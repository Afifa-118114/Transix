const assert = require("assert");

// Import frontend utils into node test environment
const {
  getTripDurationDays,
  getCampusAccommodationBudget,
  calculateStayAccommodation,
  calculateAccommodationSummary,
  calculateAccommodationBudgetAnalysis,
  calculateSegmentBudgetAllocation,
  calculateTripBudgetAnalysis,
  calculateCampusCategoryBudgetAnalysis,
  calculateCampusBudgetPrediction,
  getCampusCostReductionScenarios,
  simulateCampusReductionScenario
} = require("../frontend/src/utils/campusBudgetUtils.js");

const {
  validateItinerary
} = require("./src/services/itineraryValidator.js");

console.log("==================================================");
console.log("CAMPUS TRIP BUDGET MODEL VERIFICATION SUITE");
console.log("==================================================");

// ============================================================================
// TEST 1: CAMPUS TRIP STANDARD (From Requirements Section 2 & 11)
// Budget per student: ₹20,000, Travelers: 150
// Target Accommodation: ₹10,000–₹12,000 (50%–60%)
// Maximum Accommodation Budget: ₹12,000 / student, ₹18,00,000 group
// ============================================================================
console.log("\n--- TEST 1: CAMPUS TRIP STANDARD (₹20,000, 150 TRAVELERS) ---");
{
  const trip = {
    tripCategory: "CAMPUS",
    startDate: "2026-09-20",
    endDate: "2026-09-29", // 10 days
    budget: 20000,
    campusConfig: {
      budgetPerStudent: 20000,
      expectedParticipants: 150,
      studentsPerRoom: 2
    }
  };

  const budgetConfig = getCampusAccommodationBudget(trip);
  assert.strictEqual(budgetConfig.overallBudgetPerStudent, 20000, "Overall per-student budget must be ₹20,000");
  assert.strictEqual(budgetConfig.overallGroupBudget, 3000000, "Overall group budget must be ₹30,00,000 (20k x 150)");
  assert.strictEqual(budgetConfig.targetAccommodationBudgetPerStudent, 10000, "Target accommodation (50%) must be ₹10,000/student");
  assert.strictEqual(budgetConfig.maxAccommodationBudgetPerStudent, 12000, "Maximum accommodation (60%) must be ₹12,000/student");
  assert.strictEqual(budgetConfig.targetAccommodationBudgetGroup, 1500000, "Target group accommodation must be ₹15,00,000");
  assert.strictEqual(budgetConfig.maxAccommodationBudgetGroup, 1800000, "Maximum group accommodation must be ₹18,00,000");
  assert.strictEqual(budgetConfig.accommodationBudgetPerStudent, 12000, "Accommodation budget per student must be ₹12,000");
  assert.strictEqual(budgetConfig.accommodationBudgetGroup, 1800000, "Accommodation group budget must be ₹18,00,000");

  console.log("✓ TEST 1 PASSED: ₹20,000 / 150 travelers derives Target ₹10,000 (₹15L group) and Max ₹12,000 (₹18L group).");
}

// ============================================================================
// TEST 2: LOWER BUDGET CAMPUS TRIP (From Requirements Section 3 & 11)
// Budget per student: ₹10,000, Travelers: 50
// Target Accommodation: ₹5,000 (50%)
// Maximum Accommodation Budget: ₹6,000 / student, ₹3,00,000 group
// ============================================================================
console.log("\n--- TEST 2: LOWER BUDGET (₹10,000, 50 TRAVELERS) ---");
{
  const trip = {
    tripCategory: "CAMPUS",
    startDate: "2026-09-20",
    endDate: "2026-09-25",
    budget: 10000,
    campusConfig: {
      budgetPerStudent: 10000,
      expectedParticipants: 50,
      studentsPerRoom: 2
    }
  };

  const budgetConfig = getCampusAccommodationBudget(trip);
  assert.strictEqual(budgetConfig.overallBudgetPerStudent, 10000, "Overall per-student budget must be ₹10,000");
  assert.strictEqual(budgetConfig.overallGroupBudget, 500000, "Overall group budget must be ₹5,00,000 (10k x 50)");
  assert.strictEqual(budgetConfig.targetAccommodationBudgetPerStudent, 5000, "Target accommodation (50%) must be ₹5,000/student");
  assert.strictEqual(budgetConfig.maxAccommodationBudgetPerStudent, 6000, "Maximum accommodation (60%) must be ₹6,000/student");
  assert.strictEqual(budgetConfig.targetAccommodationBudgetGroup, 250000, "Target group accommodation must be ₹2,50,000");
  assert.strictEqual(budgetConfig.maxAccommodationBudgetGroup, 300000, "Maximum group accommodation must be ₹3,00,000");

  console.log("✓ TEST 2 PASSED: ₹10,000 / 50 travelers derives Target ₹5,000 (₹2.5L group) and Max ₹6,000 (₹3L group).");
}

// ============================================================================
// TEST 3: ACCOMMODATION EXCEEDS BUDGET (From Requirements Section 8 & 11)
// Displays clear warning when exceeding 60% of budget.
// Actual estimate is NOT silently altered or capped.
// Excess amounts per student and group are reported accurately.
// ============================================================================
console.log("\n--- TEST 3: ACCOMMODATION EXCEEDS BUDGET (> 60%) ---");
{
  const trip = {
    tripCategory: "CAMPUS",
    startDate: "2026-09-20",
    endDate: "2026-09-29",
    budget: 20000,
    campusConfig: {
      budgetPerStudent: 20000, // Max 60% = ₹12,000 / student, ₹18,00,000 group
      expectedParticipants: 150,
      studentsPerRoom: 2
    }
  };

  // 150 students / 2 = 75 rooms
  // 75 rooms @ ₹2,000/room/night * 9 nights = ₹13,50,000 (within budget)
  // But let's test a luxury hotel: ₹4,000/room/night
  // 75 rooms @ ₹4,000/room/night * 7 nights = ₹21,00,000 group total
  // Per student: ₹21,00,000 / 150 = ₹14,000 / student
  const staySegments = [
    {
      id: "stay-1",
      location: "Alappuzha",
      nights: 7,
      selectedHotel: {
        name: "Lake Palace Resort",
        groupPrice: 2100000 // Explicit ₹21,00,000 group cost
      }
    }
  ];

  const analysis = calculateAccommodationBudgetAnalysis(trip, staySegments);
  assert.strictEqual(analysis.estimatedAccommodationGroup, 2100000, "Actual group cost must be ₹21,00,000 (NOT silently altered)");
  assert.strictEqual(analysis.estimatedAccommodationPerStudent, 14000, "Actual per student cost must be ₹14,000 (NOT silently altered)");
  assert.strictEqual(analysis.validationCase, 3, "Validation case must be Case 3 (Exceeds Maximum Allocation)");
  assert.strictEqual(analysis.exceedsMaxAllocation, true, "Must flag exceeding max allocation");
  assert.strictEqual(analysis.excessPerStudent, 2000, "Excess per student must be ₹2,000 (₹14,000 - ₹12,000)");
  assert.strictEqual(analysis.excessGroup, 300000, "Excess group must be ₹3,00,000 (₹21,00,000 - ₹18,00,000)");
  assert.strictEqual(analysis.remainingOverallPerStudentBudget, 6000, "Remaining overall per student is ₹20,000 - ₹14,000 = ₹6,000");
  assert.strictEqual(analysis.remainingOverallGroupBudget, 900000, "Remaining overall group is ₹30,00,000 - ₹21,00,000 = ₹9,00,000");

  console.log("✓ TEST 3 PASSED: Over-budget estimate (₹14,000 > ₹12,000) triggers Case 3 warning without silently altering numbers.");
}

// ============================================================================
// TEST 4: MULTIPLE STAY SEGMENTS (From Requirements Section 5 & 11)
// 3 stay segments across 9 nights:
// Alappuzha 4 nights, Kochi 3 nights, Munnar 2 nights
// Proportional distribution of ₹12,000 maximum accommodation budget:
// Alappuzha: 4/9 = ₹5,333.33 / student
// Kochi: 3/9 = ₹4,000.00 / student
// Munnar: 2/9 = ₹2,666.67 / student
// Verify all segment costs are included exactly once.
// ============================================================================
console.log("\n--- TEST 4: MULTIPLE STAY SEGMENTS PROPORTIONAL ALLOCATION ---");
{
  const trip = {
    tripCategory: "CAMPUS",
    startDate: "2026-09-20",
    endDate: "2026-09-29",
    budget: 20000,
    campusConfig: {
      budgetPerStudent: 20000,
      expectedParticipants: 150,
      studentsPerRoom: 2
    }
  };

  const staySegments = [
    {
      id: "stay-1",
      location: "Alappuzha",
      nights: 4,
      selectedHotel: { name: "Punnamada Resort", groupPrice: 600000 } // ₹4,000/student
    },
    {
      id: "stay-2",
      location: "Kochi",
      nights: 3,
      selectedHotel: { name: "Gateway Hotel Marine Drive", groupPrice: 450000 } // ₹3,000/student
    },
    {
      id: "stay-3",
      location: "Munnar",
      nights: 2,
      selectedHotel: { name: "Tea County Munnar", groupPrice: 450000 } // ₹3,000/student
    }
  ];

  // Check proportional budget allocation calculation for each segment
  const seg1Alloc = calculateSegmentBudgetAllocation(staySegments[0], staySegments, trip);
  const seg2Alloc = calculateSegmentBudgetAllocation(staySegments[1], staySegments, trip);
  const seg3Alloc = calculateSegmentBudgetAllocation(staySegments[2], staySegments, trip);

  assert.strictEqual(seg1Alloc.totalNights, 9, "Total nights must be 9");
  // Alappuzha: 4/9 * 12,000 = 5333.33
  assert.strictEqual(Math.round(seg1Alloc.segmentMaxBudgetPerStudent * 100) / 100, 5333.33, "Alappuzha max allocation must be ₹5,333.33");
  // Kochi: 3/9 * 12,000 = 4000.00
  assert.strictEqual(seg2Alloc.segmentMaxBudgetPerStudent, 4000, "Kochi max allocation must be ₹4,000.00");
  // Munnar: 2/9 * 12,000 = 2666.67
  assert.strictEqual(Math.round(seg3Alloc.segmentMaxBudgetPerStudent * 100) / 100, 2666.67, "Munnar max allocation must be ₹2,666.67");

  // Sum of segment allocations equals total allocation
  const totalAlloc = seg1Alloc.segmentMaxBudgetPerStudent + seg2Alloc.segmentMaxBudgetPerStudent + seg3Alloc.segmentMaxBudgetPerStudent;
  assert.strictEqual(Math.round(totalAlloc), 12000, "Sum of segment allocations must be ₹12,000");

  // Check summary aggregation: each segment cost included exactly once
  const summary = calculateAccommodationSummary(staySegments, trip);
  assert.strictEqual(summary.totalSegments, 3, "Total segments must be 3");
  assert.strictEqual(summary.totalNights, 9, "Total nights must be 9");
  assert.strictEqual(summary.totalGroupAccommodation, 1500000, "Total group accommodation must be 6L + 4.5L + 4.5L = ₹15,00,000");
  assert.strictEqual(summary.totalPerStudentAccommodation, 10000, "Total per student must be ₹15,00,000 / 150 = ₹10,000");
  assert.strictEqual(summary.utilizationPercentage, 50, "Accommodation utilization must be exactly 50% (₹15L / ₹30L)");

  console.log("✓ TEST 4 PASSED: Multiple stay segments correctly distributed (4/9 = ₹5,333.33, 3/9 = ₹4,000, 2/9 = ₹2,666.67) and aggregated exactly once.");
}

// ============================================================================
// TEST 5: PERSONAL TRIP STRICT PRESERVATION (From Requirements Section 10 & 11)
// Trip category: "PERSONAL"
// Keep existing budget calculation, pricing, summary, and impact layout unchanged.
// Do not apply 50%–60% accommodation allocation rule.
// ============================================================================
console.log("\n--- TEST 5: PERSONAL TRIP STRICT PRESERVATION ---");
{
  const trip = {
    tripCategory: "PERSONAL",
    startDate: "2026-09-20",
    endDate: "2026-09-29",
    budget: 60000,
    travelers: 2
  };

  const budgetConfig = getCampusAccommodationBudget(trip);
  assert.strictEqual(budgetConfig.isCampus, false, "Must identify as non-campus trip");
  assert.strictEqual(budgetConfig.accommodationBudgetGroup, 60000, "Personal budget must remain trip.budget (60000)");

  const staySegments = [
    {
      id: "stay-1",
      location: "Goa",
      nights: 3,
      selectedHotel: { name: "Taj Exotica", price: 45000 }
    }
  ];

  const analysis = calculateAccommodationBudgetAnalysis(trip, staySegments);
  assert.strictEqual(analysis.isCampus, false, "Analysis must be flagged as non-campus");
  assert.strictEqual(analysis.estimatedAccommodation, 45000, "Estimated accommodation must be ₹45,000");
  assert.strictEqual(analysis.remaining, 15000, "Remaining must be ₹15,000 (₹60,000 - ₹45,000)");
  assert.strictEqual(analysis.isOverBudget, false, "Must not be over budget");

  console.log("✓ TEST 5 PASSED: Personal trip completely preserves original calculations without 50%–60% campus constraints.");
}

// ============================================================================
// TEST 6: DYNAMIC BUDGET ALLOCATION TABLE (From Requirements Section 3)
// Verify dynamic calculations for ₹10k, ₹15k, ₹20k, ₹25k, ₹30k
// ============================================================================
console.log("\n--- TEST 6: DYNAMIC BUDGET ALLOCATION TABLE VERIFICATION ---");
{
  const testBudgets = [
    { budget: 10000, target: 5000, max: 6000 },
    { budget: 15000, target: 7500, max: 9000 },
    { budget: 20000, target: 10000, max: 12000 },
    { budget: 25000, target: 12500, max: 15000 },
    { budget: 30000, target: 15000, max: 18000 },
  ];

  for (const { budget, target, max } of testBudgets) {
    const trip = {
      tripCategory: "CAMPUS",
      campusConfig: { budgetPerStudent: budget, expectedParticipants: 100 }
    };
    const config = getCampusAccommodationBudget(trip);
    assert.strictEqual(config.targetAccommodationBudgetPerStudent, target, `Budget ₹${budget}: Target must be ₹${target}`);
    assert.strictEqual(config.maxAccommodationBudgetPerStudent, max, `Budget ₹${budget}: Max must be ₹${max}`);
    assert.strictEqual(config.targetAccommodationBudgetGroup, target * 100, `Budget ₹${budget}: Target group must be ₹${target * 100}`);
    assert.strictEqual(config.maxAccommodationBudgetGroup, max * 100, `Budget ₹${budget}: Max group must be ₹${max * 100}`);
  }

  console.log("✓ TEST 6 PASSED: Dynamic calculations match all Section 3 reference table specifications.");
}

// ============================================================================
// TEST 7: ZERO HOTELS SELECTED
// If 0 hotels selected, estimated accommodation cost is ₹0 / student and ₹0 group.
// Full budget remains available.
// ============================================================================
console.log("\n--- TEST 7: ZERO HOTELS SELECTED ---");
{
  const trip = {
    tripCategory: "CAMPUS",
    startDate: "2026-09-20",
    endDate: "2026-09-29",
    budget: 20000,
    campusConfig: {
      budgetPerStudent: 20000,
      expectedParticipants: 150,
      studentsPerRoom: 2
    }
  };

  const staySegments = [
    { id: "stay-1", location: "Alappuzha", nights: 4, selectedHotel: null },
    { id: "stay-2", location: "Kochi", nights: 3, selectedHotel: null },
    { id: "stay-3", location: "Munnar", nights: 2, selectedHotel: null }
  ];

  const analysis = calculateAccommodationBudgetAnalysis(trip, staySegments);
  assert.strictEqual(analysis.estimatedAccommodationPerStudent, 0, "Estimated per student must be ₹0");
  assert.strictEqual(analysis.estimatedAccommodationGroup, 0, "Estimated group must be ₹0");
  assert.strictEqual(analysis.remainingOverallPerStudentBudget, 20000, "Remaining per student must be full ₹20,000");
  assert.strictEqual(analysis.remainingOverallGroupBudget, 3000000, "Remaining group must be full ₹30,00,000");
  assert.strictEqual(analysis.validationCase, 1, "Validation case must be Case 1 (Within Budget)");

  console.log("✓ TEST 7 PASSED: 0 hotels selected yields ₹0 estimated cost and 100% remaining budget.");
}

// ============================================================================
// TEST 8: CASE 2 VALIDATION (APPROACHING LIMIT: 50% TO 60%)
// If accommodation is between 50% and 60%, display mild warning (Case 2).
// ============================================================================
console.log("\n--- TEST 8: CASE 2 VALIDATION (50% TO 60% ALLOCATION) ---");
{
  const trip = {
    tripCategory: "CAMPUS",
    budget: 20000, // 50% = 10,000; 60% = 12,000
    campusConfig: {
      budgetPerStudent: 20000,
      expectedParticipants: 100,
      studentsPerRoom: 2
    }
  };

  // Accommodation = ₹11,000 per student (₹11,00,000 group)
  // 55% utilization -> between 50% and 60%
  const staySegments = [
    {
      id: "stay-1",
      location: "Kochi",
      nights: 5,
      selectedHotel: { name: "City Hotel", groupPrice: 1100000 }
    }
  ];

  const analysis = calculateAccommodationBudgetAnalysis(trip, staySegments);
  assert.strictEqual(analysis.validationCase, 2, "Must identify as Case 2 (Approaching Limit)");
  assert.strictEqual(analysis.isApproachingLimit, true, "isApproachingLimit must be true");
  assert.strictEqual(analysis.exceedsMaxAllocation, false, "Must not exceed max allocation");
  assert.strictEqual(analysis.utilizationPercentage, 55, "Utilization must be 55%");

  console.log("✓ TEST 8 PASSED: 55% accommodation utilization correctly triggers Case 2 (Approaching Limit).");
}

// ============================================================================
// TEST 9: BACKEND VALIDATOR INTEGRATION
// Verify backend validator uses dynamic 60% accommodation budget ceiling.
// ============================================================================
console.log("\n--- TEST 9: BACKEND VALIDATOR INTEGRATION ---");
{
  const tripInput = {
    tripCategory: "CAMPUS",
    startDate: "2026-09-20",
    endDate: "2026-09-29",
    budget: 20000,
    campusConfig: {
      budgetPerStudent: 20000, // 60% = ₹12,000 / student, ₹18,00,000 group
      expectedParticipants: 150,
      studentsPerRoom: 2,
      inclusions: { accommodation: true, travel: true, localTransport: true, activities: true },
      mealInclusions: { breakfast: true, lunch: true, dinner: true }
    }
  };

  // Hotel exceeds ₹18,00,000 max accommodation budget (cost ₹19,50,000)
  const itinerary = {
    days: [
      {
        day: 1,
        plan: [
          { category: "operational", activity: "Check-in at Hotel", estimatedCost: "1950000" }
        ]
      }
    ],
    staySegments: [
      { id: "stay-1", location: "Kochi", nights: 9, checkIn: "2026-09-20", checkOut: "2026-09-29" }
    ]
  };

  const res = validateItinerary(itinerary, tripInput);
  const accomError = res.errors.find(e => e.type === "ACCOMMODATION_BUDGET_EXCEEDED");
  assert(accomError, "Must trigger ACCOMMODATION_BUDGET_EXCEEDED when hotel cost > ₹18,00,000");

  console.log("✓ TEST 9 PASSED: Backend validator enforces dynamic 60% ceiling (₹18,00,000) for ₹20,000 / 150 student trip.");
}

// ============================================================================
// TEST 10: SECTION 3 CASE A - TOTAL GROUP COST FOR 150 TRAVELERS (₹48,000 total)
// Alappuzha: 5 nights, ₹30,000 total group
// Kochi: 4 nights, ₹18,000 total group
// Total: 9 nights, ₹48,000 total group
// Expected:
// - Accommodation per student: ₹320
// - Total accommodation: ₹48,000
// - Remaining budget per student: ₹19,680
// - Remaining total budget: ₹29,52,000
// ============================================================================
console.log("\n--- TEST 10: SECTION 3 CASE A - TOTAL GROUP PRICING UNIT ---");
{
  const trip = {
    tripCategory: "CAMPUS",
    startDate: "2026-09-20",
    endDate: "2026-09-29",
    budget: 20000,
    campusConfig: {
      budgetPerStudent: 20000,
      expectedParticipants: 150,
      studentsPerRoom: 2,
    }
  };

  const staySegments = [
    {
      id: "stay-1",
      location: "Alappuzha",
      nights: 5,
      selectedHotel: { name: "Alappuzha Backwater Resort", priceUnit: "total_group", price: 30000 }
    },
    {
      id: "stay-2",
      location: "Kochi",
      nights: 4,
      selectedHotel: { name: "Kochi Heritage Hotel", priceUnit: "total_group", price: 18000 }
    }
  ];

  const summary = calculateAccommodationSummary(staySegments, trip);
  assert.strictEqual(summary.totalTravelers, 150, "Total travelers must be 150");
  assert.strictEqual(summary.totalSegments, 2, "Total stay segments must be 2");
  assert.strictEqual(summary.totalNights, 9, "Total nights must be 9");
  assert.strictEqual(summary.accommodationPerStudent, 320, "Accommodation per student must be ₹320");
  assert.strictEqual(summary.totalAccommodationCost, 48000, "Total accommodation must be ₹48,000");

  const analysis = calculateAccommodationBudgetAnalysis(trip, staySegments);
  assert.strictEqual(analysis.overallTripBudgetPerStudent, 20000, "Budget per student must be ₹20,000");
  assert.strictEqual(analysis.expectedStudents, 150, "Total travelers must be 150");
  assert.strictEqual(analysis.overallTripBudgetGroup, 3000000, "Total trip budget must be ₹30,00,000");

  assert.strictEqual(analysis.targetAccommodationBudgetPerStudent, 10000, "Target accommodation per student must be ₹10,000");
  assert.strictEqual(analysis.maxAccommodationBudgetPerStudent, 12000, "Max accommodation per student must be ₹12,000");
  assert.strictEqual(analysis.maxAccommodationBudgetGroup, 1800000, "Total max accommodation budget must be ₹18,00,000");

  assert.strictEqual(analysis.estimatedAccommodationPerStudent, 320, "Estimated accommodation per student must be ₹320");
  assert.strictEqual(analysis.estimatedAccommodationGroup, 48000, "Total estimated accommodation must be ₹48,000");

  assert.strictEqual(analysis.remainingOverallPerStudentBudget, 19680, "Remaining budget per student must be ₹19,680");
  assert.strictEqual(analysis.remainingOverallGroupBudget, 2952000, "Remaining total budget must be ₹29,52,000");
  assert.strictEqual(analysis.validationCase, 1, "Must be within target budget (Case 1)");

  console.log("✓ TEST 10 PASSED: ₹48,000 total group cost correctly yields ₹320/student, ₹19,680 remaining/student, and ₹29,52,000 remaining total budget.");
}

// ============================================================================
// TEST 11: SECTION 3 CASE B - PER-STUDENT COST FOR 150 TRAVELERS (₹48,000/student)
// Alappuzha: 5 nights, ₹30,000 per student
// Kochi: 4 nights, ₹18,000 per student
// Total: 9 nights, ₹48,000 per student (₹72,00,000 group)
// Expected:
// - Accommodation per student: ₹48,000
// - Total accommodation: ₹72,00,000
// - Budget warning: Case 3 (Exceeds 60% max allocation of ₹18,00,000 and total budget of ₹30,00,000)
// - Excess per student: ₹36,000
// - Excess group: ₹54,00,000
// ============================================================================
console.log("\n--- TEST 11: SECTION 3 CASE B - PER-STUDENT PRICING UNIT ---");
{
  const trip = {
    tripCategory: "CAMPUS",
    startDate: "2026-09-20",
    endDate: "2026-09-29",
    budget: 20000,
    campusConfig: {
      budgetPerStudent: 20000,
      expectedParticipants: 150,
      studentsPerRoom: 2,
    }
  };

  const staySegments = [
    {
      id: "stay-1",
      location: "Alappuzha",
      nights: 5,
      selectedHotel: { name: "Alappuzha Backwater Resort", priceUnit: "per_student", price: 30000 }
    },
    {
      id: "stay-2",
      location: "Kochi",
      nights: 4,
      selectedHotel: { name: "Kochi Heritage Hotel", priceUnit: "per_student", price: 18000 }
    }
  ];

  const summary = calculateAccommodationSummary(staySegments, trip);
  assert.strictEqual(summary.totalTravelers, 150, "Total travelers must be 150");
  assert.strictEqual(summary.totalSegments, 2, "Total stay segments must be 2");
  assert.strictEqual(summary.totalNights, 9, "Total nights must be 9");
  assert.strictEqual(summary.accommodationPerStudent, 48000, "Accommodation per student must be ₹48,000");
  assert.strictEqual(summary.totalAccommodationCost, 7200000, "Total accommodation must be ₹72,00,000");

  const analysis = calculateAccommodationBudgetAnalysis(trip, staySegments);
  assert.strictEqual(analysis.validationCase, 3, "Must trigger Case 3 over-budget warning");
  assert.strictEqual(analysis.exceedsMaxAllocation, true, "Must flag exceedsMaxAllocation");
  assert.strictEqual(analysis.excessPerStudent, 36000, "Excess per student must be ₹36,000 (₹48,000 - ₹12,000)");
  assert.strictEqual(analysis.excessGroup, 5400000, "Excess group must be ₹54,00,000 (₹72,00,000 - ₹18,00,000)");

  console.log("✓ TEST 11 PASSED: ₹48,000 per student correctly yields ₹72,00,000 group, triggers budget warning, and calculates ₹36k/student & ₹54L group excess.");
}

console.log("\n==================================================");
console.log("ALL 11 VERIFICATION TESTS PASSED CLEANLY!");
console.log("==================================================");
