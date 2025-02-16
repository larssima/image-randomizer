// Load a random image on page load
window.onload = loadRandomImage;

let currentImagePath = "";

function loadRandomImage() {
    fetch("/random-image")
        .then(response => response.json())
        .then(data => {
            document.getElementById("randomImage").src = data.imageUrl;
            document.getElementById("imageDate").value = data.date || "Unknown date";
            document.getElementById("imageTitle").value = data.title || "";
            currentImagePath = data.filePath;
        })
        .catch(error => console.error("Error loading image:", error));
}

function saveImageMetadata() {
    const newTitle = document.getElementById("imageTitle").value;

    fetch("/update-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: currentImagePath, newTitle })
    })
    .then(response => response.text())
    .then(message => alert(message))
    .catch(error => console.error("Failed to update metadata:", error));
}


// Upload an image
function uploadImage() {
    const fileInput = document.getElementById("imageInput");
    const file = fileInput.files[0];

    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    fetch("/upload-image", {
        method: "POST",
        body: formData
    })
    .then(response => {
        if (response.ok) {
            alert("Image uploaded successfully!");
            loadRandomImage();
        } else {
            alert("Failed to upload image.");
        }
    })
    .catch(error => console.error("Error uploading image:", error));
}
