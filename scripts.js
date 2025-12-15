let currentUpload = null; // Variable global para almacenar información sobre la carga actual (simulada) o null si no hay ninguna.

// Firebase configuration and initialization
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
  // Firebase products SDKs for document management system
  import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
  import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
  import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyCjA2MLlwPk87ce7ZjW_b39f-UBmAe_GYM",
    authDomain: "appgestiondocumentalai.firebaseapp.com",
    projectId: "appgestiondocumentalai",
    storageBucket: "appgestiondocumentalai.firebasestorage.app",
    messagingSenderId: "174138684904",
    appId: "1:174138684904:web:db2399d62c93a35bbd205d",
    measurementId: "G-GYF4LDX6X2"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
  // Initialize Firebase services
  const storage = getStorage(app);
  const db = getFirestore(app);
  const auth = getAuth(app);


function uploadDocument() { // Función que se llama cuando el usuario intenta iniciar una carga.
    const fileInput = document.getElementById('fileInput'); // Obtiene el elemento input de tipo 'file' por su ID.
    const file = fileInput.files[0]; // Obtiene el primer archivo seleccionado por el usuario.
    if (!file) { // Comprueba si se seleccionó algún archivo.
        alert('Por favor, selecciona un archivo para subir.'); // Muestra una alerta si no se seleccionó ningún archivo.
        return; // Detiene la ejecución de la función.
    }
    // simulate a ~3 second upload with progress
    startUpload(file, 2000); // Llama a la función 'startUpload' para simular la carga del archivo con una duración de 2000 ms (2 segundos).
}

function startUpload(file, duration = 2000) { // Función para simular el inicio de la carga, toma el archivo y la duración.
    if (currentUpload) return; // Si ya hay una carga en curso (currentUpload no es null), sale de la función.
    const uploadStatus = document.getElementById('uploadStatus'); // Obtiene el contenedor de estado de la carga.
    const progressBar = document.getElementById('progressBar'); // Obtiene la barra de progreso.
    const progressCount = document.getElementById('progressCount'); // Obtiene el elemento para mostrar el tiempo restante/progreso.
    const cancelBtn = document.getElementById('cancelUpload'); // Obtiene el botón de cancelar.
    const uploadBtn = document.getElementById('uploadBtn'); // Obtiene el botón de subir.
    const fileInput = document.getElementById('fileInput'); // Obtiene el input de archivo.

    // UI setup (Configuración de la interfaz de usuario)
    uploadStatus.style.display = 'block'; // Hace visible el estado de la carga.
    progressBar.style.width = '0%'; // Establece el ancho de la barra de progreso a 0%.
    progressBar.textContent = '0%'; // Muestra "0%" en la barra de progreso.
    progressCount.textContent = `${(duration/1000).toFixed(1)}s`; // Muestra la duración total de la simulación.
    cancelBtn.style.display = 'inline-flex'; // Muestra el botón de cancelar.
    uploadBtn.disabled = true; // Deshabilita el botón de subir para evitar múltiples cargas.
    fileInput.disabled = true; // Deshabilita el input de archivo.

    console.log(`Starting simulated upload: ${file.name}`); // Muestra un mensaje en la consola sobre el inicio de la carga.

    let aborted = false; // Bandera para saber si la carga fue cancelada.
    const start = performance.now(); // Obtiene el tiempo actual para calcular el progreso.
    let rafId = null; // Variable para almacenar el ID del `requestAnimationFrame`.

    function tick(now) { // Función que se llama en cada cuadro de animación para actualizar el progreso.
        if (aborted) return; // Si fue cancelada, sale de la función.
        const elapsed = now - start; // Calcula el tiempo transcurrido desde el inicio.
        const pct = Math.min(100, Math.round((elapsed / duration) * 100)); // Calcula el porcentaje de progreso (máximo 100).
        progressBar.style.width = pct + '%'; // Actualiza el ancho de la barra de progreso.
        progressBar.textContent = pct + '%'; // Actualiza el texto de la barra de progreso.
        const timeLeft = Math.max(0, ((duration - elapsed) / 1000)).toFixed(1); // Calcula el tiempo restante en segundos.
        progressCount.textContent = `${timeLeft}s`; // Muestra el tiempo restante.
        if (elapsed < duration) { // Si aún no ha terminado la duración de la simulación.
            rafId = requestAnimationFrame(tick); // Solicita el siguiente cuadro de animación, llamando a 'tick' de nuevo.
        } else {
            // done (Terminado)
            cancelBtn.style.display = 'none'; // Oculta el botón de cancelar.
            progressCount.textContent = 'Done'; // Muestra "Done" (Terminado).
            uploadBtn.disabled = false; // Habilita el botón de subir.
            fileInput.disabled = false; // Habilita el input de archivo.
            currentUpload = null; // Resetea la carga actual.
            console.log(`Upload simulation finished: ${file.name}`); // Mensaje de finalización en la consola.
            completeUpload(file); // Llama a la función para manejar la finalización de la carga.
        }
    }

    cancelBtn.onclick = () => { // Define la acción al hacer clic en el botón de cancelar.
        aborted = true; // Marca la carga como abortada.
        if (rafId) cancelAnimationFrame(rafId); // Cancela la solicitud de animación si está pendiente.
        uploadBtn.disabled = false; // Habilita el botón de subir.
        fileInput.disabled = false; // Habilita el input de archivo.
        cancelUpload(); // Llama a la función de manejo de cancelación (limpieza de UI).
        console.log('Upload canceled by user'); // Mensaje de cancelación en la consola.
    };

    currentUpload = { // Almacena un objeto con un método 'cancel' para poder cancelar la carga externamente.
        cancel() { // Método para cancelar la carga.
            aborted = true; // Marca la carga como abortada.
            if (rafId) cancelAnimationFrame(rafId); // Cancela la animación.
            uploadBtn.disabled = false; // Habilita el botón de subir.
            fileInput.disabled = false; // Habilita el input de archivo.
            cancelUpload(); // Llama a la función de manejo de cancelación.
        }
    };

    rafId = requestAnimationFrame(tick); // Inicia el bucle de animación para el progreso.
}

function cancelUpload() { // Función para limpiar la interfaz de usuario tras una cancelación.
    const uploadStatus = document.getElementById('uploadStatus'); // Obtiene el contenedor de estado.
    const progressBar = document.getElementById('progressBar'); // Obtiene la barra de progreso.
    const cancelBtn = document.getElementById('cancelUpload'); // Obtiene el botón de cancelar.
    const results = document.getElementById('results'); // Obtiene el contenedor de resultados.
    const resultContent = document.getElementById('resultContent'); // Obtiene el contenido del resultado.
    uploadStatus.style.display = 'none'; // Oculta el estado de la carga.
    cancelBtn.style.display = 'none'; // Oculta el botón de cancelar.
    progressBar.style.width = '0%'; // Resetea el ancho de la barra.
    progressBar.textContent = '0%'; // Resetea el texto de la barra.
    results.style.display = 'block'; // Muestra el contenedor de resultados.
    resultContent.innerHTML = `<div class="muted small">Carga cancelada</div>`; // Muestra un mensaje de cancelación.
    currentUpload = null; // Resetea la carga actual.
}

function completeUpload(file) { // Función para manejar la finalización exitosa de la carga.
    const results = document.getElementById('results'); // Obtiene el contenedor de resultados.
    const resultContent = document.getElementById('resultContent'); // Obtiene el contenido del resultado.
    results.style.display = 'block'; // Muestra el contenedor de resultados.
    resultContent.innerHTML = ''; // Limpia el contenido anterior.
    const info = document.createElement('div'); // Crea un nuevo elemento div para mostrar la información del archivo.
    info.className = 'small'; // Asigna una clase CSS.
    info.textContent = `Uploaded: ${file.name} (${(file.size/1024).toFixed(1)} KB)`; // Muestra el nombre y tamaño (en KB).
    resultContent.appendChild(info); // Agrega la información del archivo al resultado.

    if (file.type.startsWith('image/')) { // Comprueba si el archivo es una imagen.
        const reader = new FileReader(); // Crea un objeto FileReader para leer el contenido del archivo.
        reader.onload = (e) => { // Define lo que sucede cuando el archivo se carga.
            const img = document.createElement('img'); // Crea un elemento img.
            img.src = e.target.result; // Establece la fuente de la imagen con la URL de datos.
            img.alt = file.name; // Establece el texto alternativo.
            img.style.maxWidth = '320px'; // Establece un ancho máximo para la visualización.
            img.style.marginTop = '8px'; // Agrega un margen superior.
            resultContent.appendChild(img); // Agrega la imagen al resultado.
        };
        reader.readAsDataURL(file); // Lee el archivo como una URL de datos (base64).
    } else { // Si no es una imagen.
        const url = URL.createObjectURL(file); // Crea una URL temporal para el archivo.
        const a = document.createElement('a'); // Crea un elemento de enlace (a).
        a.href = url; // Establece el href del enlace a la URL del objeto.
        a.download = file.name; // Hace que el enlace descargue el archivo con su nombre.
        a.className = 'btn btn-ghost mt-2'; // Asigna clases CSS al botón.
        a.textContent = 'Download'; // Establece el texto del botón.
        resultContent.appendChild(a); // Agrega el botón de descarga al resultado.
    }
}

// Dropzone behaviors (Comportamiento de la zona de arrastrar y soltar)
const dropzone = document.getElementById('dropzone'); // Obtiene el elemento de la zona de arrastrar y soltar.
if(dropzone){ // Comprueba que la zona de arrastrar y soltar exista.
    const fileInput = document.getElementById('fileInput'); // Obtiene el input de archivo.
    // clicking the zone opens the picker (Al hacer clic en la zona, se abre el selector de archivos)
    dropzone.addEventListener('click', ()=>fileInput.click()); // Asigna el evento de clic para abrir el selector de archivos.
        // keyboard accessibility (Accesibilidad por teclado)
        dropzone.addEventListener('keydown', (e)=>{ if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } }); // Abre el selector con Enter o Espacio.
    dropzone.addEventListener('dragover', e=>{e.preventDefault();dropzone.classList.add('dragover')}); // Previene el comportamiento por defecto y añade clase al arrastrar sobre la zona.
    dropzone.addEventListener('dragleave', ()=>dropzone.classList.remove('dragover')); // Remueve la clase al salir de la zona.
    dropzone.addEventListener('drop', e=>{ // Maneja el evento de soltar el archivo.
        e.preventDefault();dropzone.classList.remove('dragover'); // Previene el comportamiento por defecto y remueve la clase.
        const files = e.dataTransfer.files; // Obtiene los archivos soltados.
        if(files && files.length){ // Comprueba si se soltó al menos un archivo.
            // FileList is read-only in many browsers; use DataTransfer to assign
            const dt = new DataTransfer(); // Crea un objeto DataTransfer.
            for (let i=0;i<files.length;i++) dt.items.add(files[i]); // Agrega los archivos al DataTransfer.
            fileInput.files = dt.files; // Asigna la lista de archivos al input de archivo.
            console.log(`File dropped: ${files[0].name}`); // Mensaje de archivo soltado en consola.
                        // show filename in dropzone (Muestra el nombre del archivo en la zona de arrastrar y soltar)
                        showFilename(files); // Llama a la función para mostrar el nombre del archivo.
            // Auto-start upload on drop for convenience (Inicia automáticamente la carga)
            startUpload(files[0], 3000); // Inicia la simulación de carga con 3 segundos de duración.
        }
    });
}

// Show filename(s) in the dropzone (Muestra el nombre/nombres de archivo en la zona de arrastrar y soltar)
function showFilename(files){
    const dropFilename = document.getElementById('dropFilename'); // Obtiene el elemento para mostrar el nombre del archivo.
    const dropzone = document.getElementById('dropzone'); // Obtiene la zona de arrastrar y soltar.
    if(!files || files.length === 0){ // Si no hay archivos o la lista está vacía.
        if(dropFilename){ dropFilename.style.display = 'none'; dropFilename.textContent = ''; } // Oculta y limpia el nombre de archivo.
        if(dropzone) dropzone.classList.remove('has-file'); // Remueve la clase que indica que hay un archivo.
        return; // Sale de la función.
    }
    if(files.length === 1){ // Si hay un solo archivo.
        const name = files[0].name; // Obtiene el nombre del archivo.
        dropFilename.textContent = `Archivo: ${name}`; // Muestra el nombre del archivo.
    } else { // Si hay varios archivos.
        const first = files[0].name; // Obtiene el nombre del primer archivo.
        dropFilename.textContent = `${files.length} archivos — ${first} (+${files.length-1})`; // Muestra el conteo de archivos.
    }
    dropFilename.style.display = 'block'; // Muestra el elemento del nombre del archivo.
    if(dropzone) dropzone.classList.add('has-file'); // Añade la clase que indica que hay un archivo.
}

// Hook upload button after DOM loaded (Enganchar el botón de subir después de cargar el DOM)
// Ensure the upload button is hooked (script is included near end of body)
const uploadBtn = document.getElementById('uploadBtn'); // Obtiene el botón de subir.
if(uploadBtn) uploadBtn.addEventListener('click', uploadDocument); // Asigna la función 'uploadDocument' al evento de clic.

// Make label clicks explicit (some environments behave inconsistently) (Hacer explícitos los clics en la etiqueta)
const fileLabel = document.querySelector('label[for="fileInput"]'); // Obtiene la etiqueta asociada al input.
const fileInput = document.getElementById('fileInput'); // Obtiene el input de archivo.
if(fileLabel && fileInput) fileLabel.addEventListener('click', ()=>fileInput.click()); // Simula el clic en el input al hacer clic en la etiqueta.
// Update dropzone filename when file picker is used (Actualiza el nombre de archivo cuando se usa el selector)
if(fileInput) fileInput.addEventListener('change', (e)=>{ // Escucha el evento 'change' del input.
    const files = e.target.files; // Obtiene los archivos seleccionados.
    if(files && files.length) showFilename(files); // Si hay archivos, los muestra en la zona de arrastrar y soltar.
    else showFilename(null); // Si no hay archivos, limpia la visualización.
});

// Simple hash-based routing
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
