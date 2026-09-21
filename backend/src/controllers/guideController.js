const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../utils/AppError");
const Trip = require("../models/Trip");
const GuideProfile = require("../models/GuideProfile");
const GuideRequest = require("../models/GuideRequest");
const { matchGuidesForTrip, extractTripStates } = require("../services/guideMatchingEngine");

/**
 * Get geographically matched guides for a trip
 * GET /api/guides/match/:tripId
 */
const getMatchedGuides = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const trip = await Trip.findById(tripId);

  if (!trip) {
    throw new AppError("Trip not found", 404);
  }

  const matchingResult = await matchGuidesForTrip(trip);

  res.status(200).json({
    success: true,
    tripId: trip._id,
    tripStates: matchingResult.tripStates,
    destinationName: matchingResult.destinationName,
    routeDisplayText: matchingResult.routeDisplayText,
    resolvedLocations: matchingResult.resolvedLocations,
    guideRequirement: trip.guideRequirement || { required: false },
    count: matchingResult.matchedGuides.length,
    guides: matchingResult.matchedGuides,
  });
});

/**
 * Send Guide Request from Operator to a Guide
 * POST /api/guides/requests
 */
const createGuideRequest = asyncHandler(async (req, res) => {
  const { tripId, guideId, requirementOverride } = req.body;

  if (!tripId || !guideId) {
    throw new AppError("Trip ID and Guide ID are required", 400);
  }

  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw new AppError("Trip not found", 404);
  }

  const guide = await GuideProfile.findOne({ guideId }).select("-documents");
  if (!guide) {
    throw new AppError("Guide profile not found", 404);
  }

  const states = await extractTripStates(trip);

  // Check if a request already exists for this trip + guide
  let existingRequest = await GuideRequest.findOne({ tripId: trip._id, guideId });
  if (existingRequest) {
    return res.status(200).json({
      success: true,
      message: "Guide request already exists for this trip",
      request: existingRequest,
    });
  }

  const reqData = requirementOverride || trip.guideRequirement || {};

  const guideRequest = await GuideRequest.create({
    tripId: trip._id,
    operatorId: req.user?._id || null,
    guideId: guide.guideId,
    tripType: trip.tripCategory === "CAMPUS" ? "Campus" : "Personal",
    tripSummary: {
      title: `${trip.source} to ${trip.destination} (${trip.duration || "Trip"})`,
      source: trip.source,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      duration: trip.duration,
      travelers: trip.travelers || 1,
      route: [trip.source, trip.destination],
      states: states,
    },
    requirement: {
      numberOfGuides: reqData.numberOfGuides || "1",
      genderPreference: reqData.genderPreference || "Either",
      preferredLanguages: reqData.preferredLanguages || [],
      specialNotes: reqData.specialNotes || "",
    },
    status: "SENT",
    sentAt: new Date(),
  });

  // Update trip guide requirement status
  if (trip.guideRequirement) {
    trip.guideRequirement.status = "pending";
    await trip.save();
  }

  res.status(201).json({
    success: true,
    message: `Guide request dispatched to ${guide.fullName}`,
    request: guideRequest,
  });
});

/**
 * Get all guide requests and responses for a trip
 * GET /api/guides/requests/trip/:tripId
 */
const getTripGuideRequests = asyncHandler(async (req, res) => {
  const { tripId } = req.params;

  const requests = await GuideRequest.find({ tripId }).sort({ createdAt: -1 });

  // Attach guide profile summary to each request
  const enrichedRequests = await Promise.all(
    requests.map(async (r) => {
      const guide = await GuideProfile.findOne({ guideId: r.guideId })
        .select("guideId fullName email phone primaryRegion languages guidingExperience verificationStatus bio geographicalKnowledge")
        .lean();
      return {
        ...r.toObject(),
        guide: guide || null,
      };
    })
  );

  res.status(200).json({
    success: true,
    count: enrichedRequests.length,
    requests: enrichedRequests,
  });
});

/**
 * Operator selects a guide (or multiple guides)
 * POST /api/guides/select
 */
const selectGuideForTrip = asyncHandler(async (req, res) => {
  const { tripId, guideId, guideIds } = req.body;

  if (!tripId) {
    throw new AppError("Trip ID is required", 400);
  }

  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw new AppError("Trip not found", 404);
  }

  const targetGuideIds = guideIds && Array.isArray(guideIds) && guideIds.length > 0
    ? guideIds
    : guideId ? [guideId] : [];

  if (targetGuideIds.length === 0) {
    throw new AppError("At least one Guide ID must be selected", 400);
  }

  // Update requests to OPERATOR_SELECTED
  await GuideRequest.updateMany(
    { tripId: trip._id, guideId: { $in: targetGuideIds } },
    { $set: { status: "OPERATOR_SELECTED", selectedAt: new Date() } }
  );

  // Update trip.guideRequirement
  if (!trip.guideRequirement) {
    trip.guideRequirement = { required: true };
  }
  trip.guideRequirement.selectedGuides = targetGuideIds;
  trip.guideRequirement.status = "guide_selected";
  await trip.save();

  res.status(200).json({
    success: true,
    message: `Selected ${targetGuideIds.length} guide(s) for the trip`,
    selectedGuides: targetGuideIds,
    guideRequirement: trip.guideRequirement,
  });
});

/**
 * Finalize Guide Arrangement on the trip
 * POST /api/guides/finalize
 */
const finalizeTripGuides = asyncHandler(async (req, res) => {
  const { tripId } = req.body;

  if (!tripId) {
    throw new AppError("Trip ID is required", 400);
  }

  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw new AppError("Trip not found", 404);
  }

  const selectedGuideIds = trip.guideRequirement?.selectedGuides || [];
  if (selectedGuideIds.length === 0) {
    throw new AppError("No guides currently selected to finalize", 400);
  }

  // Find the accepted requests for these guides to extract price and details
  const acceptedRequests = await GuideRequest.find({
    tripId: trip._id,
    guideId: { $in: selectedGuideIds },
  });

  const finalizedGuides = await Promise.all(
    selectedGuideIds.map(async (gId) => {
      const guide = await GuideProfile.findOne({ guideId: gId }).select("fullName phone email").lean();
      const reqItem = acceptedRequests.find((r) => r.guideId === gId);
      return {
        guideId: gId,
        fullName: guide?.fullName || gId,
        price: reqItem?.price?.amount || 0,
        currency: reqItem?.price?.currency || "INR",
        availability: reqItem?.availability || "AVAILABLE",
        status: "Confirmed",
      };
    })
  );

  // Update Guide Requests to CONFIRMED
  await GuideRequest.updateMany(
    { tripId: trip._id, guideId: { $in: selectedGuideIds } },
    { $set: { status: "CONFIRMED", confirmedAt: new Date() } }
  );

  // Save finalized guides on the trip
  trip.guideRequirement.finalizedGuides = finalizedGuides;
  trip.guideRequirement.status = "confirmed";
  await trip.save();

  res.status(200).json({
    success: true,
    message: "Guide arrangement finalized successfully",
    finalizedGuides,
    guideRequirement: trip.guideRequirement,
  });
});

/**
 * Search Guide Profiles (Excluding sensitive documents)
 * GET /api/guides/search
 */
const searchGuides = asyncHandler(async (req, res) => {
  const { q, region, state, language, availability, experience } = req.query;

  const filter = { verificationStatus: "approved" };

  if (q && q.trim()) {
    const term = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { fullName: { $regex: term, $options: "i" } },
      { guideId: { $regex: term, $options: "i" } },
      { primaryRegion: { $regex: term, $options: "i" } },
      { "geographicalKnowledge.states": { $regex: term, $options: "i" } },
      { languages: { $regex: term, $options: "i" } },
      { bio: { $regex: term, $options: "i" } },
    ];
  }

  if (region && region.trim()) {
    filter.primaryRegion = { $regex: region.trim(), $options: "i" };
  }

  if (state && state.trim()) {
    filter["geographicalKnowledge.states"] = { $regex: state.trim(), $options: "i" };
  }

  if (language && language.trim()) {
    filter.languages = { $regex: language.trim(), $options: "i" };
  }

  if (availability && availability.trim()) {
    filter.availability = availability.trim();
  }

  if (experience && experience.trim()) {
    filter.guidingExperience = { $regex: experience.trim(), $options: "i" };
  }

  // Strict projection: documents are NOT exposed
  const guides = await GuideProfile.find(filter)
    .select("-documents")
    .limit(50)
    .sort({ fullName: 1 });

  res.status(200).json({
    success: true,
    count: guides.length,
    guides,
  });
});

module.exports = {
  getMatchedGuides,
  createGuideRequest,
  getTripGuideRequests,
  selectGuideForTrip,
  finalizeTripGuides,
  searchGuides,
};
