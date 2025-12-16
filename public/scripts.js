// Copy of project scripts for hosting (module entry)
let currentUpload = null;
let lastUploadedFile = null; // store the last uploaded file for manual processing
/* No API keys in client-side code. Set DeepSeek key on the server and configure GEMINI_PROVIDER/GEMINI_API_URL or GEMINI_API_KEY in Cloud Functions. */

// Import Firebase SDKs (ES modules)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCjA2MLlwPk87ce7ZjW_b39f-UBmAe_GYM",
  authDomain: "appgestiondocumentalai.firebaseapp.com",
  projectId: "appgestiondocumentalai",
  storageBucket: "appgestiondocumentalai.firebasestorage.app",
  messagingSenderId: "174138684904",
  appId: "1:174138684904:web:db2399d62c93a35bbd205d",
  measurementId: "G-GYF4LDX6X2"
};

const app = initializeApp(firebaseConfig);
try{ getAnalytics(app);}catch(e){/* ignore */}

const storage = getStorage(app);
const db = getFirestore(app);
const auth = getAuth(app);

// The rest of upload UI code is inlined (same as project root)
function uploadDocument(){
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  if(!file){ alert('Por favor, selecciona un archivo para subir.'); return; }
  startUpload(file,3000);
}

function startUpload(file,duration=3000){
  if(currentUpload) return;
  const uploadStatus = document.getElementById('uploadStatus');
  const progressBar = document.getElementById('progressBar');
  const progressCount = document.getElementById('progressCount');
  const cancelBtn = document.getElementById('cancelUpload');
  const uploadBtn = document.getElementById('uploadBtn');
  const fileInput = document.getElementById('fileInput');
  // Clear any previous review result
  const botRes = document.getElementById('botonResult'); if(botRes) botRes.innerHTML='';
  uploadStatus.style.display='block';progressBar.style.width='0%';progressBar.textContent='0%';progressCount.textContent=`${(duration/1000).toFixed(1)}s`;
  cancelBtn.style.display='inline-flex';uploadBtn.disabled=true;fileInput.disabled=true;
  let aborted=false; const start=performance.now(); let rafId=null;
  function tick(now){ if(aborted) return; const elapsed=now-start; const pct=Math.min(100,Math.round((elapsed/duration)*100)); progressBar.style.width=pct+'%'; progressBar.textContent=pct+'%'; const timeLeft=Math.max(0,((duration-elapsed)/1000)).toFixed(1); progressCount.textContent=`${timeLeft}s`; if(elapsed<duration){ rafId=requestAnimationFrame(tick);} else{ cancelBtn.style.display='none'; progressCount.textContent='Done'; uploadBtn.disabled=false; fileInput.disabled=false; currentUpload=null; completeUpload(file); } }
  cancelBtn.onclick=()=>{ aborted=true; if(rafId) cancelAnimationFrame(rafId); uploadBtn.disabled=false; fileInput.disabled=false; cancelUpload(); }
  currentUpload={ cancel(){ aborted=true; if(rafId) cancelAnimationFrame(rafId); uploadBtn.disabled=false; fileInput.disabled=false; cancelUpload(); } };
  rafId=requestAnimationFrame(tick);
}

function cancelUpload(){ const uploadStatus=document.getElementById('uploadStatus'); const progressBar=document.getElementById('progressBar'); const cancelBtn=document.getElementById('cancelUpload'); const results=document.getElementById('results'); const resultContent=document.getElementById('resultContent'); uploadStatus.style.display='none'; cancelBtn.style.display='none'; progressBar.style.width='0%'; progressBar.textContent='0%'; results.style.display='block'; resultContent.innerHTML=`<div class="muted small">Carga cancelada</div>`; currentUpload=null; }

async function completeUpload(file){ const results=document.getElementById('results'); const resultContent=document.getElementById('resultContent'); results.style.display='block'; resultContent.innerHTML=''; const info=document.createElement('div'); info.className='small'; info.textContent=`Uploaded: ${file.name} (${(file.size/1024).toFixed(1)} KB)`; resultContent.appendChild(info); if(file.type.startsWith('image/')){ const reader=new FileReader(); reader.onload=(e)=>{ const img=document.createElement('img'); img.src=e.target.result; img.alt=file.name; img.style.maxWidth='320px'; img.style.marginTop='8px'; resultContent.appendChild(img); }; reader.readAsDataURL(file); } else { const url=URL.createObjectURL(file); const a=document.createElement('a'); a.href=url; a.download=file.name; a.className='btn btn-ghost mt-2'; a.textContent='Download'; resultContent.appendChild(a); }
  // Manual processing: store file for review (do not auto-process)
  lastUploadedFile = file; botRes = document.getElementById('botonResult'); if(botRes) botRes.innerHTML = '<div class="muted small">Archivo listo para revisión. Pulsa "Revisar con IA".</div>'; return;

  try{
    const form = new FormData(); form.append('file', file); form.append('uploaderId', window.currentUser ? window.currentUser.uid : null);
    const PROCESS_URL = window._PROCESS_URL || 'https://YOUR_CLOUD_FUNCTION_URL';
    const r = await fetch(`${PROCESS_URL}/process`, { method: 'POST', body: form });
    if(!r.ok){ const err = await r.json().catch(()=>null); botRes.innerHTML = `<div class="text-danger small">Error del servidor: ${err && err.error ? err.error : r.statusText}</div>`; return; }
    const data = await r.json(); // { extracted, fileName, signatureHash }
    // show editable form
    const extracted = data.extracted || { fields: {} };
    const displayName = data.fileName || file.name || 'file';
    const formHtml = document.createElement('div'); formHtml.innerHTML = `<div class="small muted">Archivo procesado: <strong>${displayName}</strong></div>`;
    const fieldsWrap = document.createElement('div'); fieldsWrap.className='mt-2';
    const fieldInputs = {};
    for(const k of Object.keys(extracted.fields||{})){
      const row = document.createElement('div'); row.style.marginBottom='.5rem';
      row.innerHTML = `<label class="small">${k}</label><input class="form-control" data-field="${k}" value="${(extracted.fields[k]||'')}" />`;
      fieldsWrap.appendChild(row);
      fieldInputs[k]=row.querySelector('input');
    }

   
    // allow adding a new field
    const addRow = document.createElement('div'); addRow.innerHTML = `<input placeholder="New field name" class="form-control mt-2" id="newFieldName"/><input placeholder="Value" class="form-control mt-1" id="newFieldValue"/> <button class="btn btn-primary btn-sm mt-1" id="addFieldBtn">Add field</button>`;
    fieldsWrap.appendChild(addRow);
    formHtml.appendChild(fieldsWrap);
    const actions = document.createElement('div'); actions.className='mt-2'; actions.innerHTML = `<button class="btn btn-primary" id="saveExtract">Guardar en BD</button> <button class="btn btn-ghost" id="cancelExtract">Cancelar</button>`;
    formHtml.appendChild(actions);
    botRes.innerHTML=''; botRes.appendChild(formHtml);

    document.getElementById('addFieldBtn').addEventListener('click', ()=>{
      const name = document.getElementById('newFieldName').value.trim(); const val = document.getElementById('newFieldValue').value.trim(); if(!name) return alert('Nombre de campo requerido'); const row = document.createElement('div'); row.style.marginBottom='.5rem'; row.innerHTML = `<label class="small">${name}</label><input class="form-control" data-field="${name}" value="${val}" />`;
      fieldsWrap.insertBefore(row, addRow);
      fieldInputs[name]=row.querySelector('input');
      document.getElementById('newFieldName').value=''; document.getElementById('newFieldValue').value='';
    });

    document.getElementById('cancelExtract').addEventListener('click', ()=>{ botRes.innerHTML = '<div class="muted small">Procesamiento cancelado</div>'; });

    document.getElementById('saveExtract').addEventListener('click', async ()=>{
      const saveBtn = document.getElementById('saveExtract'); saveBtn.disabled=true; const payload = { driveFileId: data.driveFileId, extracted: { fields: {} }, signatureHash: data.signatureHash, uploaderId: window.currentUser ? window.currentUser.uid : null };
      Object.keys(fieldInputs).forEach(k=>{ payload.extracted.fields[k]=fieldInputs[k].value; });
      const PROCESS_URL = window._PROCESS_URL || 'https://YOUR_CLOUD_FUNCTION_URL';
      const r2 = await fetch(`${PROCESS_URL}/saveExtracted`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      if(!r2.ok){ const err = await r2.json().catch(()=>null); botRes.innerHTML = `<div class="text-danger small">Error guardando: ${err && err.error ? err.error : r2.statusText}</div>`; saveBtn.disabled=false; return; }
      const saved = await r2.json(); botRes.innerHTML = `<div class="text-success small">Guardado: ${saved.docId} (schema: ${saved.schemaId})</div>`;
    });
  }catch(err){ console.error(err); botRes.innerHTML = `<div class="text-danger small">Error procesando: ${err.message || err}</div>`; }
}

async function processFile(file){
  if(!file) return alert('No hay archivo para procesar.');
  if(!file.type.match(/image\//) && file.type !== 'application/pdf') return alert('Solo se admiten imágenes y PDFs escaneados para procesamiento.');
  const botRes = document.getElementById('botonResult'); if(!botRes) return; botRes.innerHTML = '<div class="muted small">Procesando con IA…</div>';
  try{
    const form = new FormData(); form.append('file', file); form.append('uploaderId', window.currentUser ? window.currentUser.uid : null);
    const PROCESS_URL = window._PROCESS_URL || 'https://YOUR_CLOUD_FUNCTION_URL';
    const r = await fetch(`${PROCESS_URL}/process`, { method: 'POST', body: form });
    if(!r.ok){ const err = await r.json().catch(()=>null); botRes.innerHTML = `<div class="text-danger small">Error del servidor: ${err && err.error ? err.error : r.statusText}</div>`; return; }
    const data = await r.json(); // { extracted, fileName, signatureHash }
    const extracted = data.extracted || { fields: {} };
    const displayName = data.fileName || file.name || 'file';
    const formHtml = document.createElement('div'); formHtml.innerHTML = `<div class="small muted">Archivo procesado: <strong>${displayName}</strong></div>`;
    const fieldsWrap = document.createElement('div'); fieldsWrap.className='mt-2';
    const fieldInputs = {};
    for(const k of Object.keys(extracted.fields||{})){
      const row = document.createElement('div'); row.style.marginBottom='.5rem';
      row.innerHTML = `<label class="small">${k}</label><input class="form-control" data-field="${k}" value="${(extracted.fields[k]||'')}" />`;
      fieldsWrap.appendChild(row);
      fieldInputs[k]=row.querySelector('input');
    }
    const addRow = document.createElement('div'); addRow.innerHTML = `<input placeholder="New field name" class="form-control mt-2" id="newFieldName"/><input placeholder="Value" class="form-control mt-1" id="newFieldValue"/> <button class="btn btn-primary btn-sm mt-1" id="addFieldBtn">Add field</button>`;
    fieldsWrap.appendChild(addRow);
    formHtml.appendChild(fieldsWrap);
    const actions = document.createElement('div'); actions.className='mt-2'; actions.innerHTML = `<button class="btn btn-primary" id="saveExtract">Guardar en BD</button> <button class="btn btn-ghost" id="cancelExtract">Cancelar</button>`;
    formHtml.appendChild(actions);

    botRes.innerHTML=''; botRes.appendChild(formHtml);

    document.getElementById('addFieldBtn').addEventListener('click', ()=>{
      const name = document.getElementById('newFieldName').value.trim(); const val = document.getElementById('newFieldValue').value.trim(); if(!name) return alert('Nombre de campo requerido'); const row = document.createElement('div'); row.style.marginBottom='.5rem'; row.innerHTML = `<label class="small">${name}</label><input class="form-control" data-field="${name}" value="${val}" />`;
      fieldsWrap.insertBefore(row, addRow);
      fieldInputs[name]=row.querySelector('input');
      document.getElementById('newFieldName').value=''; document.getElementById('newFieldValue').value='';
    });

    document.getElementById('cancelExtract').addEventListener('click', ()=>{ botRes.innerHTML = '<div class="muted small">Procesamiento cancelado</div>'; });

    document.getElementById('saveExtract').addEventListener('click', async ()=>{
      const saveBtn = document.getElementById('saveExtract'); saveBtn.disabled=true; const payload = { fileName: data.fileName || file.name, extracted: { fields: {} }, signatureHash: data.signatureHash, uploaderId: window.currentUser ? window.currentUser.uid : null };
      Object.keys(fieldInputs).forEach(k=>{ payload.extracted.fields[k]=fieldInputs[k].value; });
      const PROCESS_URL = window._PROCESS_URL || 'https://YOUR_CLOUD_FUNCTION_URL';
      const r2 = await fetch(`${PROCESS_URL}/saveExtracted`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      if(!r2.ok){ const err = await r2.json().catch(()=>null); botRes.innerHTML = `<div class="text-danger small">Error guardando: ${err && err.error ? err.error : r2.statusText}</div>`; saveBtn.disabled=false; return; }
      const saved = await r2.json(); botRes.innerHTML = `<div class="text-success small">Guardado: ${saved.docId} (schema: ${saved.schemaId})</div>`;
    });
  }catch(err){ console.error(err); botRes.innerHTML = `<div class="text-danger small">Error procesando: ${err.message || err}</div>`; }
}

const dropzone=document.getElementById('dropzone'); if(dropzone){ const fileInput=document.getElementById('fileInput'); dropzone.addEventListener('click',()=>fileInput.click()); dropzone.addEventListener('keydown',(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); fileInput.click(); }}); dropzone.addEventListener('dragover',e=>{ e.preventDefault(); dropzone.classList.add('dragover');}); dropzone.addEventListener('dragleave',()=>dropzone.classList.remove('dragover')); dropzone.addEventListener('drop',e=>{ e.preventDefault(); dropzone.classList.remove('dragover'); const files=e.dataTransfer.files; if(files && files.length){ const dt=new DataTransfer(); for(let i=0;i<files.length;i++) dt.items.add(files[i]); fileInput.files=dt.files; showFilename(files); startUpload(files[0],3000); } }); }

function showFilename(files){ const dropFilename=document.getElementById('dropFilename'); const dropzone=document.getElementById('dropzone'); if(!files||files.length===0){ if(dropFilename){ dropFilename.style.display='none'; dropFilename.textContent=''; } if(dropzone) dropzone.classList.remove('has-file'); return; } if(files.length===1){ const name=files[0].name; dropFilename.textContent=`Archivo: ${name}`; } else { const first=files[0].name; dropFilename.textContent=`${files.length} archivos — ${first} (+${files.length-1})`; } dropFilename.style.display='block'; if(dropzone) dropzone.classList.add('has-file'); }

const uploadBtn=document.getElementById('uploadBtn');
if(uploadBtn) uploadBtn.addEventListener('click',uploadDocument);
const fileLabel=document.querySelector('label[for="fileInput"]');
const fileInput=document.getElementById('fileInput');
if(fileLabel && fileInput) fileLabel.addEventListener('click',()=>fileInput.click());
if(fileInput) fileInput.addEventListener('change',(e)=>{ const files=e.target.files; if(files && files.length) showFilename(files); else showFilename(null); });

// Review button — trigger processing with the server-side model (DeepSeek)
const reviewBtn = document.getElementById('reviewBtn');
if(reviewBtn) reviewBtn.addEventListener('click', ()=>{ processFile(lastUploadedFile); });

// Simple hash-based routing for hosted site
function showPage(name){
  document.querySelectorAll('.page').forEach(el=>el.style.display='none');
  const el=document.getElementById(name);
  if(el) el.style.display='block';
  document.querySelectorAll('.site-nav .nav-link').forEach(a=>a.classList.remove('active'));
  const selector = name === 'home' ? '.site-nav .nav-link[href="#/"]' : `.site-nav .nav-link[href="#/${name}"]`;
  const link=document.querySelector(selector);
  if(link) link.classList.add('active');
}

function routeFromHash(){
  const hash = location.hash.replace('#/','');
  const name = hash === '' ? 'home' : hash;
  showPage(name);
}

window.addEventListener('hashchange', routeFromHash);
document.addEventListener('DOMContentLoaded', routeFromHash);

// --- Authentication helpers & UI wiring ---
async function registerWithEmail(email,password,displayName){
  const cred = await createUserWithEmailAndPassword(auth,email,password);
  const user = cred.user;
  // create simple profile document
  try{ await setDoc(doc(db,'users',user.uid), { email: user.email, displayName: displayName||null, createdAt: serverTimestamp() }); }catch(e){ /* non-fatal */ }
  return user;
}

async function signInWithEmail(email,password){
  return await signInWithEmailAndPassword(auth,email,password);
}

async function loginWithGoogle(){
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
}

function signOutUI(){
  return signOut(auth);
}

// Friendly auth error formatter (Spanish)
function formatAuthError(err){
  const code = err && err.code ? err.code : null;
  if(!code){ return (err && err.message) ? err.message : 'Ocurrió un error. Intenta de nuevo.'; }
  switch(code){
    case 'auth/invalid-email': return 'Correo inválido. Revisa el formato (ej. usuario@dominio.com).';
    case 'auth/user-not-found': return 'No existe una cuenta con ese correo.';
    case 'auth/wrong-password': return 'Contraseña incorrecta. Intenta de nuevo.';
    case 'auth/email-already-in-use': return 'El correo ya está registrado. Intenta iniciar sesión.';
    case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/popup-closed-by-user': return 'La ventana de inicio con Google fue cerrada antes de completar.';
    case 'auth/cancelled-popup-request': return 'Inicio con Google cancelado.';
    case 'auth/popup-blocked': return 'El navegador bloqueó la ventana emergente para Google Sign-in.';
    case 'auth/network-request-failed': return 'Fallo de red. Revisa tu conexión e intenta de nuevo.';
    case 'auth/too-many-requests': return 'Demasiados intentos. Intenta más tarde.';
    case 'auth/invalid-credential': return 'La contraseña o el usuario no son válidos.';
    default: return (err && err.message) ? err.message : 'Ocurrió un error. Intenta de nuevo.';
  }
}

// Expose to window for login page scripts
window.appAuth = { registerWithEmail, signInWithEmail, loginWithGoogle, signOutUI, formatAuthError };

// Listen for auth state changes to update nav and handle simple routing
onAuthStateChanged(auth, (user)=>{
  window.currentUser = user;
  const authArea=document.getElementById('authArea');
  if(authArea){
    if(user){
      const short = user.email? user.email.split('@')[0] : 'User';
      authArea.innerHTML = `<span class="small muted me-2">${short}</span><button class="btn btn-ghost btn-sm" id="signOutBtn">Sign out</button>`;
      const btn=document.getElementById('signOutBtn'); if(btn) btn.addEventListener('click', ()=>{ signOutUI(); });
    } else {
      authArea.innerHTML = `<a href="login.html" class="btn btn-primary btn-sm">Sign in</a>`;
    }
  }
  const path = location.pathname.split('/').pop();
  if(!user && (path === 'upload.html' || path === 'docs.html')){
    location.replace('login.html');
  }
  if(user && path === 'login.html'){
    location.replace('upload.html');
  }
});
