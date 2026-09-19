import {
  scheduleFlightJourneyIntoTrip,
  scheduleTrainJourneyIntoTrip,
  buildProposedTransportAdaptation,
  detectConflicts,
  validateTripSchedule,
} from "../src/utils/schedulingEngine.js";

const BACKEND_BASE = "http://localhost:5000";

// Helper to create a base multimodal trip
function createBaseTrip() {
  return {
    _id: "trip-section8-test",
    source: "Mumbai",
    destination: "Guwahati",
    startDate: "2026-10-30", // Future date
    endDate: "2026-11-05",
    duration: "7 Days",
    travelers: 2,
    budget: 60000,
    travelMode: "Train",
    itinerary: [
      {
        day: 1,
        title: "Day 1 — Outbound Journey",
        plan: [
          { id: "act-d1-pack", name: "Packing & Morning Prep", startTime: "07:00", endTime: "08:00", category: "leisure" },
          {
            id: "train-outbound-dep-default",
            name: "Initial Outbound Train (#12345)",
            trainNumber: "12345",
            startTime: "11:30",
            endTime: "18:00",
            departure: "11:30",
            arrival: "18:00",
            category: "transport",
            journeyDirection: "outbound",
            legType: "departure",
          }
        ]
      },
      {
        day: 2,
        title: "Day 2 — Arrival & Welcome",
        plan: [
          {
            id: "train-outbound-arr-default",
            name: "Initial Outbound Train Arrival",
            trainNumber: "12345",
            startTime: "18:00",
            endTime: "19:00",
            departure: "11:30",
            arrival: "18:00",
            category: "transport",
            journeyDirection: "outbound",
            legType: "arrival",
          },
          { id: "act-d2-dinner", name: "Welcome Dinner", startTime: "20:00", endTime: "21:30", category: "food" }
        ]
      },
      {
        day: 3,
        title: "Day 3 — Exploration",
        plan: [
          { id: "act-d3-1", name: "City Tour", startTime: "09:30", endTime: "12:30", category: "sightseeing" },
          { id: "act-d3-2", name: "Lunch", startTime: "13:00", endTime: "14:00", category: "food" }
        ]
      },
      {
        day: 4,
        title: "Day 4 — Nature Visit",
        plan: [
          { id: "act-d4-1", name: "Wildlife Safari", startTime: "08:30", endTime: "12:30", category: "sightseeing" }
        ]
      },
      {
        day: 5,
        title: "Day 5 — Heritage Sites",
        plan: [
          { id: "act-d5-1", name: "Heritage Museum", startTime: "10:00", endTime: "13:00", category: "sightseeing" }
        ]
      },
      {
        day: 6,
        title: "Day 6 — Local Markets",
        plan: [
          { id: "act-d6-1", name: "Artisanal Market Walk", startTime: "14:00", endTime: "17:00", category: "shopping" }
        ]
      },
      {
        day: 7,
        title: "Day 7 — Return Journey",
        plan: [
          { id: "act-d7-co", name: "Hotel Check-out", startTime: "11:00", endTime: "11:30", category: "hotel" },
          {
            id: "train-return-assembly-default",
            name: "Assemble at Return Station",
            startTime: "15:30",
            endTime: "17:00",
            category: "transport",
            journeyDirection: "return",
            legType: "assembly",
          },
          {
            id: "train-return-dep-default",
            name: "Initial Return Train (#12346)",
            trainNumber: "12346",
            startTime: "17:00",
            endTime: "12:00",
            departure: "17:00",
            arrival: "12:00",
            category: "transport",
            journeyDirection: "return",
            legType: "departure",
          }
        ]
      }
    ],
    travelLegs: [
      {
        id: "leg-outbound-train",
        journeyDirection: "outbound",
        mode: "train",
        trainNumber: "12345",
        trainName: "Initial Outbound Train",
        from: "Mumbai",
        to: "Guwahati",
        departure: "11:30",
        arrival: "18:00",
        departureDay: 1,
        arrivalDay: 2,
      },
      {
        id: "leg-return-train",
        journeyDirection: "return",
        mode: "train",
        trainNumber: "12346",
        trainName: "Initial Return Train",
        from: "Guwahati",
        to: "Mumbai",
        departure: "17:00",
        arrival: "12:00",
        departureDay: 7,
        arrivalDay: 8,
      }
    ]
  };
}

async function runSection8Tests() {
  console.log("=================================================================");
  console.log("EXECUTING 11 EXACT SECTION 8 TEST CASES FOR FLIGHT REFERENCE SEARCH");
  console.log("=================================================================\n");

  let allPassed = true;
  const results = [];

  function record(num, name, passed, details) {
    results.push({ num, name, passed, details });
    if (!passed) allPassed = false;
    console.log(`[TEST ${num}] ${name}: ${passed ? "PASS" : "FAIL"}`);
    if (details) console.log(`   Details: ${details}\n`);
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Historical date within validFrom/validTo + matching weekday
    // => result returned, mode: HISTORICAL
    // -------------------------------------------------------------
    // IndiGo 464 (BOM -> RPR) is valid 2020-10-25 to 2021-03-26, runs Sun, Tue, Thu, Sat.
    // 2020-11-05 is Thursday.
    const resT1 = await fetch(`${BACKEND_BASE}/api/flights/search?source=BOM&destination=RPR&date=2020-11-05`).then(r => r.json());
    const t1Flight = resT1.flights?.find(f => String(f.flightNumber).includes("464"));
    const p1 = Boolean(t1Flight && t1Flight.mode === "HISTORICAL" && !t1Flight.isReference);
    record(
      1,
      "Historical date within validFrom/validTo + matching weekday",
      p1,
      `Found ${resT1.flights?.length} flights. IndiGo 464 mode = '${t1Flight?.mode}', isReference = ${t1Flight?.isReference}`
    );

    // -------------------------------------------------------------
    // Test 2: Historical date within validFrom/validTo + non-matching weekday
    // => result NOT returned
    // -------------------------------------------------------------
    // IndiGo 464 does not operate on Friday.
    // 2020-11-06 is Friday.
    const resT2 = await fetch(`${BACKEND_BASE}/api/flights/search?source=BOM&destination=RPR&date=2020-11-06`).then(r => r.json());
    const t2Flight = resT2.flights?.find(f => String(f.flightNumber).includes("464"));
    const p2 = !t2Flight;
    record(
      2,
      "Historical date within validFrom/validTo + non-matching weekday",
      p2,
      `IndiGo 464 present on Friday? ${Boolean(t2Flight)} (expected: false)`
    );

    // -------------------------------------------------------------
    // Test 3: Future date after dataset validTo + matching weekday
    // => result returned, mode: REFERENCE
    // -------------------------------------------------------------
    // 2026-10-30 is Friday. IndiGo 312 (BOM -> GAU) operates Mon, Wed, Fri.
    const resT3 = await fetch(`${BACKEND_BASE}/api/flights/search?source=Mumbai&destination=Guwahati&date=2026-10-30`).then(r => r.json());
    const t3Flight = resT3.flights?.find(f => String(f.flightNumber).includes("312") || f.airline === "IndiGo");
    const p3 = Boolean(resT3.flights?.length > 0 && t3Flight?.mode === "REFERENCE" && t3Flight?.isReference === true);
    record(
      3,
      "Future date after dataset validTo + matching weekday",
      p3,
      `Total returned: ${resT3.flights?.length}, SearchMode: ${resT3.searchMode}, Sample mode: '${t3Flight?.mode}', isReference: ${t3Flight?.isReference}`
    );

    // -------------------------------------------------------------
    // Test 4: Future date after dataset validTo + non-matching weekday
    // => result NOT returned
    // -------------------------------------------------------------
    // TruJet 717 (BOM -> KLH) operates Mon, Tue, Wed, Fri, Sat and NEVER on Thursday.
    // 2026-10-29 is Thursday.
    const resT4 = await fetch(`${BACKEND_BASE}/api/flights/search?source=BOM&destination=KLH&date=2026-10-29`).then(r => r.json());
    const t4Flight = resT4.flights?.find(f => String(f.flightNumber).includes("717"));
    const p4 = !t4Flight;
    record(
      4,
      "Future date after dataset validTo + non-matching weekday",
      p4,
      `TruJet 717 (Mon/Tue/Wed/Fri/Sat) present on Thursday 29 Oct 2026? ${Boolean(t4Flight)} (expected: false)`
    );

    // -------------------------------------------------------------
    // Test 5: Record with Mon/Wed/Fri/Sat + Friday trip date
    // => returned
    // -------------------------------------------------------------
    // IndiGo 2326 (GOI -> DEL) operates strictly Monday, Wednesday, Friday, Saturday.
    // 2026-10-30 is Friday.
    const resT5 = await fetch(`${BACKEND_BASE}/api/flights/search?source=GOI&destination=DEL&date=2026-10-30`).then(r => r.json());
    const t5Flight = resT5.flights?.find(f => String(f.flightNumber).includes("2326"));
    const p5 = Boolean(t5Flight && (t5Flight.daysOfWeek.includes("Friday") || t5Flight.operatingDays.includes("Friday")));
    record(
      5,
      "Record with Mon/Wed/Fri/Sat + Friday trip date",
      p5,
      `IndiGo 2326 found on Friday 2026-10-30: ${Boolean(t5Flight)}, Days: ${JSON.stringify(t5Flight?.operatingDays || t5Flight?.daysOfWeek)}, Mode: ${t5Flight?.mode}`
    );

    // -------------------------------------------------------------
    // Test 6: Same record + Thursday trip date
    // => not returned
    // -------------------------------------------------------------
    // 2026-10-29 is Thursday.
    const resT6 = await fetch(`${BACKEND_BASE}/api/flights/search?source=GOI&destination=DEL&date=2026-10-29`).then(r => r.json());
    const t6Flight = resT6.flights?.find(f => String(f.flightNumber).includes("2326"));
    const p6 = !t6Flight;
    record(
      6,
      "Same record (Mon/Wed/Fri/Sat) + Thursday trip date",
      p6,
      `IndiGo 2326 found on Thursday 2026-10-29: ${Boolean(t6Flight)} (expected: false)`
    );

    // -------------------------------------------------------------
    // Test 7: Mumbai -> Kerala future date
    // => resolve to actual dataset airports/cities
    // => return matching historical reference schedules where weekday matches
    // => do NOT show "0" merely because dataset ends in 2025
    // -------------------------------------------------------------
    const resT7 = await fetch(`${BACKEND_BASE}/api/flights/search?source=Mumbai&destination=Kerala&date=2026-10-30`).then(r => r.json());
    const destCodes = new Set(resT7.flights?.map(f => f.destination?.code));
    const p7 = Boolean(
      resT7.flights?.length > 0 &&
      resT7.searchMode === "REFERENCE" &&
      destCodes.has("COK") &&
      !destCodes.has("KER")
    );
    record(
      7,
      "Mumbai -> Kerala future date (Regional resolution to actual dataset airports)",
      p7,
      `Total returned: ${resT7.flights?.length}, Destinations resolved: ${Array.from(destCodes).join(", ")}, All reference: ${resT7.flights?.every(f => f.mode === "REFERENCE")}`
    );

    // -------------------------------------------------------------
    // Test 8: Outbound Flight reference selection
    // => return itinerary remains unchanged
    // -------------------------------------------------------------
    const tripT8 = createBaseTrip();
    const referenceOutbound = resT3.flights[0];
    const adaptResT8 = buildProposedTransportAdaptation(tripT8, {
      outboundFlight: referenceOutbound,
    });
    const origReturnLeg = tripT8.travelLegs.find(l => l.journeyDirection === "return");
    const newReturnLeg = adaptResT8.proposedTrip.travelLegs.find(l => l.journeyDirection === "return");
    const origReturnPlan = tripT8.itinerary.find(d => d.day === 7).plan.filter(a => a.journeyDirection === "return");
    const newReturnPlan = adaptResT8.proposedTrip.itinerary.find(d => d.day === 7).plan.filter(a => a.journeyDirection === "return");

    const p8 = Boolean(
      adaptResT8.success &&
      newReturnLeg.mode === origReturnLeg.mode &&
      newReturnLeg.trainNumber === origReturnLeg.trainNumber &&
      newReturnPlan.length === origReturnPlan.length &&
      newReturnPlan.every((a, i) => a.id === origReturnPlan[i].id && a.startTime === origReturnPlan[i].startTime)
    );
    record(
      8,
      "Outbound Flight reference selection => return itinerary remains unchanged",
      p8,
      `Return leg unchanged: ${newReturnLeg.trainNumber === origReturnLeg.trainNumber}, Return day 7 items unchanged: ${newReturnPlan.length === origReturnPlan.length}`
    );

    // -------------------------------------------------------------
    // Test 9: Return Flight reference selection
    // => outbound remains unchanged
    // -------------------------------------------------------------
    const tripT9 = createBaseTrip();
    // Return flight from Guwahati to Mumbai on 2026-11-05 (Thursday)
    const resReturnSearch = await fetch(`${BACKEND_BASE}/api/flights/search?source=Guwahati&destination=Mumbai&date=2026-11-05`).then(r => r.json());
    const referenceReturn = resReturnSearch.flights[0];
    const adaptResT9 = buildProposedTransportAdaptation(tripT9, {
      returnFlight: referenceReturn,
    });
    const origOutboundLeg = tripT9.travelLegs.find(l => l.journeyDirection === "outbound");
    const newOutboundLeg = adaptResT9.proposedTrip.travelLegs.find(l => l.journeyDirection === "outbound");
    const origDay1Transport = tripT9.itinerary.find(d => d.day === 1).plan.filter(a => a.journeyDirection === "outbound");
    const newDay1Transport = adaptResT9.proposedTrip.itinerary.find(d => d.day === 1).plan.filter(a => a.journeyDirection === "outbound");

    const p9 = Boolean(
      adaptResT9.success &&
      newOutboundLeg.mode === origOutboundLeg.mode &&
      newOutboundLeg.trainNumber === origOutboundLeg.trainNumber &&
      newDay1Transport.length === origDay1Transport.length &&
      newDay1Transport[0].startTime === origDay1Transport[0].startTime
    );
    record(
      9,
      "Return Flight reference selection => outbound remains unchanged",
      p9,
      `Outbound leg unchanged: ${newOutboundLeg.trainNumber === origOutboundLeg.trainNumber}, Day 1 outbound transport intact: ${newDay1Transport[0]?.name}`
    );

    // -------------------------------------------------------------
    // Test 10: Train regression
    // => existing Train search and selection continue working
    // -------------------------------------------------------------
    const resTrainSearch = await fetch(`${BACKEND_BASE}/api/trains/search?source=Mumbai&destination=Guwahati&date=2026-10-30`).then(r => r.json());
    const sampleTrain = resTrainSearch.trains?.[0];
    const tripT10 = createBaseTrip();
    const adaptResT10 = buildProposedTransportAdaptation(tripT10, {
      outboundTrain: sampleTrain,
    });
    const p10 = Boolean(
      resTrainSearch.trains?.length > 0 &&
      adaptResT10.success
    );
    record(
      10,
      "Train regression => existing Train search and selection continue working",
      p10,
      `Trains found: ${resTrainSearch.trains?.length}, Sample train adaptation success: ${adaptResT10.success}`
    );

    // -------------------------------------------------------------
    // Test 11: Approved Flight reference update
    // => final itinerary validation has zero conflicts
    // -------------------------------------------------------------
    const tripT11 = createBaseTrip();
    const adaptResT11 = buildProposedTransportAdaptation(tripT11, {
      outboundFlight: referenceOutbound,
      returnFlight: referenceReturn,
    });
    const conflictsT11 = detectConflicts(adaptResT11.proposedTrip);
    const validationT11 = validateTripSchedule(adaptResT11.proposedTrip);
    const p11 = Boolean(
      adaptResT11.success &&
      conflictsT11.length === 0 &&
      validationT11.valid === true
    );
    record(
      11,
      "Approved Flight reference update => final itinerary validation has zero conflicts",
      p11,
      `Adaptation success: ${adaptResT11.success}, Schedule conflicts count: ${conflictsT11.length}, Validation valid: ${validationT11.valid}`
    );

  } catch (err) {
    console.error("Test execution error:", err);
    allPassed = false;
  }

  console.log("\n=================================================================");
  console.log(`SUMMARY: ${results.filter(r => r.passed).length} / 11 TESTS PASSED`);
  console.log("=================================================================");

  if (!allPassed) {
    process.exit(1);
  }
}

runSection8Tests();
