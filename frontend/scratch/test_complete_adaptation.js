import {
  buildProposedTrainAdaptation,
  detectConflicts,
  generateConflictSuggestions,
} from "../src/utils/schedulingEngine.js";

// Let's test the baseline Mumbai -> Kashmir trip with 62h transit train and return train
const baselineTrip = {
  _id: "6aacae0d7574a4c7c992cb40",
  title: "Trip to Kashmir",
  source: "Mumbai",
  destination: "Kashmir",
  startDate: "2026-10-01",
  endDate: "2026-10-07",
  travelLegs: [
    {
      id: "leg-outbound-orig",
      journeyDirection: "outbound",
      trainNumber: "12471",
      trainName: "Swaraj Express",
      from: "Mumbai",
      to: "Kashmir",
      departure: "11:00",
      arrival: "17:00",
      startTime: "11:00",
      endTime: "17:00",
      departureDay: 1,
      arrivalDay: 2,
    },
    {
      id: "leg-return-orig",
      journeyDirection: "return",
      trainNumber: "12472",
      trainName: "Swaraj Express Return",
      from: "Kashmir",
      to: "Mumbai",
      departure: "11:00",
      arrival: "18:00",
      startTime: "11:00",
      endTime: "18:00",
      departureDay: 7,
      arrivalDay: 8,
    }
  ],
  staySegments: [
    {
      checkIn: "2026-10-02",
      checkOut: "2026-10-07",
      location: "Kashmir",
      selectedHotel: { name: "Grand Kashmir Resort", checkInTime: "14:00", checkOutTime: "11:00" }
    }
  ],
  itinerary: [
    {
      day: 1,
      date: "2026-10-01",
      plan: [
        { id: "p1-asm", name: "Station Assembly", startTime: "09:30", endTime: "11:00", category: "assembly", legType: "assembly" },
        { id: "p1-train", name: "Swaraj Express (#12471)", trainNumber: "12471", startTime: "11:00", endTime: "17:00", category: "transport", legType: "departure", journeyDirection: "outbound" }
      ]
    },
    {
      day: 2,
      date: "2026-10-02",
      plan: [
        { id: "p2-arr", name: "Train Arrival", startTime: "17:00", endTime: "17:50", category: "transport", legType: "arrival", journeyDirection: "outbound" },
        { id: "p2-bf", name: "Breakfast", activity: "Breakfast", startTime: "08:00", endTime: "09:00", category: "food" },
        { id: "p2-lunch", name: "Pure Veg Lunch", activity: "Pure Veg Lunch", startTime: "12:30", endTime: "13:30", category: "food" },
        { id: "p2-dinner", name: "Pure Veg Dinner", activity: "Pure Veg Dinner", startTime: "19:00", endTime: "20:00", category: "food" }
      ]
    },
    {
      day: 3,
      date: "2026-10-03",
      plan: [
        { id: "p3-bf", name: "Breakfast", startTime: "08:00", endTime: "09:00", category: "food" },
        { id: "p3-tour", name: "Mughal Gardens Tour", startTime: "10:00", endTime: "13:00", category: "sightseeing" },
        { id: "p3-lunch", name: "Lunch", startTime: "13:00", endTime: "14:00", category: "food" },
        { id: "p3-lake", name: "Dal Lake Shikara Ride", startTime: "15:00", endTime: "18:00", category: "sightseeing" },
        { id: "p3-din", name: "Dinner", startTime: "20:00", endTime: "21:00", category: "food" }
      ]
    },
    {
      day: 4,
      date: "2026-10-04",
      plan: [
        { id: "p4-bf", name: "Breakfast", startTime: "08:00", endTime: "09:00", category: "food" },
        { id: "p4-act", name: "Gulmarg Day Excursion", startTime: "09:30", endTime: "17:30", category: "sightseeing" },
        { id: "p4-din", name: "Dinner", startTime: "19:30", endTime: "20:30", category: "food" }
      ]
    },
    {
      day: 5,
      date: "2026-10-05",
      plan: [
        { id: "p5-bf", name: "Breakfast", startTime: "08:00", endTime: "09:00", category: "food" },
        { id: "p5-act", name: "Pahalgam Valley Tour", startTime: "09:30", endTime: "17:30", category: "sightseeing" },
        { id: "p5-din", name: "Dinner", startTime: "19:30", endTime: "20:30", category: "food" }
      ]
    },
    {
      day: 6,
      date: "2026-10-06",
      plan: [
        { id: "p6-bf", name: "Breakfast", startTime: "08:00", endTime: "09:00", category: "food" },
        { id: "p6-shop", name: "Old City Shopping", startTime: "10:00", endTime: "14:00", category: "shopping" },
        { id: "p6-din", name: "Farewell Dinner", startTime: "19:30", endTime: "21:00", category: "food" }
      ]
    },
    {
      day: 7,
      date: "2026-10-07",
      plan: [
        { id: "p7-bf", name: "Breakfast", startTime: "08:00", endTime: "09:00", category: "food" },
        { id: "p7-co", name: "Hotel Check-out", activity: "Hotel Check-out", startTime: "11:00", endTime: "11:30", category: "hotel" },
        { id: "p7-asm", name: "Station Assembly", startTime: "09:30", endTime: "11:00", category: "assembly", legType: "assembly" },
        { id: "p7-train", name: "Swaraj Express Return (#12472)", trainNumber: "12472", startTime: "11:00", endTime: "18:00", category: "transport", legType: "departure", journeyDirection: "return" }
      ]
    }
  ]
};

// Outbound: 62h transit train (LOKMANYATILAK T -> JAMMU TAWI, 08:05 Day 1 -> 22:40 Day 3)
const newOutboundTrain = {
  trainNumber: "11077",
  trainName: "Jhelum Express",
  departure: "08:05",
  arrival: "22:40",
  duration: "62h 35m",
  price: 2450,
  from: "Mumbai",
  to: "Kashmir"
};

// Return: 07:00 departure or 13:10 or 17:45
const newReturnTrain = {
  trainNumber: "19028",
  trainName: "Vivek Express",
  departure: "07:00",
  arrival: "15:00",
  duration: "32h 00m",
  price: 2100,
  from: "Kashmir",
  to: "Mumbai"
};

console.log("=== RUNNING PROPOSED TRAIN ADAPTATION ===");
const propResult = buildProposedTrainAdaptation(baselineTrip, {
  outboundTrain: newOutboundTrain,
  returnTrain: newReturnTrain,
  routeContext: { source: "Mumbai", destination: "Kashmir" }
});

console.log("Adaptation success:", propResult.success);
if (!propResult.success) {
  console.log("Error:", propResult.error);
} else {
  console.log("Has changes:", propResult.hasChanges);
  console.log("Removed items:", propResult.diff.removed.map(r => `Day ${r.day}: ${r.name} (${r.reason})`));
  console.log("Time shifted items:", propResult.diff.timeShifted.map(t => `Day ${t.day}: ${t.name} (${t.originalTime} -> ${t.proposedTime})`));
  
  const postConflicts = detectConflicts(propResult.proposedTrip);
  console.log(`\n>>> POST-ADAPTATION CONFLICT COUNT: ${postConflicts.length} <<<`);
  postConflicts.forEach(c => {
    console.log(` -> Day ${c.affectedDay} | ${c.itemTitle} | Type: ${c.type} | Reason: ${c.reason}`);
  });

  const suggestions = generateConflictSuggestions(propResult.proposedTrip);
  console.log(`>>> SUGGESTIONS / ENRICHED CONFLICTS COUNT: ${suggestions.enrichedConflicts.length} <<<`);

  if (postConflicts.length === 0 && suggestions.enrichedConflicts.length === 0) {
    console.log("\n SUCCESS: 0 SCHEDULE CONFLICTS ACHIEVED!");
  } else {
    console.log("\n FAILED: CONFLICTS STILL REMAIN!");
  }
}
