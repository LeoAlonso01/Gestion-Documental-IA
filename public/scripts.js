// Copy of project scripts for hosting (module entry)
let currentUpload = null;

// Import Firebase SDKs (ES modules)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

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
  uploadStatus.style.display='block';progressBar.style.width='0%';progressBar.textContent='0%';progressCount.textContent=`${(duration/1000).toFixed(1)}s`;
  cancelBtn.style.display='inline-flex';uploadBtn.disabled=true;fileInput.disabled=true;
  let aborted=false; const start=performance.now(); let rafId=null;
  function tick(now){ if(aborted) return; const elapsed=now-start; const pct=Math.min(100,Math.round((elapsed/duration)*100)); progressBar.style.width=pct+'%'; progressBar.textContent=pct+'%'; const timeLeft=Math.max(0,((duration-elapsed)/1000)).toFixed(1); progressCount.textContent=`${timeLeft}s`; if(elapsed<duration){ rafId=requestAnimationFrame(tick);} else{ cancelBtn.style.display='none'; progressCount.textContent='Done'; uploadBtn.disabled=false; fileInput.disabled=false; currentUpload=null; completeUpload(file); } }
  cancelBtn.onclick=()=>{ aborted=true; if(rafId) cancelAnimationFrame(rafId); uploadBtn.disabled=false; fileInput.disabled=false; cancelUpload(); }
  currentUpload={ cancel(){ aborted=true; if(rafId) cancelAnimationFrame(rafId); uploadBtn.disabled=false; fileInput.disabled=false; cancelUpload(); } };
  rafId=requestAnimationFrame(tick);
}

function cancelUpload(){ const uploadStatus=document.getElementById('uploadStatus'); const progressBar=document.getElementById('progressBar'); const cancelBtn=document.getElementById('cancelUpload'); const results=document.getElementById('results'); const resultContent=document.getElementById('resultContent'); uploadStatus.style.display='none'; cancelBtn.style.display='none'; progressBar.style.width='0%'; progressBar.textContent='0%'; results.style.display='block'; resultContent.innerHTML=`<div class="muted small">Carga cancelada</div>`; currentUpload=null; }

function completeUpload(file){ const results=document.getElementById('results'); const resultContent=document.getElementById('resultContent'); results.style.display='block'; resultContent.innerHTML=''; const info=document.createElement('div'); info.className='small'; info.textContent=`Uploaded: ${file.name} (${(file.size/1024).toFixed(1)} KB)`; resultContent.appendChild(info); if(file.type.startsWith('image/')){ const reader=new FileReader(); reader.onload=(e)=>{ const img=document.createElement('img'); img.src=e.target.result; img.alt=file.name; img.style.maxWidth='320px'; img.style.marginTop='8px'; resultContent.appendChild(img); }; reader.readAsDataURL(file); } else { const url=URL.createObjectURL(file); const a=document.createElement('a'); a.href=url; a.download=file.name; a.className='btn btn-ghost mt-2'; a.textContent='Download'; resultContent.appendChild(a); } }

const dropzone=document.getElementById('dropzone'); if(dropzone){ const fileInput=document.getElementById('fileInput'); dropzone.addEventListener('click',()=>fileInput.click()); dropzone.addEventListener('keydown',(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); fileInput.click(); }}); dropzone.addEventListener('dragover',e=>{ e.preventDefault(); dropzone.classList.add('dragover');}); dropzone.addEventListener('dragleave',()=>dropzone.classList.remove('dragover')); dropzone.addEventListener('drop',e=>{ e.preventDefault(); dropzone.classList.remove('dragover'); const files=e.dataTransfer.files; if(files && files.length){ const dt=new DataTransfer(); for(let i=0;i<files.length;i++) dt.items.add(files[i]); fileInput.files=dt.files; showFilename(files); startUpload(files[0],3000); } }); }

function showFilename(files){ const dropFilename=document.getElementById('dropFilename'); const dropzone=document.getElementById('dropzone'); if(!files||files.length===0){ if(dropFilename){ dropFilename.style.display='none'; dropFilename.textContent=''; } if(dropzone) dropzone.classList.remove('has-file'); return; } if(files.length===1){ const name=files[0].name; dropFilename.textContent=`Archivo: ${name}`; } else { const first=files[0].name; dropFilename.textContent=`${files.length} archivos — ${first} (+${files.length-1})`; } dropFilename.style.display='block'; if(dropzone) dropzone.classList.add('has-file'); }

const uploadBtn=document.getElementById('uploadBtn'); if(uploadBtn) uploadBtn.addEventListener('click',uploadDocument); const fileLabel=document.querySelector('label[for="fileInput"]'); const fileInput=document.getElementById('fileInput'); if(fileLabel && fileInput) fileLabel.addEventListener('click',()=>fileInput.click()); if(fileInput) fileInput.addEventListener('change',(e)=>{ const files=e.target.files; if(files && files.length) showFilename(files); else showFilename(null); });
