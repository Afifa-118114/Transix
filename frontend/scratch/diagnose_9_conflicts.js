import {
  detectConflicts,
  getDayConstraints,
  scheduleTrainJourneyIntoTrip,
  buildProposedTrainAdaptation,
} from "../src/utils/schedulingEngine.js";

// Let's create an exact AI itinerary matching the user's scenario:
// 7-day trip, Mumbai to Kerala
// Day 1: Outbound train departs 13:00, arrives Day 2 18:00 (overnight)
// Day 7: Return transport (was default flight/train at 13:10)
// Now user changes Return train to 19028 departing Day 7 at 17:45 (or 05:45 PM)
const sampleTrip = {
  _id: "trip-diagnose-123",
  title: "Kerala Heritage Tour",
  source: "Mumbai",
  destination: "Kerala",
  startDate: "2026-10-01",
  endDate: "2026-10-07",
  travelLegs: [
    {
      journeyDirection: "outbound",
      from: "Mumbai",
      to: "Kerala",
      trainNumber: "12618",
      trainName: "Mangala Lakshadweep Express",
      departureTime: "13:00",
      arrivalTime: "18:00",
      departureDay: 1,
      arrivalDay: 2,
    },
    {
      journeyDirection: "return",
      from: "Kerala",
      to: "Mumbai",
      trainNumber: "DEFAULT",
      trainName: "Default Return Flight",
      departureTime: "13:10",
      arrivalTime: "14:10",
      departureDay: 7,
      arrivalDay: 7,
    },
  ],
  itinerary: [
    {
      day: 1,
      date: "2026-10-01",
      title: "Departure from Mumbai",
      plan: [
        {
          id: "act-1-1",
          name: "Assembly & Check-in at Station",
          time: "11:30 - 12:30",
          startTime: "11:30",
          endTime: "12:30",
          category: "Assembly",
          legType: "assembly",
        },
        {
          id: "train-outbound-orig",
          trainNumber: "12618",
          name: "Mangala Lakshadweep Express",
          journeyDirection: "outbound",
          time: "13:00 - 18:00",
          startTime: "13:00",
          endTime: "18:00",
          category: "Train Transport",
          isFixed: true,
          from: { code: "CSMT", name: "Mumbai", day: 1 },
          to: { code: "ERS", name: "Kerala", day: 2 },
        },
      ],
    },
    {
      day: 2,
      date: "2026-10-02",
      title: "Arrival in Kerala",
      plan: [
        {
          id: "d2-bldg-train",
          name: "Train Journey in Transit: Mumbai → Kerala",
          trainNumber: "12618",
          time: "00:00 - 18:00",
          startTime: "00:00",
          endTime: "18:00",
          category: "transport",
          isFixed: true,
        },
        {
          id: "d2-breakfast",
          name: "Breakfast",
          activity: "Breakfast",
          time: "08:30 - 09:30",
          startTime: "08:30",
          endTime: "09:30",
          category: "food",
        },
        {
          id: "d2-lunch",
          name: "Pure Veg Lunch",
          activity: "Pure Veg Lunch",
          time: "13:00 - 14:00",
          startTime: "13:00",
          endTime: "14:00",
          category: "food",
        },
        {
          id: "d2-arr",
          name: "Train Arrival & Deboarding",
          time: "18:00 - 18:30",
          startTime: "18:00",
          endTime: "18:30",
          category: "Arrival",
          legType: "arrival",
        },
        {
          id: "d2-ci",
          name: "Hotel Check-in & Freshen Up",
          time: "19:00 - 19:45",
          startTime: "19:00",
          endTime: "19:45",
          category: "hotel",
        },
        {
          id: "d2-dinner",
          name: "Pure Veg Dinner",
          activity: "Pure Veg Dinner",
          time: "20:00 - 21:00",
          startTime: "20:00",
          endTime: "21:00",
          category: "food",
        },
      ],
    },
    {
      day: 3,
      date: "2026-10-03",
      title: "Kochi Sightseeing",
      plan: [
        { id: "d3-1", name: "Breakfast", startTime: "08:30", endTime: "09:30", time: "08:30 - 09:30", category: "food" },
        { id: "d3-2", name: "Fort Kochi", startTime: "10:00", endTime: "13:00", time: "10:00 - 13:00", category: "sightseeing" },
        { id: "d3-3", name: "Dinner", startTime: "20:00", endTime: "21:00", time: "20:00 - 21:00", category: "food" },
      ],
    },
    {
      day: 4,
      date: "2026-10-04",
      title: "Munnar",
      plan: [
        { id: "d4-1", name: "Breakfast", startTime: "08:30", endTime: "09:30", time: "08:30 - 09:30", category: "food" },
        { id: "d4-2", name: "Tea Gardens", startTime: "10:00", endTime: "13:00", time: "10:00 - 13:00", category: "sightseeing" },
      ],
    },
    {
      day: 5,
      date: "2026-10-05",
      title: "Alleppey",
      plan: [
        { id: "d5-1", name: "Breakfast", startTime: "08:30", endTime: "09:30", time: "08:30 - 09:30", category: "food" },
        { id: "d5-2", name: "Houseboat", startTime: "11:00", endTime: "15:00", time: "11:00 - 15:00", category: "sightseeing" },
      ],
    },
    {
      day: 6,
      date: "2026-10-06",
      title: "Thekkady",
      plan: [
        { id: "d6-1", name: "Breakfast", startTime: "08:30", endTime: "09:30", time: "08:30 - 09:30", category: "food" },
        { id: "d6-2", name: "Boat Safari", startTime: "10:00", endTime: "13:00", time: "10:00 - 13:00", category: "sightseeing" },
      ],
    },
    {
      day: 7,
      date: "2026-10-07",
      title: "Departure to Mumbai",
      plan: [
        { id: "d7-bf", name: "Breakfast", startTime: "08:00", endTime: "09:00", time: "08:00 - 09:00", category: "food" },
        { id: "d7-walk", name: "Winter Garden Leisure Walk", startTime: "09:00", endTime: "10:00", time: "09:00 - 10:00", category: "sightseeing" },
        { id: "d7-co", name: "Hotel Check-out", startTime: "10:00", endTime: "10:30", time: "10:00 - 10:30", category: "hotel" },
        { id: "d7-lunch", name: "Early Pure Veg Lunch", startTime: "11:00", endTime: "12:00", time: "11:00 - 12:00", category: "food" },
        { id: "d7-cab", name: "Cab Transfer & Airport Security Pre-departure Buffer", startTime: "12:00", endTime: "13:10", time: "12:00 - 13:10", category: "transport" },
        { id: "d7-flight", name: "Flight Return", startTime: "13:10", endTime: "15:10", time: "13:10 - 15:10", category: "transport", isFixed: true },
      ],
    },
  ],
};

// Now simulate user selecting Return train 19028 (dep 17:45, arr 15:00 next day)
const returnTrain = {
  trainNumber: "19028",
  trainName: "Vivek Express",
  departure: "17:45",
  arrival: "15:00",
  duration: "21h 15m",
  totalStops: 18,
  source: "Kerala",
  destination: "Mumbai",
};

const outboundTrain = {
  trainNumber: "26718",
  trainName: "Kerala Superfast Express",
  departure: "16:00",
  arrival: "20:00",
  duration: "28h 00m",
  totalStops: 12,
  source: "Mumbai",
  destination: "Kerala",
};

console.log("--- 1. RUNNING PROPOSED ADAPTATION (BOTH TRAINS) ---");
const previewRes = buildProposedTrainAdaptation(sampleTrip, {
  outboundTrain,
  returnTrain,
  routeContext: { source: "Mumbai", destination: "Kerala" },
});

console.log("Preview success:", previewRes.success);
console.log("Adaptation summary itinerary adjustments:", previewRes.diff.itineraryAdjustments);
console.log("Removed:", previewRes.diff.removed);
console.log("Time shifted:", previewRes.diff.timeShifted);

const adaptedTrip = previewRes.proposedTrip;

console.log("\n--- 2. PERSISTED ITINERARY PLAN FOR DAY 2 ---");
adaptedTrip.itinerary[1].plan.forEach(p => {
  console.log(`  * [${p.startTime} - ${p.endTime}] ${p.name || p.activity} (cat: ${p.category}, isFixed: ${p.isFixed})`);
});

console.log("\n--- 3. PERSISTED ITINERARY PLAN FOR DAY 7 ---");
adaptedTrip.itinerary[6].plan.forEach(p => {
  console.log(`  * [${p.startTime} - ${p.endTime}] ${p.name || p.activity} (cat: ${p.category}, isFixed: ${p.isFixed})`);
});

console.log("\n--- 4. DETECT CONFLICTS ON ADAPTED TRIP ---");
const conflicts = detectConflicts(adaptedTrip);
console.log(`Total conflicts detected: ${conflicts.length}`);
conflicts.forEach(c => {
  console.log(`  - Day ${c.affectedDay} | Item: "${c.itemTitle}" | Type: ${c.type} | Reason: ${c.reason}`);
});
