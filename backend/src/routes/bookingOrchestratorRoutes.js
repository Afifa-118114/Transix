const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  prebookTour,
  confirmTourBooking,
  getTourBookingStatus,
  operatorAutoBookTour
} = require('../controllers/bookingOrchestratorController');

// All orchestrator routes require authentication
router.use(authMiddleware);

// Step 1: Lock rates across Hotel + Transport & create unified Razorpay Order
// POST /api/bookings/orchestrator/prebook
router.post('/prebook', prebookTour);

// Step 2: Verify Razorpay payment & execute automated multi-service bookings
// POST /api/bookings/orchestrator/confirm
router.post('/confirm', confirmTourBooking);

// Step 3: Get Master Booking Status & Passes
// GET /api/bookings/orchestrator/trip/:tripId
router.get('/trip/:tripId', getTourBookingStatus);

// Step 4: Operator One-Click Automated Booking
// POST /api/bookings/orchestrator/operator-auto-book
router.post('/operator-auto-book', operatorAutoBookTour);

module.exports = router;
