const { exiftool } = require("exiftool-vendored");
const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const exifParser = require("exif-parser");


const app = express();
const PORT = 3000;

const config = require("./config.json");
const imagesDir = path.resolve(config.imageFolder);

app.use(express.static("public"));
app.use(express.json());

// Configure multer for uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, imagesDir),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

// Helper to read image metadata
function getImageMetadata(filePath) {
    try {
        const stat = fs.statSync(filePath);
        const fallbackDate = stat.birthtime ? stat.birthtime.toLocaleString() : "Unknown date";        
        const buffer = fs.readFileSync(filePath);
        const parser = exifParser.create(buffer);
        let result = {};

        try {
            result = parser.parse(); // Attempt to parse EXIF data
        } catch (err) {
            console.error(`EXIF parsing failed for file: ${filePath} - Error: ${err.message}`);
            // Handle invalid EXIF data by returning default metadata
            return { title: "", date: fallbackDate };
        }

        const date = result.tags?.DateTimeOriginal || result.tags?.CreateDate || "";
        const title = result.tags?.ImageDescription || result.tags?.UserComment || "";

        const formattedDate = date
        ? new Date(date * 1000).toLocaleString()
        : fallbackDate;

        return { title, date: formattedDate };
    } catch (err) {
        console.error(`Metadata extraction failed for file: ${filePath} - Error: ${err.message}`);
        return { title: "", date: "Unknown" }; // Return default values on error
    }
}



// Recursively get all images
function getAllImages(directory) {
    let images = [];
    const files = fs.readdirSync(directory);
    for (const file of files) {
        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            images = images.concat(getAllImages(fullPath));
        } else if (/\.(jpg|jpeg|png|gif)$/i.test(file)) {
            const title = getImageMetadata(fullPath);
            images.push({ path: fullPath, title });
        }
    }
    return images;
}

// Get a random image
// Get a random image
// app.get("/random-image", (req, res) => {
//     const imageFiles = getAllImages(imagesDir);
//     if (imageFiles.length === 0) {
//         return res.status(404).send("No images found");
//     }

//     const randomImage = imageFiles[Math.floor(Math.random() * imageFiles.length)];
//     const metadata = getImageMetadata(randomImage.path);

//     res.json({
//         imageUrl: `/image-file?path=${encodeURIComponent(randomImage.path)}`,
//         title: metadata.title || "",
//         date: metadata.date || "Unknown date",
//         filePath: randomImage.path
//     });
// });

app.post("/random-image", (req, res) => {
    const viewedImages = req.body.viewedImages || [];
    console.log("Received viewed images:", viewedImages); // Debug log

    let imageFiles = getAllImages(imagesDir);
    console.log("Total images available:", imageFiles.length); // Debug log

    // Filtrera bort bilder som redan visats
    const availableImages = imageFiles.filter(img => !viewedImages.includes(img.path));
    
    console.log("Available images after filtering:", availableImages.length); // Debug log
    if (availableImages.length === 0) {
        console.log("All images have been viewed. Resetting list.");
        //availableImages.push(...imageFiles);
        res.json({ reset: true });
        return
    }

    const randomImage = availableImages[Math.floor(Math.random() * availableImages.length)];
    const metadata = getImageMetadata(randomImage.path);

    res.json({
        imageUrl: `/image-file?path=${encodeURIComponent(randomImage.path)}`,
        title: metadata.title || "",
        date: metadata.date || "Unknown date",
        filePath: randomImage.path
    });
});


// Serve images securely
app.get("/image-file", (req, res) => {
    const imagePath = req.query.path;
    if (!imagePath.startsWith(imagesDir)) {
        return res.status(403).send("Access denied");
    }
    res.sendFile(imagePath);
});

app.get("/edit", (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Update metadata endpoint
app.post("/update-metadata", async (req, res) => {
    const { filePath, newTitle } = req.body;

    try {
        // Write the new metadata with exiftool (this may create a backup)
        await exiftool.write(filePath, { ImageDescription: newTitle }, { overwrite_original: true });

        // Check for backup file and delete it
        const backupFilePath = filePath + "_original"; // Check for the file with _original suffix
        if (fs.existsSync(backupFilePath)) {
            fs.unlinkSync(backupFilePath); // Delete the backup file
        }

        res.status(200).send("Metadata updated successfully!");
    } catch (error) {
        console.error("Failed to update metadata:", error);
        res.status(500).send("Failed to update metadata.");
    }
});


// Upload images
app.post("/upload-image", upload.single("image"), (req, res) => {
    if (req.file) {
        console.log(`Uploaded: ${req.file.filename}`);
        res.status(200).send("Image uploaded successfully!");
    } else {
        res.status(400).send("Failed to upload image.");
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
