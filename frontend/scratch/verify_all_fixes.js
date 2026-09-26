import {
  detectConflicts,
  getDayConstraints,
  generateConflictSuggestions,
  scheduleTrainJourneyIntoTrip,
  buildProposedTrainAdaptation,
  getActivityLogicalWindow,
} from "../src/utils/schedulingEngine.js";

// Let's create the user's exact 7-day trip:
// Day 1: CSMT to ERS, train 12618 dep 13:00 arr 18:00 (same day 5h, or overnight)
// Day 7: ERS to CSMT, Vivek Express 19028 dep 17:45 arr 15:00 next day (Day 8)
const sampleTrip = {
  _id: "trip-user-scenario",
  title: "Personal Trip to Kerala",
  source: "Mumbai",
  destination: "Kerala",
  startDate: "2026-10-01",
  endDate: "2026-10-07",
  travelLegs: [
    {
      id: "leg-outbound",
      journeyDirection: "outbound",
      trainNumber: "12618",
      trainName: "MNGLA LKSDP",
      from: "Mumbai",
      to: "Kerala",
      departure: "13:00",
      arrival: "18:00",
      startTime: "13:00",
      endTime: "18:00",
      departureDay: 1,
      arrivalDay: 1, // Same day train
    },
    {
      id: "leg-return",
      journeyDirection: "return",
      trainNumber: "DEFAULT",
      trainName: "Default Return Flight",
      from: "Kerala",
      to: "Mumbai",
      departure: "13:10",
      arrival: "14:10",
      startTime: "13:10",
      endTime: "14:10",
      departureDay: 7,
      arrivalDay: 7,
    }
  ],
  itinerary: [
    {
      day: 1,
      date: "2026-10-01",
      plan: [
        { id: "p1-1", name: "Assemble at Station", startTime: "12:00", endTime: "13:00", category: "assembly", legType: "assembly" },
        { id: "p1-2", name: "MNGLA LKSDP (#12618)", trainNumber: "12618", startTime: "13:00", endTime: "18:00", category: "transport", legType: "departure", isFixed: true },
        { id: "p1-3", name: "Arrival & Deboarding", startTime: "18:00", endTime: "18:30", category: "arrival", legType: "arrival" },
        { id: "p1-4", name: "Hotel Check-in", startTime: "19:00", endTime: "19:30", category: "hotel" },
        { id: "p1-5", name: "Welcome Dinner", startTime: "20:00", endTime: "21:00", category: "food" },
      ]
    },
    {
      day: 2,
      date: "2026-10-02",
      plan: [
        { id: "p2-bf", name: "Breakfast", activity: "Breakfast", startTime: "08:30", endTime: "09:30", category: "food" },
        { id: "p2-act", name: "Fort Kochi Walking Tour", activity: "Fort Kochi Walking Tour", startTime: "10:00", endTime: "12:30", category: "sightseeing" },
        { id: "p2-lunch", name: "Pure Veg Lunch", activity: "Pure Veg Lunch", startTime: "13:00", endTime: "14:00", category: "food" },
        { id: "p2-eve", name: "Chinese Fishing Nets & Sunset", activity: "Chinese Fishing Nets", startTime: "16:00", endTime: "18:00", category: "sightseeing" },
        { id: "p2-dinner", name: "Pure Veg Dinner", activity: "Pure Veg Dinner", startTime: "20:00", endTime: "21:00", category: "food" },
      ]
    },
    {
      day: 3,
      date: "2026-10-03",
      plan: [
        { id: "p3-1", name: "Breakfast", startTime: "08:30", endTime: "09:30", category: "food" },
        { id: "p3-2", name: "Sightseeing", startTime: "10:00", endTime: "13:00", category: "sightseeing" }
      ]
    },
    {
      day: 4,
      date: "2026-10-04",
      plan: [
        { id: "p4-1", name: "Breakfast", startTime: "08:30", endTime: "09:30", category: "food" }
      ]
    },
    {
      day: 5,
      date: "2026-10-05",
      plan: [
        { id: "p5-1", name: "Breakfast", startTime: "08:30", endTime: "09:30", category: "food" }
      ]
    },
    {
      day: 6,
      date: "2026-10-06",
      plan: [
        { id: "p6-1", name: "Breakfast", startTime: "08:30", endTime: "09:30", category: "food" }
      ]
    },
    {
      day: 7,
      date: "2026-10-07",
      plan: [
        { id: "p7-bf", name: "Breakfast", startTime: "08:00", endTime: "09:00", category: "food" },
        { id: "p7-walk", name: "Winter Garden Leisure Walk", startTime: "09:00", endTime: "10:00", category: "sightseeing" },
        { id: "p7-co", name: "Hotel Check-out", startTime: "10:30", endTime: "11:00", category: "hotel" },
        { id: "p7-lunch", name: "Early Pure Veg Lunch", startTime: "11:30", endTime: "12:30", category: "food" },
        { id: "p7-flight", name: "Flight Return", startTime: "13:10", endTime: "15:10", category: "transport", isFixed: true }
      ]
    }
  ]
};

// Return train user selects: 19028 Vivek Express dep 17:45 arr 15:00
const newReturnTrain = {
  trainNumber: "19028",
  trainName: "Vivek Express",
  departure: "17:45",
  arrival: "15:00",
  duration: "21h 15m",
  totalStops: 18,
  source: "Kerala",
  destination: "Mumbai",
};

console.log("=== STEP 1: TEST PREVIEW FOR RETURN TRAIN ===");
const previewRes = buildProposedTrainAdaptation(sampleTrip, {
  outboundTrain: null,
  returnTrain: newReturnTrain,
  routeContext: { source: "Mumbai", destination: "Kerala" },
});

console.log("Preview success:", previewRes.success);
console.log("Adjustments:", previewRes.diff.itineraryAdjustments);
console.log("Removed:", previewRes.diff.removed.map(r => r.name));
console.log("Time shifted:", previewRes.diff.timeShifted.map(t => `${t.name}: ${t.originalTime} -> ${t.proposedTime}`));

const proposedTrip = previewRes.proposedTrip;

console.log("\n=== STEP 2: INSPECT ADAPTED DAY 7 PLAN ===");
proposedTrip.itinerary[6].plan.forEach(p => {
  console.log(`  * [${p.startTime} - ${p.endTime}] ${p.name || p.activity} (cat: ${p.category})`);
});

console.log("\n=== STEP 3: RUN CONFLICT DETECTION ON PROPOSED TRIP ===");
const conflicts = detectConflicts(proposedTrip);
console.log(`Total conflicts detected on proposed trip: ${conflicts.length}`);
conflicts.forEach(c => {
  console.log(`  - Day ${c.affectedDay} | ${c.itemTitle} | Type: ${c.type} | Reason: ${c.reason}`);
});

const suggestions = generateConflictSuggestions(proposedTrip);
console.log(`Total suggestions enriched: ${suggestions.enrichedConflicts.length}`);
suggestions.enrichedConflicts.forEach(ec => {
  console.log(`  - Day ${ec.conflict.affectedDay} | ${ec.conflict.itemTitle} | Suggestions count: ${ec.suggestions.length}`);
});
