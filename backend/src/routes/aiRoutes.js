const express = require("express");
const router = express.Router();
const multer = require("multer");

const { authMiddleware } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const tripSchema = require("../validators/tripValidator");

const {
  generateAITrip,
  generateAssistantChat,
  transcribeAssistantAudio,
  generateAssistantSpeech,
} = require("../controllers/aiController");

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

router.post("/assist", authMiddleware, generateAssistantChat);
router.post("/transcribe", authMiddleware, handleAudioUpload, transcribeAssistantAudio);
router.post("/speak", authMiddleware, generateAssistantSpeech);

module.exports = router;
