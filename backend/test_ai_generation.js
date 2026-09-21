require("dotenv").config();
const { generateTripPlan } = require("./src/services/aiService");

const runTests = async () => {
  console.log("=========================================");
  console.log("Starting Real AI Generation Tests");
  console.log("=========================================\n");

  const scenarios = [
    {
      name: "TEST A: 3–5 day normal trip",
      payload: { source: "Mumbai", destination: "Jaipur", startDate: "2026-09-18", endDate: "2026-09-22", travelers: 2, budget: 40000, currency: "INR", travelMode: "Train", hotelType: "Standard", foodPreference: "Any", tripType: "Couple", interests: ["History", "Culture"] }
    },
    {
      name: "TEST B: 7-day trip",
      payload: { source: "Delhi", destination: "Kerala", startDate: "2026-10-01", endDate: "2026-10-07", travelers: 2, budget: 80000, currency: "INR", travelMode: "Flight", hotelType: "Standard", foodPreference: "Veg", tripType: "Family", interests: ["Nature", "Culture"] }
    },
    {
      name: "TEST C: single-location trip",
      payload: { source: "Mumbai", destination: "Goa", startDate: "2026-11-01", endDate: "2026-11-05", travelers: 2, budget: 30000, currency: "INR", travelMode: "Flight", hotelType: "Standard", foodPreference: "Any", tripType: "Couple", interests: ["Relaxation"] }
    },
    {
      name: "TEST D: multi-location trip",
      payload: { source: "Mumbai", destination: "Uttarakhand", startDate: "2026-12-01", endDate: "2026-12-07", travelers: 2, budget: 40000, currency: "INR", travelMode: "Train", hotelType: "Standard", foodPreference: "Any", tripType: "Friends", interests: ["Nature", "Adventure"] }
    },
    {
      name: "TEST E: tight-budget trip",
      payload: { source: "Pune", destination: "Lonavala", startDate: "2026-09-18", endDate: "2026-09-20", travelers: 4, budget: 8000, currency: "INR", travelMode: "Car", hotelType: "Budget", foodPreference: "Any", tripType: "Friends", interests: ["Nature"] }
    },
    {
      name: "TEST F: interest-specific trip (Adventure)",
      payload: { source: "Pune", destination: "Rishikesh", startDate: "2026-11-01", endDate: "2026-11-05", travelers: 4, budget: 60000, currency: "INR", travelMode: "Flight", hotelType: "Standard", foodPreference: "Any", tripType: "Friends", interests: ["Adventure"] }
    },
    {
      name: "TEST G: multi-location trip with travel timing",
      payload: { source: "Delhi", destination: "Rajasthan", startDate: "2026-10-10", endDate: "2026-10-16", travelers: 2, budget: 70000, currency: "INR", travelMode: "Train", hotelType: "Standard", foodPreference: "Any", tripType: "Couple", interests: ["Culture", "Photography"] }
    }
  ];

  for (const scenario of scenarios) {
    console.log(`Testing Scenario: ${scenario.name}`);
    console.log(`Constraints: ${scenario.payload.travelers} travelers | Budget: ${scenario.payload.budget} | Interests: ${scenario.payload.interests.join(", ")}`);
    console.log("Calling AI (this may take a minute due to generation and correction loops)...");
    
    try {
      const result = await generateTripPlan(scenario.payload);
      
      if (result.validation && result.validation.valid) {
        console.log("✅ SUCCESS - Generated Valid Itinerary");
      } else if (result.validation) {
        console.log("❌ FAILED - Validation Errors remaining after 3 attempts:");
        result.validation.errors.forEach(e => console.log(`   - ${e.type}: ${e.message}`));
      } else {
        console.log("❌ FAILED - No validation object returned.");
      }
      
      console.log(`Stay Segments Generated: ${result.staySegments ? result.staySegments.length : 0}`);
      
      // Calculate total generated cost
      let totalCost = 0;
      if (result.days) {
        result.days.forEach(d => {
          if (d.plan) {
            d.plan.forEach(item => {
               totalCost += parseFloat(item.estimatedCost) || 0;
            });
          }
        });
      }
      console.log(`Total Estimated Cost: ${totalCost} / ${scenario.payload.budget}`);
      
    } catch (err) {
      console.error("Test execution error:", err.message);
    }
    
    console.log("-----------------------------------------\n");
  }
};

runTests();
