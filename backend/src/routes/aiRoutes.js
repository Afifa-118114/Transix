const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const tripSchema = require("../validators/tripValidator");

const { generateAITrip } = require("../controllers/aiController");

router.post(
  "/generate-trip",
  authMiddleware,
  validate(tripSchema),
  generateAITrip,
);

module.exports = router;
