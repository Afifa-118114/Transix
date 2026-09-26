const express = require("express");
const router = express.Router();
const { vendorAuthMiddleware } = require("../middleware/vendorAuthMiddleware");
const {
  loginVendor,
  getVendorMe,
  searchConnectedVendors,
  getVendorsWithActiveRequests,
} = require("../controllers/vendorAuthController");
const {
  getVendorPortalRequests,
  getVendorRequestDetails,
  rejectVendorRequest,
  acceptVendorRequest,
  submitVendorResponse,
  confirmVendorRequest,
  getVendorRequestMessages,
  sendVendorRequestMessage,
} = require("../controllers/vendorController");

// Public / Vendor Auth & Search
router.post("/auth/login", loginVendor);
router.get("/search", searchConnectedVendors);
router.get("/active-vendors", getVendorsWithActiveRequests);

// Protected routes (require valid vendor JWT token)
router.use(vendorAuthMiddleware);

router.get("/me", getVendorMe);
router.get("/requests", getVendorPortalRequests);
router.get("/requests/:requestId", getVendorRequestDetails);
router.post("/requests/:requestId/accept", acceptVendorRequest);
router.post("/requests/:requestId/reject", rejectVendorRequest);
router.post("/requests/:requestId/response", submitVendorResponse);
router.post("/requests/:requestId/confirm", confirmVendorRequest);
router.get("/requests/:requestId/messages", getVendorRequestMessages);
router.post("/requests/:requestId/messages", sendVendorRequestMessage);

module.exports = router;
