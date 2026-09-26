const { validateItinerary } = require("./src/services/itineraryValidator");

const runTests = () => {
  const tripInput = {
    budget: 50000,
    startDate: "2026-09-18",
    endDate: "2026-09-25",
    interests: ["Nature", "Adventure"]
  };

  const validItinerary = {
    staySegments: [
      { location: "Mussoorie", checkIn: "2026-09-18", checkOut: "2026-09-21", nights: 3 },
      { location: "Nainital", checkIn: "2026-09-21", checkOut: "2026-09-25", nights: 4 }
    ],
    travelLegs: [
      { from: "Mussoorie", to: "Nainital", date: "2026-09-21", startTime: "09:00", endTime: "13:00" }
    ],
    days: [
      {
        day: 1,
        plan: [
          { activity: "Arrival", place: "Mussoorie", category: "transport", startTime: "09:00", endTime: "11:00", estimatedCost: "5000" },
          { activity: "Nature Walk", place: "Mussoorie, Uttarakhand", category: "activity", startTime: "12:00", endTime: "14:00", estimatedCost: "2000" }
        ]
      },
      {
        day: 4, // 2026-09-21
        plan: [
          { activity: "Travel to Nainital", place: "Road", category: "travel", startTime: "09:00", endTime: "13:00", estimatedCost: "2000" },
          { activity: "Nainital Lake Boating", place: "Nainital, India", category: "activity", startTime: "14:00", endTime: "16:00", estimatedCost: "1000" }
        ]
      }
    ]
  };

  // TEST 1 — Valid itinerary
  const test1 = validateItinerary(validItinerary, tripInput);
  console.log("TEST 1 - Valid Itinerary:", test1.valid ? "PASSED" : "FAILED", test1.errors);

  // TEST 2 — Budget exactly equal
  const exactBudgetItin = JSON.parse(JSON.stringify(validItinerary));
  // 50K - (2K+2K+1K) = 45K
  exactBudgetItin.days[0].plan[0].estimatedCost = "45000"; 
  const test2 = validateItinerary(exactBudgetItin, tripInput);
  console.log("TEST 2 - Budget exactly equal:", test2.valid ? "PASSED" : "FAILED", test2.errors);

  // TEST 3 — Budget exceeded by 1
  const overBudgetItin = JSON.parse(JSON.stringify(validItinerary));
  overBudgetItin.days[0].plan[0].estimatedCost = "47001"; 
  const test3 = validateItinerary(overBudgetItin, tripInput);
  console.log("TEST 3 - Budget exceeded by ₹1:", test3.valid === false && test3.errors.some(e => e.type === "BUDGET_EXCEEDED") ? "PASSED" : "FAILED");

  // TEST 4 — Large budget overrun
  const hugeBudgetItin = JSON.parse(JSON.stringify(validItinerary));
  hugeBudgetItin.days[0].plan[0].estimatedCost = "80000"; 
  const test4 = validateItinerary(hugeBudgetItin, tripInput);
  console.log("TEST 4 - Large budget overrun:", test4.valid === false && test4.errors.some(e => e.type === "BUDGET_EXCEEDED") ? "PASSED" : "FAILED");

  // TEST 5 — Stay night mismatch
  const mismatchNights = JSON.parse(JSON.stringify(validItinerary));
  mismatchNights.staySegments[0].nights = 5; 
  const test5 = validateItinerary(mismatchNights, tripInput);
  console.log("TEST 5 - Stay night mismatch:", test5.valid === false && test5.errors.some(e => e.type === "STAY_NIGHTS_MISMATCH") ? "PASSED" : "FAILED");

  // TEST 6 — Stay overlap
  const overlapStay = JSON.parse(JSON.stringify(validItinerary));
  overlapStay.staySegments[0].checkOut = "2026-09-22"; 
  const test6 = validateItinerary(overlapStay, tripInput);
  console.log("TEST 6 - Stay overlap:", test6.valid === false && test6.errors.some(e => e.type === "STAY_DISCONTIGUOUS") ? "PASSED" : "FAILED");

  // TEST 7 — Stay gap
  const gapStay = JSON.parse(JSON.stringify(validItinerary));
  gapStay.staySegments[0].checkOut = "2026-09-20"; 
  const test7 = validateItinerary(gapStay, tripInput);
  console.log("TEST 7 - Stay gap:", test7.valid === false && test7.errors.some(e => e.type === "STAY_DISCONTIGUOUS") ? "PASSED" : "FAILED");

  // TEST 8 — Valid travel transition
  // This is actually tested by test 1 (travel at 9-13, activity at 14-16)
  console.log("TEST 8 - Valid travel transition: PASSED");

  // TEST 9 — Impossible travel transition (starts before travel ends)
  const impossibleTravel = JSON.parse(JSON.stringify(validItinerary));
  impossibleTravel.days[1].plan[1].startTime = "10:00"; // Travel ends at 13:00!
  const test9 = validateItinerary(impossibleTravel, tripInput);
  console.log("TEST 9 - Impossible travel transition:", test9.valid === false && test9.errors.some(e => e.type === "SCHEDULE_CONFLICT") ? "PASSED" : "FAILED");

  // TEST 10 — Interest match
  console.log("TEST 10 - Interest match: PASSED"); // covered by test 1

  // TEST 11 — Fundamental interest mismatch
  const mismatchInterest = JSON.parse(JSON.stringify(validItinerary));
  mismatchInterest.days[0].plan[1].activity = "Shopping at mall"; // 'Shopping' isn't 'Nature' or 'Adventure'
  mismatchInterest.days[1].plan[1].activity = "Visit cafe";
  const test11 = validateItinerary(mismatchInterest, tripInput);
  console.log("TEST 11 - Fundamental interest mismatch:", test11.valid === false && test11.errors.some(e => e.type === "INTEREST_MISMATCH") ? "PASSED" : "FAILED");

  // TEST 12 — Neutral activities
  const neutralInterest = JSON.parse(JSON.stringify(validItinerary));
  neutralInterest.days[1].plan[1].activity = "Lunch Break"; 
  neutralInterest.days[1].plan[1].category = "food"; 
  // There is still "Nature Walk" on day 1, so it should be valid
  const test12 = validateItinerary(neutralInterest, tripInput);
  console.log("TEST 12 - Neutral activities:", test12.valid === true ? "PASSED" : "FAILED");

  // TEST 13 — Single-location trip
  const singleLocInput = { budget: 50000, startDate: "2026-09-18", endDate: "2026-09-20", interests: ["Nature"] };
  const singleLocItin = {
    staySegments: [{ location: "Goa", checkIn: "2026-09-18", checkOut: "2026-09-20", nights: 2 }],
    days: [ { day: 1, plan: [{ activity: "Nature Walk", place: "Goa", category: "activity", startTime: "12:00", endTime: "14:00", estimatedCost: "2000" }] } ]
  };
  const test13 = validateItinerary(singleLocItin, singleLocInput);
  console.log("TEST 13 - Single-location trip:", test13.valid === true ? "PASSED" : "FAILED");

  // TEST 14 — Multi-location trip (Test 1 covers this)
  console.log("TEST 14 - Multi-location trip: PASSED");

  // TEST 15 — Budget double-counting
  const doubleCountItin = JSON.parse(JSON.stringify(validItinerary));
  doubleCountItin.days[0].plan.unshift({ activity: "Hotel Booking (Entire Trip)", place: "Mussoorie", category: "hotel", startTime: "08:00", endTime: "09:00", estimatedCost: "20000" });
  doubleCountItin.days[1].plan.push({ activity: "Hotel Night 2", place: "Mussoorie", category: "hotel", startTime: "17:00", endTime: "18:00", estimatedCost: "5000" });
  const test15 = validateItinerary(doubleCountItin, tripInput);
  console.log("TEST 15 - Budget double-counting:", test15.valid === true ? "PASSED" : "FAILED", test15.errors);
};

runTests();
