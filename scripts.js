function uploadDocument() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    if (file) {
        // Implement the upload logic here
        console.log(`Uploading document: ${file.name}`);
    } else {
        console.log('No file selected.');
    }
}