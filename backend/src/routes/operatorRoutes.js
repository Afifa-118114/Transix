const express = require("express");
const router = express.Router();
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");
const {
  getDashboardStats,
  getOperatorTrips,
  getOperatorTripDetails,
  updateBookingStatus,
  updateTripOperationalStatus,
} = require("../controllers/operatorController");

router.use(authMiddleware);
router.use(authorizeRoles("operator", "admin"));

router.get("/dashboard", getDashboardStats);
router.get("/trips", getOperatorTrips);
router.get("/trips/:tripId", getOperatorTripDetails);
router.patch("/trips/:tripId/status", updateTripOperationalStatus);
router.patch("/bookings/:bookingId/status", updateBookingStatus);

module.exports = router;
