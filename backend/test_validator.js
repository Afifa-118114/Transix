const { validateItinerary } = require("./src/services/itineraryValidator");

const runTest = (name, trip, expectedValid, expectedErrorType) => {
  const result = validateItinerary(trip, trip);
  const isValid = result.valid;
  const hasExpectedError = expectedErrorType ? result.errors.some(e => e.type === expectedErrorType) : true;
  
  if (isValid === expectedValid && (!expectedErrorType || hasExpectedError)) {
    console.log(`✅ ${name} passed`);
  } else {
    console.error(`❌ ${name} failed. Expected valid=${expectedValid}, got ${isValid}. Errors:`, JSON.stringify(result.errors));
  }
};

const baseTrip = {
  startDate: "2024-12-15",
  endDate: "2024-12-17",
  budget: 20000,
  travelers: 2,
  staySegments: [
    { location: "Manali", checkIn: "2024-12-15", checkOut: "2024-12-17", nights: 2 }
  ],
  travelLegs: [],
  days: [
    {
      day: 1,
      plan: []
    }
  ]
};

const getBaseTrip = () => JSON.parse(JSON.stringify(baseTrip));

// TEST 1 — VALID
let trip = getBaseTrip();
trip.days[0].plan = [
  { activity: "Act 1", startTime: "10:00", endTime: "12:00", estimatedCost: "500", _absStart: 600, _absEnd: 720 },
  { activity: "Act 2", startTime: "13:00", endTime: "14:00", estimatedCost: "500", _absStart: 780, _absEnd: 840 }
];
runTest("TEST 1 - VALID", trip, true);

// TEST 2 — OVERLAP
trip = getBaseTrip();
trip.days[0].plan = [
  { activity: "Act 1", startTime: "10:00", endTime: "13:00", estimatedCost: "500", _absStart: 600, _absEnd: 780 },
  { activity: "Act 2", startTime: "12:00", endTime: "14:00", estimatedCost: "500", _absStart: 720, _absEnd: 840 }
];
runTest("TEST 2 - OVERLAP", trip, false, "SCHEDULE_CONFLICT");

// TEST 3 — BUFFER (Travel buffer violated by 1 minute)
trip = getBaseTrip();
trip.days[0].plan = [
  { activity: "Transport", category: "transport", startTime: "10:00", endTime: "12:00", estimatedCost: "500", _absStart: 600, _absEnd: 720 },
  // If buffer is 15m, 12:14 should be invalid (14m gap)
  { activity: "Act 2", startTime: "12:14", endTime: "14:00", estimatedCost: "500", _absStart: 734, _absEnd: 840 }
];
runTest("TEST 3 - BUFFER (violated)", trip, false, "TRAVEL_BUFFER_VIOLATION");

// TEST 4 — BUFFER EXACT
trip = getBaseTrip();
trip.days[0].plan = [
  { activity: "Transport", category: "transport", startTime: "10:00", endTime: "12:00", estimatedCost: "500", _absStart: 600, _absEnd: 720 },
  // 12:15 should be valid
  { activity: "Act 2", startTime: "12:15", endTime: "14:00", estimatedCost: "500", _absStart: 735, _absEnd: 840 }
];
runTest("TEST 4 - BUFFER EXACT", trip, true);

// TEST 5 — HOTEL
trip = getBaseTrip();
trip.days[0].plan = [
  { activity: "Hotel Check-in", startTime: "14:00", endTime: "14:30", estimatedCost: "0", _absStart: 840, _absEnd: 870 },
  // 14:00 check-in is immutable.
  // 13:00-14:30 overlaps with check-in.
  { activity: "Act 2", startTime: "13:00", endTime: "14:15", estimatedCost: "500", _absStart: 780, _absEnd: 855 }
];
runTest("TEST 5 - HOTEL (Overlap)", trip, false, "SCHEDULE_CONFLICT");

// TEST 6 — BUDGET
trip = getBaseTrip();
trip.budget = 20000;
trip.days[0].plan = [
  { activity: "Act 1", startTime: "10:00", endTime: "12:00", estimatedCost: "20001", _absStart: 600, _absEnd: 720 }
];
runTest("TEST 6 - BUDGET (Exceeded by 1)", trip, false, "BUDGET_EXCEEDED");

// TEST 7 — BUDGET EXACT
trip = getBaseTrip();
trip.budget = 20000;
trip.days[0].plan = [
  { activity: "Act 1", startTime: "10:00", endTime: "12:00", estimatedCost: "20000", _absStart: 600, _absEnd: 720 }
];
runTest("TEST 7 - BUDGET EXACT", trip, true);

// TEST 8 — DATE (Before trip start)
trip = getBaseTrip();
// Trip starts 15 Dec. Activity on Day 0?
trip.days.push({
  day: 0,
  plan: [
    { activity: "Act 1", startTime: "10:00", endTime: "12:00", estimatedCost: "500", _absStart: 600, _absEnd: 720 }
  ]
});
runTest("TEST 8 - DATE (Before trip start)", trip, false, "DATE_OUT_OF_BOUNDS");

// TEST 13 — INVALID DURATION
trip = getBaseTrip();
trip.days[0].plan = [
  { activity: "Act 1", startTime: "13:00", endTime: "12:00", estimatedCost: "500", _absStart: 780, _absEnd: 720 }
];
runTest("TEST 13 - INVALID DURATION (Negative)", trip, false, "INVALID_DURATION");

// TEST 19 — MALFORMED AI
trip = getBaseTrip();
trip.days[0].plan = [
  { activity: "Act 1", startTime: "10:00", endTime: "12:00", estimatedCost: "500", _absStart: 600, _absEnd: 720 },
  { activity: null, time: null, _absStart: null, _absEnd: null }
];
runTest("TEST 19 - MALFORMED AI", trip, false, "STRUCTURAL_VALIDATION_ERROR");
