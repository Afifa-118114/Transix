const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const { generateTripPlan } = require("./src/services/aiService");
const { detectConflicts } = require("./src/services/itineraryValidator");

async function runKeralaTest() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  console.log("Connected to MongoDB.");

  const payload = {
    source: "Mumbai",
    destination: "Kerala",
    startDate: "2026-12-20",
    endDate: "2026-12-26",
    travelers: 2,
    budget: 50000,
    currency: "INR",
    travelMode: "Train",
    hotelType: "Standard",
    foodPreference: "Any",
    tripType: "Couple",
    interests: ["Nature", "Backwaters", "Culture"]
  };

  console.log("\n==========================================");
  console.log("Testing Exact Kerala Train Scenario");
  console.log("2026-12-20 -> 2026-12-26 | Mumbai -> Kerala | Train");
  console.log("==========================================\n");

  const result = await generateTripPlan(payload);

  console.log("\n--- GENERATION RESULT ---");
  console.log("Summary:", result.summary);
  console.log("Validation valid:", result.validation?.valid);
  if (result.validation && !result.validation.valid) {
    console.log("Validation errors:", result.validation.errors);
  }

  console.log("\nTravel Legs (count: " + (result.travelLegs?.length || 0) + "):");
  result.travelLegs?.forEach((leg, i) => {
    console.log(`Leg ${i + 1}:`, {
      mode: leg.mode,
      trainNumber: leg.trainNumber,
      trainName: leg.trainName,
      departureDate: leg.departureDate,
      departureTime: leg.departureTime,
      departureDateTime: leg.departureDateTime,
      arrivalDate: leg.arrivalDate,
      arrivalTime: leg.arrivalTime,
      arrivalDateTime: leg.arrivalDateTime,
      isOvernight: leg.isOvernight,
      cost: leg.estimatedCost
    });
  });

  console.log("\nStay Segments:");
  console.log(result.staySegments);

  console.log("\nBudget Breakdown:");
  console.log(result.budgetBreakdown);

  // Check schedule conflicts
  const conflicts = detectConflicts({
    days: result.days,
    travelLegs: result.travelLegs,
    staySegments: result.staySegments,
    startDate: payload.startDate
  });
  console.log("Schedule conflicts count:", conflicts.length);
  if (conflicts.length > 0) {
    console.log("Conflicts:", conflicts);
  }

  console.log("\nDay-wise Plans:");
  result.days?.forEach((d) => {
    console.log(`\nDay ${d.day}: ${d.title}`);
    d.plan?.forEach((p) => {
      console.log(`  [${p.time}] (${p.category}) ${p.activity} @ ${p.place || ''}`);
    });
  });

  // Assertions
  const outLeg = result.travelLegs?.[0];
  const retLeg = result.travelLegs?.[1];

  let passed = true;
  if (!outLeg || outLeg.mode !== "Train") {
    console.error("FAIL: Outbound is not Train!");
    passed = false;
  }
  if (!retLeg || retLeg.mode !== "Train") {
    console.error("FAIL: Return is not Train!");
    passed = false;
  }
  if (retLeg && retLeg.arrivalDate > payload.endDate) {
    console.error(`FAIL: Return arrives on ${retLeg.arrivalDate}, which is past trip end ${payload.endDate}!`);
    passed = false;
  }
  if (retLeg && retLeg.departureDate > payload.endDate) {
    console.error(`FAIL: Return departs on ${retLeg.departureDate}, which is past trip end ${payload.endDate}!`);
    passed = false;
  }
  if (!result.validation?.valid) {
    console.error("FAIL: Validation is not valid!");
    passed = false;
  }
  if (conflicts.length > 0) {
    console.error("FAIL: Residual schedule conflicts found!");
    passed = false;
  }

  if (passed) {
    console.log("\n✅ ALL KERALA SCENARIO ACCEPTANCE CRITERIA PASSED!");
  } else {
    console.log("\n❌ SOME CRITERIA FAILED");
  }

  await mongoose.disconnect();
  process.exit(passed ? 0 : 1);
}

runKeralaTest().catch(async err => {
  console.error("Test error:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
