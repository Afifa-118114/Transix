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

const {
  uploadDocument,
  previewDocument,
  submitGuideApplication,
  getGuideApplicationStatus,
} = require("../controllers/guideApplicationController");

const { guideAuthMiddleware, optionalGuideAuth } = require("../middleware/guideAuthMiddleware");
const { guidePdfUpload } = require("../middleware/uploadMiddleware");

// --- Guide Document Upload & Verification ---
const handleGuideUpload = (req, res, next) => {
  guidePdfUpload.single("file")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File size exceeds 10MB limit. Please upload a smaller document.",
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to upload document.",
      });
    }
    next();
  });
};

router.post("/upload-document", handleGuideUpload, uploadDocument);
router.post("/documents/upload", handleGuideUpload, uploadDocument);
router.get("/documents/preview", previewDocument);

// --- Guide Registration & Status ---
router.post("/apply", submitGuideApplication);
router.get("/status/:id", getGuideApplicationStatus);

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
