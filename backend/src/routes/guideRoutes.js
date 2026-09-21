const express = require("express");
const router = express.Router();
const { guideUpload } = require("../middleware/uploadMiddleware");
const guideController = require("../controllers/guideController");

// Upload single document to Cloudinary with validation & preview metadata
router.post("/upload-document", guideUpload.single("file"), guideController.uploadDocument);

// Stream secure document preview for PDF & images
router.get("/documents/preview", guideController.previewDocument);

// Submit guide application
router.post("/apply", guideController.applyGuide);

// Get application verification status & timeline
router.get("/status/:id", guideController.getGuideStatus);

module.exports = router;
