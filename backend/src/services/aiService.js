const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

const { validateItinerary } = require("./itineraryValidator");

const { resolveStationCandidates } = require("./stationService");
const { searchDirectTrains } = require("./trainPlannerService");
const { fetchTravelOptions } = require("./travelService");

const generateTripPlan = async (tripData) => {
  let numDays = 5;
  if (tripData.startDate && tripData.endDate) {
    const start = new Date(tripData.startDate);
    const end = new Date(tripData.endDate);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      numDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }
  }

  // Transport Feasibility Resolver
  let feasibleTransportString = "No specific trains found. Use logical estimates based on Road/Flight if applicable.";
  try {
    const sourceCandidates = await resolveStationCandidates(tripData.source);
    const destinationCandidates = await resolveStationCandidates(tripData.destination);
    
    let trains = [];
    if (sourceCandidates && destinationCandidates) {
      trains = await searchDirectTrains(sourceCandidates, destinationCandidates, tripData.startDate);
    }

    if (trains && trains.length > 0) {
      const topTrains = trains.slice(0, 5).map(t => 
        `Train ${t.trainNumber} (${t.trainName}): Departs ${t.from.name} at ${t.from.departure}, Arrives ${t.to.name} at ${t.to.arrival}. Duration: ${t.duration}, Est. Fare: ${t.estimatedFare}`
      );
      feasibleTransportString = `REAL TRAIN OPTIONS AVAILABLE:\n${topTrains.join("\n")}`;
    } else {
      const otherOptions = await fetchTravelOptions(tripData.source, tripData.destination);
      let fallbacks = [];
      if (otherOptions.flight && otherOptions.flight.length > 0) fallbacks.push(`Flight: ~${otherOptions.flight[0].duration}, Fare: ${otherOptions.flight[0].estimatedFare}`);
      if (otherOptions.bus && otherOptions.bus.length > 0) fallbacks.push(`Bus: ~${otherOptions.bus[0].duration}, Fare: ${otherOptions.bus[0].estimatedFare}`);
      if (otherOptions.cab && otherOptions.cab.length > 0) fallbacks.push(`Cab: ~${otherOptions.cab[0].duration}, Fare: ${otherOptions.cab[0].estimatedFare}`);
      
      if (fallbacks.length > 0) {
        feasibleTransportString = `REAL TRANSPORT OPTIONS AVAILABLE:\n${fallbacks.join("\n")}`;
      }
    }
  } catch (err) {
    console.error("Failed to resolve transport candidates:", err);
  }

  const basePrompt = `
You are an expert travel planner acting as a strict financial and geographic planner.

Trip Details:
Source: ${tripData.source}
Destination: ${tripData.destination}
Start Date: ${tripData.startDate}
End Date: ${tripData.endDate}
Travelers: ${tripData.travelers}
Total Budget: ${tripData.budget} ${tripData.currency} (This is a STRICT constraint for ALL travelers combined)
Preferred Travel Mode: ${tripData.travelMode}
Hotel Type: ${tripData.hotelType}
Food Preference: ${tripData.foodPreference}
Trip Type: ${tripData.tripType}
Interests: ${tripData.interests.join(", ")}
Number of Days: ${numDays}

FEASIBLE TRANSPORT CANDIDATES:
${feasibleTransportString}

Your task is to plan a robust multi-location itinerary using the following strict scheduling order:
STEP 1: Identify suitable geographic stay points (locations) based on the destination.
STEP 2: Allocate contiguous check-in/check-out dates and nights to each stay point covering the exact trip dates.
STEP 3: Plan logical travel legs ONLY from the FEASIBLE TRANSPORT CANDIDATES list. You MUST NOT invent your own transport or fabricate times. Place fixed transport as the skeleton of the itinerary.
STEP 4: Assign feasible, chronological daily activities that respect the current stay point's geography and leave ample buffers for transport and hotel checkouts.

RULES:
1. Stay Segments MUST perfectly cover the trip dates. Total nights must equal (End Date - Start Date). No overlaps.
2. Transport constraints: Leave at least a 60-minute pre-departure buffer and a 30-minute post-arrival buffer for any transport legs.
3. Hotel constraints: Leave at least a 30-minute buffer for hotel checkout (standard 11:00 AM).
4. Logical constraints: Respect standard operating hours. Do NOT schedule sightseeing, shopping, or museums between 10:00 PM and 06:00 AM.
5. Total estimated cost MUST NOT exceed ${tripData.budget} ${tripData.currency}. To ensure this, aim for a target of ~10% under budget.
6. Provide ONLY pure numbers for "estimatedCost" (no currency symbols).

Return ONLY this EXACT JSON structure, do NOT use markdown or backticks:

{
  "summary": "Brief summary of the trip",
  "staySegments": [
    {
      "id": "stay-1",
      "location": "City Name",
      "checkIn": "YYYY-MM-DD",
      "checkOut": "YYYY-MM-DD",
      "nights": 3,
      "reason": "Why this location"
    }
  ],
  "travelLegs": [
    {
      "from": "Origin",
      "to": "City Name",
      "date": "YYYY-MM-DD",
      "startTime": "09:00 AM",
      "endTime": "13:00 PM",
      "durationMinutes": 240,
      "mode": "Train",
      "estimated": true
    }
  ],
  "days": [
    {
      "day": 1,
      "title": "Day title",
      "plan": [
        {
          "time": "09:00 AM - 11:00 AM",
          "place": "Location",
          "activity": "Activity Name",
          "notes": "Notes",
          "duration": "2 hours",
          "estimatedCost": "1000",
          "category": "activity"
        }
      ]
    }
  ],
  "budgetBreakdown": {
    "travel": "",
    "stay": "",
    "food": "",
    "misc": ""
  },
  "tips": []
}
`;

  let currentPrompt = basePrompt;
  let parsedData = null;
  let validationResult = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    let result;
    try {
      result = await model.generateContent(currentPrompt);
    } catch (err) {
      if (err.message.includes("503") && attempt < 3) {
        console.log(`Retry ${attempt} due to 503...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      throw err;
    }

    let text = result.response.text().replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();

    try {
      parsedData = JSON.parse(text);
      const validationResult = validateItinerary(parsedData, tripData);
      
      if (validationResult.valid) {
        parsedData.validation = validationResult;
        return parsedData;
      }
      
      // If invalid, construct correction prompt
      console.log(`[Attempt ${attempt}] Validation failed. Correcting...`);
      const errorMessages = validationResult.errors.map(e => `- ${e.message}`).join("\n");
      
      currentPrompt = basePrompt + `\n\nYOUR PREVIOUS ATTEMPT FAILED VALIDATION WITH THESE ERRORS:\n${errorMessages}\n\nPlease carefully correct these specific errors while preserving the user's dates, interests, and traveler count. Return the full corrected JSON.`;
    } catch (err) {
      console.log(`[Attempt ${attempt}] AI returned invalid JSON:`, text);
      currentPrompt = basePrompt + "\\n\\nYOUR PREVIOUS ATTEMPT RETURNED INVALID/MALFORMED JSON. Please ensure your response is strictly valid JSON.";
    }
  }

  return {
    summary: "Could not generate a valid, conflict-free itinerary. Please try adjusting your constraints or increasing your budget.",
    staySegments: [],
    travelLegs: [],
    days: [],
    budgetBreakdown: {},
    validation: {
      valid: false,
      errors: [{ type: "GENERATION_FAILED", day: null, message: "AI repeatedly failed to generate a valid, conflict-free itinerary after 3 attempts." }],
      warnings: []
    }
  };
};

const regenerateTripDay = async (trip, day) => {
  const prompt = `
Return ONLY valid JSON.

Regenerate ONLY Day ${day}.

Destination: ${trip.destination}

Trip Type: ${trip.tripType}

Budget: ${trip.budget}

Travel Mode: ${trip.travelMode}

Keep every other day unchanged.

Return

{
 "day": ${day},
 "title":"",
 "plan":[
   {
      "time":"",
      "place":"",
      "activity":"",
      "notes":"",
      "duration":"",
      "estimatedCost":""
   }
 ]
}
`;

  let result;

  for (let i = 0; i < 3; i++) {
    try {
      result = await model.generateContent(prompt);
      break;
    } catch (err) {
      if (err.message.includes("503") && i < 2) {
        console.log(`Retry ${i + 1}...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      throw err;
    }
  }
  let text = result.response.text();

  text = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(text);
  } catch (err) {
    console.log("❌ Regenerate AI Output:\n", text);
    throw new Error("Invalid JSON returned while regenerating day.");
  }
};

module.exports = {
  generateTripPlan,
  regenerateTripDay,
};
