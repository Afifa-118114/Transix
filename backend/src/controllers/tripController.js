const Trip = require("../models/Trip");
const AppError = require("../utils/AppError");
const asyncHandler = require("../middleware/asyncHandler");
const { regenerateTripDay } = require("../services/aiService");

const generateTrip = asyncHandler(async (req, res) => {
  const {
    source,
    destination,
    startDate,
    endDate,
    travelers,
    budget,
    currency,
    travelMode,
    hotelType,
    foodPreference,
    tripType,
    interests,
    priority,
    purpose,
  } = req.body;

  const newTrip = await Trip.create({
    user: req.user.id,
    source,
    destination,
    startDate,
    endDate,
    travelers,
    budget,
    currency,
    travelMode,
    hotelType,
    foodPreference,
    tripType,
    interests,
    priority,
    purpose,
  });

  res.status(201).json({
    success: true,
    message: "Trip created successfully",
    trip: newTrip,
  });
});

const getAllTrips = asyncHandler(async (req, res) => {
  const trips = await Trip.find({
    user: req.user.id,
  });

  res.status(200).json({
    success: true,
    count: trips.length,
    trips,
  });
});

const getTripById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const trip = await Trip.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!trip) {
    throw new AppError("Trip not found", 404);
  }

  res.status(200).json({
    success: true,
    trip,
  });
});

const updateTrip = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const updatedTrip = await Trip.findOneAndUpdate(
    {
      _id: id,
      user: req.user.id,
    },
    req.body,
    {
      new: true,
      runValidators: true,
    },
  );

  if (!updatedTrip) {
    throw new AppError("Trip not found", 404);
  }

  res.status(200).json({
    success: true,
    message: "Trip updated successfully",
    trip: updatedTrip,
  });
});

const deleteTrip = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const deletedTrip = await Trip.findOneAndDelete({
    _id: id,
    user: req.user.id,
  });

  if (!deletedTrip) {
    throw new AppError("Trip not found", 404);
  }

  res.status(200).json({
    success: true,
    message: "Trip deleted successfully",
    deletedTrip,
  });
});

const regenerateDay = asyncHandler(async (req, res) => {
  const { day } = req.body;

  const trip = await Trip.findById(req.params.id);

  if (!trip)
    return res.status(404).json({
      success: false,
      message: "Trip not found",
    });

  const newDay = await regenerateTripDay(trip, day);

  trip.itinerary[day - 1] = newDay;

  await trip.save();

  res.json({
    success: true,
    day: newDay,
  });
});

module.exports = {
  generateTrip,
  getAllTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  regenerateDay,
};
