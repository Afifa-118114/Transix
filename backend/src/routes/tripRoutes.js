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
  finalizeTrip,
  syncItinerary,
} = require("../controllers/tripController");

const {
  getTripMessages,
  sendTripMessage,
  getUnreadMessageCount,
  markMessagesRead,
} = require("../controllers/operatorController");

router.post("/generate", authMiddleware, validate(tripSchema), generateTrip);

router.get("/", authMiddleware, getAllTrips);

router.get("/:id", authMiddleware, getTripById);

router.put("/:id", authMiddleware, updateTrip);

router.post("/:id/finalize", authMiddleware, finalizeTrip);

router.patch("/:id/operator-access", authMiddleware, updateOperatorAccess);

router.delete("/:id", authMiddleware, deleteTrip);

router.post("/:id/regenerate-day", authMiddleware, regenerateDay);

router.post("/:id/sync-itinerary", authMiddleware, syncItinerary);

router.post("/:id/smartshift/suggest", authMiddleware, smartshiftSuggest);

router.post("/:id/smartshift/apply", authMiddleware, smartshiftApply);
router.get("/:id/bookings", authMiddleware, getTripBookings);

// 1-to-1 Trip Chat between Operator and Trip Owner/Coordinator
router.get("/:id/messages", authMiddleware, getTripMessages);
router.post("/:id/messages", authMiddleware, sendTripMessage);
router.get("/:id/messages/unread", authMiddleware, getUnreadMessageCount);
router.patch("/:id/messages/read", authMiddleware, markMessagesRead);

module.exports = router;
