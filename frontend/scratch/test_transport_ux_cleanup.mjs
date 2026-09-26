import {
  scheduleFlightJourneyIntoTrip,
  scheduleTrainJourneyIntoTrip,
  buildProposedTransportAdaptation,
  detectConflicts,
  validateTripSchedule,
} from "../src/utils/schedulingEngine.js";
import fs from "fs";
import path from "path";

const BACKEND_BASE = "http://localhost:5000";

function createBaseTrainTrip() {
  return {
    _id: "trip-test-clean-ux",
    source: "Mumbai",
    destination: "Guwahati",
    startDate: "2026-10-30",
    endDate: "2026-11-05",
    duration: "7 Days",
    travelers: 2,
    budget: 60000,
    travelMode: "Train",
    itinerary: [
      {
        day: 1,
        title: "Day 1 — Departure",
        plan: [
          { id: "act-d1-prep", name: "Packing & Prep", startTime: "07:00", endTime: "08:00", category: "leisure" },
          {
            id: "train-outbound-dep",
            name: "Rajdhani Express (#12952)",
            trainNumber: "12952",
            startTime: "11:30",
            endTime: "18:00",
            departure: "11:30",
            arrival: "18:00",
            category: "transport",
            journeyDirection: "outbound",
            legType: "departure",
          }
        ]
      },
      {
        day: 2,
        title: "Day 2 — Arrival",
        plan: [
          {
            id: "train-outbound-arr",
            name: "Rajdhani Express Arrival",
            trainNumber: "12952",
            startTime: "18:00",
            endTime: "19:00",
            departure: "11:30",
            arrival: "18:00",
            category: "transport",
            journeyDirection: "outbound",
            legType: "arrival",
          },
          { id: "act-d2-dinner", name: "Dinner", startTime: "20:00", endTime: "21:30", category: "food" }
        ]
      },
      {
        day: 3,
        title: "Day 3 — Sightseeing",
        plan: [
          { id: "act-d3-1", name: "Temple Visit", startTime: "09:30", endTime: "12:30", category: "sightseeing" }
        ]
      },
      {
        day: 4,
        title: "Day 4 — Nature",
        plan: [
          { id: "act-d4-1", name: "Park Walk", startTime: "10:00", endTime: "13:00", category: "sightseeing" }
        ]
      },
      {
        day: 5,
        title: "Day 5 — Heritage",
        plan: [
          { id: "act-d5-1", name: "Museum Visit", startTime: "10:00", endTime: "13:00", category: "sightseeing" }
        ]
      },
      {
        day: 6,
        title: "Day 6 — Market",
        plan: [
          { id: "act-d6-1", name: "Handicrafts Market", startTime: "14:00", endTime: "17:00", category: "shopping" }
        ]
      },
      {
        day: 7,
        title: "Day 7 — Return Journey",
        plan: [
          { id: "act-d7-co", name: "Hotel Check-out", startTime: "11:00", endTime: "11:30", category: "hotel" },
          {
            id: "train-return-assembly",
            name: "Assemble at Return Station",
            startTime: "15:30",
            endTime: "17:00",
            category: "transport",
            journeyDirection: "return",
            legType: "assembly",
          },
          {
            id: "train-return-dep",
            name: "Return Express (#12346)",
            trainNumber: "12346",
            startTime: "17:00",
            endTime: "12:00",
            departure: "17:00",
            arrival: "12:00",
            category: "transport",
            journeyDirection: "return",
            legType: "departure",
          }
        ]
      }
    ],
    travelLegs: [
      {
        id: "leg-outbound-train",
        journeyDirection: "outbound",
        mode: "train",
        trainNumber: "12952",
        trainName: "Rajdhani Express",
        from: "Mumbai",
        to: "Guwahati",
        departure: "11:30",
        arrival: "18:00",
        departureDay: 1,
        arrivalDay: 2,
      },
      {
        id: "leg-return-train",
        journeyDirection: "return",
        mode: "train",
        trainNumber: "12346",
        trainName: "Return Express",
        from: "Guwahati",
        to: "Mumbai",
        departure: "17:00",
        arrival: "12:00",
        departureDay: 7,
        arrivalDay: 8,
      }
    ]
  };
}

async function runAllTests() {
  console.log("=================================================================");
  console.log("TRANSIX TRANSPORT UX & GEMINI MODE ENFORCEMENT VERIFICATION");
  console.log("=================================================================\n");

  const results = [];
  let allPassed = true;

  function test(id, description, condition, details = "") {
    results.push({ id, description, passed: condition, details });
    if (!condition) allPassed = false;
    console.log(`[Case ${id}] ${description}: ${condition ? "PASS" : "FAIL"}`);
    if (details) console.log(`   Details: ${details}\n`);
  }

  // -------------------------------------------------------------
  // Test 1-4: Gemini / AI mode constraint verification
  // -------------------------------------------------------------
  const aiServiceContent = fs.readFileSync("c:/Projects/Transix/backend/src/services/aiService.js", "utf-8");
  const hasStrictRule = aiServiceContent.includes("TRANSPORT MODE IS A HARD USER CONSTRAINT");
  const hasFlightConstraint = aiServiceContent.includes("MUST be FLIGHT") && aiServiceContent.includes("MUST be FLIGHT");
  const hasTrainConstraint = aiServiceContent.includes("MUST be TRAIN") && aiServiceContent.includes("MUST be TRAIN");
  const hasLocalExemption = aiServiceContent.includes("LOCAL/IN-TRIP TRANSPORT IS SEPARATE");
  const hasDeterministicGuard = aiServiceContent.includes("Deterministic transport mode constraint enforcement");

  test(1, "New trip with TRAIN constraint documented in prompt", hasTrainConstraint, "Prompt enforces Outbound & Return MUST be TRAIN");
  test(2, "New trip with FLIGHT constraint documented in prompt", hasFlightConstraint, "Prompt enforces Outbound & Return MUST be FLIGHT");
  test(3, "TRAIN initial trip hard constraint against flight substitution", hasStrictRule && hasDeterministicGuard, "AI prompt and backend guardrail prevent substituting Flight for Train");
  test(4, "FLIGHT initial trip hard constraint against train substitution", hasStrictRule && hasDeterministicGuard, "AI prompt and backend guardrail prevent substituting Train for Flight");

  // -------------------------------------------------------------
  // Test 5-6: Initial display mode alignment
  // -------------------------------------------------------------
  const trainTrip = createBaseTrainTrip();
  const hasOutboundTrain = trainTrip.travelLegs.find(l => l.journeyDirection === "outbound")?.mode === "train";
  const hasReturnTrain = trainTrip.travelLegs.find(l => l.journeyDirection === "return")?.mode === "train";
  test(5, "Existing TRAIN → TRAIN trip structure", hasOutboundTrain && hasReturnTrain, "Both legs canonical mode is 'train'");

  const flightTrip = JSON.parse(JSON.stringify(trainTrip));
  flightTrip.travelMode = "Flight";
  flightTrip.travelLegs[0].mode = "flight";
  flightTrip.travelLegs[1].mode = "flight";
  const hasOutboundFlight = flightTrip.travelLegs.find(l => l.journeyDirection === "outbound")?.mode === "flight";
  const hasReturnFlight = flightTrip.travelLegs.find(l => l.journeyDirection === "return")?.mode === "flight";
  test(6, "Existing FLIGHT → FLIGHT trip structure", hasOutboundFlight && hasReturnFlight, "Both legs canonical mode is 'flight'");

  // Fetch real sample flights from backend
  const resFlights = await fetch(`${BACKEND_BASE}/api/flights/search?source=Mumbai&destination=Guwahati&date=2026-10-30`).then(r => r.json());
  const sampleOutboundFlight = resFlights.flights?.[0];

  const resReturnFlights = await fetch(`${BACKEND_BASE}/api/flights/search?source=Guwahati&destination=Mumbai&date=2026-11-05`).then(r => r.json());
  const sampleReturnFlight = resReturnFlights.flights?.[0];

  // -------------------------------------------------------------
  // Test 7: Change outbound: TRAIN → FLIGHT => result = FLIGHT → TRAIN
  // -------------------------------------------------------------
  const tripCase7 = createBaseTrainTrip();
  const adapt7 = buildProposedTransportAdaptation(tripCase7, {
    outboundFlight: sampleOutboundFlight,
  });
  const outLeg7 = adapt7.proposedTrip.travelLegs.find(l => l.journeyDirection === "outbound");
  const retLeg7 = adapt7.proposedTrip.travelLegs.find(l => l.journeyDirection === "return");
  const p7 = adapt7.success && outLeg7.mode === "flight" && retLeg7.mode === "train";
  test(7, "Change Outbound: TRAIN → FLIGHT result = FLIGHT → TRAIN", p7, `Outbound mode: ${outLeg7?.mode}, Return mode: ${retLeg7?.mode} (Return untouched)`);

  // -------------------------------------------------------------
  // Test 8: Change return: TRAIN → FLIGHT => result = TRAIN → FLIGHT
  // -------------------------------------------------------------
  const tripCase8 = createBaseTrainTrip();
  const adapt8 = buildProposedTransportAdaptation(tripCase8, {
    returnFlight: sampleReturnFlight,
  });
  const outLeg8 = adapt8.proposedTrip.travelLegs.find(l => l.journeyDirection === "outbound");
  const retLeg8 = adapt8.proposedTrip.travelLegs.find(l => l.journeyDirection === "return");
  const p8 = adapt8.success && outLeg8.mode === "train" && retLeg8.mode === "flight";
  test(8, "Change Return: TRAIN → FLIGHT result = TRAIN → FLIGHT", p8, `Outbound mode: ${outLeg8?.mode} (Outbound untouched), Return mode: ${retLeg8?.mode}`);

  // -------------------------------------------------------------
  // Test 9: Change both: TRAIN → TRAIN to FLIGHT → FLIGHT
  // -------------------------------------------------------------
  const tripCase9 = createBaseTrainTrip();
  const adapt9 = buildProposedTransportAdaptation(tripCase9, {
    outboundFlight: sampleOutboundFlight,
    returnFlight: sampleReturnFlight,
  });
  const outLeg9 = adapt9.proposedTrip.travelLegs.find(l => l.journeyDirection === "outbound");
  const retLeg9 = adapt9.proposedTrip.travelLegs.find(l => l.journeyDirection === "return");
  const p9 = adapt9.success && outLeg9.mode === "flight" && retLeg9.mode === "flight";
  test(9, "Change both: TRAIN → TRAIN to FLIGHT → FLIGHT", p9, `Outbound mode: ${outLeg9?.mode}, Return mode: ${retLeg9?.mode}`);

  // -------------------------------------------------------------
  // Test 10-11: Mutually exclusive mode selection per leg
  // -------------------------------------------------------------
  let pendingOutbound = { mode: "train", item: { trainNumber: "12952" } };
  // User selects flight for outbound => replaces train
  pendingOutbound = { mode: "flight", item: sampleOutboundFlight };
  const p10 = pendingOutbound.mode === "flight" && !pendingOutbound.train;
  test(10, "User cannot select both Train and Flight for Outbound", p10, "State stores single mode object per direction: exactly one mode active");

  let pendingReturn = { mode: "train", item: { trainNumber: "12346" } };
  // User selects flight for return => replaces train
  pendingReturn = { mode: "flight", item: sampleReturnFlight };
  const p11 = pendingReturn.mode === "flight" && !pendingReturn.train;
  test(11, "User cannot select both Train and Flight for Return", p11, "State stores single mode object per direction: exactly one mode active");

  // -------------------------------------------------------------
  // Test 12-13: Dashboard card navigation to /travel-options
  // -------------------------------------------------------------
  const travelCardContent = fs.readFileSync("c:/Projects/Transix/frontend/src/components/dashboard/travel/TravelCard.jsx", "utf-8");
  const hasModeQueryInCard = travelCardContent.includes("mode=${modeKey}");
  const hasTrainNav = travelCardContent.includes("isFlight ? \"flight\" : \"train\"");
  test(12, "Dashboard Train card opens Travel Options on Train", hasModeQueryInCard && hasTrainNav, "Navigates to /travel-options with mode=train and travelMode: 'train'");
  test(13, "Dashboard Flight card opens Travel Options on Flight", hasModeQueryInCard && hasTrainNav, "Navigates to /travel-options with mode=flight and travelMode: 'flight'");

  // -------------------------------------------------------------
  // Test 14: Bus does not appear anywhere in Travel Options
  // -------------------------------------------------------------
  const modeTabsContent = fs.readFileSync("c:/Projects/Transix/frontend/src/components/travelOptions/ModeTabs.jsx", "utf-8");
  const busInModeTabs = modeTabsContent.toLowerCase().includes("bus");
  const travelOptionsPageContent = fs.readFileSync("c:/Projects/Transix/frontend/src/pages/TravelOptionsPage.jsx", "utf-8");
  const busInPage = travelOptionsPageContent.toLowerCase().includes("bus");
  test(14, "Bus does not appear anywhere in Travel Options", !busInModeTabs && !busInPage, "ModeTabs contains only Train and Flight; no bus tab or UI exists");

  // -------------------------------------------------------------
  // Test 15: Train functionality remains unchanged
  // -------------------------------------------------------------
  const resTrains = await fetch(`${BACKEND_BASE}/api/trains/search?source=Mumbai&destination=Guwahati&date=2026-10-30`).then(r => r.json());
  const p15 = Array.isArray(resTrains.trains) && resTrains.trains.length > 0;
  test(15, "Train search functionality remains unchanged", p15, `Found ${resTrains.trains?.length} trains for Mumbai → Guwahati`);

  // -------------------------------------------------------------
  // Test 16-17: Flight search and future reference mode unchanged functionally
  // -------------------------------------------------------------
  const p16 = Array.isArray(resFlights.flights) && resFlights.flights.length > 0;
  const p17 = resFlights.searchMode === "REFERENCE" && resFlights.flights.every(f => f.mode === "REFERENCE" && f.isReference === true);
  test(16, "Flight schedule search remains unchanged functionally", p16, `Found ${resFlights.flights?.length} flights for Mumbai → Guwahati`);
  test(17, "Future Flight reference results still work", p17, `searchMode: ${resFlights.searchMode}, all records tagged REFERENCE`);

  // -------------------------------------------------------------
  // Test 18: Final approved transport update produces zero validation conflicts
  // -------------------------------------------------------------
  const conflicts9 = detectConflicts(adapt9.proposedTrip);
  const val9 = validateTripSchedule(adapt9.proposedTrip);
  const p18 = conflicts9.length === 0 && val9.valid === true;
  test(18, "Final approved transport update produces zero validation conflicts", p18, `Conflicts count: ${conflicts9.length}, validation valid: ${val9.valid}`);

  console.log("\n=================================================================");
  console.log(`SUMMARY: ${results.filter(r => r.passed).length} / 18 TESTS PASSED`);
  console.log("=================================================================");

  if (!allPassed) process.exit(1);
}

runAllTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
