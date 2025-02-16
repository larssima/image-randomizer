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
        const result = parser.parse();

        console.log("Parsed EXIF result:", result.tags); // 👀 Debugging line

        const date = result.tags.DateTimeOriginal || result.tags.CreateDate || "";
        const title = result.tags.ImageDescription || result.tags.UserComment || "";

        const formattedDate = date
        ? new Date(date * 1000).toLocaleString()
        : fallbackDate;

        return { title, date: formattedDate };
    } catch (err) {
        console.error("Metadata extraction failed:", err);
        return { title: "", date: "Unknown" };
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
app.get("/random-image", (req, res) => {
    const imageFiles = getAllImages(imagesDir);
    if (imageFiles.length === 0) {
        return res.status(404).send("No images found");
    }

    const randomImage = imageFiles[Math.floor(Math.random() * imageFiles.length)];
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

// Update metadata endpoint
app.post("/update-metadata", async (req, res) => {
    const { filePath, newTitle } = req.body;

    try {
        await exiftool.write(filePath, { ImageDescription: newTitle });
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
