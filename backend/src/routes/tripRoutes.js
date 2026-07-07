const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const tripSchema = require("../validators/tripValidator");

const {
  generateTrip,
  getAllTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  regenerateDay,
} = require("../controllers/tripController");

router.post("/generate", authMiddleware, validate(tripSchema), generateTrip);

router.get("/", authMiddleware, getAllTrips);

router.get("/:id", authMiddleware, getTripById);

router.put("/:id", authMiddleware, updateTrip);

router.delete("/:id", authMiddleware, deleteTrip);

router.post("/:id/regenerate-day", authMiddleware, regenerateDay);

module.exports = router;
