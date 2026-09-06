const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

const generateTripPlan = async (tripData) => {
  // Calculate exact inclusive number of days from the user's date range
  let numDays = 5;
  if (tripData.startDate && tripData.endDate) {
    const start = new Date(tripData.startDate);
    const end = new Date(tripData.endDate);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      numDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }
  }

  const prompt = `
You are an expert travel planner acting as a strict financial planner.

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
Total Budget: ${tripData.budget} ${tripData.currency} (This is a STRICT constraint for ALL travelers combined)
Preferred Travel Mode: ${tripData.travelMode}
Hotel Type: ${tripData.hotelType}
Food Preference: ${tripData.foodPreference}
Trip Type: ${tripData.tripType}
Interests: ${tripData.interests.join(", ")}
Number of Days: ${numDays} (EXACT — You MUST generate EXACTLY ${numDays} days in the "days" array, Day 1 through Day ${numDays}.)

Very Important:
1. BUDGET CONSTRAINT: You MUST build an itinerary where the sum of ALL activities' "estimatedCost" is strictly less than or equal to the Total Budget (${tripData.budget} ${tripData.currency}).
2. ESTIMATED COST: Provide the total estimated cost for ALL travelers combined for each item as a pure number without currency symbols. (e.g. if a hotel is 2000 per night and there are 2 travelers sharing 1 room for 1 night, cost is 2000. If an activity is 500 per person and 2 travelers, cost is 1000). Do NOT use strings like "₹350". Use pure numbers like "1000".
3. REALISTIC SCHEDULE: Do NOT overpack the itinerary. Generate a STRICT MAXIMUM of 3-4 meaningful items per day TOTAL (including meals and transport). Ensure time for rest. A travel day should have even fewer activities.
4. TIMINGS: Activities should be in chronological order with feasible non-overlapping start times and 20-30 minutes buffer between activities for local travel. Use standard AM/PM formats (e.g., "09:30 AM", "01:30 PM").

Example Activity JSON:
{
  "time": "09:30 AM - 11:30 AM",
  "place": "Naini Lake",
  "activity": "Boating",
  "notes": "Best during morning",
  "duration": "2 hours",
  "estimatedCost": "1000",
  "category": "activity"
}

Categories allowed: "transport", "hotel", "activity", "food", "local transport", "shopping".

Rules:
- Include major transport (e.g., flight/train from source to destination).
- Include hotel check-in on arrival and check-out on departure.
- Allocate roughly: Transport (30%), Hotel (30%), Food (20%), Activities/Misc (20%) - adapt based on the budget constraint.
- If the budget is very low, use economy options and fewer paid activities.
- The total sum of all "estimatedCost" MUST NOT exceed ${tripData.budget}.

Return exactly this JSON:

{
  "summary": "Brief summary of the trip",
  "days": [
    {
      "day": 1,
      "title": "Day title",
      "plan": [
        {
          "time": "",
          "place": "",
          "activity": "",
          "notes": "",
          "duration": "",
          "estimatedCost": "",
          "category": ""
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
    const parsedData = JSON.parse(text);
    
    // Post-generation validation and correction: Maximum 4 items per day
    if (parsedData && parsedData.days && Array.isArray(parsedData.days)) {
      parsedData.days = parsedData.days.map(day => {
        if (day.plan && Array.isArray(day.plan) && day.plan.length > 4) {
          // Identify essential items (transport, hotel, check-in)
          const essential = [];
          const nonEssential = [];
          
          day.plan.forEach(item => {
            const cat = String(item.category || "").toLowerCase();
            const act = String(item.activity || item.name || "").toLowerCase();
            if (
              cat.includes("transport") || 
              cat.includes("hotel") || 
              cat.includes("stay") || 
              act.includes("check-in") || 
              act.includes("check out") || 
              act.includes("checkout") || 
              act.includes("flight") || 
              act.includes("train") ||
              act.includes("arrival") ||
              act.includes("departure")
            ) {
              essential.push(item);
            } else {
              nonEssential.push(item);
            }
          });
          
          let newPlan = [];
          
          if (essential.length >= 4) {
            newPlan = essential.slice(0, 4);
          } else {
            newPlan = [...essential];
            const remainingSlots = 4 - newPlan.length;
            newPlan.push(...nonEssential.slice(0, remainingSlots));
          }
          
          // Restore chronological order based on original index
          const originalIndices = new Map();
          day.plan.forEach((item, idx) => originalIndices.set(item, idx));
          newPlan.sort((a, b) => originalIndices.get(a) - originalIndices.get(b));
          
          day.plan = newPlan;
        }
        return day;
      });
    }
    
    return parsedData;
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
