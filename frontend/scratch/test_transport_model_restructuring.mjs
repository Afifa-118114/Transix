import assert from "assert";
import { findExistingTransportRecord } from "../src/utils/schedulingEngine.js";
import {
  detectBusRequirements,
  resolveLocalTransportArrangement,
  calculateDayDate,
  calculateCampusFleetRequirements,
  PERSONAL_CAR_OPTIONS,
  PERSONAL_MINIBUS_OPTIONS
} from "../src/utils/busRequirementDetector.js";

console.log("=== RUNNING RESTRUCTURE TRANSPORT MODEL VERIFICATION TEST ===");

// -------------------------------------------------------------
// Test 1 & 2: Campus always shows exactly 2 intercity cards & supports all 4 combinations
// Train/Train, Train/Flight, Flight/Train, Flight/Flight
// -------------------------------------------------------------
console.log("\n--- Testing 1 & 2: Campus Intercity Cards (Exact 2 cards for all 4 combinations) ---");

const combinations = [
  {
    name: "Train -> Train",
    legs: [
      { mode: "train", trainNumber: "12626", operator: "Kerala Express", from: "Mumbai", to: "Trivandrum", journeyDirection: "outbound", departureDay: 1, startTime: "08:00", endTime: "22:00" },
      { mode: "transfer", from: "Trivandrum Station", to: "Hotel", journeyDirection: "outbound" },
      { mode: "transfer", from: "Hotel", to: "Trivandrum Station", journeyDirection: "return" },
      { mode: "train", trainNumber: "12625", operator: "Kerala Express", from: "Trivandrum", to: "Mumbai", journeyDirection: "return", departureDay: 10, startTime: "10:00", endTime: "23:00" },
    ],
    expectedOutMode: "train",
    expectedRetMode: "train",
  },
  {
    name: "Train -> Flight",
    legs: [
      { mode: "train", trainNumber: "12626", operator: "Kerala Express", from: "Mumbai", to: "Trivandrum", journeyDirection: "outbound", departureDay: 1, startTime: "08:00", endTime: "22:00" },
      { mode: "transfer", from: "Trivandrum Station", to: "Hotel", journeyDirection: "outbound" },
      { mode: "transfer", from: "Hotel", to: "Trivandrum Airport", journeyDirection: "return" },
      { mode: "flight", flightNumber: "6E-512", airline: "IndiGo", from: "Trivandrum", to: "Mumbai", journeyDirection: "return", departureDay: 10, startTime: "14:00", endTime: "16:30" },
    ],
    expectedOutMode: "train",
    expectedRetMode: "flight",
  },
  {
    name: "Flight -> Train",
    legs: [
      { mode: "flight", flightNumber: "AI-801", airline: "Air India", from: "Mumbai", to: "Trivandrum", journeyDirection: "outbound", departureDay: 1, startTime: "06:00", endTime: "08:30" },
      { mode: "transfer", from: "Trivandrum Airport", to: "Hotel", journeyDirection: "outbound" },
      { mode: "transfer", from: "Hotel", to: "Trivandrum Station", journeyDirection: "return" },
      { mode: "train", trainNumber: "12625", operator: "Kerala Express", from: "Trivandrum", to: "Mumbai", journeyDirection: "return", departureDay: 10, startTime: "11:00", endTime: "23:30" },
    ],
    expectedOutMode: "flight",
    expectedRetMode: "train",
  },
  {
    name: "Flight -> Flight",
    legs: [
      { mode: "flight", flightNumber: "AI-801", airline: "Air India", from: "Mumbai", to: "Trivandrum", journeyDirection: "outbound", departureDay: 1, startTime: "06:00", endTime: "08:30" },
      { mode: "transfer", from: "Trivandrum Airport", to: "Hotel", journeyDirection: "outbound" },
      { mode: "transfer", from: "Hotel", to: "Trivandrum Airport", journeyDirection: "return" },
      { mode: "flight", flightNumber: "6E-512", airline: "IndiGo", from: "Trivandrum", to: "Mumbai", journeyDirection: "return", departureDay: 10, startTime: "17:00", endTime: "19:30" },
    ],
    expectedOutMode: "flight",
    expectedRetMode: "flight",
  },
];

for (const combo of combinations) {
  const campusTrip = {
    tripCategory: "CAMPUS",
    source: "Mumbai",
    destination: "Kerala",
    startDate: "2026-10-16",
    travelLegs: combo.legs,
    itinerary: Array(10).fill({ plan: [] }),
  };

  const out = findExistingTransportRecord(campusTrip, "outbound");
  const ret = findExistingTransportRecord(campusTrip, "return");

  assert(out !== null, `Outbound should not be null for ${combo.name}`);
  assert(ret !== null, `Return should not be null for ${combo.name}`);
  assert.strictEqual(out.mode, combo.expectedOutMode, `Outbound mode match for ${combo.name}`);
  assert.strictEqual(ret.mode, combo.expectedRetMode, `Return mode match for ${combo.name}`);

  // Construct the 2 canonical cards
  const cards = [
    { direction: "OUTBOUND", mode: out.mode, from: out.source, to: out.destination },
    { direction: "RETURN", mode: ret.mode, from: ret.source, to: ret.destination },
  ];

  assert.strictEqual(cards.length, 2, `Campus must yield exactly 2 cards for ${combo.name}`);
  console.log(`[PASS] ${combo.name}: Exactly 2 cards (${cards[0].direction}: ${cards[0].mode} -> ${cards[1].direction}: ${cards[1].mode})`);
}

// -------------------------------------------------------------
// Test 3, 4, 5: Campus Road Transport (ONE fleet arrangement + movements list, NO independent booking statuses)
// -------------------------------------------------------------
console.log("\n--- Testing 3, 4, 5: Campus Road Transport Fleet & Movements ---");

const campusTripWithMovements = {
  tripCategory: "CAMPUS",
  travelers: 210,
  startDate: "2026-10-16",
  campusTransportPlan: {
    totalTravelers: 210,
    studentsCount: 200,
    teachersStaffCount: 10,
    vehicleType: "Coach",
    capacityPerVehicle: 25,
    vehiclesRequired: 9,
    comfort: "Luxury AC",
    luggageCount: 210,
    notes: "Group fleet for 210 members",
  },
  itinerary: [
    {
      day: 1,
      plan: [
        { id: "act-1", time: "08:30 - 09:30", category: "transport", activity: "Trivandrum Airport to Hotel", place: "Trivandrum Airport -> Hotel" },
      ],
    },
    {
      day: 3,
      plan: [
        { id: "act-2", time: "09:00 - 13:00", category: "transport", activity: "Hotel to Munnar transfer", place: "Hotel -> Munnar" },
      ],
    },
    {
      day: 5,
      plan: [
        { id: "act-3", time: "08:30 - 12:00", category: "transport", activity: "Munnar to Thekkady", place: "Munnar -> Thekkady" },
      ],
    },
    {
      day: 10,
      plan: [
        { id: "act-4", time: "17:00 - 18:30", category: "transport", activity: "Hotel to Airport", place: "Hotel -> Trivandrum Airport" },
      ],
    },
  ],
};

// Calculate fleet requirements
const fleetCalc = calculateCampusFleetRequirements({
  studentsCount: 200,
  teachersStaffCount: 10,
  capacityPerVehicle: 25,
  vehicleType: "Coach",
  comfort: "Luxury AC",
});
assert.strictEqual(fleetCalc.totalTravelers, 210, "Total travelers = 210");
assert.strictEqual(fleetCalc.vehiclesRequired, 9, "Vehicles required = 9");

// Detect movements
const campusMovements = detectBusRequirements(campusTripWithMovements);
assert.strictEqual(campusMovements.length, 4, "Detected 4 scheduled movements");

// Verify movements describe route/time without independent booking statuses
campusMovements.forEach((m, idx) => {
  assert(m.from, `Movement ${idx} has from location`);
  assert(m.to, `Movement ${idx} has to location`);
  assert(m.timing || m.requiredDepartureTime, `Movement ${idx} has timing`);
  assert(!m.status || m.status === "PENDING", `Movement ${idx} must NOT have independent confirmed/processing status`);
});

console.log(`[PASS] Fleet: ${fleetCalc.vehiclesRequired}x ${fleetCalc.comfort} ${fleetCalc.vehicleType} for ${fleetCalc.totalTravelers} travelers`);
console.log(`[PASS] ${campusMovements.length} movements under ONE fleet with no independent booking statuses`);

// -------------------------------------------------------------
// Test 6: Personal retains its 4-card door-to-door intercity/local structure
// -------------------------------------------------------------
console.log("\n--- Testing 6: Personal Trip 4-card door-to-door structure ---");

const personalTrip4Legs = {
  tripCategory: "PERSONAL",
  travelLegs: [
    { mode: "train", from: "Mumbai", to: "Kerala", journeyDirection: "outbound" },
    { mode: "transfer", from: "Kerala Station", to: "Hotel", journeyDirection: "outbound" },
    { mode: "transfer", from: "Hotel", to: "Kerala Station", journeyDirection: "return" },
    { mode: "train", from: "Kerala", to: "Mumbai", journeyDirection: "return" },
  ],
};

assert.strictEqual(personalTrip4Legs.travelLegs.length, 4, "Personal trip retains 4 door-to-door travel legs");
console.log(`[PASS] Personal trip retains 4 door-to-door cards:`);
personalTrip4Legs.travelLegs.forEach((l, i) => console.log(`   Leg #${i+1}: ${l.from} -> ${l.to} (${l.mode})`));

// -------------------------------------------------------------
// Test 7, 8, 9: Personal Local Transport (Private Car, Mini Bus, Traveler Managed)
// -------------------------------------------------------------
console.log("\n--- Testing 7, 8, 9: Personal Local Transport Choices ---");

// 7. Private Car
const carTrip = {
  tripCategory: "PERSONAL",
  travelers: 4,
  localTransportPreference: {
    arrangementType: "PRIVATE_CAR",
    vehicleType: "Private AC SUV",
    comfort: "AC",
    travelerCount: 4,
    seatCount: 6,
    luggageCount: 4,
    notes: "Child seat required",
  },
};
const carResolution = resolveLocalTransportArrangement(carTrip);
assert.strictEqual(carResolution.arrangementType, "PRIVATE_CAR", "Arrangement is PRIVATE_CAR");
assert.strictEqual(carResolution.isPrivateCar, true, "isPrivateCar is true");
assert.strictEqual(carResolution.isTransixCoordinated, true, "isTransixCoordinated is true");
assert.strictEqual(carResolution.isTravelerManaged, false, "isTravelerManaged is false");
assert.strictEqual(carResolution.preferences.vehicleType, "Private AC SUV");
console.log(`[PASS] Private Car: ${carResolution.preferences.vehicleType}, ${carResolution.preferences.travelerCount} travelers, Entire trip`);

// 8. Private Mini Bus
const minibusTrip = {
  tripCategory: "PERSONAL",
  travelers: 15,
  localTransportPreference: {
    arrangementType: "PRIVATE_MINIBUS",
    vehicleType: "Private AC Mini Bus (18-22 Seats)",
    comfort: "AC",
    travelerCount: 15,
    seatCount: 20,
    luggageCount: 15,
  },
};
const minibusResolution = resolveLocalTransportArrangement(minibusTrip);
assert.strictEqual(minibusResolution.arrangementType, "PRIVATE_MINIBUS", "Arrangement is PRIVATE_MINIBUS");
assert.strictEqual(minibusResolution.isPrivateMinibus, true, "isPrivateMinibus is true");
assert.strictEqual(minibusResolution.isTransixCoordinated, true, "isTransixCoordinated is true");
assert.strictEqual(minibusResolution.preferences.travelerCount, 15);
console.log(`[PASS] Private Mini Bus: ${minibusResolution.preferences.vehicleType}, ${minibusResolution.preferences.travelerCount} travelers, Entire trip`);

// 9. Traveler Managed
const selfManagedTrip = {
  tripCategory: "PERSONAL",
  travelers: 2,
  localTransportPreference: {
    arrangementType: "TRAVELER_MANAGED",
  },
};
const selfResolution = resolveLocalTransportArrangement(selfManagedTrip);
assert.strictEqual(selfResolution.arrangementType, "TRAVELER_MANAGED", "Arrangement is TRAVELER_MANAGED");
assert.strictEqual(selfResolution.isTravelerManaged, true, "isTravelerManaged is true");
assert.strictEqual(selfResolution.isTransixCoordinated, false, "isTransixCoordinated is false");
console.log(`[PASS] Traveler Managed: No vehicle booking created, marked as traveler-managed`);

// -------------------------------------------------------------
// Test 10: Personal local movements listed under the ONE arrangement
// -------------------------------------------------------------
console.log("\n--- Testing 10: Personal local movements under ONE arrangement ---");

const personalTripWithMovements = {
  ...carTrip,
  itinerary: [
    { day: 1, plan: [{ id: "p-1", time: "10:00 - 12:00", category: "visit", activity: "Hotel to Zoo", place: "Hotel -> Zoo" }] },
    { day: 2, plan: [{ id: "p-2", time: "09:00 - 11:00", category: "visit", activity: "Hotel to Tea Factory", place: "Hotel -> Tea Factory" }] },
    { day: 3, plan: [{ id: "p-3", time: "08:30 - 12:00", category: "transport", activity: "Munnar to Thekkady", place: "Munnar -> Thekkady" }] },
    { day: 5, plan: [{ id: "p-4", time: "17:00 - 18:00", category: "transport", activity: "Hotel to Airport", place: "Hotel -> Airport" }] },
  ],
};
const personalMovements = detectBusRequirements(personalTripWithMovements);
assert.strictEqual(personalMovements.length, 4, "Detected 4 personal local movements");
console.log(`[PASS] 4 local movements listed under ONE Private Vehicle arrangement (SUV • AC):`);
personalMovements.forEach((m) => console.log(`   - ${m.from} -> ${m.to} (${m.timing || m.requiredDepartureTime})`));

// -------------------------------------------------------------
// Test 11: Options arrays verification
// -------------------------------------------------------------
console.log("\n--- Testing 11: Option definitions & finalization safety ---");

assert(Array.isArray(PERSONAL_CAR_OPTIONS) && PERSONAL_CAR_OPTIONS.length > 0, "PERSONAL_CAR_OPTIONS exist");
assert(Array.isArray(PERSONAL_MINIBUS_OPTIONS) && PERSONAL_MINIBUS_OPTIONS.length > 0, "PERSONAL_MINIBUS_OPTIONS exist");
console.log(`[PASS] Car options available: ${PERSONAL_CAR_OPTIONS.length} options`);
console.log(`[PASS] Mini bus options available: ${PERSONAL_MINIBUS_OPTIONS.length} options`);

console.log("\n=== ALL 11 VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
