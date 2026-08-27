const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

const generateTripPlan = async (tripData) => {
  const prompt = `
You are an expert travel planner.

Return ONLY valid JSON.
Do NOT use markdown.
Do NOT use backticks.
Do NOT include explanations.

Trip Details:
Source: ${tripData.source}
Destination: ${tripData.destination}
Start Date: ${tripData.startDate}
End Date: ${tripData.endDate}
Travelers: ${tripData.travelers}
Budget: ${tripData.budget} ${tripData.currency}
Preferred Travel Mode: ${tripData.travelMode}
Hotel Type: ${tripData.hotelType}
Food Preference: ${tripData.foodPreference}
Trip Type: ${tripData.tripType}
Purpose: ${tripData.purpose}
Interests: ${tripData.interests.join(", ")}
Very Important:
Prioritize activities matching the user's interests.
If "Food" is selected, include famous restaurants, cafes and local dishes.
If "Nature" is selected, prioritize parks, lakes, viewpoints and gardens.
If "History" is selected, prioritize monuments, forts and museums.
If "Shopping" is selected, include famous markets and shopping streets.
If multiple interests are selected, balance them across the itinerary.

Instructions:

Create a realistic trip.

For EVERY day generate 5-7 activities.

Activities should be in chronological order with feasible non-overlapping start times and 15-30 minutes buffer between activities for local travel.

Each activity must contain:

- time
- place
- activity
- notes
- duration
- estimatedCost

Example:

{
"time":"09:00 AM",
"place":"Naini Lake",
"activity":"Boating",
"notes":"Best during morning",
"duration":"1 hour",
"estimatedCost":"₹350"
}

Rules:

- Use REAL tourist attractions.
- Use REAL restaurants/cafes.
- Include breakfast, lunch and dinner naturally.
- Include hotel check-in/check-out where required.
- Include travel where required.
- Avoid repeating places.
- Activities must be short.
- Use realistic non-overlapping timings with 15-30m transition buffers.
- Use realistic prices.
- Budget breakdown must approximately match the total budget.


Return exactly this JSON:

{
  "summary":"",
  "days":[
    {
      "day":1,
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
  ],
  "budgetBreakdown":{
    "travel":"",
    "stay":"",
    "food":"",
    "misc":""
  },
  "tips":[]
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
  const response = await result.response;

  let text = response.text();

  // ✅ Remove markdown formatting
  text = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(text);
  } catch (err) {
    console.log("❌ AI RAW OUTPUT:\n", text);
    throw new Error("AI returned invalid JSON");
  }
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
