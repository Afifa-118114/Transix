const express = require("express");
const router = express.Router();
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");
const {
  getDashboardStats,
  getOperatorTrips,
  getOperatorTripDetails,
  claimOperatorTrip,
  releaseOperatorTrip,
  getTripMessages,
  sendTripMessage,
  getUnreadMessageCount,
  markMessagesRead,
  updateBookingStatus,
  updateTripOperationalStatus,
  getFleetVendorsForTrip,
  sendFleetVendorRequests,
  getTripFleetVendorRequests,
  selectFleetVendor,
  requestFleetVendorConfirmation,
  getAllVendorsDirectory,
  getOperatorVendorRequestMessages,
  sendOperatorVendorRequestMessage,
  getOperatorBookings,
  getOperatorAllVendorRequests,
  getOperatorConversations,
} = require("../controllers/operatorController");

const {
  getOperatorProfile,
  updateOperatorProfile,
} = require("../controllers/authController");

router.use(authMiddleware);
router.use(authorizeRoles("operator", "admin"));

// Profile management
router.get("/profile", getOperatorProfile);
router.put("/profile", updateOperatorProfile);

router.get("/dashboard", getDashboardStats);
router.get("/trips", getOperatorTrips);
router.get("/trips/:tripId", getOperatorTripDetails);
router.post("/trips/:tripId/claim", claimOperatorTrip);
router.post("/trips/:tripId/release", releaseOperatorTrip);
router.get("/trips/:tripId/messages", getTripMessages);
router.post("/trips/:tripId/messages", sendTripMessage);
router.get("/trips/:tripId/messages/unread", getUnreadMessageCount);
router.patch("/trips/:tripId/messages/read", markMessagesRead);
router.patch("/trips/:tripId/status", updateTripOperationalStatus);
router.get("/bookings", getOperatorBookings);
router.patch("/bookings/:bookingId/status", updateBookingStatus);
router.get("/all-vendor-requests", getOperatorAllVendorRequests);
router.get("/conversations", getOperatorConversations);


// Fleet Vendor Management Routes
router.get("/vendors", getAllVendorsDirectory);
router.get("/trips/:tripId/fleet-vendors", getFleetVendorsForTrip);
router.post("/trips/:tripId/fleet-vendor-requests", sendFleetVendorRequests);
router.get("/trips/:tripId/fleet-vendor-requests", getTripFleetVendorRequests);
router.post("/trips/:tripId/fleet-vendor-selection", selectFleetVendor);
router.post("/trips/:tripId/fleet-vendor-confirmation-request", requestFleetVendorConfirmation);
router.get("/vendor-requests/:requestId/messages", getOperatorVendorRequestMessages);
router.post("/vendor-requests/:requestId/messages", sendOperatorVendorRequestMessage);

module.exports = router;
