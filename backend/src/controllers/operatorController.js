const asyncHandler = require("../middleware/asyncHandler");
const Trip = require("../models/Trip");
const BookingRequirement = require("../models/BookingRequirement");
const AppError = require("../utils/AppError");

const getDashboardStats = asyncHandler(async (req, res) => {
  const operatorQuery = { "operatorAccess.enabled": true, status: "Finalized" };
  const [activeTrips, upcomingTrips, trips] = await Promise.all([
    Trip.countDocuments(operatorQuery),
    Trip.countDocuments({ ...operatorQuery, startDate: { $gt: new Date() } }),
    Trip.find(operatorQuery).select("_id"),
  ]);

  const tripIds = trips.map(t => t._id);

  const [bookingsPending, actionRequired, confirmed] = await Promise.all([
    BookingRequirement.countDocuments({ tripId: { $in: tripIds }, status: { $in: ["NOT_BOOKED", "PROCESSING"] } }),
    BookingRequirement.countDocuments({ tripId: { $in: tripIds }, status: "ACTION_REQUIRED" }),
    BookingRequirement.countDocuments({ tripId: { $in: tripIds }, status: "CONFIRMED" }),
  ]);

  res.status(200).json({
    success: true,
    stats: {
      activeTrips,
      upcomingTrips,
      bookingsPending,
      actionRequired,
      confirmed,
    },
  });
});

const getOperatorTrips = asyncHandler(async (req, res) => {
  const trips = await Trip.find({ "operatorAccess.enabled": true, status: "Finalized" }).populate("user", "name email");

  // Fetch booking requirements per trip to compute progress
  const tripsWithBookings = await Promise.all(
    trips.map(async (trip) => {
      const bookings = await BookingRequirement.find({ tripId: trip._id });
      const confirmed = bookings.filter((b) => b.status === "CONFIRMED").length;
      const actionReq = bookings.filter((b) => b.status === "ACTION_REQUIRED").length;
      
      return {
        ...trip.toObject(),
        bookingProgress: {
          total: bookings.length,
          confirmed,
          actionRequired: actionReq,
        },
      };
    })
  );

  res.status(200).json({
    success: true,
    count: tripsWithBookings.length,
    trips: tripsWithBookings,
  });
});

const getOperatorTripDetails = asyncHandler(async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.tripId, "operatorAccess.enabled": true, status: "Finalized" }).populate("user", "name email");
  if (!trip) throw new AppError("Trip not found or access not granted", 404);

  const bookings = await BookingRequirement.find({ tripId: trip._id });

  res.status(200).json({
    success: true,
    trip,
    bookings,
  });
});

const updateBookingStatus = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { status, notes, externalReferenceId } = req.body;

  const validTransitions = {
    NOT_BOOKED: ["PROCESSING"],
    PROCESSING: ["ACTION_REQUIRED", "CONFIRMED", "CANCELLED"],
    ACTION_REQUIRED: ["PROCESSING", "CONFIRMED", "CANCELLED"],
    CONFIRMED: [],
    CANCELLED: [],
  };

  const booking = await BookingRequirement.findById(bookingId);
  if (!booking) throw new AppError("Booking requirement not found", 404);

  if (status && booking.status !== status) {
    if (!validTransitions[booking.status].includes(status)) {
      throw new AppError(`Invalid status transition from ${booking.status} to ${status}`, 400);
    }
    booking.status = status;
    booking.statusHistory.push({
      status,
      operatorId: req.user.id,
      timestamp: new Date(),
    });
  }

  if (notes !== undefined) booking.notes = notes;
  if (externalReferenceId !== undefined) booking.externalReferenceId = externalReferenceId;

  await booking.save();

  res.status(200).json({
    success: true,
    message: "Booking status updated successfully",
    booking,
  });
});

const updateTripOperationalStatus = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const { status } = req.body;

  const trip = await Trip.findOne({ _id: tripId, "operatorAccess.enabled": true, status: "Finalized" });
  if (!trip) throw new AppError("Trip not found or access not granted", 404);

  if (status) {
    trip.status = status;
    await trip.save();
  }

  res.status(200).json({
    success: true,
    message: "Trip status updated successfully",
    trip,
  });
});

module.exports = {
  getDashboardStats,
  getOperatorTrips,
  getOperatorTripDetails,
  updateBookingStatus,
  updateTripOperationalStatus,
};
