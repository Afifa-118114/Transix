const mongoose = require("mongoose");
require("dotenv").config({ path: ".env" });
const { generateTripPlan } = require("./src/services/aiService");

// Mock getModel to log errors in aiService or just wrap it.
// Actually, I can just patch the console.warn to print the error.
const originalWarn = console.warn;
console.warn = (...args) => {
  originalWarn(...args);
};

async function runTest() {
  const tripData = {
    source: "Mumbai",
    destination: "Manali",
    startDate: "2024-12-15",
    endDate: "2024-12-17",
    travelers: 2,
    budget: 25000,
    currency: "INR",
    travelMode: "Train",
    hotelType: "Comfort",
    foodPreference: "Local Cuisine",
    tripType: "Relaxed",
    interests: ["Heritage", "Relaxed"]
  };
  
  console.log("Starting generation...");
  const result = await generateTripPlan(tripData);
  // console.log("Result:", JSON.stringify(result, null, 2));
}

runTest().catch(console.error).finally(() => process.exit(0));
