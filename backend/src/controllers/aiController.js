const asyncHandler = require("../middleware/asyncHandler");
const Trip = require("../models/Trip");
const {
  generateTripPlan,
  generateAssistantReply,
  transcribeAssistantAudio: transcribeAudio,
  synthesizeAssistantSpeech: synthesizeSpeech,
} = require("../services/aiService");
const { generateHeroImage } = require("../services/imageService");
const crypto = require("crypto");

const generateAssistantChat = asyncHandler(async (req, res) => {
  const { message, language = "auto", trip = null, history = [] } = req.body || {};
  const cleanMessage = typeof message === "string" ? message.trim() : "";

  if (!cleanMessage) {
    const error = new Error("Please enter a message.");
    error.statusCode = 400;
    throw error;
  }

  const reply = await generateAssistantReply({
    message: cleanMessage,
    language,
    trip,
    history,
  });

  res.status(200).json({
    success: true,
    reply,
  });
});

const transcribeAssistantAudio = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer?.length) {
    const error = new Error("No audio recording was received. Please record a message and try again.");
    error.statusCode = 400;
    throw error;
  }

  const mimeType = String(req.file.mimetype || "").split(";")[0].toLowerCase();
  const extension = String(req.file.originalname || "").split(".").pop().toLowerCase();
  const formatByMimeType = {
    "audio/webm": "webm",
    "audio/mp4": "m4a",
    "audio/m4a": "m4a",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/mpeg": "mp3",
    "audio/flac": "flac",
    "audio/aac": "aac",
  };
  const format = formatByMimeType[mimeType] || extension;
  const transcript = await transcribeAudio({
    audioBuffer: req.file.buffer,
    format,
    language: req.body?.language || "auto",
  });

  res.status(200).json({ success: true, transcript });
});

const generateAssistantSpeech = asyncHandler(async (req, res) => {
  const { text = "", language = "auto" } = req.body || {};
  const speech = await synthesizeSpeech({ text, language });

  res.status(200)
    .set("Content-Type", speech.contentType)
    .set("Cache-Control", "no-store")
    .set("X-Content-Type-Options", "nosniff")
    .send(speech.audio);
});

const generateAITrip = asyncHandler(async (req, res) => {
  const tripData = req.body;
  const tStart = Date.now();

  let heroImage = tripData.heroImage;
  let aiData;
  
  if (heroImage) {
    aiData = await generateTripPlan(tripData);
  } else {
    // Generate Gemini trip plan and AI hero image concurrently.
    // .catch ensures hero image failure never prevents trip creation.
    const imagePromise = generateHeroImage(tripData.destination).catch((err) => {
      console.error("[aiController] Hero image generation error:", err.message);
      return null;
    });

    [aiData, heroImage] = await Promise.all([
      generateTripPlan(tripData),
      imagePromise,
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
  generateAssistantChat,
  transcribeAssistantAudio,
  generateAssistantSpeech,
};
