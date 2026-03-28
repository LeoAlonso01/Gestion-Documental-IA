# 📄 Gestión Documental IA

Una aplicación web moderna para la gestión de documentos potenciada con Inteligencia Artificial, construida con HTML, CSS y JavaScript puro, e integrada con Firebase como backend en la nube.

---

## 🚀 Características

- **Carga de archivos** con seguimiento de progreso en tiempo real
- **Arrastrar y soltar** (drag & drop) para subir documentos fácilmente
- **Cancelación de carga** en cualquier momento
- **Vista previa de imágenes** directamente en el navegador
- **Descarga de archivos** con enlace directo
- **Visualización del tamaño** del archivo cargado
- **Autenticación anónima** mediante Firebase Auth
- **Almacenamiento en la nube** con Firebase Storage
- **Base de datos** con Firestore
- **Diseño responsivo** adaptado a dispositivos móviles y de escritorio
- **Accesibilidad de teclado** para una navegación inclusiva

---

## 🛠️ Tecnologías utilizadas

| Categoría          | Tecnología          | Versión  |
|--------------------|---------------------|----------|
| Lenguajes          | HTML5, CSS3, JS ES6+| —        |
| Framework UI       | Bootstrap           | 5.0.2    |
| Utilidad           | Popper.js           | 2.9.2    |
| Backend / BaaS     | Firebase            | 12.6.0   |
| Autenticación      | Firebase Auth       | 12.6.0   |
| Almacenamiento     | Firebase Storage    | 12.6.0   |
| Base de datos      | Firestore           | 12.6.0   |
| Analíticas         | Firebase Analytics  | 12.6.0   |

---

## 📁 Estructura del proyecto

```
Gestion-Documental-IA/
├── index.html       # Página principal y estructura de la interfaz
├── scripts.js       # Lógica de la aplicación e integración con Firebase
├── style.css        # Estilos y diseño visual
└── README.md        # Documentación del proyecto
```

---

## ⚙️ Instalación y uso

No se requiere ningún proceso de construcción ni dependencias de Node.js. La aplicación es completamente del lado del cliente.

### Pasos para ejecutar localmente

1. **Clona el repositorio:**
   ```bash
   git clone https://github.com/LeoAlonso01/Gestion-Documental-IA.git
   cd Gestion-Documental-IA
   ```

2. **Configura Firebase:**
   - Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
   - Habilita **Authentication** (inicio de sesión anónimo), **Firestore** y **Storage**.
   - Reemplaza el objeto `firebaseConfig` en `scripts.js` con tus propias credenciales.

3. **Abre la aplicación:**
   - Sirve los archivos con un servidor local (p. ej. la extensión *Live Server* de VS Code) o despliégalos en cualquier servicio de alojamiento estático.

---

## ☁️ Despliegue

Al ser una aplicación de archivos estáticos, puedes desplegarla en:

- **Firebase Hosting**
- **GitHub Pages**
- **Vercel**
- **Netlify**

---

## 🔒 Seguridad

> ⚠️ Las credenciales de Firebase están actualmente en el código fuente (`scripts.js`). Para entornos de producción se recomienda proteger el acceso mediante las **Reglas de seguridad de Firebase** (Firestore y Storage) y restringir el uso de la API key desde la consola de Google Cloud.

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Si deseas mejorar el proyecto:

1. Haz un fork del repositorio.
2. Crea una rama con tu mejora: `git checkout -b feature/mi-mejora`
3. Realiza tus cambios y haz commit: `git commit -m "Agrega mi mejora"`
4. Envía tu rama: `git push origin feature/mi-mejora`
5. Abre un Pull Request.

---

## 📄 Licencia

Este proyecto está disponible bajo los términos de la licencia MIT.
