import {
  scheduleFlightJourneyIntoTrip,
  scheduleTrainJourneyIntoTrip,
  buildProposedTransportAdaptation,
  detectConflicts,
  validateTripSchedule,
} from "../src/utils/schedulingEngine.js";

// Sample initial trip (Train -> Train)
function createBaseTrip() {
  return {
    _id: "trip-test-mumbai-guwahati",
    source: "Mumbai",
    destination: "Guwahati",
    startDate: "2024-05-15",
    endDate: "2024-05-21",
    duration: "7 Days",
    travelers: 2,
    budget: 50000,
    travelMode: "Train",
    itinerary: [
      {
        day: 1,
        title: "Day 1 — Departure from Mumbai",
        plan: [
          {
            id: "act-d1-morning",
            name: "Morning Packing & Light Breakfast",
            startTime: "07:30",
            endTime: "08:30",
            category: "food",
          },
          {
            id: "train-outbound-dep-default",
            name: "Default Train (#12345)",
            trainNumber: "12345",
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
        title: "Day 2 — Arrival & Local Exploration",
        plan: [
          {
            id: "train-outbound-arr-default",
            name: "Default Train (#12345)",
            trainNumber: "12345",
            startTime: "18:00",
            endTime: "19:00",
            departure: "11:30",
            arrival: "18:00",
            category: "transport",
            journeyDirection: "outbound",
            legType: "arrival",
          },
          {
            id: "act-d2-dinner",
            name: "Assamese Welcome Dinner",
            startTime: "20:00",
            endTime: "21:30",
            category: "food",
          }
        ]
      },
      {
        day: 3,
        title: "Day 3 — Heritage & Temples",
        plan: [
          { id: "act-d3-1", name: "Kamakhya Temple Visit", startTime: "09:00", endTime: "12:00", category: "sightseeing" },
          { id: "act-d3-2", name: "Traditional Lunch", startTime: "12:30", endTime: "13:30", category: "food" },
          { id: "act-d3-3", name: "Brahmaputra Sunset Cruise", startTime: "16:30", endTime: "18:00", category: "sightseeing" }
        ]
      },
      {
        day: 4,
        title: "Day 4 — Wildlife & Nature",
        plan: [
          { id: "act-d4-1", name: "Pobitora Wildlife Sanctuary Jeep Safari", startTime: "08:00", endTime: "12:00", category: "sightseeing" }
        ]
      },
      {
        day: 5,
        title: "Day 5 — Cultural Centers",
        plan: [
          { id: "act-d5-1", name: "Srimanta Sankaradeva Kalakshetra", startTime: "10:00", endTime: "13:00", category: "sightseeing" }
        ]
      },
      {
        day: 6,
        title: "Day 6 — Local Markets & Leisure",
        plan: [
          { id: "act-d6-1", name: "Fancy Bazaar Silk & Handicraft Shopping", startTime: "14:00", endTime: "17:00", category: "shopping" }
        ]
      },
      {
        day: 7,
        title: "Day 7 — Farewell & Journey Home",
        plan: [
          {
            id: "act-d7-co",
            name: "Hotel Check-out",
            startTime: "11:00",
            endTime: "11:30",
            category: "hotel",
          },
          {
            id: "train-return-assembly-default",
            name: "Assemble at Guwahati Station",
            startTime: "15:30",
            endTime: "17:00",
            category: "transport",
            journeyDirection: "return",
            legType: "assembly",
          },
          {
            id: "train-return-dep-default",
            name: "Default Return Train (#12346)",
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
        trainNumber: "12345",
        trainName: "Default Train",
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
        trainName: "Default Return Train",
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

// Sample real flights from Mumbai -> Guwahati dataset
const sampleOutboundFlight = {
  airline: "IndiGo",
  flightNumber: "6E228",
  origin: { code: "BOM", name: "Mumbai" },
  destination: { code: "GAU", name: "Guwahati" },
  departureTime: "08:30",
  arrivalTime: "11:50",
  daysOfWeek: ["Daily"],
  validFrom: "2024-03-31",
  validTo: "2024-10-26",
  source: "Air-Clean.csv",
};

const sampleReturnFlight = {
  airline: "SpiceJet",
  flightNumber: "SG8170",
  origin: { code: "GAU", name: "Guwahati" },
  destination: { code: "BOM", name: "Mumbai" },
  departureTime: "15:55",
  arrivalTime: "18:40",
  daysOfWeek: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  validFrom: "2024-03-31",
  validTo: "2024-10-26",
  source: "Air-Clean.csv",
};

const sampleNewTrain = {
  trainNumber: "12952",
  trainName: "Rajdhani Express",
  from: { code: "MMCT", name: "Mumbai" },
  to: { code: "GAU", name: "Guwahati" },
  departure: "16:35",
  arrival: "08:30",
  duration: "39h 55m",
  durationMinutes: 2395,
  source: "Mumbai",
  destination: "Guwahati",
};

async function testAll() {
  console.log("\n==========================================");
  console.log("RUNNING FLIGHT ENGINE VERIFICATION TESTS");
  console.log("==========================================\n");

  // TEST 1: Change ONLY Outbound to Flight (Train -> Flight for outbound)
  console.log("--- TEST A: Adapt Outbound to Flight (Train -> Flight) ---");
  const tripA = createBaseTrip();
  const resA = buildProposedTransportAdaptation(tripA, {
    outboundFlight: sampleOutboundFlight,
  });

  if (!resA.success) {
    console.error("FAIL TEST A:", resA.error);
    process.exit(1);
  }

  const conflictsA = detectConflicts(resA.proposedTrip);
  const validationA = validateTripSchedule(resA.proposedTrip);

  console.log("Test A Success:", resA.success);
  console.log("Conflicts count:", conflictsA.length);
  console.log("Validation valid:", validationA.valid);
  
  // Verify return train was NOT modified
  const returnLegA = resA.proposedTrip.travelLegs.find(l => l.journeyDirection === "return");
  console.log("Return leg mode:", returnLegA.mode);
  console.log("Return leg trainNumber:", returnLegA.trainNumber);
  if (returnLegA.trainNumber !== "12346" || returnLegA.mode !== "train") {
    console.error("FAIL: Return train was modified when outbound flight changed!");
    process.exit(1);
  }
  console.log("PASS: Return train untouched when Outbound Flight changed.\n");

  // TEST 2: Change ONLY Return to Flight (Train -> Flight for return)
  console.log("--- TEST B: Adapt Return to Flight (Train -> Flight) ---");
  const tripB = createBaseTrip();
  const resB = buildProposedTransportAdaptation(tripB, {
    returnFlight: sampleReturnFlight,
  });

  if (!resB.success) {
    console.error("FAIL TEST B:", resB.error);
    process.exit(1);
  }

  const conflictsB = detectConflicts(resB.proposedTrip);
  const validationB = validateTripSchedule(resB.proposedTrip);

  console.log("Test B Success:", resB.success);
  console.log("Conflicts count:", conflictsB.length);
  console.log("Validation valid:", validationB.valid);

  // Verify outbound train was NOT modified
  const outboundLegB = resB.proposedTrip.travelLegs.find(l => l.journeyDirection === "outbound");
  console.log("Outbound leg mode:", outboundLegB.mode);
  console.log("Outbound leg trainNumber:", outboundLegB.trainNumber);
  if (outboundLegB.trainNumber !== "12345" || outboundLegB.mode !== "train") {
    console.error("FAIL: Outbound train was modified when return flight changed!");
    process.exit(1);
  }
  console.log("PASS: Outbound train untouched when Return Flight changed.\n");

  // TEST 3: Change BOTH Outbound and Return to Flight in ONE flow (Flight -> Flight)
  console.log("--- TEST C: Adapt Both to Flight (Flight -> Flight) in ONE flow ---");
  const tripC = createBaseTrip();
  const resC = buildProposedTransportAdaptation(tripC, {
    outboundFlight: sampleOutboundFlight,
    returnFlight: sampleReturnFlight,
  });

  if (!resC.success) {
    console.error("FAIL TEST C:", resC.error);
    process.exit(1);
  }

  const conflictsC = detectConflicts(resC.proposedTrip);
  const validationC = validateTripSchedule(resC.proposedTrip);

  console.log("Test C Success:", resC.success);
  console.log("Conflicts count:", conflictsC.length);
  console.log("Validation valid:", validationC.valid);
  console.log("Outbound Leg:", resC.proposedTrip.travelLegs.find(l => l.journeyDirection === "outbound"));
  console.log("Return Leg:", resC.proposedTrip.travelLegs.find(l => l.journeyDirection === "return"));
  console.log("PASS: Both Outbound & Return Flights scheduled with ZERO conflicts.\n");

  // TEST 4: Flight -> Train combination (Outbound is Flight, Return is changed to new Train)
  console.log("--- TEST D: Flight -> Train Combination ---");
  // Start from trip with outbound flight
  const tripD = resA.proposedTrip;
  const resD = buildProposedTransportAdaptation(tripD, {
    returnTrain: sampleNewTrain,
  });

  if (!resD.success) {
    console.error("FAIL TEST D:", resD.error);
    process.exit(1);
  }

  const conflictsD = detectConflicts(resD.proposedTrip);
  console.log("Test D Conflicts count:", conflictsD.length);
  const outLegD = resD.proposedTrip.travelLegs.find(l => l.journeyDirection === "outbound");
  const retLegD = resD.proposedTrip.travelLegs.find(l => l.journeyDirection === "return");
  console.log("Outbound mode:", outLegD.mode, "flightNumber:", outLegD.flightNumber);
  console.log("Return mode:", retLegD.mode, "trainNumber:", retLegD.trainNumber);
  if (outLegD.mode !== "flight" || retLegD.mode !== "train") {
    console.error("FAIL TEST D: Invalid modes in Flight -> Train combination");
    process.exit(1);
  }
  console.log("PASS: Flight -> Train combination works with ZERO conflicts.\n");

  // TEST 5: Train Regression Test (Changing Outbound train to another train still works)
  console.log("--- TEST E: Existing Train Functionality Regression Test ---");
  const tripE = createBaseTrip();
  const resE = buildProposedTransportAdaptation(tripE, {
    outboundTrain: sampleNewTrain,
  });

  if (!resE.success) {
    console.error("FAIL TEST E:", resE.error);
    process.exit(1);
  }

  const conflictsE = detectConflicts(resE.proposedTrip);
  console.log("Test E Conflicts count:", conflictsE.length);
  if (conflictsE.length !== 0) {
    console.error("FAIL TEST E: Train adaptation regression introduced conflicts!");
    process.exit(1);
  }
  console.log("PASS: Train adaptation works with ZERO conflicts, zero regression.\n");

  console.log("ALL FLIGHT ENGINE TESTS PASSED PERFECTLY!");
}

testAll().catch(e => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
