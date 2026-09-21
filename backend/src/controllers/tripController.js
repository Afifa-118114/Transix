const Trip = require("../models/Trip");
const BookingRequirement = require("../models/BookingRequirement");
const AppError = require("../utils/AppError");
const asyncHandler = require("../middleware/asyncHandler");
const { regenerateTripDay } = require("../services/aiService");
const { generateAlternatives, applyAlternative } = require("../services/smartshiftService");
const crypto = require("crypto");

// Helper to repair missing IDs
const repairTripIds = async (trip) => {
  let modified = false;
  if (Array.isArray(trip.itinerary)) {
    trip.itinerary.forEach(day => {
      if (Array.isArray(day.plan)) {
        day.plan.forEach(p => {
          if (!p.id && !p._id) {
            p.id = `itin_${crypto.randomUUID()}`;
            modified = true;
          }
        });
      }
    });
  }
  if (modified) {
    trip.markModified("itinerary");
    await trip.save();
  }
  return trip;
};

// Helper to automatically sync booking requirements based on trip changes
const syncBookingRequirements = async (trip) => {
  if (trip.status === "Draft") return; // Do not generate requirements while still drafting
  
  // 1. Accommodation requirements from staySegments
  if (Array.isArray(trip.staySegments)) {
    for (const stay of trip.staySegments) {
      if (stay.selectedHotel) {
        // Idempotent upsert
        await BookingRequirement.findOneAndUpdate(
          { tripId: trip._id, staySegmentId: stay.id, type: "ACCOMMODATION" },
          {
            travelerId: trip.user,
            title: stay.selectedHotel.name || stay.selectedHotel.hotelName || "Accommodation",
            location: stay.location,
            vendorName: stay.selectedHotel.brand || "Independent",
            externalUrl: stay.selectedHotel.url || stay.selectedHotel.bookingUrl || "",
          },
          { upsert: true, setDefaultsOnInsert: true }
        );
      }
    }
  }

  // 2. Road / Fleet Transport Booking Requirements (ONE Fleet or Vehicle Arrangement per trip)
  const { detectBusRequirements, resolveLocalTransportArrangement } = require("../utils/busRequirementDetector");
  const travelerId = trip.user || trip.coordinatorId;
  const isCampus = trip.tripCategory === "CAMPUS";

  if (isCampus) {
    // Campus Trip: Sync exactly ONE Group Fleet Booking Requirement
    const campusPlan = trip.campusTransportPlan || (trip.campusConfig?.groupTransportPlan ? trip.campusConfig.groupTransportPlan : null);
    if (campusPlan) {
      await BookingRequirement.findOneAndUpdate(
        { tripId: trip._id, itemId: "campus-group-fleet", type: "TRANSPORT" },
        {
          $setOnInsert: {
            travelerId,
            status: campusPlan.status || "PENDING",
          },
          $set: {
            title: `Campus Fleet: ${campusPlan.vehiclesRequired}x ${campusPlan.comfort} ${campusPlan.vehicleType} (${campusPlan.totalTravelers} Travelers)`,
            location: `${trip.source} → ${trip.destination} (Tour Fleet)`,
            vendorName: "Pending Fleet Vendor Assignment",
            notes: `${campusPlan.vehiclesRequired} vehicles required (${campusPlan.capacityPerVehicle} seats/coach) for ${campusPlan.totalTravelers} travelers (${campusPlan.studentsCount} students + ${campusPlan.teachersStaffCount} staff). Luggage: ${campusPlan.luggageCount} bags.${campusPlan.notes ? ` Notes: ${campusPlan.notes}` : ""}`,
            transportDetails: {
              mode: "BUS",
              requirementType: "GROUP_TRANSPORT",
              arrangement: "GROUP_FLEET",
              travelers: campusPlan.totalTravelers,
              groupTransportPlan: campusPlan,
              preferences: {
                vehicleType: campusPlan.vehicleType,
                comfort: campusPlan.comfort,
                capacityPerVehicle: campusPlan.capacityPerVehicle,
                vehiclesRequired: campusPlan.vehiclesRequired,
                studentsCount: campusPlan.studentsCount,
                teachersStaffCount: campusPlan.teachersStaffCount,
                seatCount: campusPlan.totalTravelers,
                luggageCount: campusPlan.luggageCount,
                notes: campusPlan.notes,
              },
            },
          },
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }
    // Prune movement-level requirements for Campus trip
    await BookingRequirement.deleteMany({
      tripId: trip._id,
      type: "TRANSPORT",
      itemId: { $ne: "campus-group-fleet" },
    });
  } else {
    // Personal Trip: Sync ONE Private Vehicle arrangement OR delete if Traveler Managed
    const arrangement = resolveLocalTransportArrangement(trip);
    if (arrangement?.isTransixCoordinated) {
      const prefs = arrangement.preferences || {};
      const vehicleLabel = prefs.vehicleType || (arrangement.isPrivateMinibus ? "Private Mini Bus" : "Private Car");
      await BookingRequirement.findOneAndUpdate(
        { tripId: trip._id, itemId: "personal-private-vehicle", type: "TRANSPORT" },
        {
          $setOnInsert: {
            travelerId,
            status: "PENDING",
          },
          $set: {
            title: `${vehicleLabel} (${prefs.comfort || "AC"}) — Entire Trip`,
            location: `${trip.source} → ${trip.destination} (Private Vehicle)`,
            vendorName: "Pending Operator Assignment",
            notes: `Entire trip private vehicle: ${vehicleLabel} (${prefs.comfort || "AC"}). Capacity: ${prefs.seatCount || trip.travelers} seats. Travelers: ${prefs.travelerCount || trip.travelers}. Luggage: ${prefs.luggageCount} bags.${prefs.notes ? ` Notes: ${prefs.notes}` : ""}`,
            transportDetails: {
              mode: "PRIVATE_VEHICLE",
              requirementType: "LOCAL_TRANSPORT",
              arrangement: arrangement.arrangementType,
              travelers: prefs.travelerCount || trip.travelers,
              preferences: prefs,
            },
          },
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
    } else {
      // Traveler managed: no booking requirement created
      await BookingRequirement.deleteOne({
        tripId: trip._id,
        itemId: "personal-private-vehicle",
        type: "TRANSPORT",
      });
    }
    // Prune movement-level requirements for Personal trip
    await BookingRequirement.deleteMany({
      tripId: trip._id,
      type: "TRANSPORT",
      itemId: { $ne: "personal-private-vehicle" },
    });
  }
};

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

  // Repair loaded trips (in background, no await map needed for response speed but we await to ensure integrity)
  for (const t of trips) {
    await repairTripIds(t);
  }

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

  await repairTripIds(trip);

  res.status(200).json({
    success: true,
    trip,
  });
});

const getTripBookings = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const trip = await Trip.findOne({
    _id: id,
    user: req.user.id,
  });

  if (!trip) {
    throw new AppError("Trip not found", 404);
  }

  const bookings = await BookingRequirement.find({ tripId: id });

  res.status(200).json({
    success: true,
    bookings,
  });
});

const updateTrip = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Whitelist only genuine user-editable trip fields
  const allowedUpdates = [
    "itinerary",
    "travelLegs",
    "staySegments",
    "busRequirements",
    "campusTransportPlan",
    "localTransportPreference",
    "campusConfig",
    "budget",
    "travelers",
    "status",
    "summary",
    "budgetBreakdown",
    "tips",
    "operatorAccess",
    "guideRequirement",
  ];

  const updateData = {};
  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      updateData[key] = req.body[key];
    }
  }

  const updatedTrip = await Trip.findOneAndUpdate(
    {
      _id: id,
      $or: [{ user: req.user.id }, { coordinatorId: req.user.id }],
    },
    updateData,
    {
      new: true,
      runValidators: true,
    },
  );

  if (!updatedTrip) {
    throw new AppError("Trip not found", 404);
  }

  // Trigger booking sync if appropriate
  await syncBookingRequirements(updatedTrip);

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

  const dayNum = Number(day);
  if (!Number.isInteger(dayNum) || dayNum < 1) {
    return res.status(400).json({
      success: false,
      message: "Day must be a positive integer",
    });
  }

  const trip = await Trip.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: "Trip not found",
    });
  }

  if (!Array.isArray(trip.itinerary) || dayNum > trip.itinerary.length) {
    return res.status(400).json({
      success: false,
      message: `Day exceeds itinerary length (${trip.itinerary?.length || 0})`,
    });
  }

  const newDay = await regenerateTripDay(trip, dayNum);

  if (!newDay || !newDay.plan || !Array.isArray(newDay.plan) || newDay.plan.length === 0) {
    res.status(400);
    throw new Error("Could not regenerate a valid, non-empty day. Please try again.");
  }

  if (Array.isArray(newDay.plan)) {
    newDay.plan.forEach(p => {
      if (!p.id && !p._id) {
        p.id = `itin_${crypto.randomUUID()}`;
      }
    });
  }

  trip.itinerary[dayNum - 1] = newDay;
  trip.markModified("itinerary");

  await trip.save();

  res.json({
    success: true,
    day: newDay,
  });
});

const syncItinerary = asyncHandler(async (req, res) => {
  const { newStaySegments } = req.body;
  if (!newStaySegments || !Array.isArray(newStaySegments)) {
    return res.status(400).json({ success: false, message: "newStaySegments is required and must be an array" });
  }

  const trip = await Trip.findOne({
    _id: req.params.id,
    $or: [{ user: req.user.id }, { coordinatorId: req.user.id }],
  });

  if (!trip) {
    return res.status(404).json({ success: false, message: "Trip not found" });
  }

  const { syncItineraryWithStayPlan } = require("../services/aiService");
  const updatedTrip = await syncItineraryWithStayPlan(trip, newStaySegments);

  // Sync booking requirements for any updated hotels
  await syncBookingRequirements(updatedTrip);

  res.json({
    success: true,
    trip: updatedTrip,
  });
});

const smartshiftSuggest = asyncHandler(async (req, res) => {
  const { itemId } = req.body;
  if (!itemId) {
    return res.status(400).json({ success: false, message: "itemId is required" });
  }

  const trip = await Trip.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!trip) {
    return res.status(404).json({ success: false, message: "Trip not found" });
  }

  try {
    const result = generateAlternatives(trip, itemId);
    res.status(200).json({
      success: true,
      tripId: trip._id,
      affectedItem: result.affectedItem,
      alternatives: result.alternatives
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

const smartshiftApply = asyncHandler(async (req, res) => {
  const { alternative, itemId } = req.body;
  
  if (!alternative || !itemId) {
    return res.status(400).json({ success: false, message: "alternative and itemId are required" });
  }

  const trip = await Trip.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!trip) {
    return res.status(404).json({ success: false, message: "Trip not found" });
  }

  try {
    const updatedTripData = applyAlternative(trip, itemId, alternative);
    
    trip.itinerary = updatedTripData.itinerary;
    trip.markModified("itinerary");
    
    await trip.save();

    res.status(200).json({
      success: true,
      message: "SmartShift applied successfully",
      trip
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

const updateOperatorAccess = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { enabled } = req.body;

  if (typeof enabled !== "boolean") {
    throw new AppError("Invalid operator access flag", 400);
  }

  const trip = await Trip.findOne({
    _id: id,
    $or: [{ user: req.user.id }, { coordinatorId: req.user.id }],
  });

  if (!trip) {
    throw new AppError("Trip not found", 404);
  }

  if (enabled && trip.status !== "Finalized") {
    throw new AppError("Trip must be finalized before sharing with an operator", 400);
  }

  trip.operatorAccess = {
    enabled,
    grantedAt: enabled ? new Date() : null,
  };

  await trip.save();

  res.status(200).json({
    success: true,
    message: enabled ? "Trip shared with operator" : "Operator access revoked",
    trip,
  });
});

const finalizeTrip = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const trip = await Trip.findOne({
    _id: id,
    $or: [{ user: req.user.id }, { coordinatorId: req.user.id }],
  });

  if (!trip) {
    throw new AppError("Trip not found", 404);
  }

  if (!trip.itinerary || trip.itinerary.length === 0) {
    throw new AppError("Cannot finalize: Itinerary is incomplete.", 400);
  }

  if (req.body.guideRequirement) {
    trip.guideRequirement = req.body.guideRequirement;
  }

  trip.status = "Finalized";
  await trip.save();

  // Sync booking requirements for the finalized trip
  await syncBookingRequirements(trip);

  res.status(200).json({
    success: true,
    message: "Trip finalized successfully",
    trip,
  });
});

module.exports = {
  generateTrip,
  getAllTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  regenerateDay,
  smartshiftSuggest,
  smartshiftApply,
  getTripBookings,
  updateOperatorAccess,
  finalizeTrip,
  syncItinerary,
};
