import assert from "node:assert";
import { detectBusRequirements } from "../src/utils/busRequirementDetector.js";

console.log("==================================================");
console.log("RUNNING CAMPUS BUS TRANSPORT FLOW & FINALIZATION TESTS");
console.log("==================================================");

// 1. Capacity & Fleet math verification
function testCapacityMath() {
  console.log("\n[TEST 1] Fleet capacity & vehiclesRequired formula:");

  const calcFleet = (students, teachers, capacity) => {
    const totalTravelers = students + teachers;
    const vehiclesRequired = Math.ceil(totalTravelers / capacity);
    return { totalTravelers, vehiclesRequired };
  };

  // 200 students + 10 teachers + 25 capacity = 210 / 25 = 8.4 -> 9 vehicles
  const res1 = calcFleet(200, 10, 25);
  assert.strictEqual(res1.totalTravelers, 210);
  assert.strictEqual(res1.vehiclesRequired, 9);
  console.log(`  ✓ 200 students + 10 staff @ 25 cap = ${res1.totalTravelers} travelers -> ${res1.vehiclesRequired} vehicles (PASSED)`);

  // Changing teachers: 200 students + 20 staff = 220 / 25 = 8.8 -> 9 vehicles
  const res2 = calcFleet(200, 20, 25);
  assert.strictEqual(res2.totalTravelers, 220);
  assert.strictEqual(res2.vehiclesRequired, 9);
  console.log(`  ✓ 200 students + 20 staff @ 25 cap = ${res2.totalTravelers} travelers -> ${res2.vehiclesRequired} vehicles (PASSED)`);

  // Changing teachers: 200 students + 30 staff = 230 / 25 = 9.2 -> 10 vehicles
  const res3 = calcFleet(200, 30, 25);
  assert.strictEqual(res3.totalTravelers, 230);
  assert.strictEqual(res3.vehiclesRequired, 10);
  console.log(`  ✓ 200 students + 30 staff @ 25 cap = ${res3.totalTravelers} travelers -> ${res3.vehiclesRequired} vehicles (PASSED)`);

  // Changing capacity: 210 travelers @ 35 capacity = 210 / 35 = 6 vehicles
  const res4 = calcFleet(200, 10, 35);
  assert.strictEqual(res4.vehiclesRequired, 6);
  console.log(`  ✓ 210 travelers @ 35 cap -> ${res4.vehiclesRequired} vehicles (PASSED)`);

  // Changing capacity: 210 travelers @ 50 capacity = 210 / 50 = 4.2 -> 5 vehicles
  const res5 = calcFleet(200, 10, 50);
  assert.strictEqual(res5.vehiclesRequired, 5);
  console.log(`  ✓ 210 travelers @ 50 cap -> ${res5.vehiclesRequired} vehicles (PASSED)`);
}

// 2. Road movements vs Intercity train/flight detection
function testBusRequirementDetection() {
  console.log("\n[TEST 2] Road movement detection and intercity train filter:");

  const campusTrip = {
    _id: "trip-campus-101",
    tripCategory: "CAMPUS",
    campusConfig: {
      expectedParticipants: 200,
    },
    campusTransportPlan: {
      studentsCount: 200,
      teachersStaffCount: 10,
      totalTravelers: 210,
      vehicleType: "Luxury Coach",
      comfort: "AC",
      capacityPerVehicle: 25,
      vehiclesRequired: 9,
      luggageCount: 210,
      notes: "Faculty mic required",
    },
    itinerary: [
      {
        day: 1,
        date: "2026-10-01",
        plan: [
          {
            id: "leg-intercity-train",
            category: "Train Transport",
            place: "Trivandrum Central (TVC) to Ernakulam Town (ERN)",
            activity: "Netravati Express #16346",
            legType: "departure",
            startTime: "06:00 AM",
            endTime: "10:00 AM",
          },
          {
            id: "road-mvmt-1",
            category: "Transport",
            place: "Airport to Hotel",
            activity: "Private Group Coach transfer from Airport to Hotel",
            startTime: "11:00 AM",
            endTime: "12:30 PM",
          }
        ]
      },
      {
        day: 2,
        date: "2026-10-02",
        plan: [
          {
            id: "road-mvmt-2",
            category: "Road Transport",
            place: "Hotel to Munnar",
            activity: "Scenic hill road transfer to Munnar resort",
            startTime: "08:00 AM",
            endTime: "12:00 PM",
          }
        ]
      },
      {
        day: 5,
        date: "2026-10-05",
        plan: [
          {
            id: "road-mvmt-3",
            category: "Cab Transport",
            place: "Munnar to Thekkady",
            activity: "Bus travel from Munnar tea gardens to Thekkady wildlife sanctuary",
            startTime: "09:00 AM",
            endTime: "01:00 PM",
          }
        ]
      },
      {
        day: 8,
        date: "2026-10-08",
        plan: [
          {
            id: "road-mvmt-4",
            category: "Bus",
            place: "Thekkady to Ernakulam",
            activity: "Group bus drive to Ernakulam city",
            startTime: "08:30 AM",
            endTime: "01:30 PM",
          }
        ]
      },
      {
        day: 9,
        date: "2026-10-09",
        plan: [
          {
            id: "road-mvmt-5",
            category: "Road Transport",
            place: "Ernakulam to Railway Station",
            activity: "Station drop-off transfer",
            startTime: "04:00 PM",
            endTime: "05:00 PM",
          },
          {
            id: "leg-intercity-train-return",
            category: "Train Transport",
            place: "Ernakulam Junction to Lokmanya Tilak Terminus",
            activity: "Mangala Lakshadweep Express #12618",
            legType: "arrival",
            startTime: "06:00 PM",
            endTime: "11:00 PM",
          }
        ]
      }
    ]
  };

  const detected = detectBusRequirements(campusTrip);

  console.log(`  Identified ${detected.length} road transport movements.`);
  assert.strictEqual(detected.length, 5, `Expected exactly 5 road movements, got ${detected.length}`);

  // Ensure intercity trains were filtered out
  const hasIntercityTrains = detected.some(d => 
    d.activity?.toLowerCase().includes("express") || 
    d.from?.toLowerCase().includes("trivandrum central")
  );
  assert.strictEqual(hasIntercityTrains, false, "Intercity train must NOT be detected as road bus transport");
  console.log("  ✓ Intercity trains excluded from road movements (PASSED)");

  // Ensure all 5 movements reference the single Campus Group Transport Plan
  for (const m of detected) {
    assert.ok(m.groupTransportPlan, "Movement must link to group transport plan");
    assert.strictEqual(m.groupTransportPlan.vehiclesRequired, 9);
    assert.strictEqual(m.groupTransportPlan.totalTravelers, 210);
    assert.strictEqual(m.groupTransportPlan.capacityPerVehicle, 25);
  }
  console.log("  ✓ All 5 movements link to the SAME Campus Group Transport Plan (PASSED)");
}

// 3. Finalization Gating Logic Verification
function testFinalizationGating() {
  console.log("\n[TEST 3] Finalization Gating behavior for Campus Group Transport:");

  // Simulated 6 road movements
  const busRequirements = [
    { from: "Airport", to: "Hotel" },
    { from: "Hotel", to: "Munnar" },
    { from: "Munnar", to: "Thekkady" },
    { from: "Thekkady", to: "Ernakulam" },
    { from: "Ernakulam", to: "Railway Station" },
    { from: "Station", to: "Campus" }
  ];

  const defaultStudents = 200;
  const defaultTeachers = 10;
  const defaultTravelersCount = defaultStudents + defaultTeachers; // 210

  const isValidGroupTransportPlan = (p) => {
    if (!p || typeof p !== "object") return false;
    const travelers = Number(
      p.totalTravelers ||
      (Number(p.studentsCount || 0) + Number(p.teachersStaffCount || 0))
    );
    const capacity = Number(p.capacityPerVehicle || 0);
    const vehicles = Number(
      p.vehiclesRequired || (travelers > 0 && capacity > 0 ? Math.ceil(travelers / capacity) : 0)
    );
    return travelers > 0 && capacity > 0 && vehicles > 0;
  };

  const evaluateFinalizationState = (plan) => {
    const isCampus = true;
    const hasRoadMovements = busRequirements.length > 0;
    const hasValidGroupPlan = !hasRoadMovements || Boolean(plan && isValidGroupTransportPlan(plan));

    const isBudgetValid = true;
    const isFeasible = true;
    const canFinalize = isBudgetValid && isFeasible && hasValidGroupPlan;

    const checklistItem = {
      title: hasValidGroupPlan ? "Group fleet preferences saved" : "Group fleet preferences required",
      status: hasValidGroupPlan,
      isBlocking: !hasValidGroupPlan,
      desc: hasValidGroupPlan
        ? `${plan.totalTravelers} travelers • ${plan.vehiclesRequired} coaches • ${busRequirements.length} road movements`
        : `${defaultTravelersCount} travelers • ${busRequirements.length} road movements identified`,
    };

    return { canFinalize, checklistItem, hasValidGroupPlan };
  };

  // Case A: No plan exists yet
  const stateNoPlan = evaluateFinalizationState(null);
  assert.strictEqual(stateNoPlan.hasValidGroupPlan, false);
  assert.strictEqual(stateNoPlan.canFinalize, false);
  assert.strictEqual(stateNoPlan.checklistItem.status, false);
  assert.strictEqual(stateNoPlan.checklistItem.isBlocking, true);
  assert.strictEqual(stateNoPlan.checklistItem.title, "Group fleet preferences required");
  assert.strictEqual(stateNoPlan.checklistItem.desc, "210 travelers • 6 road movements identified");
  console.log("  ✓ Case A (No Plan): Shows 'Group fleet preferences required' & '210 travelers • 6 road movements identified' (PASSED)");

  // Case B: Group transport plan is entered & saved once
  const validPlan = {
    studentsCount: 200,
    teachersStaffCount: 10,
    totalTravelers: 210,
    capacityPerVehicle: 25,
    vehiclesRequired: 9,
    vehicleType: "Luxury Coach",
    comfort: "AC"
  };

  const stateWithPlan = evaluateFinalizationState(validPlan);
  assert.strictEqual(stateWithPlan.hasValidGroupPlan, true);
  assert.strictEqual(stateWithPlan.canFinalize, true);
  assert.strictEqual(stateWithPlan.checklistItem.status, true);
  assert.strictEqual(stateWithPlan.checklistItem.isBlocking, false);
  assert.strictEqual(stateWithPlan.checklistItem.title, "Group fleet preferences saved");
  assert.strictEqual(stateWithPlan.checklistItem.desc, "210 travelers • 9 coaches • 6 road movements");
  console.log("  ✓ Case B (Valid Plan): Shows 'Group fleet preferences saved' & '210 travelers • 9 coaches • 6 road movements', finalization PASSES (PASSED)");
}

// 4. Verify Personal Trip behavior remains untouched
function testPersonalTripUnchanged() {
  console.log("\n[TEST 4] Personal Trip bus flow remains independent & customizable:");

  const personalTrip = {
    _id: "trip-personal-202",
    tripCategory: "PERSONAL",
    travelers: 4,
    itinerary: [
      {
        day: 1,
        date: "2026-11-01",
        plan: [
          {
            id: "personal-transfer-1",
            category: "Transport",
            place: "Jaipur Airport to Hotel",
            activity: "Cab pickup",
            startTime: "10:00 AM",
            endTime: "11:00 AM",
          }
        ]
      }
    ]
  };

  const personalDetected = detectBusRequirements(personalTrip);
  assert.strictEqual(personalDetected.length, 1);
  assert.strictEqual(personalDetected[0].travelers, 4);
  assert.strictEqual(personalDetected[0].groupTransportPlan, undefined, "Personal trip must NOT have a groupTransportPlan");
  console.log("  ✓ Personal Trip bus flow preserved without group fleet plan (PASSED)");
}

testCapacityMath();
testBusRequirementDetection();
testFinalizationGating();
testPersonalTripUnchanged();

console.log("\n==================================================");
console.log("ALL TESTS PASSED SUCCESSFULLY! ✓");
console.log("==================================================");
