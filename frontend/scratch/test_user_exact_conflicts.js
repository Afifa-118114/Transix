import {
  detectConflicts,
  getDayConstraints,
  generateConflictSuggestions,
} from "../src/utils/schedulingEngine.js";

// Exact itinerary representing user's 7-day trip
const trip = {
  _id: "6aacae0d7574a4c7c992cb40",
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
      arrivalDay: 2,
    },
    {
      id: "leg-return",
      journeyDirection: "return",
      trainNumber: "19028",
      trainName: "Vivek Express",
      from: "Kerala",
      to: "Mumbai",
      departure: "17:45",
      arrival: "15:00",
      startTime: "17:45",
      endTime: "15:00",
      departureDay: 7,
      arrivalDay: 8,
    }
  ],
  itinerary: [
    {
      day: 1,
      date: "2026-10-01",
      plan: [
        { id: "p1-1", name: "Assemble at Station", startTime: "11:30", endTime: "12:30", category: "assembly", legType: "assembly" },
        { id: "p1-2", name: "MNGLA LKSDP (#12618)", trainNumber: "12618", startTime: "13:00", endTime: "18:00", category: "transport", isFixed: true }
      ]
    },
    {
      day: 2,
      date: "2026-10-02",
      plan: [
        { id: "p2-bf", name: "Breakfast", activity: "Breakfast", startTime: "08:00", endTime: "09:00", category: "food" },
        { id: "p2-lunch", name: "Pure Veg Lunch", activity: "Pure Veg Lunch", startTime: "12:30", endTime: "13:30", category: "food" },
        { id: "p2-dinner", name: "Pure Veg Dinner", activity: "Pure Veg Dinner", startTime: "19:00", endTime: "20:00", category: "food" },
      ]
    },
    {
      day: 3,
      date: "2026-10-03",
      plan: [
        { id: "p3-1", name: "Breakfast", startTime: "08:00", endTime: "09:00", category: "food" },
        { id: "p3-2", name: "Sightseeing", startTime: "10:00", endTime: "13:00", category: "sightseeing" }
      ]
    },
    {
      day: 4,
      date: "2026-10-04",
      plan: [
        { id: "p4-1", name: "Breakfast", startTime: "08:00", endTime: "09:00", category: "food" }
      ]
    },
    {
      day: 5,
      date: "2026-10-05",
      plan: [
        { id: "p5-1", name: "Breakfast", startTime: "08:00", endTime: "09:00", category: "food" }
      ]
    },
    {
      day: 6,
      date: "2026-10-06",
      plan: [
        { id: "p6-1", name: "Breakfast", startTime: "08:00", endTime: "09:00", category: "food" }
      ]
    },
    {
      day: 7,
      date: "2026-10-07",
      plan: [
        { id: "p7-co", name: "Hotel Check-out", activity: "Hotel Check-out", startTime: "15:00", endTime: "15:30", category: "hotel" },
        { id: "p7-asm", name: "Assemble at Station", startTime: "16:15", endTime: "17:45", category: "transport" },
        { id: "p7-train", name: "Vivek Express (#19028)", trainNumber: "19028", startTime: "17:45", endTime: "15:00", category: "transport", isFixed: true }
      ]
    }
  ]
};

console.log("=== RUNNING CONFLICT DETECTION ===");
const conflicts = detectConflicts(trip);
console.log(`Conflicts count: ${conflicts.length}`);
conflicts.forEach(c => {
  console.log(`Day ${c.affectedDay} | ${c.itemTitle} | Type: ${c.type} | Reason: ${c.reason}`);
});

const suggestions = generateConflictSuggestions(trip);
console.log(`Suggestions count: ${suggestions.enrichedConflicts.length}`);
suggestions.enrichedConflicts.forEach(ec => {
  console.log(`Day ${ec.conflict.affectedDay} | ${ec.conflict.itemTitle} | Suggestions: ${ec.suggestions.length}`);
  ec.suggestions.forEach(s => console.log(`   -> ${s.suggestionText}`));
});
