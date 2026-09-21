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
router.get("/:id/announcements", authMiddleware, campusController.getAnnouncements);
router.get("/:id/announcements/:annId", authMiddleware, campusController.getAnnouncementById);
router.post("/:id/announcements", authMiddleware, campusController.addAnnouncement);
router.put("/:id/announcements/:annId", authMiddleware, campusController.updateAnnouncement);
router.patch("/:id/announcements/:annId", authMiddleware, campusController.updateAnnouncement);
router.delete("/:id/announcements/:annId", authMiddleware, campusController.deleteAnnouncement);
router.patch("/:id/student-access", authMiddleware, campusController.updateStudentAccess);

// Participant actions
router.post("/join", authMiddleware, campusController.joinCampusTrip);
router.put("/:id/participant/registration", authMiddleware, campusController.submitRegistration);
router.post("/:id/participant/documents", authMiddleware, upload.single('file'), campusController.uploadDocument);
router.get("/:id/participant/documents/:docId/preview", authMiddleware, campusController.previewDocument);
router.post("/:id/participant/payments/:installmentId", authMiddleware, campusController.processPayment);
router.post("/:id/participant/payment/create-order", authMiddleware, campusController.createPaymentOrder);
router.post("/:id/participant/payment/verify", authMiddleware, campusController.verifyPayment);

// Coordinator actions for participants
router.get("/:id/participants", authMiddleware, campusController.getParticipants);
router.get("/:id/participants/:regId/documents/:docId/preview", authMiddleware, campusController.previewDocument);
router.patch("/:id/participants/:regId/documents/:docId/status", authMiddleware, campusController.updateDocumentStatus);
router.post("/:id/registrations/:regId/approve", authMiddleware, campusController.approveRegistration);
router.post("/:id/registrations/:regId/reject", authMiddleware, campusController.rejectRegistration);
router.post("/:id/registrations/:regId/message", authMiddleware, campusController.updateCoordinatorMessage);

module.exports = router;
