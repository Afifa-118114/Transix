const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const campusController = require("../controllers/campusController");
const { upload } = require("../middleware/uploadMiddleware");

// Organizer actions
router.post("/", authMiddleware, campusController.createCampusTrip);
router.get("/", authMiddleware, campusController.getMyCampusTrips);
router.get("/:id", authMiddleware, campusController.getCampusTripById);
router.post("/:id/finalize", authMiddleware, campusController.finalizeCampusTrip);
router.put("/:id/registration-config", authMiddleware, campusController.updateRegistrationConfig);
router.put("/:id/inclusions", authMiddleware, campusController.updateCampusConfig);

// Announcements and access
router.post("/:id/announcements", authMiddleware, campusController.addAnnouncement);
router.patch("/:id/announcements/:annId", authMiddleware, campusController.toggleAnnouncement);
router.patch("/:id/student-access", authMiddleware, campusController.updateStudentAccess);

// Participant actions
router.post("/join", authMiddleware, campusController.joinCampusTrip);
router.put("/:id/participant/registration", authMiddleware, campusController.submitRegistration);
router.post("/:id/participant/documents", authMiddleware, upload.single('file'), campusController.uploadDocument);
router.get("/:id/participant/documents/:docId/preview", authMiddleware, campusController.previewDocument);
router.post("/:id/participant/payments/:installmentId", authMiddleware, campusController.processPayment);

// Coordinator actions for participants
router.get("/:id/participants", authMiddleware, campusController.getParticipants);
router.patch("/:id/participants/:regId/documents/:docId/status", authMiddleware, campusController.updateDocumentStatus);

module.exports = router;
