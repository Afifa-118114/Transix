import {
  scheduleTrainJourneyIntoTrip,
  buildProposedTrainAdaptation,
  validateTripSchedule,
  detectConflicts,
  generateConflictSuggestions,
} from "../src/utils/schedulingEngine.js";

// Sample 7-day canonical trip
const sampleTrip = {
  _id: "trip-test-123",
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
      trainNumber: "12217",
      trainName: "Kerala Sampark Kranti",
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
          category: "Assembly",
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
          id: "act-2-1",
          name: "Train Arrival",
          time: "18:00 - 18:30",
          category: "Arrival",
        },
        {
          id: "act-2-2",
          name: "Hotel Check-in",
          time: "19:00 - 19:30",
          category: "Hotel",
        },
        {
          id: "act-2-3",
          name: "Freshen Up",
          time: "19:30 - 20:30",
          category: "Rest",
        },
        {
          id: "act-2-4",
          name: "Welcome Dinner",
          time: "20:30 - 21:30",
          category: "Food",
        },
      ],
    },
    {
      day: 3,
      date: "2026-10-03",
      title: "Kochi Fort Exploration",
      plan: [
        { id: "act-3-1", name: "Breakfast", time: "08:30 - 09:30", category: "Food" },
        { id: "act-3-2", name: "Fort Kochi Heritage Walk", time: "10:00 - 13:00", category: "Sightseeing" },
        { id: "act-3-3", name: "Lunch", time: "13:00 - 14:00", category: "Food" },
        { id: "act-3-4", name: "Chinese Fishing Nets", time: "15:00 - 17:00", category: "Sightseeing" },
        { id: "act-3-5", name: "Dinner", time: "20:00 - 21:00", category: "Food" },
      ],
    },
    {
      day: 4,
      date: "2026-10-04",
      title: "Munnar Tea Gardens",
      plan: [
        { id: "act-4-1", name: "Breakfast", time: "08:30 - 09:30", category: "Food" },
        { id: "act-4-2", name: "Tea Estate Walk", time: "10:00 - 12:30", category: "Nature" },
        { id: "act-4-3", name: "Lunch", time: "13:00 - 14:00", category: "Food" },
        { id: "act-4-4", name: "Gondola / Viewpoint", time: "15:00 - 17:00", category: "Sightseeing" },
        { id: "act-4-5", name: "Dinner", time: "20:00 - 21:00", category: "Food" },
      ],
    },
    {
      day: 5,
      date: "2026-10-05",
      title: "Alleppey Backwaters",
      plan: [
        { id: "act-5-1", name: "Breakfast", time: "08:30 - 09:30", category: "Food" },
        { id: "act-5-2", name: "Houseboat Cruise", time: "11:00 - 15:00", category: "Sightseeing" },
        { id: "act-5-3", name: "Sunset Beach", time: "17:00 - 18:30", category: "Relax" },
        { id: "act-5-4", name: "Dinner", time: "20:00 - 21:00", category: "Food" },
      ],
    },
    {
      day: 6,
      date: "2026-10-06",
      title: "Periyar Wildlife",
      plan: [
        { id: "act-6-1", name: "Breakfast", time: "08:30 - 09:30", category: "Food" },
        { id: "act-6-2", name: "Wildlife Boat Safari", time: "10:00 - 12:30", category: "Nature" },
        { id: "act-6-3", name: "Lunch", time: "13:00 - 14:00", category: "Food" },
        { id: "act-6-4", name: "Spice Plantation Tour", time: "15:00 - 17:00", category: "Culture" },
        { id: "act-6-5", name: "Dinner", time: "20:00 - 21:00", category: "Food" },
      ],
    },
    {
      day: 7,
      date: "2026-10-07",
      title: "Departure to Mumbai",
      plan: [
        { id: "act-7-1", name: "Breakfast", time: "08:00 - 09:00", category: "Food" },
        { id: "act-7-2", name: "Hotel Check-out", time: "10:00 - 10:30", category: "Hotel" },
        { id: "act-7-3", name: "Station Transfer", time: "11:00 - 12:00", category: "Transport" },
        {
          id: "train-return-orig",
          trainNumber: "12217",
          name: "Kerala Sampark Kranti",
          journeyDirection: "return",
          time: "13:10 - 14:10",
          startTime: "13:10",
          endTime: "14:10",
          category: "Train Transport",
          isFixed: true,
          from: { code: "ERS", name: "Kerala", day: 7 },
          to: { code: "CSMT", name: "Mumbai", day: 7 },
        },
      ],
    },
  ],
};

console.log("=== RUNNING VERIFICATION CHECKS ===");

// 1. Verify baseline schedule conflicts are ZERO
const baselineConflicts = detectConflicts(sampleTrip);
console.log(`[TEST 1] Baseline schedule conflicts count: ${baselineConflicts.length}`);
if (baselineConflicts.length !== 0) {
  console.error("FAIL: Baseline trip should have 0 conflicts!", baselineConflicts);
  process.exit(1);
} else {
  console.log("PASS: 0 cascading conflicts across Days 1-7 in baseline.");
}

// 2. Test Non-Mutation on Preview
const originalTripSnapshot = JSON.stringify(sampleTrip);
const newOutboundTrain = {
  trainNumber: "26718",
  trainName: "Kerala Superfast Express",
  departure: "16:00",
  arrival: "20:00",
  duration: "28h 00m",
  totalStops: 12,
  source: "Mumbai",
  destination: "Kerala",
};

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

const previewResult = buildProposedTrainAdaptation(sampleTrip, {
  outboundTrain: newOutboundTrain,
  returnTrain: newReturnTrain,
  routeContext: { source: "Mumbai", destination: "Kerala" },
});

console.log("[TEST 2] Non-mutation check:");
const currentTripSnapshot = JSON.stringify(sampleTrip);
if (originalTripSnapshot !== currentTripSnapshot) {
  console.error("FAIL: Original trip was mutated during preview!");
  process.exit(1);
} else {
  console.log("PASS: Original trip remained completely untouched during preview.");
}

// 3. Test Return Train Arrival Day (NO DAY 2 BUG)
console.log("[TEST 3] Return train arrival day check (prevent Day 2 bug):");
const proposedTrip = previewResult.proposedTrip;
const proposedReturnTrain = proposedTrip.itinerary[6].plan.find(p => p.trainNumber === "19028");
console.log("Proposed return train item:", {
  trainNumber: proposedReturnTrain?.trainNumber,
  departure: proposedReturnTrain?.startTime,
  arrival: proposedReturnTrain?.endTime,
  fromDay: proposedReturnTrain?.from?.day,
  toDay: proposedReturnTrain?.to?.day,
});

if (proposedReturnTrain?.to?.day === 2) {
  console.error("FAIL: Return train arrival is erroneously Day 2!");
  process.exit(1);
} else {
  console.log(`PASS: Return train departure day: ${proposedReturnTrain?.from?.day}, arrival day: ${proposedReturnTrain?.to?.day}. No Day 2 bug!`);
}

// 4. Test Both Directions Combined Impact
console.log("[TEST 4] Combined adaptation impact check:");
console.log(`- Outbound changed: ${previewResult.diff.outboundChanged}`);
console.log(`- Return changed: ${previewResult.diff.returnChanged}`);
console.log(`- Train changes count: ${previewResult.diff.trainChanges.length}`);
console.log(`- Time shifted count: ${previewResult.diff.timeShifted.length}`);
console.log(`- Removed count: ${previewResult.diff.removed.length}`);
console.log(`- Unchanged days: ${previewResult.diff.unchangedDays.join(", ")}`);

if (!previewResult.diff.outboundChanged || !previewResult.diff.returnChanged) {
  console.error("FAIL: Both directions should be flagged as changed!");
  process.exit(1);
}
if (previewResult.diff.unchangedDays.length === 0) {
  console.error("FAIL: Intermediate days 3-6 should remain unchanged!");
  process.exit(1);
}
console.log("PASS: Combined adaptation correctly identifies affected vs unchanged days.");

// 5. Test Schedule Conflicts on Proposed Trip (Detailed Itinerary)
console.log("[TEST 5] Validating proposed trip conflicts in Detailed Itinerary:");
const proposedConflicts = detectConflicts(proposedTrip);
console.log(`Proposed trip schedule conflicts count: ${proposedConflicts.length}`);
if (proposedConflicts.length > 0) {
  console.log("Conflicts found:", proposedConflicts);
}
const suggestions = generateConflictSuggestions(proposedTrip);
console.log(`Suggestions generated count: ${suggestions.enrichedConflicts.length}`);

// Ensure suggestions never recommend moving later days to Day 1
suggestions.enrichedConflicts.forEach(conf => {
  conf.suggestions?.forEach(sug => {
    if (conf.dayIndex > 1 && sug.suggestedDate && sug.suggestedDate.includes("2026-10-01")) {
      console.error(`FAIL: Conflict on Day ${conf.day} suggested moving to Day 1!`, sug);
      process.exit(1);
    }
  });
});
console.log("PASS: Zero invalid Day 1 suggestions for Day 4/5/6 activities.");

// 6. Test Outbound-only adaptation
console.log("[TEST 6] Outbound-only adaptation:");
const outboundOnlyRes = buildProposedTrainAdaptation(sampleTrip, {
  outboundTrain: newOutboundTrain,
  returnTrain: null,
  routeContext: { source: "Mumbai", destination: "Kerala" },
});
if (!outboundOnlyRes.diff.outboundChanged || outboundOnlyRes.diff.returnChanged) {
  console.error("FAIL: Outbound only should have outboundChanged=true, returnChanged=false");
  process.exit(1);
}
console.log("PASS: Outbound-only adaptation works as expected.");

// 7. Test Return-only adaptation
console.log("[TEST 7] Return-only adaptation:");
const returnOnlyRes = buildProposedTrainAdaptation(sampleTrip, {
  outboundTrain: null,
  returnTrain: newReturnTrain,
  routeContext: { source: "Mumbai", destination: "Kerala" },
});
if (returnOnlyRes.diff.outboundChanged || !returnOnlyRes.diff.returnChanged) {
  console.error("FAIL: Return only should have outboundChanged=false, returnChanged=true");
  process.exit(1);
}
console.log("PASS: Return-only adaptation works as expected.");

console.log("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY! ✅");
