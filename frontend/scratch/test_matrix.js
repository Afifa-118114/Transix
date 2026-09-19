import { buildProposedTrainAdaptation, detectConflicts } from "../src/utils/schedulingEngine.js";

const times = ["05:45", "07:00", "10:00", "13:10", "15:30", "17:45", "21:00", "23:30"];
let allPassed = true;

for (const dep of times) {
  const returnTrain = {
    trainNumber: "19028",
    trainName: "Vivek Express",
    departure: dep,
    arrival: "15:00",
    duration: "32h",
    price: 2100,
    from: "Kashmir",
    to: "Mumbai"
  };

  const trip = {
    startDate: "2026-10-01",
    itinerary: [
      { day: 1, plan: [{ id: "tr1", legType: "departure", journeyDirection: "outbound", trainNumber: "11077", startTime: "08:05", endTime: "22:40" }] },
      { day: 2, plan: [] },
      { day: 3, plan: [{ id: "tr1arr", legType: "arrival", journeyDirection: "outbound", trainNumber: "11077", startTime: "22:40", endTime: "23:30" }] },
      { day: 4, plan: [{ id: "p4", name: "Sightseeing", startTime: "10:00", endTime: "13:00" }] },
      { day: 5, plan: [{ id: "p5", name: "Sightseeing", startTime: "10:00", endTime: "13:00" }] },
      { day: 6, plan: [{ id: "p6", name: "Sightseeing", startTime: "10:00", endTime: "13:00" }] },
      { day: 7, plan: [
        { id: "p7-bf", name: "Breakfast", startTime: "08:00", endTime: "09:00", category: "food" },
        { id: "p7-co", name: "Hotel Check-out", activity: "Hotel Check-out", startTime: "11:00", endTime: "11:30", category: "hotel" },
        { id: "p7-orig", name: "Old Train", legType: "departure", journeyDirection: "return", trainNumber: "99999", startTime: "12:00", endTime: "18:00" }
      ]}
    ]
  };

  const res = buildProposedTrainAdaptation(trip, { returnTrain, routeContext: { source: "Mumbai", destination: "Kashmir" } });
  const conflicts = detectConflicts(res.proposedTrip);
  console.log(`Departure ${dep} -> Success: ${res.success}, Conflicts: ${conflicts.length}`);
  if (conflicts.length > 0) {
    allPassed = false;
    console.log("Conflicts:", conflicts);
  }
}

if (allPassed) {
  console.log("\n>>> ALL DEPARTURE TIMES PRODUCED 0 CONFLICTS! <<<");
} else {
  console.log("\n>>> SOME DEPARTURE TIMES FAILED <<<");
}
