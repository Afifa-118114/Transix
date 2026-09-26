const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  prebookHotel,
  confirmHotelBooking,
  getHotelBooking,
  getTripHotelBookings,
  cancelHotelBooking
} = require('../controllers/hotelBookingController');

// All routes require authentication
router.use(authMiddleware);

// Step 1: Lock rate + create Razorpay order
// POST /api/hotels/prebook
router.post('/prebook', prebookHotel);

// Step 2: Verify Razorpay payment + confirm hotel booking with LiteAPI
// POST /api/hotels/book
router.post('/book', confirmHotelBooking);

// Get live booking status + voucher URL
// GET /api/hotels/booking/:bookingId
router.get('/booking/:bookingId', getHotelBooking);

// Get all hotel bookings for a trip (from DB)
// GET /api/hotels/trip/:tripId
router.get('/trip/:tripId', getTripHotelBookings);

// Cancel a booking
// PUT /api/hotels/booking/:bookingId/cancel
router.put('/booking/:bookingId/cancel', cancelHotelBooking);

module.exports = router;
