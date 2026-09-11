const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const tripSchema = require("../validators/tripValidator");

const {
  generateTrip,
  getAllTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  regenerateDay,
  smartshiftSuggest,
  smartshiftApply,
  getTripBookings,
  updateOperatorAccess,
} = require("../controllers/tripController");

router.post("/generate", authMiddleware, validate(tripSchema), generateTrip);

router.get("/", authMiddleware, getAllTrips);

router.get("/:id", authMiddleware, getTripById);

router.put("/:id", authMiddleware, updateTrip);

router.patch("/:id/operator-access", authMiddleware, updateOperatorAccess);

router.delete("/:id", authMiddleware, deleteTrip);

router.post("/:id/regenerate-day", authMiddleware, regenerateDay);

router.post("/:id/smartshift/suggest", authMiddleware, smartshiftSuggest);

router.post("/:id/smartshift/apply", authMiddleware, smartshiftApply);
router.get("/:id/bookings", authMiddleware, getTripBookings);

module.exports = router;
