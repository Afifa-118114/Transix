const express = require("express");
const router = express.Router();
const multer = require("multer");

const { authMiddleware } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const tripSchema = require("../validators/tripValidator");

const jwt = require("jsonwebtoken");
const {
  generateAITrip,
  generateAssistantChat,
  transcribeAssistantAudio,
  generateAssistantSpeech,
} = require("../controllers/aiController");

const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    }
  } catch (_) {}
  next();
};

const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
}).single("audio");

const handleAudioUpload = (req, res, next) => {
  uploadAudio(req, res, (uploadError) => {
    if (!uploadError) return next();
    const error = new Error(uploadError.code === "LIMIT_FILE_SIZE"
      ? "Recording is too large. Please record a shorter voice message."
      : "Could not read the audio recording. Please try again.");
    error.statusCode = uploadError.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return next(error);
  });
};

router.post(
  "/generate-trip",
  authMiddleware,
  validate(tripSchema),
  generateAITrip,
);

router.post("/assist", optionalAuth, generateAssistantChat);
router.post("/transcribe", optionalAuth, handleAudioUpload, transcribeAssistantAudio);
router.post("/speak", optionalAuth, generateAssistantSpeech);

module.exports = router;
