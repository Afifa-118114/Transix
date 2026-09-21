const express = require("express");
const router = express.Router();

const {
  getMatchedGuides,
  createGuideRequest,
  getTripGuideRequests,
  selectGuideForTrip,
  finalizeTripGuides,
  searchGuides,
} = require("../controllers/guideController");

const {
  loginGuide,
  getGuideMe,
  getGuidePortalRequests,
  getGuideRequestDetails,
  respondToGuideRequest,
} = require("../controllers/guideAuthController");

const { guideAuthMiddleware, optionalGuideAuth } = require("../middleware/guideAuthMiddleware");

// --- Guide Matching & Operator Trip Workflow ---
router.get("/match/:tripId", getMatchedGuides);
router.post("/requests", createGuideRequest);
router.get("/requests/trip/:tripId", getTripGuideRequests);
router.post("/select", selectGuideForTrip);
router.post("/finalize", finalizeTripGuides);

// --- Guide Search (100 Profiles) ---
router.get("/search", searchGuides);

// --- Guide Authentication & Portal ---
router.post("/auth/login", loginGuide);
router.get("/auth/me", guideAuthMiddleware, getGuideMe);
router.get("/portal/requests", optionalGuideAuth, getGuidePortalRequests);
router.get("/portal/requests/:requestId", guideAuthMiddleware, getGuideRequestDetails);
router.post("/portal/respond/:requestId", guideAuthMiddleware, respondToGuideRequest);

module.exports = router;
