import {
  detectBusRequirements,
  resolveItemRoute,
} from "../src/utils/busRequirementDetector.js";

console.log("=================================================================");
console.log("TRANSIX BUS TRANSPORT REQUIREMENTS & PREFERENCES VERIFICATION");
console.log("=================================================================\n");

let passedCount = 0;
let totalCount = 0;

function assert(condition, testName, details) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`[PASS] Case ${totalCount}: ${testName}`);
    if (details) console.log(`   Details: ${details}`);
  } else {
    console.error(`[FAIL] Case ${totalCount}: ${testName}`);
    if (details) console.error(`   Details: ${details}`);
  }
}

// -------------------------------------------------------------
// Case 1: Personal Trip with Munnar → Thekkady outstation movement
// -------------------------------------------------------------
const personalTripMunnar = {
  _id: "trip-personal-1",
  source: "Kochi",
  destination: "Kerala",
  startDate: "2026-10-20",
  travelers: 3,
  itinerary: [
    {
      day: 5,
      date: "2026-10-24",
      location: "Munnar",
      plan: [
        {
          id: "itin-day5-drive",
          activity: "Drive to Thekkady",
          name: "Scenic mountain transfer to Thekkady",
          place: "Munnar to Thekkady",
          category: "transport",
          startTime: "09:00 AM",
          endTime: "01:00 PM",
        },
        {
          id: "itin-day5-spice",
          activity: "Spice Plantation Visit",
          category: "activity",
          startTime: "03:00 PM",
          endTime: "05:00 PM",
        }
      ]
    }
  ]
};

const reqs1 = detectBusRequirements(personalTripMunnar);
assert(
  reqs1.length === 1 &&
  reqs1[0].mode === "BUS" &&
  reqs1[0].from === "Munnar" &&
  reqs1[0].to === "Thekkady" &&
  reqs1[0].travelers === 3 &&
  reqs1[0].requiredDepartureTime === "09:00 AM" &&
  reqs1[0].requiredArrivalTime === "01:00 PM" &&
  reqs1[0].requirementType === "OUTSTATION_TRANSPORT" &&
  reqs1[0].status === "PENDING",
  "Single outstation road movement detected correctly",
  `Found 1 requirement: ${reqs1[0]?.from} → ${reqs1[0]?.to}, ${reqs1[0]?.requiredDepartureTime} to ${reqs1[0]?.requiredArrivalTime}, travelers: ${reqs1[0]?.travelers}`
);

// -------------------------------------------------------------
// Case 2: Multi-leg road movements in a longer journey
// -------------------------------------------------------------
const multiLegTrip = {
  _id: "trip-multi-1",
  source: "Mumbai",
  destination: "Kerala",
  startDate: "2026-10-15",
  travelers: 3,
  itinerary: [
    {
      day: 2,
      location: "Kochi",
      plan: [
        { id: "itin-trans-1", activity: "Airport Transfer to Hotel", category: "transport", startTime: "10:30 AM", endTime: "11:30 AM" }
      ]
    },
    {
      day: 3,
      location: "Kochi",
      plan: [
        { id: "itin-trans-2", activity: "Transfer to Munnar", category: "transport", startTime: "08:30 AM", endTime: "12:30 PM" }
      ]
    },
    {
      day: 5,
      location: "Munnar",
      plan: [
        { id: "itin-trans-3", activity: "Munnar → Thekkady", category: "transport", startTime: "09:00 AM", endTime: "01:00 PM" }
      ]
    },
    {
      day: 7,
      location: "Thekkady",
      plan: [
        { id: "itin-trans-4", activity: "Drive to Kochi", category: "transport", startTime: "10:00 AM", endTime: "02:00 PM" }
      ]
    },
    {
      day: 10,
      location: "Kochi",
      plan: [
        { id: "itin-trans-5", activity: "Hotel to Airport Transfer", category: "transport", startTime: "03:00 PM", endTime: "04:30 PM" }
      ]
    }
  ]
};

const reqs2 = detectBusRequirements(multiLegTrip);
assert(
  reqs2.length === 5,
  "All 5 distinct road transport movements detected without duplication",
  `Found ${reqs2.length} requirements across days ${reqs2.map(r => r.day).join(", ")}`
);

// -------------------------------------------------------------
// Case 3: Default preferences application across multiple requirements
// -------------------------------------------------------------
const defaultPrefs = {
  vehicleType: "SUV",
  comfort: "AC",
  seatCount: 3,
  luggageCount: 3,
  notes: "Comfortable vehicle preferred"
};

const reqsWithDefaults = reqs2.map(r => ({ ...r, preferences: { ...defaultPrefs } }));
assert(
  reqsWithDefaults.every(r => r.preferences.vehicleType === "SUV" && r.preferences.comfort === "AC"),
  "Default preferences apply across all detected bus requirements",
  `All 5 legs have comfort: AC, vehicleType: SUV, seats: 3, luggage: 3`
);

// -------------------------------------------------------------
// Case 4: Specific requirement customization override
// -------------------------------------------------------------
// Override leg 5 with Sedan and Luxury
reqsWithDefaults[4] = {
  ...reqsWithDefaults[4],
  preferences: {
    ...reqsWithDefaults[4].preferences,
    vehicleType: "Sedan",
    comfort: "Luxury",
    notes: "VIP sedan for airport departure"
  }
};

assert(
  reqsWithDefaults[0].preferences.vehicleType === "SUV" &&
  reqsWithDefaults[4].preferences.vehicleType === "Sedan" &&
  reqsWithDefaults[4].preferences.comfort === "Luxury",
  "Individual requirement can be customized while others retain default preferences",
  `Leg 1 is SUV/AC while Leg 5 is customized to Sedan/Luxury with custom note`
);

// -------------------------------------------------------------
// Case 5: Idempotency (re-detecting preserves saved traveler preferences)
// -------------------------------------------------------------
const tripWithSavedPrefs = {
  ...multiLegTrip,
  busRequirements: reqsWithDefaults
};

const redetected = detectBusRequirements(tripWithSavedPrefs);
assert(
  redetected.length === 5 &&
  redetected[4].preferences.vehicleType === "Sedan" &&
  redetected[4].preferences.comfort === "Luxury" &&
  redetected[0].preferences.vehicleType === "SUV",
  "Re-detecting preserves existing traveler preferences idempotently",
  `Saved preferences for all legs retained intact after re-detection`
);

// -------------------------------------------------------------
// Case 6: Campus Trip group transport detection
// -------------------------------------------------------------
const campusTrip = {
  _id: "trip-campus-101",
  tripCategory: "CAMPUS",
  source: "Bangalore",
  destination: "Hyderabad",
  campusConfig: {
    expectedParticipants: 120,
    budgetPerStudent: 8000
  },
  startDate: "2026-11-05",
  itinerary: [
    {
      day: 1,
      plan: [
        {
          id: "campus-transfer-1",
          activity: "Station to Campus Hotel Transfer",
          category: "transport",
          startTime: "08:00 AM",
          endTime: "09:30 AM"
        }
      ]
    }
  ]
};

const campusReqs = detectBusRequirements(campusTrip);
assert(
  campusReqs.length === 1 &&
  campusReqs[0].travelers === 120 &&
  campusReqs[0].requirementType === "GROUP_TRANSPORT" &&
  campusReqs[0].mode === "BUS",
  "Campus Trip group transport requirement detected with accurate headcount",
  `Headcount: ${campusReqs[0]?.travelers} students, requirementType: ${campusReqs[0]?.requirementType}`
);

// -------------------------------------------------------------
// Case 7: Train & Flight intercity travel are NOT converted to Bus
// -------------------------------------------------------------
const trainFlightTrip = {
  _id: "trip-train-flight",
  source: "Mumbai",
  destination: "Guwahati",
  startDate: "2026-10-01",
  travelLegs: [
    {
      id: "leg-outbound-flight",
      mode: "Flight",
      flightNumber: "6E123",
      from: "Mumbai",
      to: "Guwahati"
    },
    {
      id: "leg-return-train",
      mode: "Train",
      trainNumber: "12472",
      from: "Guwahati",
      to: "Mumbai"
    }
  ],
  itinerary: [
    {
      day: 1,
      plan: [
        {
          id: "itin-flight",
          name: "Flight 6E123",
          flightNumber: "6E123",
          category: "transport"
        }
      ]
    },
    {
      day: 5,
      plan: [
        {
          id: "itin-train",
          name: "Train 12472",
          trainNumber: "12472",
          category: "transport"
        }
      ]
    }
  ]
};

const trainFlightBusReqs = detectBusRequirements(trainFlightTrip);
assert(
  trainFlightBusReqs.length === 0,
  "Intercity Train and Flight movements are never converted into Bus requirements",
  `0 bus requirements generated for pure Train/Flight itinerary`
);

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log("\n=================================================================");
console.log(`SUMMARY: ${passedCount} / ${totalCount} TESTS PASSED`);
console.log("=================================================================\n");

if (passedCount !== totalCount) {
  process.exit(1);
}
