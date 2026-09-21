const asyncHandler = require("../middleware/asyncHandler");
const Trip = require("../models/Trip");
const { generateTripPlan } = require("../services/aiService");
const { getDestinationImage } = require("../services/imageService");
const crypto = require("crypto");

const generateAITrip = asyncHandler(async (req, res) => {
  const tripData = req.body;
  const tStart = Date.now();

  let heroImage = tripData.heroImage;
  let aiData;
  
  if (heroImage) {
    aiData = await generateTripPlan(tripData);
  } else {
    [aiData, heroImage] = await Promise.all([
      generateTripPlan(tripData),
      getDestinationImage(tripData.destination),
    ]);
  }
  const tAi = Date.now();
  console.log(`[Backend Trace] AI Generation & Image Fetch: ${tAi - tStart}ms`);

  if (!aiData || !aiData.days || aiData.days.length === 0 || (aiData.validation && aiData.validation.valid === false)) {
    res.status(400);
    throw new Error("Could not generate a valid, conflict-free itinerary. Please try adjusting your constraints.");
  }

  const numDays = aiData.days.length;
  let finalStartDate = tripData.startDate;
  let finalEndDate = tripData.endDate;

  if (finalStartDate) {
    const s = new Date(finalStartDate + (finalStartDate.includes('T') ? '' : 'T00:00:00Z'));
    if (!isNaN(s.getTime())) {
      if (!finalEndDate) {
        const e = new Date(s.getTime());
        e.setUTCDate(s.getUTCDate() + numDays - 1);
        finalEndDate = e.toISOString().split("T")[0];
      }
    }
  }

  const savedTrip = await Trip.create({
    user: req.user.id,

    source: tripData.source,
    destination: tripData.destination,
    heroImage,
    startDate: finalStartDate,
    endDate: finalEndDate,
    duration: `${numDays} Days`,
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
    itinerary: aiData.days.map((day, dIdx) => ({
      ...day,
      plan: (day.plan || []).map(p => ({
        ...p,
        id: p.id || `itin_${crypto.randomUUID()}`
      }))
    })),
    staySegments: aiData.staySegments || [],
    travelLegs: aiData.travelLegs || [],
    validation: aiData.validation || null,
    budgetBreakdown: aiData.budgetBreakdown,
    tips: aiData.tips,
    summary: aiData.summary,
  });
  const tDb = Date.now();
  console.log(`[Backend Trace] DB Save: ${tDb - tAi}ms`);
  console.log(`[Backend Trace] Total Backend Execution: ${tDb - tStart}ms`);

  res.status(201).json({
    success: true,
    message: "AI trip generated & saved successfully",
    trip: savedTrip,
  });
});

module.exports = {
  generateAITrip,
};
