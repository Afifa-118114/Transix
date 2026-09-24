require("dotenv").config();
const mongoose = require("mongoose");
const { generateTripPlan } = require("./src/services/aiService");
const { validateItinerary, detectConflicts } = require("./src/services/itineraryValidator");

async function runTests() {
  console.log("==================================================");
  console.log("TRANSIX AI ITINERARY GENERATION CONTRACT TESTS");
  console.log("==================================================\n");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.\n");

  let passed = 0;
  let failed = 0;

  // TEST A: Train Mode (Outbound = train, Return = train)
  console.log("--- TEST A: Train Mode Hard Constraint ---");
  const trainPayload = {
    source: "Mumbai",
    destination: "Jaipur",
    startDate: "2026-09-18",
    endDate: "2026-09-22",
    travelers: 2,
    budget: 45000,
    currency: "INR",
    travelMode: "Train",
    hotelType: "Standard",
    foodPreference: "Any",
    tripType: "Couple",
    interests: ["History", "Culture"]
  };

  try {
    const resA = await generateTripPlan(trainPayload);
    console.log("Result summary:", resA.summary);
    console.log("Validation valid:", resA.validation?.valid);
    console.log("Travel legs count:", resA.travelLegs?.length);

    const outLeg = resA.travelLegs?.[0];
    const retLeg = resA.travelLegs?.[1];
    console.log(`Outbound: ${outLeg?.mode} from ${outLeg?.from} to ${outLeg?.to} (Fare: ₹${outLeg?.estimatedCost})`);
    console.log(`Return: ${retLeg?.mode} from ${retLeg?.from} to ${retLeg?.to} (Fare: ₹${retLeg?.estimatedCost})`);

    const isTrainOut = String(outLeg?.mode).toLowerCase() === "train";
    const isTrainRet = String(retLeg?.mode).toLowerCase() === "train";

    if (isTrainOut && isTrainRet && resA.validation?.valid) {
      console.log("✅ TEST A PASSED: Both legs are Train and validation passed.\n");
      passed++;
    } else {
      console.log("❌ TEST A FAILED: Expected both Train legs and valid=true.", { isTrainOut, isTrainRet, valid: resA.validation?.valid });
      if (resA.validation?.errors) resA.validation.errors.forEach(e => console.log(`   - ${e.type}: ${e.message}`));
      failed++;
    }
  } catch (e) {
    console.error("❌ TEST A ERROR:", e.message);
    failed++;
  }

  // TEST B: Flight Mode (Outbound = flight, Return = flight)
  console.log("--- TEST B: Flight Mode Hard Constraint ---");
  const flightPayload = {
    source: "Mumbai",
    destination: "Goa",
    startDate: "2026-11-01",
    endDate: "2026-11-04",
    travelers: 2,
    budget: 35000,
    currency: "INR",
    travelMode: "Flight",
    hotelType: "Standard",
    foodPreference: "Any",
    tripType: "Couple",
    interests: ["Relaxation", "Beach"]
  };

  try {
    const resB = await generateTripPlan(flightPayload);
    console.log("Result summary:", resB.summary);
    console.log("Validation valid:", resB.validation?.valid);

    const outLeg = resB.travelLegs?.[0];
    const retLeg = resB.travelLegs?.[1];
    console.log(`Outbound: ${outLeg?.mode} (${outLeg?.flightNumber}) from ${outLeg?.from} to ${outLeg?.to} (Fare: ₹${outLeg?.estimatedCost})`);
    console.log(`Return: ${retLeg?.mode} (${retLeg?.flightNumber}) from ${retLeg?.from} to ${retLeg?.to} (Fare: ₹${retLeg?.estimatedCost})`);

    const isFlightOut = String(outLeg?.mode).toLowerCase() === "flight";
    const isFlightRet = String(retLeg?.mode).toLowerCase() === "flight";

    if (isFlightOut && isFlightRet && resB.validation?.valid) {
      console.log("✅ TEST B PASSED: Both legs are Flight and validation passed.\n");
      passed++;
    } else {
      console.log("❌ TEST B FAILED: Expected both Flight legs and valid=true.", { isFlightOut, isFlightRet, valid: resB.validation?.valid });
      if (resB.validation?.errors) resB.validation.errors.forEach(e => console.log(`   - ${e.type}: ${e.message}`));
      failed++;
    }
  } catch (e) {
    console.error("❌ TEST B ERROR:", e.message);
    failed++;
  }

  // TEST C & D & E: Multi-day stay, budget breakdown, zero conflicts
  console.log("--- TEST C & D & E: Multi-Day Trip, Stay Defaults, Budget Accounting, Zero Conflicts ---");
  const multiPayload = {
    source: "Delhi",
    destination: "Jaipur",
    startDate: "2026-10-10",
    endDate: "2026-10-14", // 5 days, 4 nights
    travelers: 2,
    budget: 50000,
    currency: "INR",
    travelMode: "Train",
    hotelType: "Standard",
    foodPreference: "Veg",
    tripType: "Family",
    interests: ["Culture", "History"]
  };

  try {
    const resC = await generateTripPlan(multiPayload);
    console.log("Stays:", resC.staySegments);
    console.log("Budget Breakdown:", resC.budgetBreakdown);

    // Verify stay segments
    const stay = resC.staySegments?.[0];
    const totalNights = resC.staySegments?.reduce((acc, s) => acc + (s.nights || 0), 0);
    const hasStayCost = resC.staySegments?.some(s => parseFloat(s.estimatedCost) > 0);
    const hasTransportCost = resC.travelLegs?.every(l => parseFloat(l.estimatedCost) > 0);

    // Verify conflicts
    const tripForConflicts = { days: resC.days, travelLegs: resC.travelLegs, staySegments: resC.staySegments, startDate: multiPayload.startDate };
    const conflicts = detectConflicts(tripForConflicts);
    const overlapConflicts = conflicts.filter(c => c.type === "OVERLAP");

    console.log(`Stay nights: ${totalNights} (expected 4), CheckIn: ${stay?.checkIn}, CheckOut: ${resC.staySegments?.[resC.staySegments.length - 1]?.checkOut}`);
    console.log(`Has stay cost: ${hasStayCost}, Has transport cost: ${hasTransportCost}`);
    console.log(`Actual schedule overlap conflicts: ${overlapConflicts.length}`);

    const passC = totalNights === 4 && stay?.checkIn === multiPayload.startDate && resC.staySegments?.[resC.staySegments.length - 1]?.checkOut === multiPayload.endDate;
    const passD = hasStayCost && hasTransportCost && !!resC.budgetBreakdown?.travel && !!resC.budgetBreakdown?.stay;
    const passE = overlapConflicts.length === 0 && resC.validation?.valid;

    if (passC && passD && passE) {
      console.log("✅ TEST C, D, E PASSED: Automatic stays, complete budget, zero conflicts.\n");
      passed += 3;
    } else {
      console.log("❌ TEST C/D/E FAILED:", { passC, passD, passE, overlapConflicts });
      failed++;
    }
  } catch (e) {
    console.error("❌ TEST C/D/E ERROR:", e.message);
    failed++;
  }

  console.log(`\nRESULTS: ${passed} PASSED, ${failed} FAILED.`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error("Fatal test error:", e);
  process.exit(1);
});
