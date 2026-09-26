const { generateAlternatives, applyAlternative } = require("../services/smartshiftService");
const assert = require("assert");

function runSmartShiftTests() {
  console.log("🧪 Running SmartShift Engine Integration Tests...\n");

  const sampleTrip = {
    _id: "trip-test-01",
    updatedAt: new Date().toISOString(),
    itinerary: [
      {
        day: 1,
        plan: [
          {
            id: "item-101",
            name: "Morning Heritage Tour",
            activity: "Morning Heritage Tour",
            category: "Sightseeing",
            startTime: "10:00 AM",
            endTime: "01:00 PM",
            durationMinutes: 180,
            estimatedCost: 500,
            price: 500,
          },
          {
            id: "item-102",
            name: "Spice Garden Lunch",
            activity: "Spice Garden Lunch",
            category: "Food",
            startTime: "01:30 PM",
            endTime: "02:30 PM",
            durationMinutes: 60,
            estimatedCost: 300,
            price: 300,
          },
          {
            id: "item-103",
            name: "Cultural Evening Museum",
            activity: "Cultural Evening Museum",
            category: "Museum",
            startTime: "04:00 PM",
            endTime: "06:00 PM",
            durationMinutes: 120,
            estimatedCost: 400,
            price: 400,
          },
        ],
      },
      {
        day: 2,
        plan: [],
      },
    ],
  };

  // TEST 1: Generate Alternatives for item-101
  console.log("Test 1: Generate alternatives & downstream impact analysis...");
  const analysis = generateAlternatives(sampleTrip, "item-101", "ACTIVITY_UNAVAILABLE");
  assert.equal(analysis.disruptionDetected, true);
  assert.equal(analysis.affectedItem.title, "Morning Heritage Tour");
  assert.ok(analysis.alternatives.length > 0, "Should generate recovery alternatives");
  console.log("✅ Test 1 Passed: Generated", analysis.alternatives.length, "recovery options.");

  // TEST 2: Downstream impact calculation
  console.log("Test 2: Downstream impact calculation...");
  const delayedAnalysis = generateAlternatives(sampleTrip, "item-101", "TRAIN_DELAYED_90M");
  assert.ok(delayedAnalysis.downstreamImpactCount >= 0);
  console.log("✅ Test 2 Passed: Downstream items evaluated.");

  // TEST 3: Apply Alternative
  console.log("Test 3: Apply recovery plan...");
  const selectedOpt = analysis.alternatives[0];
  const result = applyAlternative(sampleTrip, "item-101", selectedOpt);
  assert.ok(result.trip);
  assert.ok(result.previousItinerary);
  console.log("✅ Test 3 Passed: Applied alternative safely and generated previousItinerary snapshot.");

  // TEST 4: Stale Plan Protection
  console.log("Test 4: Stale plan protection...");
  const staleTrip = { ...sampleTrip, updatedAt: new Date(Date.now() + 100000).toISOString() };
  let staleCaught = false;
  try {
    applyAlternative(staleTrip, "item-101", selectedOpt);
  } catch (err) {
    staleCaught = err.message.includes("outdated");
  }
  assert.ok(staleCaught, "Should reject stale plan when trip.updatedAt is newer");
  console.log("✅ Test 4 Passed: Stale plan protection verified.");

  // TEST 5: Mandatory Transport Protection
  console.log("Test 5: Mandatory transport protection...");
  const transportTrip = {
    _id: "trip-test-02",
    updatedAt: new Date().toISOString(),
    itinerary: [
      {
        day: 1,
        plan: [
          {
            id: "item-train",
            name: "Train to Ernakulam Express (12624)",
            activity: "Train to Ernakulam Express",
            category: "Transport",
            startTime: "08:00 AM",
            endTime: "01:00 PM",
          },
        ],
      },
    ],
  };

  const transportAnalysis = generateAlternatives(transportTrip, "item-train");
  assert.equal(transportAnalysis.noSafeOption, true);
  assert.ok(transportAnalysis.reasons.length > 0);
  console.log("✅ Test 5 Passed: Immutable transport requires manual action.");

  console.log("\n🎉 All SmartShift Engine Tests Passed Successfully!\n");
}

runSmartShiftTests();
