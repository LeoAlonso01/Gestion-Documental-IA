/*
 * Cloud Function (Express) - Document processing MVP
 * Endpoints:
 *  POST /process         -> accepts multipart file (field 'file') and uploaderId -> uploads to Drive & GCS, OCR -> calls Gemini -> returns extracted JSON (DOES NOT SAVE)
 *  POST /saveExtracted   -> accepts JSON payload { driveFileId, extracted, schemaSignature, schemaFields, uploaderId } -> saves to Firestore
 *
 * IMPORTANT: Configure these environment variables in your Cloud Functions deployment:
 * - GOOGLE_APPLICATION_CREDENTIALS or use metadata service (deployed on GCP)
 * - GCS_BUCKET (temporary bucket name used for Vision async processing)
 * - GEMINI_API_KEY (or set your Gemini access method)
 * - DRIVE_FOLDER_ID (optional) - folder in Drive where files will be stored
 */

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {google} = require('googleapis');
const {Storage} = require('@google-cloud/storage');
const vision = require('@google-cloud/vision');
const axios = require('axios');
const admin = require('firebase-admin');
const crypto = require('crypto');

const app = express();
const upload = multer({ dest: os.tmpdir() });

// Initialize firebase-admin
try{
  admin.initializeApp();
}catch(e){ /* already initialized if emulator or repeated load */ }
const db = admin.firestore();

// Clients
const storage = new Storage();
const visionClient = new vision.ImageAnnotatorClient();

// Drive client using googleapis auth from ADC
const auth = new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/drive.file'] });
let driveClient = null;
async function getDrive(){ if(driveClient) return driveClient; const client = await auth.getClient(); driveClient = google.drive({ version: 'v3', auth: client }); return driveClient; }

function schemaSignatureFromObj(obj){ const keys = Object.keys(obj).sort(); return keys.join('|'); }
function hashString(s){ return crypto.createHash('sha1').update(s).digest('hex'); }

app.post('/process', upload.single('file'), async (req,res)=>{
  try{
    const file = req.file; const uploaderId = req.body.uploaderId || null;
    if(!file) return res.status(400).json({ error: 'No file uploaded' });

    // Do NOT upload file to Drive — process in-memory / temporary (we may use GCS temporarily for Vision PDF OCR)
    const fileName = file.originalname;

    // OCR: if image -> text detection; if pdf -> upload to GCS and call asyncBatchAnnotateFiles, then cleanup outputs
    let rawText = '';
    if(file.mimetype.startsWith('image/')){
      const [result] = await visionClient.textDetection(file.path);
      rawText = result.fullTextAnnotation ? result.fullTextAnnotation.text : '';
    } else if(file.mimetype === 'application/pdf'){
      // For scanned PDFs we must upload temporarily to GCS for asyncBatchAnnotateFiles
      const bucketName = process.env.GCS_BUCKET; if(!bucketName) throw new Error('GCS_BUCKET not configured');
      const gcsFileName = `uploads/${Date.now()}-${file.originalname}`;
      await storage.bucket(bucketName).upload(file.path, { destination: gcsFileName });
      const gcsUri = `gs://${bucketName}/${gcsFileName}`;
      const request = {
        requests: [
          {
            inputConfig: { mimeType: 'application/pdf', gcsSource: { uri: gcsUri } },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            outputConfig: { gcsDestination: { uri: `gs://${bucketName}/vision-output/` } }
          }
        ]
      };
      const [operation] = await visionClient.asyncBatchAnnotateFiles(request);
      await operation.promise();
      // Read results from bucket (vision writes JSON outputs); we'll attempt to find files in vision-output/
      const [files] = await storage.bucket(bucketName).getFiles({ prefix: 'vision-output/' });
      for(const f of files){ const contents = (await f.download())[0].toString('utf8'); const parsed = JSON.parse(contents); if(parsed.responses && parsed.responses[0] && parsed.responses[0].fullTextAnnotation){ rawText += '\n' + parsed.responses[0].fullTextAnnotation.text; } }
      // cleanup uploaded PDF and outputs
      try{ await storage.bucket(bucketName).file(gcsFileName).delete(); }catch(e){}
      try{ const [outFiles] = await storage.bucket(bucketName).getFiles({ prefix: 'vision-output/' }); for(const ofile of outFiles){ try{ await ofile.delete(); }catch(e){} } }catch(e){}
    } else {
      rawText = `Unsupported mimeType for OCR: ${file.mimetype}`;
    }

    // call Gemini (configurable)
    const geminiKey = process.env.GEMINI_API_KEY;
    const geminiProvider = (process.env.GEMINI_PROVIDER || 'generic').toLowerCase();
    const geminiUrl = process.env.GEMINI_API_URL || null; // optional for generic provider
    const geminiModel = process.env.GEMINI_MODEL || null; // used for provider-specific calls
    if(!geminiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

    // Compose prompt - ask for strict JSON extraction
    const prompt = `Por favor, EXTRAE los campos más relevantes del siguiente documento y RESPONDE SÓLO con JSON VÁLIDO en la forma: {"fields": {"fieldName": "value", ...}, "confidence": 0.0, "notes": "..."}. No añadas explicaciones fuera del JSON. Documento:\n${rawText.slice(0,30000)}`;

    // callGemini helper (supports generic POST or Google Generative)
    async function callGemini(promptText){
      if(geminiProvider === 'google'){
        if(!geminiModel) throw new Error('GEMINI_MODEL not set for google provider');
        const url = `https://generativelanguage.googleapis.com/v1beta2/models/${geminiModel}:generate?key=${geminiKey}`;
        const body = { prompt: { text: promptText }, temperature: 0.0, maxOutputTokens: 1024 };
        const r = await axios.post(url, body, { timeout: 120000 });
        // Google returns candidates in r.data.candidates[*].content typically
        const content = (r.data && r.data.candidates && r.data.candidates[0] && r.data.candidates[0].content) ? r.data.candidates[0].content : (r.data && r.data.output ? JSON.stringify(r.data.output) : '');
        return content;
      } else if (geminiProvider === 'deepseek') {
        // deepseek provider — POST { prompt } with Bearer token
        if(!geminiUrl) throw new Error('GEMINI_API_URL not set for deepseek provider');
        const r = await axios.post(geminiUrl, { prompt: promptText }, { headers: { 'Authorization': `Bearer ${geminiKey}`, 'Content-Type': 'application/json' }, timeout: 120000 });
        if(r.data){
          if(typeof r.data === 'string') return r.data;
          if(r.data.result) return (typeof r.data.result === 'string') ? r.data.result : JSON.stringify(r.data.result);
          if(r.data.text) return r.data.text;
          if(r.data.data && r.data.data.text) return r.data.data.text;
          if(r.data.output && r.data.output[0] && r.data.output[0].content) return r.data.output[0].content;
        }
        return JSON.stringify(r.data || {});
      } else {
        // generic provider expects GEMINI_API_URL and Bearer key, POST { prompt }
        if(!geminiUrl) throw new Error('GEMINI_API_URL not set for generic provider');
        const r = await axios.post(geminiUrl, { prompt: promptText, model: geminiModel }, { headers: { 'Authorization': `Bearer ${geminiKey}`, 'Content-Type': 'application/json' }, timeout: 120000 });
        // try to extract text content from common shapes
        if(r.data){
          if(typeof r.data === 'string') return r.data;
          if(r.data.output && r.data.output[0] && r.data.output[0].content) return r.data.output[0].content;
          if(r.data.choices && r.data.choices[0] && (r.data.choices[0].message || r.data.choices[0].text)){
            return r.data.choices[0].message ? (r.data.choices[0].message.content || JSON.stringify(r.data.choices[0].message)) : r.data.choices[0].text;
          }
        }
        return JSON.stringify(r.data || {});
      }
    }

    let geminiRaw = '';
    try{ geminiRaw = await callGemini(prompt); }catch(e){ console.error('Gemini call failed', e); return res.status(500).json({ error: 'Error calling Gemini: ' + (e.message||String(e)) }); }

    // attempt to parse JSON from string response
    let extracted = { fields: {}, confidence: 0 };
    try{
      // try direct parse
      extracted = JSON.parse(geminiRaw);
    }catch(e){
      // try to find JSON substring
      const m = geminiRaw.match(/\{[\s\S]*\}/);
      if(m){ try{ extracted = JSON.parse(m[0]); }catch(e2){ console.warn('failed to parse inner JSON', e2); extracted = { fields: { _raw: geminiRaw }, confidence: 0 }; } }
      else { extracted = { fields: { _raw: geminiRaw }, confidence: 0 }; }
    }

    // Compute signature from fields
    const signature = schemaSignatureFromObj(extracted.fields || {});
    const signatureHash = hashString(signature || 'empty');

    // Return response for client review (DO NOT SAVE YET). We do not save the file — return original filename and extracted JSON.
    res.json({ success: true, fileName: fileName, extracted, signature, signatureHash, rawText: rawText.slice(0, 200000) });
  }catch(err){
    console.error('process error', err);
    res.status(500).json({ error: err.message || String(err) });
  } finally {
    // cleanup tmp file
    try{ if(req.file && req.file.path) fs.unlinkSync(req.file.path); }catch(e){}
  }
});

app.post('/saveExtracted', express.json(), async (req,res)=>{
  try{
    const payload = req.body;
    const { driveFileId, fileName, extracted, signatureHash, uploaderId } = payload;
    if(!extracted) return res.status(400).json({ error: 'missing extracted payload' });

    // find template
    const templatesRef = db.collection('schemaTemplates');
    const q = await templatesRef.where('signatureHash','==',signatureHash).limit(1).get();
    let schemaId = null;
    if(!q.empty){ schemaId = q.docs[0].id; }
    else{
      const newTpl = { signature: Object.keys(extracted.fields||{}).sort(), signatureHash, createdAt: admin.firestore.FieldValue.serverTimestamp() };
      const r = await templatesRef.add(newTpl); schemaId = r.id;
    }

    const docRef = await db.collection('extractedDocs').add({ schemaId, extracted, driveFileId: driveFileId || null, fileName: fileName || null, uploaderId: uploaderId || null, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    res.json({ success: true, docId: docRef.id, schemaId });
  }catch(err){ console.error('saveExtracted error', err); res.status(500).json({ error: err.message || String(err) }); }
});

// Simple health
app.get('/', (req,res)=> res.send('Document processing function is running'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, ()=> console.log(`Server started on ${PORT}`));

module.exports = app;