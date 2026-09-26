const assert = require("assert");

// Import frontend utils into node test environment
const {
  getTripDurationDays,
  getCampusAccommodationBudget,
  calculateStayAccommodation,
  calculateAccommodationSummary,
  calculateAccommodationBudgetAnalysis,
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

// TEST 1 — 10 DAY CAMPUS TRIP
console.log("\n--- TEST 1: 10 DAY CAMPUS TRIP ---");
{
  const trip = {
    tripCategory: "CAMPUS",
    startDate: "2026-09-20",
    endDate: "2026-09-29", // 10 days
    budget: 15000,
    campusConfig: {
      budgetPerStudent: 15000,
      expectedParticipants: 200,
      studentsPerRoom: 2
    }
  };

  const duration = getTripDurationDays(trip);
  assert.strictEqual(duration, 10, "Trip duration must be exactly 10 days");

  const budgetConfig = getCampusAccommodationBudget(trip);
  assert.strictEqual(budgetConfig.overallBudgetPerStudent, 15000, "Overall per-student budget must be ₹15,000");
  assert.strictEqual(budgetConfig.overallGroupBudget, 3000000, "Overall group budget must be ₹30,00,000");
  assert.strictEqual(budgetConfig.accommodationBudgetPerStudent, 10000, "Accommodation maximum must be ₹10,000/student");
  assert.strictEqual(budgetConfig.accommodationBudgetGroup, 2000000, "Accommodation group maximum must be ₹20,00,000");

  console.log("✓ TEST 1 PASSED: 10-day trip derives ₹10,000/student and ₹20,00,000 group accommodation allocation.");
}

// TEST 2 — NO HOTELS
console.log("\n--- TEST 2: NO HOTELS SELECTED ---");
{
  const trip = {
    tripCategory: "CAMPUS",
    startDate: "2026-09-20",
    endDate: "2026-09-29",
    budget: 15000,
    campusConfig: {
      budgetPerStudent: 15000,
      expectedParticipants: 200,
      studentsPerRoom: 2
    }
  };

  const staySegments = [
    { id: "stay-1", location: "Thiruvananthapuram", nights: 4, selectedHotel: null },
    { id: "stay-2", location: "Munnar", nights: 3, selectedHotel: null },
    { id: "stay-3", location: "Kochi", nights: 2, selectedHotel: null }
  ];

  const analysis = calculateAccommodationBudgetAnalysis(trip, staySegments);
  assert.strictEqual(analysis.overallTripBudgetPerStudent, 15000, "Overall trip budget per student must be ₹15,000");
  assert.strictEqual(analysis.overallTripBudgetGroup, 3000000, "Overall trip budget group must be ₹30,00,000");
  assert.strictEqual(analysis.estimatedAccommodationPerStudent, 0, "Estimated accommodation per student must be ₹0");
  assert.strictEqual(analysis.estimatedAccommodationGroup, 0, "Estimated accommodation group must be ₹0");
  assert.strictEqual(analysis.remainingOverallPerStudentBudget, 15000, "Remaining overall per student must be full ₹15,000");
  assert.strictEqual(analysis.remainingOverallGroupBudget, 3000000, "Remaining overall group must be full ₹30,00,000");
  assert.strictEqual(analysis.exceedsOverallBudget, false, "Must not exceed overall budget");
  assert.strictEqual(analysis.exceedsInternalLimit, false, "Must not exceed internal limit");

  console.log("✓ TEST 2 PASSED: 0 hotels selected yields ₹0 estimated and full ₹15,000 / ₹30,00,000 remaining overall budget.");
}

// TEST 3 — ONE HOTEL SELECTED (EDUCATIONAL BULK GROUP RATE)
console.log("\n--- TEST 3: ONE HOTEL SELECTED (EDUCATIONAL BULK RATE) ---");
{
  const trip = {
    tripCategory: "CAMPUS",
    startDate: "2026-09-20",
    endDate: "2026-09-29",
    budget: 15000,
    campusConfig: {
      budgetPerStudent: 15000,
      expectedParticipants: 200,
      studentsPerRoom: 2
    }
  };

  // 200 students / 2 = 100 rooms.
  // Base retail rate: ₹3,500/night.
  // calculateCampusGroupRoomRate(3500, 100) -> 50% bulk concession = ₹1,750/night.
  // 100 rooms @ ₹1,750/night * 4 nights = ₹7,00,000 group.
  // Per-student: ₹7,00,000 / 200 = ₹3,500.
  const staySegments = [
    {
      id: "stay-1",
      location: "Thiruvananthapuram",
      nights: 4,
      selectedHotel: { name: "Hycinth Hotels", nightlyPrice: 3500 }
    },
    { id: "stay-2", location: "Munnar", nights: 3, selectedHotel: null },
    { id: "stay-3", location: "Kochi", nights: 2, selectedHotel: null }
  ];

  const analysis = calculateAccommodationBudgetAnalysis(trip, staySegments);
  assert.strictEqual(analysis.overallTripBudgetPerStudent, 15000, "Overall trip budget per student is ₹15,000");
  assert.strictEqual(analysis.overallTripBudgetGroup, 3000000, "Overall trip budget group is ₹30,00,000");
  assert.strictEqual(analysis.estimatedAccommodationGroup, 700000, "Group cost with educational bulk discount is ₹7,00,000");
  assert.strictEqual(analysis.estimatedAccommodationPerStudent, 3500, "Per-student is ₹3,500");
  assert.strictEqual(analysis.remainingOverallPerStudentBudget, 11500, "Remaining overall per-student is ₹15,000 - ₹3,500 = ₹11,500");
  assert.strictEqual(analysis.remainingOverallGroupBudget, 2300000, "Remaining overall group is ₹30,00,000 - ₹7,00,000 = ₹23,00,000");
  assert.strictEqual(analysis.exceedsOverallBudget, false, "Within overall budget");
  assert.strictEqual(analysis.exceedsInternalLimit, false, "Within internal limit");

  console.log("✓ TEST 3 PASSED: Single hotel correctly updates overall remaining: ₹11,500/student and ₹23,00,000 group.");
}

// TEST 4 — ALL HOTELS SELECTED (REALISTIC BULK ESTIMATION WITHIN BUDGET)
console.log("\n--- TEST 4: ALL HOTELS SELECTED (REALISTIC BULK ESTIMATION) ---");
{
  const trip = {
    tripCategory: "CAMPUS",
    startDate: "2026-09-20",
    endDate: "2026-09-29",
    budget: 15000,
    campusConfig: {
      budgetPerStudent: 15000,
      expectedParticipants: 200,
      studentsPerRoom: 2
    }
  };

  // Hotel 1 (TVM): 100 rooms @ 1750 (50% of 3500) * 4 nights = ₹7,00,000
  // Hotel 2 (Munnar): 100 rooms @ 2500 (8000 discounted & capped at 2500 institutional tier) * 3 nights = ₹7,50,000
  // Hotel 3 (Kochi): 100 rooms @ 2000 (50% of 4000) * 2 nights = ₹4,00,000
  // Total Group = ₹18,50,000 (NOT the unadjusted ₹46,00,000 retail!)
  // Total Per Student = ₹18,50,000 / 200 = ₹9,250 (NOT ₹23,000/student!)
  const staySegments = [
    {
      id: "stay-1",
      location: "Thiruvananthapuram",
      nights: 4,
      selectedHotel: { name: "Hycinth Hotels", nightlyPrice: 3500 }
    },
    {
      id: "stay-2",
      location: "Munnar",
      nights: 3,
      selectedHotel: { name: "Blanket Hotel", nightlyPrice: 8000 }
    },
    {
      id: "stay-3",
      location: "Kochi",
      nights: 2,
      selectedHotel: { name: "Grand Hyatt", nightlyPrice: 4000 }
    }
  ];

  const analysis = calculateAccommodationBudgetAnalysis(trip, staySegments);
  assert.strictEqual(analysis.overallTripBudgetPerStudent, 15000, "Overall trip budget is ₹15,000");
  assert.strictEqual(analysis.overallTripBudgetGroup, 3000000, "Overall trip budget is ₹30,00,000");
  assert.strictEqual(analysis.estimatedAccommodationGroup, 1850000, "Total group cost must be ₹18,50,000");
  assert.strictEqual(analysis.estimatedAccommodationPerStudent, 9250, "Total per student must be ₹9,250");
  assert.strictEqual(analysis.remainingOverallPerStudentBudget, 5750, "Remaining overall per student must be ₹5,750");
  assert.strictEqual(analysis.remainingOverallGroupBudget, 1150000, "Remaining overall group budget must be ₹11,50,000");
  assert.strictEqual(analysis.exceedsOverallBudget, false, "Must NOT exceed overall trip budget");
  assert.strictEqual(analysis.exceedsInternalLimit, false, "Must NOT exceed internal allocation limit");

  console.log("✓ TEST 4 PASSED: Realistic bulk estimation produces ₹9,250/student & ₹18,50,000 group, leaving ₹5,750/student & ₹11,50,000 remaining.");
}

// TEST 4B — EXCEEDS INTERNAL LIMIT BUT WITHIN OVERALL BUDGET
console.log("\n--- TEST 4B: EXCEEDS INTERNAL LIMIT BUT WITHIN OVERALL BUDGET ---");
{
  const trip = {
    tripCategory: "CAMPUS",
    startDate: "2026-09-20",
    endDate: "2026-09-29", // 10 days, max internal accommodation limit: ₹10,000/student, ₹20,00,000 group
    budget: 15000,
    campusConfig: {
      budgetPerStudent: 15000,
      expectedParticipants: 200,
      studentsPerRoom: 2
    }
  };

  // 100 rooms across 9 nights at luxury institutional cap (₹2,500/night):
  // 100 * 2500 * 9 = ₹22,50,000 group -> ₹11,250/student
  // Exceeds internal limit (₹10,000) by ₹1,250, BUT within overall trip budget (₹15,000)
  const staySegments = [
    {
      id: "stay-1",
      location: "Thiruvananthapuram",
      nights: 9,
      selectedHotel: { name: "Ultra Luxury Palace", nightlyPrice: 12000 }
    }
  ];

  const analysis = calculateAccommodationBudgetAnalysis(trip, staySegments);
  assert.strictEqual(analysis.overallTripBudgetPerStudent, 15000);
  assert.strictEqual(analysis.estimatedAccommodationGroup, 2250000, "Group cost is ₹22,50,000");
  assert.strictEqual(analysis.estimatedAccommodationPerStudent, 11250, "Per-student is ₹11,250");
  assert.strictEqual(analysis.remainingOverallPerStudentBudget, 3750, "Remaining overall per student is ₹3,750");
  assert.strictEqual(analysis.exceedsInternalLimit, true, "Must flag exceeding internal limit");
  assert.strictEqual(analysis.exceedsOverallBudget, false, "Must NOT flag exceeding overall budget");

  console.log("✓ TEST 4B PASSED: Correctly flags exceedsInternalLimit (advisory) without falsely claiming overall budget exceeded.");
}

// TEST 4C — GENUINE OVER-OVERALL-BUDGET SCENARIO
console.log("\n--- TEST 4C: GENUINE OVER-OVERALL-BUDGET SCENARIO ---");
{
  const trip = {
    tripCategory: "CAMPUS",
    startDate: "2026-09-20",
    endDate: "2026-09-29",
    budget: 8000,
    campusConfig: {
      budgetPerStudent: 8000, // Total group budget ₹16,00,000
      expectedParticipants: 200,
      studentsPerRoom: 2
    }
  };

  // 3 hotels produce realistic group accommodation of ₹18,50,000 (₹9,250/student)
  // Since overall trip budget is ₹8,000/student (₹16,00,000 group), accommodation exceeds entire trip budget!
  const staySegments = [
    {
      id: "stay-1",
      location: "Thiruvananthapuram",
      nights: 4,
      selectedHotel: { name: "Hycinth Hotels", nightlyPrice: 3500 }
    },
    {
      id: "stay-2",
      location: "Munnar",
      nights: 3,
      selectedHotel: { name: "Blanket Hotel", nightlyPrice: 8000 }
    },
    {
      id: "stay-3",
      location: "Kochi",
      nights: 2,
      selectedHotel: { name: "Grand Hyatt", nightlyPrice: 4000 }
    }
  ];

  const analysis = calculateAccommodationBudgetAnalysis(trip, staySegments);
  assert.strictEqual(analysis.overallTripBudgetPerStudent, 8000);
  assert.strictEqual(analysis.overallTripBudgetGroup, 1600000);
  assert.strictEqual(analysis.estimatedAccommodationGroup, 1850000);
  assert.strictEqual(analysis.estimatedAccommodationPerStudent, 9250);
  assert.strictEqual(analysis.remainingOverallPerStudentBudget, -1250);
  assert.strictEqual(analysis.remainingOverallGroupBudget, -250000);
  assert.strictEqual(analysis.exceedsOverallBudget, true, "Must flag exceeding overall budget");
  assert.strictEqual(analysis.overOverallAmountPerStudent, 1250, "Over overall by ₹1,250/student");
  assert.strictEqual(analysis.overOverallAmountGroup, 250000, "Group over overall by ₹2,50,000");

  console.log("✓ TEST 4C PASSED: Correctly flags exceedsOverallBudget when accommodation (₹9,250) > overall trip budget (₹8,000).");
}

// TEST 5 — SHORTER TRIP (6 DAYS)
console.log("\n--- TEST 5: SHORTER TRIP (6 DAYS) ---");
{
  const trip = {
    tripCategory: "CAMPUS",
    startDate: "2026-09-20",
    endDate: "2026-09-25", // 6 days
    budget: 15000,
    campusConfig: {
      budgetPerStudent: 15000,
      expectedParticipants: 200,
      studentsPerRoom: 2
    }
  };

  const duration = getTripDurationDays(trip);
  assert.strictEqual(duration, 6, "Trip duration must be 6 days");

  const budgetConfig = getCampusAccommodationBudget(trip);
  // 6 * 1000 = 6,000
  assert.strictEqual(budgetConfig.accommodationBudgetPerStudent, 6000, "6-day trip must allocate ₹6,000/student, NOT ₹10,000");
  assert.strictEqual(budgetConfig.accommodationBudgetGroup, 1200000, "6-day trip group allocation must be ₹12,00,000");

  console.log("✓ TEST 5 PASSED: 6-day trip accommodation allocation is ₹6,000/student (NOT defaulting to ₹10,000).");
}

// TEST 6 — LONGER TRIP (12 DAYS)
console.log("\n--- TEST 6: LONGER TRIP (12 DAYS) ---");
{
  const trip = {
    tripCategory: "CAMPUS",
    startDate: "2026-09-20",
    endDate: "2026-10-01", // 12 days
    budget: 15000,
    campusConfig: {
      budgetPerStudent: 15000,
      expectedParticipants: 200,
      studentsPerRoom: 2
    }
  };

  const duration = getTripDurationDays(trip);
  assert.strictEqual(duration, 12, "Trip duration must be 12 days");

  const budgetConfig = getCampusAccommodationBudget(trip);
  // 12 * 1000 = 12,000, but cap is 10,000
  assert.strictEqual(budgetConfig.accommodationBudgetPerStudent, 10000, "12-day trip must be capped at ₹10,000/student");
  assert.strictEqual(budgetConfig.accommodationBudgetGroup, 2000000, "12-day trip group allocation must be capped at ₹20,00,000");

  console.log("✓ TEST 6 PASSED: 12-day trip accommodation allocation correctly capped at ₹10,000/student ceiling.");
}

// TEST 7 — BUILDER USES IDENTICAL CANONICAL DERIVED ALLOCATION
console.log("\n--- TEST 7: BUILDER CANONICAL SYNC ---");
{
  const trip = {
    tripCategory: "CAMPUS",
    startDate: "2026-09-20",
    endDate: "2026-09-29", // 10 days
    budget: 15000,
    campusConfig: {
      budgetPerStudent: 15000,
      expectedParticipants: 200,
      studentsPerRoom: 2
    }
  };

  const builderBudget = getCampusAccommodationBudget(trip);
  const stayPlanBudget = calculateAccommodationBudgetAnalysis(trip, []);

  assert.strictEqual(builderBudget.accommodationBudgetPerStudent, stayPlanBudget.accommodationBudgetPerStudent, "Builder and Stay Plan per-student budgets must match");
  assert.strictEqual(builderBudget.accommodationBudgetGroup, stayPlanBudget.accommodationBudgetGroup, "Builder and Stay Plan group budgets must match");
  assert.strictEqual(builderBudget.accommodationBudgetPerStudent, 10000, "Must be ₹10,000");
  assert.strictEqual(builderBudget.accommodationBudgetGroup, 2000000, "Must be ₹20,00,000");

  console.log("✓ TEST 7 PASSED: Builder and Stay Plan use identical canonical values (₹10,000 & ₹20,00,000).");
}

// TEST 8 — PERSONAL TRIP REMAINS UNCHANGED
console.log("\n--- TEST 8: PERSONAL TRIP UNCHANGED ---");
{
  const trip = {
    tripCategory: "PERSONAL",
    startDate: "2026-09-20",
    endDate: "2026-09-29",
    budget: 60000,
    travelers: 2
  };

  const budgetConfig = getCampusAccommodationBudget(trip);
  assert.strictEqual(budgetConfig.isCampus, false, "Must identify as non-campus");
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
  assert.strictEqual(analysis.isCampus, false);
  assert.strictEqual(analysis.estimatedAccommodation, 45000);
  assert.strictEqual(analysis.remaining, 15000);
  assert.strictEqual(analysis.isOverBudget, false);

  console.log("✓ TEST 8 PASSED: Personal Trip retains original budget behavior and logic without modification.");
}

// TEST 9 — BACKEND VALIDATOR DISCRIMINATES ACCOMMODATION VS OVERALL BUDGET
console.log("\n--- TEST 9: BACKEND VALIDATOR DUAL-LEVEL CHECK ---");
{
  const tripInput = {
    tripCategory: "CAMPUS",
    startDate: "2026-09-20",
    endDate: "2026-09-29", // 10 days => max lodging ₹10,000/student, ₹20,00,000 group
    budget: 15000,
    campusConfig: {
      budgetPerStudent: 15000, // ₹30,00,000 group
      expectedParticipants: 200,
      studentsPerRoom: 2,
      inclusions: { accommodation: true, travel: true, localTransport: true, activities: true },
      mealInclusions: { breakfast: true, lunch: true, dinner: true }
    }
  };

  // Case A: Accommodation exceeds ₹20,00,000, but total cost is under ₹30,00,000
  // e.g. Hotel = ₹22,00,000, Activities = ₹1,00,000 -> Total = ₹23,00,000 (under ₹30,00,000 overall, but lodging > ₹20,00,000)
  const itineraryA = {
    days: [
      {
        day: 1,
        plan: [
          { category: "operational", activity: "Check-in at Luxury Hotel", estimatedCost: "2200000" },
          { category: "activity", activity: "Museum visit", estimatedCost: "100000" }
        ]
      }
    ],
    staySegments: [
      { id: "stay-1", location: "Kochi", nights: 9, checkIn: "2026-09-20", checkOut: "2026-09-29" }
    ]
  };

  const resA = validateItinerary(itineraryA, tripInput);
  const accomError = resA.errors.find(e => e.type === "ACCOMMODATION_BUDGET_EXCEEDED");
  const overallError = resA.errors.find(e => e.type === "BUDGET_EXCEEDED");
  assert(accomError, "Must trigger ACCOMMODATION_BUDGET_EXCEEDED when hotel cost > ₹20,00,000");
  assert(!overallError, "Must NOT trigger overall BUDGET_EXCEEDED when total cost (₹23,00,000) <= ₹30,00,000");

  console.log("✓ TEST 9 PASSED: Backend validator accurately isolates ACCOMMODATION_BUDGET_EXCEEDED without false overall budget error.");
}

// TEST 10 — CATEGORY-WISE BUDGET ANALYSIS WITH SINGLE SOURCE OF TRUTH
console.log("\n--- TEST 10: CATEGORY-WISE BUDGET ANALYSIS (4 CATEGORIES, 2 SECTIONS) ---");
{
  const trip = {
    tripCategory: "CAMPUS",
    startDate: "2026-09-20",
    endDate: "2026-09-29",
    budget: 15000,
    campusConfig: {
      budgetPerStudent: 15000,
      expectedParticipants: 200,
      studentsPerRoom: 2,
      inclusions: { accommodation: true, travel: true, localTransport: true, activities: true },
      mealInclusions: { breakfast: true, lunch: true, dinner: true }
    }
  };

  const staySegments = [
    {
      id: "stay-1",
      location: "Thiruvananthapuram",
      nights: 4,
      selectedHotel: { name: "Hycinth Hotels", nightlyPrice: 3500 }
    },
    {
      id: "stay-2",
      location: "Munnar",
      nights: 3,
      selectedHotel: { name: "Fragrant Nature Munnar", nightlyPrice: 8000 }
    },
    {
      id: "stay-3",
      location: "Kochi",
      nights: 2,
      selectedHotel: { name: "Grand Hyatt Kochi", nightlyPrice: 4000 }
    }
  ];

  const itinerary = [
    {
      day: 1,
      plan: [
        { category: "transport", activity: "Train to TVM", estimatedCost: 100000 },
        { category: "food", activity: "Breakfast at Station", estimatedCost: 100000 },
        { category: "activity", activity: "Technopark Educational Visit", estimatedCost: 100000 },
        { category: "shopping", activity: "Local Handicrafts Shopping", estimatedCost: 50000 } // EXCLUDED
      ]
    },
    {
      day: 2,
      plan: [
        { category: "local transport", activity: "Local Tour Bus", estimatedCost: 200000 },
        { category: "dining", activity: "Institutional Group Lunch", estimatedCost: 200000 },
        { category: "activity", activity: "Science Center Visit", estimatedCost: 100000 },
        { category: "activity", activity: "Optional Evening Boat Ride", estimatedCost: 60000, optional: true } // EXCLUDED
      ]
    },
    {
      day: 3,
      plan: [
        { category: "food", activity: "Institutional Dinner", estimatedCost: 200000 },
        { category: "activity", activity: "Exclusive Water Sports", estimatedCost: 40000, isExcluded: true }, // EXCLUDED
        { category: "transport", activity: "Return Train to Source", estimatedCost: 100000 }
      ]
    }
  ];

  const analysis = calculateCampusCategoryBudgetAnalysis(trip, staySegments, itinerary);

  // Overall limit checks
  assert.strictEqual(analysis.overallBudgetPerStudent, 15000, "Overall per-student budget must be ₹15,000");
  assert.strictEqual(analysis.overallGroupBudget, 3000000, "Overall group budget must be ₹30,00,000");

  // Accommodation single source of truth check
  assert.strictEqual(analysis.perStudent.accommodation, 9250, "Accommodation per student must match canonical ₹9,250");
  assert.strictEqual(analysis.group.accommodation, 1850000, "Accommodation group must match canonical ₹18,50,000");

  // Travel check: 100,000 + 200,000 + 100,000 = 400,000 group, 2,000 per student
  assert.strictEqual(analysis.group.travel, 400000, "Group travel must be ₹4,00,000");
  assert.strictEqual(analysis.perStudent.travel, 2000, "Per student travel must be ₹2,000");

  // Food check (aggregates Breakfast + Lunch + Dinner without separate meal rows):
  // 100,000 (breakfast) + 200,000 (lunch) + 200,000 (dinner) = 500,000 group, 2,500 per student
  assert.strictEqual(analysis.group.food, 500000, "Combined group food must be ₹5,00,000");
  assert.strictEqual(analysis.perStudent.food, 2500, "Combined per student food must be ₹2,500");

  // Activities check (inclusive only, excludes shopping 50k, optional 60k, isExcluded 40k):
  // Technopark (100k) + Science Center (100k) = 200,000 group, 1,000 per student
  assert.strictEqual(analysis.group.activities, 200000, "Inclusive group activities must be ₹2,00,000");
  assert.strictEqual(analysis.perStudent.activities, 1000, "Inclusive per student activities must be ₹1,000");

  // Total Included check:
  // Per Student: 9250 (accommodation) + 2000 (travel) + 1000 (activities) = 12,250
  // Group: 18,50,000 + 4,00,000 + 2,00,000 = 24,50,000
  // Food is NOT included in actual package cost (provided via accommodation arrangement)
  assert.strictEqual(analysis.perStudent.totalIncluded, 12250, "Total included per student must be ₹12,250 (excluding food)");
  assert.strictEqual(analysis.group.totalIncluded, 2450000, "Total included group must be ₹24,50,000 (excluding food)");

  // Remaining against overall Campus Budget:
  // Per Student: 15,000 - 12,250 = 2,750
  // Group: 30,00,000 - 24,50,000 = 5,50,000
  assert.strictEqual(analysis.perStudent.remaining, 2750, "Remaining per student must be ₹2,750");
  assert.strictEqual(analysis.group.remaining, 550000, "Remaining group must be ₹5,50,000");

  console.log("✓ TEST 10 PASSED: Category-wise analysis correctly calculates Accommodation + Travel + Activities (no Food), Total Included, and Remaining.");
}

// TEST 11 — STAY PLAN HOTEL SELECTION / REMOVAL SYNC
console.log("\n--- TEST 11: CANONICAL SYNC ON HOTEL REMOVAL ---");
{
  const trip = {
    tripCategory: "CAMPUS",
    startDate: "2026-09-20",
    endDate: "2026-09-29",
    budget: 15000,
    campusConfig: {
      budgetPerStudent: 15000,
      expectedParticipants: 200,
      studentsPerRoom: 2
    }
  };

  // Remove Hotel 3 (Kochi): stays only at TVM and Munnar
  const staySegmentsWithoutKochi = [
    {
      id: "stay-1",
      location: "Thiruvananthapuram",
      nights: 4,
      selectedHotel: { name: "Hycinth Hotels", nightlyPrice: 3500 } // ₹7,00,000
    },
    {
      id: "stay-2",
      location: "Munnar",
      nights: 3,
      selectedHotel: { name: "Fragrant Nature Munnar", nightlyPrice: 8000 } // ₹7,50,000
    },
    { id: "stay-3", location: "Kochi", nights: 2, selectedHotel: null } // 0
  ];

  const analysis = calculateCampusCategoryBudgetAnalysis(trip, staySegmentsWithoutKochi, []);
  assert.strictEqual(analysis.group.accommodation, 1450000, "Group accommodation updates to ₹14,50,000");
  assert.strictEqual(analysis.perStudent.accommodation, 7250, "Per student accommodation updates to ₹7,250");
  assert.strictEqual(analysis.perStudent.totalIncluded, 7250, "Total included reflects updated accommodation");

  console.log("✓ TEST 11 PASSED: Removing a hotel immediately reflects updated canonical accommodation cost.");
}

// TEST 12 — INCLUSIONS TOGGLE AND EXCLUSION BEHAVIOR
console.log("\n--- TEST 12: INCLUSIONS TOGGLING & EXCLUSIONS ---");
{
  const trip = {
    tripCategory: "CAMPUS",
    startDate: "2026-09-20",
    endDate: "2026-09-29",
    budget: 15000,
    campusConfig: {
      budgetPerStudent: 15000,
      expectedParticipants: 200,
      studentsPerRoom: 2,
      inclusions: { accommodation: false, travel: true, localTransport: true, activities: true }, // Accommodation excluded
      mealInclusions: { breakfast: false, lunch: true, dinner: true } // Breakfast excluded
    }
  };

  const staySegments = [
    {
      id: "stay-1",
      location: "Thiruvananthapuram",
      nights: 4,
      selectedHotel: { name: "Hycinth Hotels", nightlyPrice: 3500 }
    }
  ];

  const itinerary = [
    {
      day: 1,
      plan: [
        { category: "food", activity: "Breakfast", estimatedCost: 100000 },
        { category: "dining", activity: "Lunch", estimatedCost: 150000 }
      ]
    }
  ];

  const analysis = calculateCampusCategoryBudgetAnalysis(trip, staySegments, itinerary);
  assert.strictEqual(analysis.group.accommodation, 0, "Excluded accommodation must be ₹0");
  assert.strictEqual(analysis.perStudent.accommodation, 0, "Excluded accommodation per student must be ₹0");
  assert.strictEqual(analysis.group.food, 150000, "Food must only include Lunch (₹1,50,000) when Breakfast is excluded");

  console.log("✓ TEST 12 PASSED: Toggled exclusions properly zero out excluded categories.");
}

// TEST 13 — EDIT LIMIT (BUDGET PER STUDENT UPDATE)
console.log("\n--- TEST 13: EDIT BUDGET LIMIT UPDATES OVERALL GROUP BUDGET ---");
{
  const trip = {
    tripCategory: "CAMPUS",
    startDate: "2026-09-20",
    endDate: "2026-09-29",
    budget: 18000, // Changed from 15,000 to 18,000
    campusConfig: {
      budgetPerStudent: 18000,
      expectedParticipants: 200,
      studentsPerRoom: 2
    }
  };

  const analysis = calculateCampusCategoryBudgetAnalysis(trip, [], []);
  assert.strictEqual(analysis.overallBudgetPerStudent, 18000, "Updated budget per student is ₹18,000");
  assert.strictEqual(analysis.overallGroupBudget, 3600000, "Updated group budget is ₹36,00,000");
  assert.strictEqual(analysis.perStudent.remaining, 18000, "Remaining per student is full ₹18,000");
  assert.strictEqual(analysis.group.remaining, 3600000, "Remaining group is full ₹36,00,000");

  console.log("✓ TEST 13 PASSED: Editing budget updates both per-student and group limits and calculations.");
}

// TEST 14 — DETERMINISTIC BUDGET PREDICTION
console.log("\n--- TEST 14: DETERMINISTIC BUDGET PREDICTION ---");
{
  // 8-day trip
  const trip8 = {
    tripCategory: "CAMPUS",
    duration: 8,
    startDate: "2026-09-20",
    endDate: "2026-09-27", // 8 days
    budget: 15000,
    campusConfig: {
      budgetPerStudent: 15000,
      expectedParticipants: 200,
    },
  };
  const pred8 = calculateCampusBudgetPrediction(trip8);
  assert.strictEqual(pred8.durationDays, 8, "Duration must be 8 days");
  assert.strictEqual(pred8.baselinePerStudent.accommodation, 8000, "8-day baseline accommodation must be ₹8,000");
  assert.strictEqual(pred8.baselinePerStudent.travel, 3500, "8-day baseline travel must be ₹3,500");
  assert.strictEqual(pred8.baselinePerStudent.food, 2500, "8-day baseline food must be ₹2,500");
  assert.strictEqual(pred8.baselinePerStudent.activities, 1000, "8-day baseline activities must be ₹1,000");
  assert.strictEqual(pred8.planningBaseline, 15000, "8-day planning baseline must be ₹15,000");
  assert.strictEqual(pred8.recommendedPerStudent.min, 14500, "8-day recommended min must be ₹14,500");
  assert.strictEqual(pred8.recommendedPerStudent.max, 15000, "8-day recommended max must be ₹15,000");

  // 10-day trip
  const trip10 = {
    tripCategory: "CAMPUS",
    duration: 10,
    startDate: "2026-09-20",
    endDate: "2026-09-29", // 10 days
    budget: 15000,
    campusConfig: {
      budgetPerStudent: 15000,
      expectedParticipants: 200,
    },
  };
  const pred10 = calculateCampusBudgetPrediction(trip10);
  assert.strictEqual(pred10.durationDays, 10, "Duration must be 10 days");
  assert.strictEqual(pred10.baselinePerStudent.accommodation, 10000, "10-day baseline accommodation must be ₹10,000");
  assert.strictEqual(pred10.baselinePerStudent.travel, 4000, "10-day baseline travel must be ₹4,000");
  assert.strictEqual(pred10.baselinePerStudent.food, 3000, "10-day baseline food must be ₹3,000");
  assert.strictEqual(pred10.baselinePerStudent.activities, 1000, "10-day baseline activities must be ₹1,000");
  assert.strictEqual(pred10.planningBaseline, 18000, "10-day planning baseline must be ₹18,000");
  assert.strictEqual(pred10.recommendedPerStudent.min, 17500, "10-day recommended min must be ₹17,500");
  assert.strictEqual(pred10.recommendedPerStudent.max, 18000, "10-day recommended max must be ₹18,000");
  assert.strictEqual(pred10.recommendedPerStudent.display, "₹17,500–₹18,000", "Display must be ₹17,500–₹18,000");

  console.log("✓ TEST 14 PASSED: Deterministic Budget Prediction generates exact reference planning baselines (8-day ₹15k, 10-day ₹18k) and ranges.");
}

// TEST 15 — THREE BUDGET STATUSES (CASE A, CASE B, CASE C)
console.log("\n--- TEST 15: THREE BUDGET STATUSES (CASES A, B, C) ---");
{
  const baseTrip = {
    tripCategory: "CAMPUS",
    duration: 10,
    campusConfig: {
      expectedParticipants: 200,
    },
  };

  // Mock category budget with actual cost = ₹15,500
  const mockCatBudget = {
    expectedStudents: 200,
    perStudent: { totalIncluded: 15500 },
    group: { totalIncluded: 3100000 },
  };

  // Case A: Current budget (₹18,000) >= recommended planning requirement (₹17,500)
  const predA = calculateCampusBudgetPrediction(
    { ...baseTrip, campusConfig: { ...baseTrip.campusConfig, budgetPerStudent: 18000 } },
    { ...mockCatBudget, overallBudgetPerStudent: 18000, overallGroupBudget: 3600000 }
  );
  assert.strictEqual(predA.status, "within_recommended", "Case A status must be within_recommended");
  assert.strictEqual(predA.statusMessage, "Package budget is within the recommended planning range.");
  assert.strictEqual(predA.gapPerStudent, 0);

  // Case B: Current budget (₹16,000) below recommended planning range (₹17,500) but >= actual cost (₹15,500)
  const predB = calculateCampusBudgetPrediction(
    { ...baseTrip, campusConfig: { ...baseTrip.campusConfig, budgetPerStudent: 16000 } },
    { ...mockCatBudget, overallBudgetPerStudent: 16000, overallGroupBudget: 3200000 }
  );
  assert.strictEqual(predB.status, "below_recommended", "Case B status must be below_recommended");
  assert.strictEqual(predB.statusMessage, "Package budget is below the recommended planning range.");
  assert.strictEqual(predB.gapPerStudent, 0, "Case B must not claim an actual cost shortfall");

  // Case C: Current budget (₹15,000) < actual cost (₹15,500)
  const predC = calculateCampusBudgetPrediction(
    { ...baseTrip, campusConfig: { ...baseTrip.campusConfig, budgetPerStudent: 15000 } },
    { ...mockCatBudget, overallBudgetPerStudent: 15000, overallGroupBudget: 3000000 }
  );
  assert.strictEqual(predC.status, "insufficient", "Case C status must be insufficient");
  assert.strictEqual(predC.statusMessage, "Package budget is insufficient for the currently configured package.");
  assert.strictEqual(predC.gapPerStudent, 500, "Case C shortfall per student must be ₹500");
  assert.strictEqual(predC.gapGroup, 100000, "Case C group shortfall must be ₹1,00,000");

  console.log("✓ TEST 15 PASSED: All three budget statuses (within, below recommended, insufficient) correctly identified with exact shortfalls.");
}

// TEST 16 — REAL COST REDUCTION SCENARIOS
console.log("\n--- TEST 16: COST REDUCTION SCENARIOS (REAL ITEMS ONLY) ---");
{
  const trip = {
    tripCategory: "CAMPUS",
    startDate: "2026-09-20",
    endDate: "2026-09-29",
    budget: 15000,
    campusConfig: {
      budgetPerStudent: 15000,
      expectedParticipants: 200,
      studentsPerRoom: 2
    },
    itinerary: [
      {
        day: 1,
        plan: [
          { id: "act-1", category: "activity", activity: "Technopark Educational Visit", estimatedCost: 100000 },
          { id: "act-2", category: "shopping", activity: "Local Crafts Shopping", estimatedCost: 50000 }, // EXCLUDED: shopping
          { id: "act-3", category: "activity", activity: "Optional Evening Boat Ride", estimatedCost: 40000, optional: true } // EXCLUDED: optional
        ]
      },
      {
        day: 2,
        plan: [
          { id: "act-4", category: "activity", activity: "Science Center Visit", estimatedCost: 100000 }
        ]
      }
    ],
    staySegments: [
      {
        id: "stay-1",
        location: "Thiruvananthapuram",
        nights: 4,
        selectedHotel: { name: "Apollo Dimora", nightlyPrice: 3500 }
      }
    ]
  };

  const scenarios = getCampusCostReductionScenarios(trip, trip.staySegments, trip.itinerary);
  assert.strictEqual(scenarios.isCampus, true);
  assert.strictEqual(scenarios.activityOptions.length, 2, "Only 2 inclusive activities must be available for reduction");
  assert.strictEqual(scenarios.activityOptions[0].id, "act-1");
  assert.strictEqual(scenarios.activityOptions[0].costPerStudent, 500, "Technopark cost per student must be ₹500 (100k / 200)");
  assert.strictEqual(scenarios.activityOptions[1].id, "act-4");
  assert.strictEqual(scenarios.activityOptions[1].costPerStudent, 500, "Science Center cost per student must be ₹500 (100k / 200)");

  // Verify non-available messages
  assert.strictEqual(scenarios.accommodationOptions.available, false);
  assert.strictEqual(scenarios.accommodationOptions.message, "Accommodation alternatives\nNo comparable priced alternative is currently available.");
  assert.strictEqual(scenarios.foodOptions.available, false);
  assert.strictEqual(scenarios.foodOptions.message, "Food\nCost optimization unavailable because a reliable configured food cost is not currently available.");
  assert.strictEqual(scenarios.transportOptions.available, false);
  assert.strictEqual(scenarios.transportOptions.message, "Transport alternatives\nNo comparable priced alternative is currently available.");

  console.log("✓ TEST 16 PASSED: Cost reduction scenarios include only real included activities and output exact required unavailable notices.");
}

// TEST 17 — SIMULATION & VALIDATION ISOLATION
console.log("\n--- TEST 17: SCENARIO SIMULATION DOES NOT MUTATE ORIGINAL PACKAGE ---");
{
  const trip = {
    tripCategory: "CAMPUS",
    startDate: "2026-09-20",
    endDate: "2026-09-29",
    budget: 15000,
    campusConfig: {
      budgetPerStudent: 15000,
      expectedParticipants: 200,
      studentsPerRoom: 2
    },
    itinerary: [
      {
        day: 1,
        plan: [
          { id: "act-1", category: "activity", activity: "Technopark Educational Visit", estimatedCost: 100000 },
          { id: "act-2", category: "activity", activity: "Science Center Visit", estimatedCost: 100000 }
        ]
      }
    ],
    staySegments: [
      {
        id: "stay-1",
        location: "Kochi",
        nights: 2,
        selectedHotel: { name: "Grand Hyatt Kochi", nightlyPrice: 4000 }
      }
    ]
  };

  const originalItineraryLen = trip.itinerary[0].plan.length;

  // Simulate removing Technopark (act-1)
  const sim = simulateCampusReductionScenario(trip, ["act-1"]);
  assert.strictEqual(sim.reductionPerStudent, 500, "Reduction per student must be ₹500");
  assert.strictEqual(sim.reductionGroup, 100000, "Reduction group must be ₹1,00,000");
  assert.strictEqual(sim.simulatedTrip.itinerary[0].plan.length, 1, "Simulated trip has 1 item");
  assert.strictEqual(trip.itinerary[0].plan.length, originalItineraryLen, "Original trip must NOT be mutated!");

  console.log("✓ TEST 17 PASSED: Simulation strictly calculates impact on cloned trip without mutating original package.");
}

console.log("\n==================================================");
console.log("ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!");
console.log("==================================================");

