const { validateItinerary } = require("../../backend/src/services/itineraryValidator");

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

// Test 1: Valid
const validTrip = JSON.parse(JSON.stringify(baseTrip));
validTrip.days[0].plan = [
  { startTime: "10:00", endTime: "12:00", estimatedCost: "500", _absStart: 600, _absEnd: 720 },
  { startTime: "13:00", endTime: "14:00", estimatedCost: "500", _absStart: 780, _absEnd: 840 }
];
runTest("TEST 1 - VALID", validTrip, true);

// Test 2: Overlap
const overlapTrip = JSON.parse(JSON.stringify(baseTrip));
overlapTrip.days[0].plan = [
  { startTime: "10:00", endTime: "13:00", estimatedCost: "500", _absStart: 600, _absEnd: 780 },
  { startTime: "12:00", endTime: "14:00", estimatedCost: "500", _absStart: 720, _absEnd: 840 }
];
runTest("TEST 2 - OVERLAP", overlapTrip, false, "SCHEDULE_CONFLICT");

// Test 13: Invalid Duration
const invalidDurationTrip = JSON.parse(JSON.stringify(baseTrip));
invalidDurationTrip.days[0].plan = [
  { startTime: "13:00", endTime: "12:00", estimatedCost: "500", _absStart: 780, _absEnd: 720 }
];
runTest("TEST 13 - INVALID DURATION (Negative)", invalidDurationTrip, false);
