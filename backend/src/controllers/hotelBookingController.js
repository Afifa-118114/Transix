const Razorpay = require('razorpay');
const crypto = require('crypto');
const BookingRequirement = require('../models/BookingRequirement');
const Trip = require('../models/Trip');
const {
  prebookRoom,
  bookRoom,
  getBookingDetails,
  cancelBooking
} = require('../services/nuiteeService');

// ─── Razorpay Client ──────────────────────────────────────────────────────────
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: Prebook — lock the rate, create Razorpay order
// POST /api/hotels/prebook
// Body: { tripId, staySegmentId, offerId, hotelName, roomType, totalAmount, currency, guest }
// ─────────────────────────────────────────────────────────────────────────────
exports.prebookHotel = async (req, res) => {
  try {
    const { tripId, staySegmentId, offerId, hotelName, roomType, totalAmount, currency, guest } = req.body;
    const userId = req.user._id;

    if (!tripId || !offerId || !totalAmount) {
      return res.status(400).json({ success: false, message: 'tripId, offerId, and totalAmount are required' });
    }

    // 1. Verify the trip belongs to this user
    const trip = await Trip.findOne({ _id: tripId, user: userId });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    // 2. Lock the rate with LiteAPI (prebookId valid for ~15 mins)
    const prebookData = await prebookRoom(offerId);

    // 3. Create a Razorpay order for the hotel amount
    const amountInPaise = Math.round(prebookData.totalAmount || totalAmount) * 100;
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: prebookData.currency || currency || 'INR',
      receipt: `TRX-HTL-${tripId}-${Date.now()}`,
      notes: {
        tripId: String(tripId),
        staySegmentId: staySegmentId || '',
        prebookId: prebookData.prebookId,
        hotelName: hotelName || prebookData.hotelId,
        type: 'HOTEL_BOOKING'
      }
    });

    // 4. Mark BookingRequirement as PROCESSING
    let bookingReq;
    try {
      bookingReq = await BookingRequirement.findOneAndUpdate(
        { tripId, staySegmentId, type: 'ACCOMMODATION' },
        {
          $set: {
            status: 'PROCESSING',
            title: hotelName || roomType || 'Hotel Booking',
            notes: JSON.stringify({
              prebookId: prebookData.prebookId,
              razorpayOrderId: razorpayOrder.id,
              offerId,
              roomType: prebookData.roomType || roomType,
              totalAmount: prebookData.totalAmount || totalAmount,
              currency: prebookData.currency || currency,
              cancellationPolicy: prebookData.cancellationPolicy,
              mealPlan: prebookData.boardName
            })
          }
        },
        { upsert: true, new: true }
      );
    } catch (dbErr) {
      console.error('BookingRequirement upsert error:', dbErr.message);
    }

    return res.status(200).json({
      success: true,
      data: {
        prebookId: prebookData.prebookId,
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        amountInPaise,
        currency: prebookData.currency || 'INR',
        hotelDetails: {
          hotelName: hotelName || prebookData.hotelId,
          roomType: prebookData.roomType || roomType,
          mealPlan: prebookData.boardName,
          totalAmount: prebookData.totalAmount || totalAmount,
          cancellationPolicy: prebookData.cancellationPolicy
        },
        bookingRequirementId: bookingReq?._id
      }
    });
  } catch (error) {
    console.error('Hotel Prebook Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: Confirm Booking — verify Razorpay payment, then book with LiteAPI
// POST /api/hotels/book
// Body: { prebookId, tripId, staySegmentId, guest, razorpayOrderId, razorpayPaymentId, razorpaySignature }
// ─────────────────────────────────────────────────────────────────────────────
exports.confirmHotelBooking = async (req, res) => {
  try {
    const {
      prebookId,
      tripId,
      staySegmentId,
      guest,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    } = req.body;

    if (!prebookId || !guest || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Missing required booking fields' });
    }

    // 1. Verify Razorpay signature (prevents fake payment submissions)
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed — invalid signature' });
    }

    // 2. Idempotency key to prevent double-booking
    const clientReference = `TRX-${tripId}-${staySegmentId || Date.now()}`;

    // 3. Book with LiteAPI
    // Sandbox: ACC_CREDIT_CARD | Production: WALLET (after topping up LiteAPI account)
    const bookingResult = await bookRoom(
      prebookId,
      {
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        phone: guest.phone
      },
      clientReference,
      process.env.NODE_ENV === 'production' ? 'WALLET' : 'ACC_CREDIT_CARD'
    );

    // 4. Persist confirmed booking details
    const confirmedNotes = JSON.stringify({
      liteApiBookingId: bookingResult.bookingId,
      hotelConfirmationCode: bookingResult.hotelConfirmationCode,
      voucherUrl: bookingResult.voucherUrl,
      razorpayOrderId,
      razorpayPaymentId,
      guestEmail: guest.email,
      bookedAt: new Date().toISOString()
    });

    await BookingRequirement.findOneAndUpdate(
      { tripId, staySegmentId, type: 'ACCOMMODATION' },
      {
        $set: {
          status: bookingResult.status === 'CONFIRMED' ? 'CONFIRMED' : 'PROCESSING',
          externalReferenceId: bookingResult.bookingId,
          externalUrl: bookingResult.voucherUrl,
          notes: confirmedNotes,
          vendorName: bookingResult.hotelName
        }
      },
      { upsert: true }
    );

    return res.status(200).json({
      success: true,
      data: {
        bookingId: bookingResult.bookingId,
        status: bookingResult.status,
        hotelName: bookingResult.hotelName,
        hotelConfirmationCode: bookingResult.hotelConfirmationCode,
        checkIn: bookingResult.checkIn,
        checkOut: bookingResult.checkOut,
        totalAmount: bookingResult.totalAmount,
        currency: bookingResult.currency,
        voucherUrl: bookingResult.voucherUrl,
        cancellationInfo: bookingResult.cancellationInfo,
        message: 'Hotel booked and confirmed successfully!'
      }
    });
  } catch (error) {
    if (error.message.startsWith('DUPLICATE_BOOKING')) {
      return res.status(409).json({ success: false, message: 'This hotel was already booked for this trip segment.' });
    }
    console.error('Hotel Confirm Booking Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET: Retrieve live booking status and voucher
// GET /api/hotels/booking/:bookingId
// ─────────────────────────────────────────────────────────────────────────────
exports.getHotelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!bookingId) return res.status(400).json({ success: false, message: 'bookingId required' });

    const details = await getBookingDetails(bookingId);
    return res.status(200).json({ success: true, data: details });
  } catch (error) {
    console.error('Get Hotel Booking Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET: All hotel bookings for a trip (from DB)
// GET /api/hotels/trip/:tripId
// ─────────────────────────────────────────────────────────────────────────────
exports.getTripHotelBookings = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user._id;

    const trip = await Trip.findOne({ _id: tripId, user: userId });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    const hotelBookings = await BookingRequirement.find({ tripId, type: 'ACCOMMODATION' }).lean();

    const enriched = hotelBookings.map(b => {
      let parsedNotes = {};
      try { parsedNotes = JSON.parse(b.notes || '{}'); } catch {}
      return { ...b, bookingDetails: parsedNotes };
    });

    return res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    console.error('Get Trip Hotel Bookings Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Cancel a confirmed booking (before free cancellation deadline)
// PUT /api/hotels/booking/:bookingId/cancel
// Body: { tripId, staySegmentId }
// ─────────────────────────────────────────────────────────────────────────────
exports.cancelHotelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { tripId, staySegmentId } = req.body;

    const result = await cancelBooking(bookingId);

    if (tripId) {
      await BookingRequirement.findOneAndUpdate(
        { tripId, staySegmentId, type: 'ACCOMMODATION' },
        { $set: { status: 'CANCELLED' } }
      );
    }

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Cancel Hotel Booking Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};
