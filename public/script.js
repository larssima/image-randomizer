// Load a random image on page load
window.onload = loadRandomImage;

let currentImagePath = "";
let viewedImages = JSON.parse(localStorage.getItem("viewedImages")) || [];
let autoViewActive = false;
let autoViewInterval = null;

function loadRandomImage() {
    fetch("/random-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewedImages })
        })
        .then(response => response.json())
        .then(data => {
            if (data.reset) {
                //console.log("All images have been viewed. Resetting LocalStorage.");
                viewedImages = []; // Reset viewed images
                localStorage.removeItem("viewedImages"); // Clear LocalStorage
                setTimeout(loadRandomImage, 100);
                return
            }
            document.getElementById("randomImage").src = data.imageUrl;
            document.getElementById("imageDate").value = data.date || "Unknown date";
            document.getElementById("imageTitle").value = data.title || "";
            currentImagePath = data.filePath;

            // Add to viewed images and save to LocalStorage
            if (!viewedImages.includes(data.filePath)) {
                viewedImages.push(data.filePath);
                localStorage.setItem("viewedImages", JSON.stringify(viewedImages));
            }            
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

function toggleAutoView() {
    const button = document.getElementById("autoViewBtn");
    const intervalInput = document.getElementById("intervalInput");

    if (!autoViewActive) {
        const interval = parseInt(intervalInput.value) * 1000 || 5000; // Default to 5 seconds
        autoViewInterval = setInterval(loadRandomImage, interval);
        button.textContent = "Auto View On";
    } else {
        clearInterval(autoViewInterval);
        button.textContent = "Auto View Off";
    }
    autoViewActive = !autoViewActive;
}
