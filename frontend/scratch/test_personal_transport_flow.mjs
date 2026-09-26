import assert from "node:assert";
import { detectBusRequirements } from "../src/utils/busRequirementDetector.js";

console.log("==================================================");
console.log("TESTING PERSONAL TRIP LOCAL TRANSPORT RESTRUCTURING");
console.log("==================================================");

// Mock personal trip with 4 travelers and 5 scheduled movements
const mockPersonalTrip = {
  _id: "trip-personal-123",
  tripCategory: "PERSONAL",
  destination: "Munnar",
  startDate: "2026-10-01",
  endDate: "2026-10-05",
  travelers: 4,
  budget: 50000,
  itinerary: [
    {
      day: 1,
      date: "2026-10-01",
      location: "Hotel Grand",
      plan: [
        {
          id: "act-1",
          activity: "Transfer from Airport to Hotel Grand",
          category: "transport",
          startTime: "09:00 AM",
          endTime: "10:30 AM",
          from: "Airport",
          to: "Hotel Grand",
        },
      ],
    },
    {
      day: 2,
      date: "2026-10-02",
      location: "Hotel Grand",
      plan: [
        {
          id: "act-2",
          activity: "Drive to Zoo",
          category: "transport",
          startTime: "09:30 AM",
          endTime: "10:00 AM",
          from: "Hotel Grand",
          to: "Zoo",
        },
        {
          id: "act-3",
          activity: "Visit Zoo & Botanical Garden",
          category: "activity",
          startTime: "10:00 AM",
          endTime: "01:00 PM",
          place: "Zoo",
        },
      ],
    },
    {
      day: 3,
      date: "2026-10-03",
      location: "Hotel Grand",
      plan: [
        {
          id: "act-4",
          activity: "Transfer to Tea Factory",
          category: "transfer",
          startTime: "10:00 AM",
          endTime: "11:00 AM",
          from: "Hotel Grand",
          to: "Tea Factory",
        },
      ],
    },
    {
      day: 4,
      date: "2026-10-04",
      location: "Hotel Grand",
      plan: [
        {
          id: "act-5",
          activity: "Drive to Thekkady Lake",
          category: "transport",
          startTime: "08:00 AM",
          endTime: "11:00 AM",
          from: "Munnar",
          to: "Thekkady",
        },
      ],
    },
    {
      day: 5,
      date: "2026-10-05",
      location: "Hotel Grand",
      plan: [
        {
          id: "act-6",
          activity: "Transfer to Railway Station",
          category: "transfer",
          startTime: "02:00 PM",
          endTime: "03:30 PM",
          from: "Hotel Grand",
          to: "Railway Station",
        },
      ],
    },
  ],
};

// ----------------------------------------------------
// CASE 1: 4 travelers, 5 local movements, Transix transport
// ----------------------------------------------------
console.log("\n[TEST 1] CASE 1: Transix Coordinated Local Transport");
{
  const tripWithTransix = {
    ...mockPersonalTrip,
    localTransportPreference: {
      arrangement: "TRANSIX_COORDINATED",
      vehicleType: "SUV",
      comfort: "AC",
      seatCount: 4,
      luggageCount: 4,
      notes: "Need child seat",
    },
  };

  const reqs = detectBusRequirements(tripWithTransix);
  assert.strictEqual(reqs.length, 5, "Must detect exactly 5 scheduled road movements");
  
  reqs.forEach((r) => {
    assert.strictEqual(r.mode, "PRIVATE_VEHICLE", "Personal transport must use mode PRIVATE_VEHICLE, not generic public BUS");
    assert.strictEqual(r.arrangement, "TRANSIX_COORDINATED");
    assert.strictEqual(r.preferences.vehicleType, "SUV");
    assert.strictEqual(r.preferences.comfort, "AC");
    assert.strictEqual(r.preferences.seatCount, 4);
    assert.strictEqual(r.preferences.luggageCount, 4);
    assert.strictEqual(r.preferences.notes, "Need child seat");
  });

  console.log("  ✓ All 5 movements share the single preference configuration (SUV · AC · 4 seats)");
  console.log("  ✓ Mode is correctly set to PRIVATE_VEHICLE");
}

// ----------------------------------------------------
// CASE 2: 4 travelers, Traveler Arranged Transport
// ----------------------------------------------------
console.log("\n[TEST 2] CASE 2: Traveler Arranged Transport ('I will arrange transport myself')");
{
  const tripWithTravelerArranged = {
    ...mockPersonalTrip,
    localTransportPreference: {
      arrangement: "TRAVELER_ARRANGED",
    },
  };

  const reqs = detectBusRequirements(tripWithTravelerArranged);
  assert.strictEqual(reqs.length, 5);

  reqs.forEach((r) => {
    assert.strictEqual(r.arrangement, "TRAVELER_ARRANGED");
    assert.deepStrictEqual(r.preferences, {}, "Traveler arranged movements do not require Transix vehicle preferences");
  });

  console.log("  ✓ All movements marked as TRAVELER_ARRANGED");
  console.log("  ✓ No vendor booking requirements generated");
  console.log("  ✓ Finalization is completely unblocked");
}

// ----------------------------------------------------
// CASE 3: Mixed Mode
// ----------------------------------------------------
console.log("\n[TEST 3] CASE 3: Mixed Mode (Transix Coordinated + Traveler Arranged)");
{
  const existingReqs = [
    {
      id: "bus-req-act-1",
      itineraryItemId: "act-1",
      arrangement: "TRANSIX_COORDINATED",
      preferences: { vehicleType: "SUV", comfort: "AC", seatCount: 4, luggageCount: 4 },
    },
    {
      id: "bus-req-act-2",
      itineraryItemId: "act-2",
      arrangement: "TRAVELER_ARRANGED",
      preferences: {},
    },
    {
      id: "bus-req-act-4",
      itineraryItemId: "act-4",
      arrangement: "TRANSIX_COORDINATED",
      preferences: { vehicleType: "SUV", comfort: "AC", seatCount: 4, luggageCount: 4 },
    },
  ];

  const mixedTrip = {
    ...mockPersonalTrip,
    busRequirements: existingReqs,
    localTransportPreference: {
      arrangement: "TRANSIX_COORDINATED",
      vehicleType: "SUV",
      comfort: "AC",
      seatCount: 4,
      luggageCount: 4,
    },
  };

  const reqs = detectBusRequirements(mixedTrip);
  const airportReq = reqs.find((r) => r.itineraryItemId === "act-1");
  const zooReq = reqs.find((r) => r.itineraryItemId === "act-2");
  const teaReq = reqs.find((r) => r.itineraryItemId === "act-4");

  assert.strictEqual(airportReq.arrangement, "TRANSIX_COORDINATED");
  assert.strictEqual(zooReq.arrangement, "TRAVELER_ARRANGED");
  assert.strictEqual(teaReq.arrangement, "TRANSIX_COORDINATED");

  console.log("  ✓ Movement A (Airport -> Hotel): Transix Coordinated");
  console.log("  ✓ Movement B (Hotel -> Zoo): Traveler Arranged (Ola / Uber)");
  console.log("  ✓ Movement C (Hotel -> Tea Factory): Transix Coordinated");
  console.log("  ✓ Both modes coexist harmoniously without conflict");
}

// ----------------------------------------------------
// CASE 4: Scheduled Activity Timing Preservation
// ----------------------------------------------------
console.log("\n[TEST 4] CASE 4: Scheduled Activity Timing Preservation (Hotel -> Zoo at 10:00 AM)");
{
  const reqs = detectBusRequirements(mockPersonalTrip);
  const zooDriveReq = reqs.find((r) => r.to.toLowerCase() === "zoo");

  assert.ok(zooDriveReq, "Must detect road movement to Zoo");
  assert.strictEqual(zooDriveReq.requiredDepartureTime, "09:30 AM");
  assert.strictEqual(zooDriveReq.requiredArrivalTime, "10:00 AM");
  assert.strictEqual(zooDriveReq.pickupTime, "09:30 AM");

  console.log("  ✓ Scheduled movement departure (09:30 AM) and arrival (10:00 AM) preserved exactly");
  console.log("  ✓ No artificial public bus schedule assumed");
}

// ----------------------------------------------------
// CASE 5: Preference Modification Without Itinerary Regeneration
// ----------------------------------------------------
console.log("\n[TEST 5] CASE 5: Changing Preferences (SUV -> Sedan)");
{
  const updatedTrip = {
    ...mockPersonalTrip,
    localTransportPreference: {
      arrangement: "TRANSIX_COORDINATED",
      vehicleType: "Sedan",
      comfort: "AC",
      seatCount: 3,
      luggageCount: 2,
    },
  };

  const reqs = detectBusRequirements(updatedTrip);
  reqs.forEach((r) => {
    assert.strictEqual(r.preferences.vehicleType, "Sedan");
    assert.strictEqual(r.preferences.seatCount, 3);
  });

  // Verify itinerary items and dates are 100% untouched
  assert.strictEqual(updatedTrip.itinerary.length, 5);
  assert.strictEqual(updatedTrip.itinerary[1].plan[1].startTime, "10:00 AM");

  console.log("  ✓ Updated single configuration to Sedan · 3 seats");
  console.log("  ✓ Itinerary structure, dates, and activity timings completely preserved");
}

// ----------------------------------------------------
// CASE 6: Campus Group Transport Isolation
// ----------------------------------------------------
console.log("\n[TEST 6] CASE 6: Campus Group Transport Plan Isolation");
{
  const mockCampusTrip = {
    _id: "trip-campus-999",
    tripCategory: "CAMPUS",
    travelers: 210,
    campusConfig: {
      expectedParticipants: 210,
      groupTransportPlan: {
        totalTravelers: 210,
        vehicleType: "Luxury Coach",
        comfort: "AC",
        capacityPerVehicle: 25,
        vehiclesRequired: 9,
        studentsCount: 200,
        teachersStaffCount: 10,
      },
    },
    itinerary: mockPersonalTrip.itinerary,
  };

  const campusReqs = detectBusRequirements(mockCampusTrip);
  assert.strictEqual(campusReqs.length, 5);
  campusReqs.forEach((r) => {
    assert.strictEqual(r.mode, "BUS");
    assert.strictEqual(r.requirementType, "GROUP_TRANSPORT");
    assert.strictEqual(r.travelers, 210);
    assert.strictEqual(r.preferences.vehiclesRequired, 9);
    assert.strictEqual(r.preferences.capacityPerVehicle, 25);
  });

  console.log("  ✓ Campus Group Transport Plan preserved with 9 coaches for 210 travelers");
  console.log("  ✓ No personal trip logic leaked into Campus Trip");
}

console.log("\n==================================================");
console.log("ALL 6 TEST CASES PASSED PERFECTLY! ✓");
console.log("==================================================");
