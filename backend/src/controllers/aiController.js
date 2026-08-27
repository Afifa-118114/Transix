const asyncHandler = require("../middleware/asyncHandler");
const Trip = require("../models/Trip");
const { generateTripPlan } = require("../services/aiService");
const { getDestinationImage } = require("../services/imageService");

const generateAITrip = asyncHandler(async (req, res) => {
  const tripData = req.body;

  const [aiData, heroImage] = await Promise.all([
    generateTripPlan(tripData),
    getDestinationImage(tripData.destination),
  ]);

  const savedTrip = await Trip.create({
    user: req.user.id,

    source: tripData.source,
    destination: tripData.destination,
    heroImage,
    startDate: tripData.startDate,
    endDate: tripData.endDate,
    travelers: tripData.travelers,
    budget: tripData.budget,
    currency: tripData.currency || "INR",
    travelMode: tripData.travelMode,
    hotelType: tripData.hotelType,
    foodPreference: tripData.foodPreference,
    tripType: tripData.tripType,
    interests: tripData.interests,
    priority: tripData.priority,
    purpose: tripData.purpose,

    status: "Generated",

    aiGenerated: true,
    itinerary: aiData.days,
    budgetBreakdown: aiData.budgetBreakdown,
    tips: aiData.tips,
    summary: aiData.summary,
  });
  console.log(savedTrip.itinerary[0]);

  res.status(201).json({
    success: true,
    message: "AI trip generated & saved successfully",
    trip: savedTrip,
  });
});

module.exports = {
  generateAITrip,
};
