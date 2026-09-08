const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

const { validateItinerary } = require("./itineraryValidator");

const generateTripPlan = async (tripData) => {
  let numDays = 5;
  if (tripData.startDate && tripData.endDate) {
    const start = new Date(tripData.startDate);
    const end = new Date(tripData.endDate);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      numDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }
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

Your task is to plan a robust multi-location itinerary using the following order of thinking:
STEP 1: Identify suitable geographic stay points (locations) based on the destination.
STEP 2: Allocate contiguous check-in/check-out dates and nights to each stay point covering the exact trip dates.
STEP 3: Plan logical travel legs between these stay points.
STEP 4: Assign feasible, chronological daily activities that respect the current stay point's geography.
STEP 5: Validate the total estimated cost strictly against the budget.

RULES:
1. Stay Segments MUST perfectly cover the trip dates. Total nights must equal (End Date - Start Date). No overlaps.
2. Activities MUST NOT overlap in time. Include reasonable buffers for travel.
3. Total estimated cost MUST NOT exceed ${tripData.budget} ${tripData.currency}. To ensure this, aim for a target of ~10% under budget.
4. Limit to 2-4 meaningful activities/events per day.
5. Provide ONLY pure numbers for "estimatedCost" (no currency symbols).

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
      "mode": "Car",
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
      validationResult = validateItinerary(parsedData, tripData);

      if (validationResult.valid) {
        parsedData.validation = validationResult;
        return parsedData;
      }

      // If invalid, construct correction prompt
      console.log(`[Attempt ${attempt}] Validation failed. Correcting...`);
      const errorMessages = validationResult.errors.map(e => `- ${e.message}`).join("\n");
      
      currentPrompt = basePrompt + `
\n\nYOUR PREVIOUS ATTEMPT FAILED VALIDATION WITH THESE ERRORS:
${errorMessages}

Please carefully correct these specific errors while preserving the user's dates, interests, and traveler count. Return the full corrected JSON.`;

    } catch (err) {
      console.log(`[Attempt ${attempt}] AI returned invalid JSON:`, text);
      currentPrompt = basePrompt + "\\n\\nYOUR PREVIOUS ATTEMPT RETURNED INVALID/MALFORMED JSON. Please ensure your response is strictly valid JSON.";
    }
  }

  // Fallback: return the last generated data with validation errors attached
  if (parsedData) {
    parsedData.validation = validationResult;
    return parsedData;
  }
  
  return {
    summary: "Could not generate a valid itinerary. Please try adjusting your constraints or increasing your budget.",
    staySegments: [],
    travelLegs: [],
    days: [],
    budgetBreakdown: {},
    validation: {
      valid: false,
      errors: [{ type: "GENERATION_FAILED", day: null, message: "AI repeatedly failed to generate a valid itinerary format after 3 attempts." }],
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
