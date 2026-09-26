/**
 * Backend Tests for Guide Geographic Normalization and Matching Engine
 * Covers all scenarios required by Transix Guide Workflow:
 * 1. Manali -> Himachal Pradesh
 * 2. Munnar -> Kerala
 * 3. Mumbai -> Maharashtra
 * 4. A route already containing a state (e.g. "Himachal Pradesh" or "Kerala")
 * 5. A route with multiple destinations/states (e.g. Manali + Kochi)
 * 6. A route where no geographically suitable guide exists
 * 7. Verification that approved guides with Himachal Pradesh are returned with sensitive docs stripped
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const {
  resolveLocationToState,
  resolveTripLocationsToStates,
  matchGuidesForTrip,
} = require("../services/guideMatchingEngine");

async function runTests() {
  console.log("========================================================");
  console.log("RUNNING GUIDE MATCHING & STATE NORMALIZATION TEST SUITE");
  console.log("========================================================");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB for tests");

  let passed = 0;
  let failed = 0;

  const assert = (condition, desc) => {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  };

  // 1. Manali -> Himachal Pradesh
  console.log("\n[TEST 1] Resolving City: Manali -> Himachal Pradesh");
  const stateManali = await resolveLocationToState("Manali");
  assert(stateManali === "Himachal Pradesh", `Manali resolves to 'Himachal Pradesh' (got '${stateManali}')`);

  const stateManaliVariation = await resolveLocationToState("  manali, india  ");
  assert(stateManaliVariation === "Himachal Pradesh", `Whitespace & suffix variation '  manali, india  ' resolves to 'Himachal Pradesh'`);

  // 2. Munnar -> Kerala
  console.log("\n[TEST 2] Resolving City: Munnar -> Kerala");
  const stateMunnar = await resolveLocationToState("Munnar");
  assert(stateMunnar === "Kerala", `Munnar resolves to 'Kerala' (got '${stateMunnar}')`);

  // 3. Mumbai -> Maharashtra
  console.log("\n[TEST 3] Resolving City: Mumbai -> Maharashtra");
  const stateMumbai = await resolveLocationToState("Mumbai");
  assert(stateMumbai === "Maharashtra", `Mumbai resolves to 'Maharashtra' (got '${stateMumbai}')`);

  const stateJaipur = await resolveLocationToState("Jaipur");
  assert(stateJaipur === "Rajasthan", `Jaipur resolves to 'Rajasthan' (got '${stateJaipur}')`);

  // 4. A route already containing a state
  console.log("\n[TEST 4] Route already containing a state name");
  const stateAlreadyHP = await resolveLocationToState("Himachal Pradesh");
  assert(stateAlreadyHP === "Himachal Pradesh", `'Himachal Pradesh' is preserved as 'Himachal Pradesh'`);

  const stateAlreadyKerala = await resolveLocationToState("Kerala");
  assert(stateAlreadyKerala === "Kerala", `'Kerala' is preserved as 'Kerala'`);

  const resolutionAlreadyState = await resolveTripLocationsToStates({ destination: "Himachal Pradesh" });
  assert(
    resolutionAlreadyState.tripStates.includes("Himachal Pradesh") && resolutionAlreadyState.tripStates.length === 1,
    `Trip with destination 'Himachal Pradesh' resolves to ['Himachal Pradesh']`
  );
  assert(
    resolutionAlreadyState.routeDisplayText === "Geographically matched based on trip route: Himachal Pradesh",
    `Route display text is 'Geographically matched based on trip route: Himachal Pradesh' (got '${resolutionAlreadyState.routeDisplayText}')`
  );

  // 5. A route with multiple destinations/states
  console.log("\n[TEST 5] Route with multiple destinations/states");
  const multiResolution = await resolveTripLocationsToStates({
    destination: "Manali",
    itinerary: [
      { destination: "Kochi" },
      { plan: [{ place: "Panjim" }] },
    ],
  });
  assert(
    multiResolution.tripStates.includes("Himachal Pradesh") &&
    multiResolution.tripStates.includes("Kerala") &&
    multiResolution.tripStates.includes("Goa"),
    `Multi-destination route contains ['Himachal Pradesh', 'Kerala', 'Goa'] (got ${JSON.stringify(multiResolution.tripStates)})`
  );
  assert(
    multiResolution.routeDisplayText.startsWith("Geographically matched based on trip route states:"),
    `Multi-destination route display text uses 'Geographically matched based on trip route states:' (got '${multiResolution.routeDisplayText}')`
  );

  // 6. A route where no geographically suitable guide exists
  console.log("\n[TEST 6] Route where no geographic location or guide exists");
  const unknownState = await resolveLocationToState("NonExistentCityXYZ99");
  assert(unknownState === null, `Unrecognized location returns null`);

  // Test 6b: matchGuidesForTrip on non-existent route
  const nonExistentMatch = await matchGuidesForTrip({ destination: "NonExistentCityXYZ99" });
  assert(
    nonExistentMatch.matchedGuides.length === 0 && nonExistentMatch.totalMatches === 0,
    `Non-existent route returns 0 matched guides without fabricating fake profiles`
  );

  // 7. Manually verify requirement 20:
  // Destination: Manali, Guides: 1, Gender: Either, Languages: English, Hindi
  console.log("\n[TEST 7] Full Verification: Trip with Destination: Manali, Guides: 1, Gender: Either, Languages: English, Hindi");
  const manaliTrip = {
    destination: "Manali",
    travelers: 4,
    guideRequirement: {
      required: true,
      numberOfGuides: "1",
      genderPreference: "Either",
      preferredLanguages: ["English", "Hindi"],
    },
  };

  const manaliMatch = await matchGuidesForTrip(manaliTrip);
  console.log(`  Resolved tripStates: ${JSON.stringify(manaliMatch.tripStates)}`);
  console.log(`  Route Display Text: "${manaliMatch.routeDisplayText}"`);
  console.log(`  Matched Guides Count: ${manaliMatch.matchedGuides.length}`);

  assert(
    manaliMatch.tripStates.includes("Himachal Pradesh"),
    `Resolved tripStates includes 'Himachal Pradesh'`
  );
  assert(
    manaliMatch.routeDisplayText === "Geographically matched based on trip route: Manali → Himachal Pradesh",
    `Exact display text 'Geographically matched based on trip route: Manali → Himachal Pradesh'`
  );
  assert(
    manaliMatch.matchedGuides.length > 0,
    `Returns approved matching guides (found ${manaliMatch.matchedGuides.length})`
  );

  // Verify all returned guides have Himachal Pradesh in geographicalKnowledge.states
  let allHP = true;
  let sensitiveDocsFound = false;

  manaliMatch.matchedGuides.forEach((guide) => {
    const states = guide.geographicalKnowledge?.states || [];
    if (!states.includes("Himachal Pradesh")) {
      allHP = false;
    }
    if (guide.documents && (guide.documents.aadhaar || guide.documents.passport || guide.documents.drivingLicense)) {
      sensitiveDocsFound = true;
    }
  });

  assert(allHP, `Every returned guide has 'Himachal Pradesh' in geographicalKnowledge.states`);
  assert(!sensitiveDocsFound, `No sensitive identity documents (Aadhaar, Passport, DL) are exposed`);

  await mongoose.disconnect();

  console.log("\n========================================================");
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
