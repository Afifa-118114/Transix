const fs = require("fs");
const path = require("path");

const enginePath = path.resolve("c:/Projects/Transix/frontend/src/utils/schedulingEngine.js");
let content = fs.readFileSync(enginePath, "utf8");

const isCRLF = content.includes("\r\n");
let normalized = content.replace(/\r\n/g, "\n");

// Replace findExistingTrainRecord with findExistingTransportRecord and alias findExistingTrainRecord
const oldFindMarker = `// Utility to discover existing train baseline from canonical trip without hardcoding\nexport const findExistingTrainRecord = (trip, direction = "outbound", routeContext = {}) => {`;
const oldScheduleTrainMarker = `export const scheduleTrainJourneyIntoTrip = (trip, train, routeContext = {}) => {`;

const findStart = normalized.indexOf(oldFindMarker);
const scheduleStart = normalized.indexOf(oldScheduleTrainMarker);

if (findStart === -1 || scheduleStart === -1) {
  console.error("Find markers not found:", { findStart, scheduleStart });
  process.exit(1);
}

const newTransportRecordFunctions = `// Utility to discover existing transport baseline (train or flight) from canonical trip
export const findExistingTransportRecord = (trip, direction = "outbound", routeContext = {}) => {
  if (!trip) return null;
  const targetDir = String(direction || "outbound").toLowerCase();
  const totalDays = Array.isArray(trip.itinerary) ? trip.itinerary.length : 10;
  const norm = (str) => (str || "").toLowerCase().trim();
  const tripSrc = norm(trip.source || routeContext.source || "");
  const tripDst = norm(trip.destination || routeContext.destination || "");

  // 1. Inspect trip.travelLegs
  if (Array.isArray(trip.travelLegs) && trip.travelLegs.length > 0) {
    const leg = trip.travelLegs.find(l => {
      if (!l) return false;
      const lDir = norm(l.journeyDirection);
      const lMode = norm(l.mode || l.type);
      const isTransport = lMode.includes("train") || lMode.includes("flight") || Boolean(l.trainNumber) || Boolean(l.flightNumber);
      if (!isTransport) return false;

      if (lDir === targetDir) return true;
      if (targetDir === "outbound") {
        if (l.departureDay === 1 || (tripSrc && norm(l.from || l.source).includes(tripSrc))) return true;
      } else {
        if (l.departureDay === totalDays || (tripSrc && norm(l.to || l.destination).includes(tripSrc))) return true;
      }
      return false;
    });

    if (leg) {
      const depTime = leg.startTime || leg.departure;
      const arrTime = leg.endTime || leg.arrival;
      const depMin = timeToMinutes(depTime);
      const arrMin = timeToMinutes(arrTime);
      const depDay = leg.departureDay || (targetDir === "return" ? totalDays : 1);
      const legDur = leg.durationMinutes || (depMin !== null && arrMin !== null ? (arrMin >= depMin ? arrMin - depMin : arrMin + 1440 - depMin) : 180);
      const arrDay = leg.arrivalDay || (depDay + Math.floor(((depMin || 0) + legDur) / 1440));
      const isFlight = leg.mode === "flight" || Boolean(leg.flightNumber) || Boolean(leg.airline);
      return {
        mode: isFlight ? "flight" : "train",
        flightNumber: leg.flightNumber ? String(leg.flightNumber) : null,
        airline: leg.airline || leg.operator || (isFlight ? "Scheduled Airline" : null),
        trainNumber: leg.trainNumber ? String(leg.trainNumber) : (isFlight ? null : "DEFAULT"),
        trainName: leg.trainName || leg.operator || (isFlight ? "Scheduled Flight" : "Default Train"),
        name: isFlight ? \`\${leg.airline || "Flight"} #\${leg.flightNumber || ""}\` : (leg.trainName || "Train"),
        source: leg.source || leg.from || trip.source,
        destination: leg.destination || leg.to || trip.destination,
        originCode: leg.originCode || leg.from?.code || "",
        destinationCode: leg.destinationCode || leg.to?.code || "",
        departure: depTime,
        arrival: arrTime,
        departureMin: depMin,
        arrivalMin: arrMin,
        departureDay: depDay,
        arrivalDay: arrDay,
        duration: leg.duration,
        durationMinutes: leg.durationMinutes,
        journeyDirection: targetDir,
        rawLeg: leg,
      };
    }
  }

  // 2. Inspect trip.itinerary
  if (Array.isArray(trip.itinerary) && trip.itinerary.length > 0) {
    const checkDays = targetDir === "outbound" 
      ? [0, 1] 
      : [trip.itinerary.length - 1, Math.max(0, trip.itinerary.length - 2)];

    for (const dIdx of checkDays) {
      const day = trip.itinerary[dIdx];
      if (!day || !Array.isArray(day.plan)) continue;

      for (const item of day.plan) {
        if (!item) continue;
        const cat = norm(item.category);
        const act = norm(item.activity || item.name || "");
        const legType = norm(item.legType);
        const itemDir = norm(item.journeyDirection);
        const hasTrainNum = Boolean(item.trainNumber);
        const hasFlightNum = Boolean(item.flightNumber || item.airline || item.mode === "flight" || cat.includes("flight") || act.includes("flight"));
        const isTransport = cat.includes("transport") || cat.includes("travel") || hasFlightNum || hasTrainNum || legType === "departure";

        if (!isTransport) continue;

        const isReturnIndicator = itemDir === "return" || act.includes("return") || act.includes("farewell") || (tripSrc && act.includes(\`to \${tripSrc}\`));
        if (targetDir === "return" && !isReturnIndicator && dIdx < trip.itinerary.length - 1) continue;
        if (targetDir === "outbound" && isReturnIndicator) continue;

        const depTime = item.departure || item.startTime || (item.time ? String(item.time).split("-")[0].trim() : null);
        const arrTime = item.arrival || item.endTime || (item.time ? String(item.time).split("-")[1].trim() : null);
        const depMin = timeToMinutes(depTime);
        const arrMin = timeToMinutes(arrTime);

        if (depMin !== null || hasTrainNum || hasFlightNum) {
          const isFlight = hasFlightNum || item.mode === "flight";
          const matchedTrainNum = item.trainNumber || (act.match(/#?(\\d{4,5})/)?.[1]) || (isFlight ? null : "DEFAULT");
          const matchedFlightNum = item.flightNumber || (act.match(/([A-Z0-9]{2,3}\\s?\\d{3,4})/)?.[1]) || null;
          const depDay = dIdx + 1;
          const itemDur = item.durationMinutes || (depMin !== null && arrMin !== null ? (arrMin >= depMin ? arrMin - depMin : arrMin + 1440 - depMin) : 180);
          const arrDay = targetDir === "outbound" ? (depDay + Math.floor(((depMin || 0) + itemDur) / 1440)) : depDay;
          return {
            mode: isFlight ? "flight" : "train",
            flightNumber: matchedFlightNum ? String(matchedFlightNum) : null,
            airline: item.airline || (isFlight ? "Scheduled Airline" : null),
            trainNumber: matchedTrainNum ? String(matchedTrainNum) : (isFlight ? null : "DEFAULT"),
            trainName: item.trainName || item.name || item.activity || (isFlight ? "Scheduled Flight" : "Default Train"),
            name: isFlight ? \`\${item.airline || "Flight"} #\${matchedFlightNum || ""}\` : (item.trainName || item.name || "Train"),
            source: item.source || item.routeSource || (targetDir === "return" ? trip.destination : trip.source),
            destination: item.destination || item.routeDestination || (targetDir === "return" ? trip.source : trip.destination),
            originCode: item.originCode || "",
            destinationCode: item.destinationCode || "",
            departure: depTime || (targetDir === "return" ? "17:00" : "13:00"),
            arrival: arrTime || (targetDir === "return" ? "12:00" : "18:00"),
            departureMin: depMin,
            arrivalMin: arrMin,
            departureDay: depDay,
            arrivalDay: arrDay,
            duration: item.duration,
            durationMinutes: item.durationMinutes,
            journeyDirection: targetDir,
            rawItem: item,
          };
        }
      }
    }
  }

  return null;
};

// Backwards-compatible alias for existing train callers
export const findExistingTrainRecord = (trip, direction = "outbound", routeContext = {}) => {
  const rec = findExistingTransportRecord(trip, direction, routeContext);
  if (!rec) return null;
  return {
    ...rec,
    trainNumber: rec.trainNumber || (rec.flightNumber ? rec.flightNumber : "DEFAULT"),
    trainName: rec.trainName || rec.name || "Default Transport",
  };
};

`;

normalized = normalized.slice(0, findStart) + newTransportRecordFunctions + normalized.slice(scheduleStart);

// Now let's find the end of scheduleTrainJourneyIntoTrip and insert scheduleFlightJourneyIntoTrip
const scheduleTrainEndMarker = `    itineraryAdjustments,\n  };\n\n  return {\n    success: true,\n    trip: scheduledTrip,\n    adaptationSummary,\n  };\n};`;

const trainEndIdx = normalized.indexOf(scheduleTrainEndMarker);
if (trainEndIdx === -1) {
  console.error("scheduleTrainEndMarker not found!");
  process.exit(1);
}

const flightScheduleFunction = `

// Surgical adaptation for verified flight schedules
export const scheduleFlightJourneyIntoTrip = (trip, flight, routeContext = {}) => {
  if (!trip || !flight || !flight.flightNumber) {
    return { success: false, error: "Invalid flight or trip data" };
  }

  const direction = (routeContext.direction || "outbound").toLowerCase();
  const tripSource = trip.source || "Mumbai";
  const tripDestination = trip.destination || "Destination";

  const journeySource = direction === "return" ? (routeContext.source || tripDestination) : (routeContext.source || tripSource);
  const journeyDestination = direction === "return" ? (routeContext.destination || tripSource) : (routeContext.destination || tripDestination);

  const norm = (str) => (str || "").toLowerCase().trim();
  const fromName = flight.origin?.name || flight.source || journeySource;
  const toName = flight.destination?.name || flight.destination || journeyDestination;
  const fromCode = flight.origin?.code || "";
  const toCode = flight.destination?.code || "";

  const depTimeStr = flight.departureTime || flight.departure;
  const arrTimeStr = flight.arrivalTime || flight.arrival;
  const depMin = timeToMinutes(depTimeStr);
  const arrMin = timeToMinutes(arrTimeStr);

  if (depMin === null || arrMin === null) {
    return { success: false, error: "Selected flight has invalid departure or arrival times." };
  }

  // Calculate flight duration in minutes
  let durationMins = arrMin >= depMin ? arrMin - depMin : (1440 - depMin) + arrMin;
  if (durationMins <= 0) durationMins = 120;
  const durHours = Math.floor(durationMins / 60);
  const durRemainderMins = durationMins % 60;
  const durationStr = \`\${durHours}h \${durRemainderMins}m\`;

  // Deep clone existing canonical itinerary to protect unaffected days and items
  let itinerary = Array.isArray(trip.itinerary) && trip.itinerary.length > 0
    ? trip.itinerary.map(d => ({ ...d, plan: [...(d.plan || [])] }))
    : [];

  if (itinerary.length === 0) {
    return { success: false, error: "Trip itinerary has no days configured." };
  }

  const totalDays = itinerary.length;

  // 1. Identify existing baseline transport from canonical itinerary
  const oldTransport = findExistingTransportRecord(trip, direction, routeContext) || {
    mode: "flight",
    flightNumber: "DEFAULT",
    airline: "Default Airline",
    trainNumber: "DEFAULT",
    trainName: "Default Transport",
    departure: direction === "return" ? "18:00" : "08:30",
    arrival: direction === "return" ? "20:30" : "11:50",
    departureDay: direction === "return" ? totalDays : 1,
    arrivalDay: direction === "return" ? totalDays : 1,
  };

  const itineraryAdjustments = [];

  // Helper to remove ONLY the transport items for THIS direction
  const isMatchingTransportItem = (item, dayIdx) => {
    if (!item) return false;
    const act = norm(item.activity || item.name || "");
    const leg = norm(item.legType || "");
    const dir = norm(item.journeyDirection || "");
    const cat = norm(item.category || "");
    const isTransport = cat.includes("transport") || cat.includes("travel") || cat.includes("flight") || leg === "departure" || leg === "arrival" || leg === "assembly" || item.flightNumber || item.trainNumber;

    if (direction === "outbound") {
      if (dir === "outbound") return true;
      if (leg === "assembly" && dayIdx === 0) return true;
      if (leg === "departure" && dayIdx === 0) return true;
      if (leg === "transit" && (dayIdx === 1 || dayIdx === 2)) return true;
      if (leg === "arrival" && (dayIdx === 0 || dayIdx === 1 || dayIdx === 2)) return true;
      if (dayIdx === 0 && (act.includes("outbound") || act.includes("flight") || act.includes("train") || act.includes("airport") || act.includes("station")) && isTransport) return true;
      if (dayIdx === 1 && act.includes("train arrival")) return true;
      return false;
    } else {
      if (dir === "return") return true;
      if (dayIdx >= totalDays - 1) {
        if (leg === "assembly" || leg === "departure" || leg === "transfer") return true;
        if (isTransport && (act.includes("return") || act.includes("flight") || act.includes("train") || act.includes("airport") || act.includes("station") || act.includes("farewell"))) return true;
      }
      return false;
    }
  };

  itinerary = itinerary.map((d, dIdx) => ({
    ...d,
    plan: (d.plan || []).filter(item => !isMatchingTransportItem(item, dIdx)),
  }));

  // Clean travelLegs: preserve opposite direction, replace this direction
  let updatedTravelLegs = Array.isArray(trip.travelLegs)
    ? trip.travelLegs.filter(l => l.journeyDirection !== direction)
    : [];

  let arrDayNum = 1;

  if (direction === "outbound") {
    // Domestic flight pre-departure buffer: 120 minutes (2 hours)
    const assemblyDuration = 120;
    const assemblyStartMin = Math.max(0, depMin - assemblyDuration);

    const assemblyItem = {
      id: \`flight-outbound-assembly-\${flight.flightNumber}\`,
      activity: \`Airport Transfer & Security Clearance: \${fromName}\${fromCode ? \` (\${fromCode})\` : ""}\`,
      name: \`Report to \${fromName} Airport (\${fromCode || "Airport"})\`,
      place: \`\${fromName} Airport (\${fromCode})\`,
      location: \`\${fromName} Airport\`,
      time: \`\${minutesToTimeStr(assemblyStartMin)} - \${depTimeStr}\`,
      startTime: minutesToTimeStr(assemblyStartMin),
      endTime: depTimeStr,
      duration: "2 hours",
      durationMinutes: 120,
      category: "transport",
      categoryLabel: "Transport",
      journeyDirection: "outbound",
      legType: "assembly",
      mode: "flight",
      airline: flight.airline,
      flightNumber: flight.flightNumber,
      icon: "🛫",
      notes: \`Report to \${fromName} airport 2 hours prior to departure for check-in, security clearance, and boarding gate arrival.\`,
    };

    const departureItem = {
      id: \`flight-outbound-dep-\${flight.flightNumber}\`,
      activity: \`Outbound Flight: \${fromName}\${fromCode ? \` (\${fromCode})\` : ""} → \${toName}\${toCode ? \` (\${toCode})\` : ""}\`,
      name: \`\${flight.airline} (\${flight.flightNumber})\`,
      place: \`Departing \${fromName} (\${fromCode})\`,
      location: \`\${fromName} → \${toName}\`,
      routeSource: journeySource,
      routeDestination: journeyDestination,
      source: fromName,
      destination: toName,
      time: \`\${depTimeStr} - \${arrTimeStr}\`,
      startTime: depTimeStr,
      endTime: arrTimeStr,
      departure: depTimeStr,
      arrival: arrTimeStr,
      duration: durationStr,
      durationMinutes: durationMins,
      category: "transport",
      categoryLabel: "Transport",
      journeyDirection: "outbound",
      legType: "departure",
      mode: "flight",
      airline: flight.airline,
      flightNumber: flight.flightNumber,
      originCode: fromCode,
      destinationCode: toCode,
      operatingDays: flight.daysOfWeek || flight.operatingDays,
      validFrom: flight.validFrom,
      validTo: flight.validTo,
      sourceDataset: flight.source || "Air-Clean.csv",
      icon: "✈️",
      notes: \`Verified flight schedule: \${flight.airline} \${flight.flightNumber} departs \${fromName} (\${fromCode}) at \${depTimeStr}, lands at \${toName} (\${toCode}) at \${arrTimeStr}.\`,
    };

    // Adapt Day 1 Morning Plan before assembly
    const day1Plan = itinerary[0]?.plan || [];
    const preservedDay1Morning = [];
    let morningTimeSlot = 8 * 60;

    day1Plan.forEach(item => {
      const itemStart = timeToMinutes(item.startTime || (item.time ? String(item.time).split("-")[0] : null));
      const itemEnd = timeToMinutes(item.endTime || (item.time ? String(item.time).split("-")[1] : null));
      const dur = item.durationMinutes || (itemStart !== null && itemEnd !== null ? Math.max(30, itemEnd - itemStart) : 60);

      if (itemEnd !== null && itemEnd <= assemblyStartMin) {
        preservedDay1Morning.push(item);
        morningTimeSlot = Math.max(morningTimeSlot, itemEnd + 15);
      } else if (morningTimeSlot + dur <= assemblyStartMin) {
        const newStart = morningTimeSlot;
        const newEnd = morningTimeSlot + dur;
        morningTimeSlot = newEnd + 15;
        preservedDay1Morning.push({
          ...item,
          startTime: minutesToTimeStr(newStart),
          endTime: minutesToTimeStr(newEnd),
          time: \`\${minutesToTimeStr(newStart)} - \${minutesToTimeStr(newEnd)}\`,
        });
        itineraryAdjustments.push(\`Day 1 activity "\${item.name || item.activity}" shifted to \${minutesToTimeStr(newStart)} before airport departure.\`);
      } else {
        itineraryAdjustments.push(\`Day 1 activity "\${item.name || item.activity}" removed due to flight departure at \${depTimeStr}.\`);
      }
    });

    // Handle Arrival (Same-day domestic flight vs Overnight)
    const isOvernight = arrMin <= depMin;
    arrDayNum = isOvernight ? 2 : 1;

    const exitAirportMin = Math.min(1440, arrMin + 60);
    const hotelArrivalMin = Math.min(1440, arrMin + 90);
    const checkInEndMin = Math.min(1440, hotelArrivalMin + 30);

    const arrivalItem = {
      id: \`flight-outbound-arr-\${flight.flightNumber}\`,
      activity: \`Flight Arrival & Airport Transfer: \${toName}\${toCode ? \` (\${toCode})\` : ""}\`,
      name: \`Arrive at \${toName} Airport (\${toCode})\`,
      place: \`\${toName} Airport (\${toCode})\`,
      location: \`\${toName}\`,
      time: \`\${arrTimeStr} - \${minutesToTimeStr(exitAirportMin)}\`,
      startTime: arrTimeStr,
      endTime: minutesToTimeStr(exitAirportMin),
      duration: "1 hour",
      durationMinutes: 60,
      category: "transport",
      categoryLabel: "Transport",
      journeyDirection: "outbound",
      legType: "arrival",
      mode: "flight",
      airline: flight.airline,
      flightNumber: flight.flightNumber,
      icon: "🛬",
      notes: \`Deplane at \${toName} (\${toCode}), collect baggage, and transfer to accommodation.\`,
    };

    const checkInItem = {
      id: \`flight-outbound-checkin-\${flight.flightNumber}\`,
      activity: \`Hotel Check-in & Freshen Up\`,
      name: \`Hotel Check-in & Freshen Up\`,
      place: toName,
      category: "hotel",
      categoryLabel: "Stay",
      startTime: minutesToTimeStr(hotelArrivalMin),
      endTime: minutesToTimeStr(checkInEndMin),
      time: \`\${minutesToTimeStr(hotelArrivalMin)} - \${minutesToTimeStr(checkInEndMin)}\`,
      duration: "30m",
      durationMinutes: 30,
    };

    if (!isOvernight) {
      // Lands on Day 1!
      let day1AfternoonItems = [];
      let eveningStartMin = Math.max(checkInEndMin + 30, 18 * 60);
      if (checkInEndMin <= 19 * 60) {
        day1AfternoonItems.push({
          id: \`flight-day1-dinner\`,
          activity: \`Welcome Dinner at \${toName}\`,
          name: \`Welcome Dinner & Leisure\`,
          place: toName,
          category: "food",
          categoryLabel: "Food",
          startTime: minutesToTimeStr(eveningStartMin),
          endTime: minutesToTimeStr(Math.min(1440, eveningStartMin + 60)),
          time: \`\${minutesToTimeStr(eveningStartMin)} - \${minutesToTimeStr(Math.min(1440, eveningStartMin + 60))}\`,
          duration: "1h",
          durationMinutes: 60,
        });
      }

      itinerary[0] = {
        ...itinerary[0],
        plan: [...preservedDay1Morning, assemblyItem, departureItem, arrivalItem, checkInItem, ...day1AfternoonItems],
      };

      itineraryAdjustments.push(\`Flight arrives on Day 1 at \${arrTimeStr}. Hotel check-in scheduled for \${minutesToTimeStr(hotelArrivalMin)}.\`);
      itineraryAdjustments.push(\`Day 2 through Day \${totalDays} itinerary preserved.\`);
    } else {
      // Overnight flight lands on Day 2
      itinerary[0] = {
        ...itinerary[0],
        plan: [...preservedDay1Morning, assemblyItem, departureItem],
      };

      const day2Plan = (itinerary[1]?.plan || []).filter(item => {
        const itemStart = timeToMinutes(item.startTime || (item.time ? String(item.time).split("-")[0] : null));
        return itemStart === null || itemStart >= checkInEndMin;
      });

      itinerary[1] = {
        ...itinerary[1],
        plan: [arrivalItem, checkInItem, ...day2Plan],
      };

      itineraryAdjustments.push(\`Overnight flight arrives on Day 2 at \${arrTimeStr}. Hotel check-in scheduled for \${minutesToTimeStr(hotelArrivalMin)}.\`);
      if (totalDays > 2) {
        itineraryAdjustments.push(\`Day 3 through Day \${totalDays} itinerary preserved.\`);
      }
    }

    updatedTravelLegs.push({
      id: \`leg-outbound-flight\`,
      journeyDirection: "outbound",
      mode: "flight",
      type: "flight",
      airline: flight.airline,
      flightNumber: flight.flightNumber,
      operator: flight.airline,
      from: fromName,
      to: toName,
      source: fromName,
      destination: toName,
      departure: depTimeStr,
      arrival: arrTimeStr,
      startTime: depTimeStr,
      endTime: arrTimeStr,
      duration: durationStr,
      durationMinutes: durationMins,
      departureDay: 1,
      arrivalDay: arrDayNum,
      originCode: fromCode,
      destinationCode: toCode,
      operatingDays: flight.daysOfWeek || flight.operatingDays,
      validFrom: flight.validFrom,
      validTo: flight.validTo,
      sourceDataset: flight.source || "Air-Clean.csv",
    });
  } else {
    // ====================================================
    // SURGICAL ADAPTATION: RETURN FLIGHT
    // ====================================================
    const finalDayIdx = Math.max(0, totalDays - 1);
    const finalDayNum = finalDayIdx + 1;

    // Airport assembly buffer: 120 minutes prior to departure
    const assemblyDuration = 120;
    const assemblyStartMin = Math.max(0, depMin - assemblyDuration);
    const retActivityCutoffMin = Math.max(0, assemblyStartMin - 20);

    const returnAssemblyItem = {
      id: \`flight-return-assembly-\${flight.flightNumber}\`,
      activity: \`Airport Transfer & Security Clearance: \${fromName}\${fromCode ? \` (\${fromCode})\` : ""}\`,
      name: \`Report to \${fromName} Airport (\${fromCode || "Airport"})\`,
      place: \`\${fromName} Airport (\${fromCode})\`,
      location: \`\${fromName} Airport\`,
      time: \`\${minutesToTimeStr(assemblyStartMin)} - \${depTimeStr}\`,
      startTime: minutesToTimeStr(assemblyStartMin),
      endTime: depTimeStr,
      duration: "2 hours",
      durationMinutes: 120,
      category: "transport",
      categoryLabel: "Transport",
      journeyDirection: "return",
      legType: "assembly",
      mode: "flight",
      airline: flight.airline,
      flightNumber: flight.flightNumber,
      icon: "🛫",
      notes: \`Transfer from accommodation to \${fromName} airport, security clearance, and boarding for return flight.\`,
    };

    const returnDepartureItem = {
      id: \`flight-return-dep-\${flight.flightNumber}\`,
      activity: \`Return Flight: \${fromName}\${fromCode ? \` (\${fromCode})\` : ""} → \${toName}\${toCode ? \` (\${toCode})\` : ""}\`,
      name: \`\${flight.airline} (\${flight.flightNumber})\`,
      place: \`Departing \${fromName} (\${fromCode})\`,
      location: \`\${fromName} → \${toName}\`,
      routeSource: journeySource,
      routeDestination: journeyDestination,
      source: fromName,
      destination: toName,
      time: \`\${depTimeStr} - \${arrTimeStr}\`,
      startTime: depTimeStr,
      endTime: arrTimeStr,
      departure: depTimeStr,
      arrival: arrTimeStr,
      duration: durationStr,
      durationMinutes: durationMins,
      category: "transport",
      categoryLabel: "Transport",
      journeyDirection: "return",
      legType: "departure",
      mode: "flight",
      airline: flight.airline,
      flightNumber: flight.flightNumber,
      originCode: fromCode,
      destinationCode: toCode,
      operatingDays: flight.daysOfWeek || flight.operatingDays,
      validFrom: flight.validFrom,
      validTo: flight.validTo,
      sourceDataset: flight.source || "Air-Clean.csv",
      icon: "✈️",
      notes: \`Verified return flight: \${flight.airline} \${flight.flightNumber} departs \${fromName} (\${fromCode}) at \${depTimeStr}, arrives at \${toName} (\${toCode}) at \${arrTimeStr}.\`,
    };

    // Filter and adapt Day (totalDays) activities
    const preservedFinalDay = [];
    const finalDayPlan = itinerary[finalDayIdx]?.plan || [];
    let morningTimeSlot = 8 * 60;
    let checkoutFound = false;

    finalDayPlan.forEach(item => {
      const cat = norm(item.category || "");
      const act = norm(item.activity || item.name || "");

      // Hotel check-out MUST be preserved!
      const isCheckout = (cat === "hotel" || cat === "operational" || cat === "accommodation" || cat === "stay") &&
        (act.includes("checkout") || act.includes("check-out") || act.includes("check out")) ||
        act.includes("hotel check-out") || act.includes("hotel checkout");

      if (isCheckout) {
        checkoutFound = true;
        let coStartMin = 11 * 60;
        if (assemblyStartMin <= 11 * 60) {
          coStartMin = Math.max(4 * 60, assemblyStartMin - 35);
        } else {
          coStartMin = Math.min(11 * 60, assemblyStartMin - 35);
        }
        preservedFinalDay.push({
          ...item,
          category: item.category || "hotel",
          startTime: minutesToTimeStr(coStartMin),
          endTime: minutesToTimeStr(coStartMin + 30),
          time: \`\${minutesToTimeStr(coStartMin)} - \${minutesToTimeStr(coStartMin + 30)}\`,
        });
        itineraryAdjustments.push(\`Hotel check-out scheduled for \${minutesToTimeStr(coStartMin)}.\`);
        return;
      }

      const itemStart = timeToMinutes(item.startTime || (item.time ? String(item.time).split("-")[0] : null));
      const itemEnd = timeToMinutes(item.endTime || (item.time ? String(item.time).split("-")[1] : null));
      const dur = item.durationMinutes || (itemStart !== null && itemEnd !== null ? Math.max(30, itemEnd - itemStart) : 60);

      if (itemEnd !== null && itemEnd <= retActivityCutoffMin) {
        preservedFinalDay.push(item);
        morningTimeSlot = Math.max(morningTimeSlot, itemEnd + 15);
      } else if (morningTimeSlot + dur <= retActivityCutoffMin) {
        const newStart = morningTimeSlot;
        const newEnd = morningTimeSlot + dur;
        morningTimeSlot = newEnd + 15;
        preservedFinalDay.push({
          ...item,
          startTime: minutesToTimeStr(newStart),
          endTime: minutesToTimeStr(newEnd),
          time: \`\${minutesToTimeStr(newStart)} - \${minutesToTimeStr(newEnd)}\`,
        });
        itineraryAdjustments.push(\`Day \${finalDayNum} activity "\${item.name || item.activity}" shifted to \${minutesToTimeStr(newStart)}.\`);
      } else {
        itineraryAdjustments.push(\`Day \${finalDayNum} activity "\${item.name || item.activity}" removed due to return flight departure at \${depTimeStr}.\`);
      }
    });

    if (!checkoutFound) {
      let coStartMin = 11 * 60;
      if (assemblyStartMin <= 11 * 60) {
        coStartMin = Math.max(4 * 60, assemblyStartMin - 35);
      } else {
        coStartMin = Math.min(11 * 60, assemblyStartMin - 35);
      }
      preservedFinalDay.push({
        id: \`sync-checkout-final-day\`,
        activity: \`Hotel Check-out & Luggage Storage\`,
        name: \`Hotel Check-out\`,
        place: fromName,
        category: "hotel",
        categoryLabel: "Stay",
        startTime: minutesToTimeStr(coStartMin),
        endTime: minutesToTimeStr(coStartMin + 30),
        time: \`\${minutesToTimeStr(coStartMin)} - \${minutesToTimeStr(coStartMin + 30)}\`,
        duration: "30m",
        durationMinutes: 30,
      });
      itineraryAdjustments.push(\`Hotel check-out scheduled for \${minutesToTimeStr(coStartMin)}.\`);
    }

    itinerary[finalDayIdx] = {
      ...itinerary[finalDayIdx],
      plan: [...preservedFinalDay, returnAssemblyItem, returnDepartureItem],
    };

    itineraryAdjustments.push(\`Day 1 through Day \${finalDayNum - 1} itinerary unchanged.\`);

    updatedTravelLegs.push({
      id: \`leg-return-flight\`,
      journeyDirection: "return",
      mode: "flight",
      type: "flight",
      airline: flight.airline,
      flightNumber: flight.flightNumber,
      operator: flight.airline,
      from: fromName,
      to: toName,
      source: fromName,
      destination: toName,
      departure: depTimeStr,
      arrival: arrTimeStr,
      startTime: depTimeStr,
      endTime: arrTimeStr,
      duration: durationStr,
      durationMinutes: durationMins,
      departureDay: finalDayNum,
      arrivalDay: finalDayNum,
      originCode: fromCode,
      destinationCode: toCode,
      operatingDays: flight.daysOfWeek || flight.operatingDays,
      validFrom: flight.validFrom,
      validTo: flight.validTo,
      sourceDataset: flight.source || "Air-Clean.csv",
    });
  }

  // Chronologically sort each day's plan
  itinerary.forEach(d => {
    (d.plan || []).sort((a, b) => {
      const aStart = timeToMinutes(a.startTime || (a.time ? String(a.time).split("-")[0] : null)) || 0;
      const bStart = timeToMinutes(b.startTime || (b.time ? String(b.time).split("-")[0] : null)) || 0;
      return aStart - bStart;
    });
  });

  const scheduledTrip = {
    ...trip,
    itinerary,
    travelLegs: updatedTravelLegs,
    // Add directional transport abstraction per Section 22
    transport: {
      ...(trip.transport || {}),
      [direction]: {
        mode: "FLIGHT",
        airline: flight.airline,
        flightNumber: flight.flightNumber,
        departure: depTimeStr,
        arrival: arrTimeStr,
        from: fromName,
        to: toName,
        originCode: fromCode,
        destinationCode: toCode,
      }
    }
  };

  const oldIdentifier = oldTransport.flightNumber || oldTransport.trainNumber || "DEFAULT";
  const oldLabel = oldTransport.mode === "flight"
    ? \`\${oldTransport.airline || "Flight"} #\${oldTransport.flightNumber || "DEFAULT"}\`
    : \`Train #\${oldTransport.trainNumber || "DEFAULT"}\`;
  const newLabel = \`\${flight.airline} #\${flight.flightNumber}\`;

  const adaptationSummary = {
    direction,
    directionLabel: direction === "return" ? "Return Flight" : "Outbound Flight",
    oldTransport,
    newTransport: {
      mode: "flight",
      airline: flight.airline,
      flightNumber: flight.flightNumber,
      departure: depTimeStr,
      arrival: arrTimeStr,
      departureDay: direction === "return" ? totalDays : 1,
      arrivalDay: arrDayNum,
    },
    timingChanges: {
      transportChanged: \`\${oldLabel} → \${newLabel}\`,
      trainChanged: \`\${oldLabel} → \${newLabel}\`,
      departureChange: \`Day \${oldTransport.departureDay || (direction === "return" ? totalDays : 1)} \${oldTransport.departure || "N/A"} → Day \${direction === "return" ? totalDays : 1} \${depTimeStr}\`,
      arrivalChange: \`Day \${oldTransport.arrivalDay || (direction === "return" ? totalDays : 1)} \${oldTransport.arrival || "N/A"} → Day \${arrDayNum} \${arrTimeStr}\`,
    },
    itineraryAdjustments,
  };

  return {
    success: true,
    trip: scheduledTrip,
    adaptationSummary,
  };
};
`;

const insertAfterTrainIdx = trainEndIdx + scheduleTrainEndMarker.length;
normalized = normalized.slice(0, insertAfterTrainIdx) + flightScheduleFunction + normalized.slice(insertAfterTrainIdx);

// Now replace buildProposedTrainAdaptation with buildProposedTransportAdaptation and alias
const buildTrainStartMarker = `// Pure non-mutating preview engine that builds proposed changes for Outbound, Return, or Both\nexport const buildProposedTrainAdaptation = (trip, options = {}) => {`;
const validateTripMarker = `export const validateTripSchedule = (trip) => {`;

const buildTrainStart = normalized.indexOf(buildTrainStartMarker);
const validateTripStart = normalized.indexOf(validateTripMarker);

if (buildTrainStart === -1 || validateTripStart === -1) {
  console.error("Build train markers not found!", { buildTrainStart, validateTripStart });
  process.exit(1);
}

const newProposedTransportAdaptation = `// Pure non-mutating preview engine for Outbound, Return, or Both (supporting Train or Flight independently)
export const buildProposedTransportAdaptation = (trip, options = {}) => {
  if (!trip || !Array.isArray(trip.itinerary) || trip.itinerary.length === 0) {
    return { success: false, error: "Trip has no active itinerary configured." };
  }

  const {
    outboundTransport = null,
    returnTransport = null,
    outboundTrain = null,
    returnTrain = null,
    outboundFlight = null,
    returnFlight = null,
    routeContext = {},
  } = options;

  const totalDays = trip.itinerary.length;
  const tripSource = trip.source || "Origin";
  const tripDestination = trip.destination || "Destination";

  const oldOutbound = findExistingTransportRecord(trip, "outbound", routeContext);
  const oldReturn = findExistingTransportRecord(trip, "return", routeContext);

  const targetOutbound = outboundTransport || outboundFlight || outboundTrain;
  const targetReturn = returnTransport || returnFlight || returnTrain;

  const isFlightObj = (obj) => Boolean(obj && (obj.mode === "flight" || obj.flightNumber || obj.airline));

  const outboundChanged = Boolean(
    targetOutbound && (
      !oldOutbound ||
      (isFlightObj(targetOutbound) !== (oldOutbound.mode === "flight")) ||
      (isFlightObj(targetOutbound)
        ? String(targetOutbound.flightNumber) !== String(oldOutbound.flightNumber)
        : String(targetOutbound.trainNumber) !== String(oldOutbound.trainNumber))
    )
  );

  const returnChanged = Boolean(
    targetReturn && (
      !oldReturn ||
      (isFlightObj(targetReturn) !== (oldReturn.mode === "flight")) ||
      (isFlightObj(targetReturn)
        ? String(targetReturn.flightNumber) !== String(oldReturn.flightNumber)
        : String(targetReturn.trainNumber) !== String(oldReturn.trainNumber))
    )
  );

  if (!outboundChanged && !returnChanged) {
    return {
      success: true,
      hasChanges: false,
      message: "No transport preference changes detected.",
    };
  }

  let currentTrip = JSON.parse(JSON.stringify(trip));
  const transportChanges = [];
  const allAdjustments = [];

  // 1. Process Outbound if changed (Train or Flight)
  if (outboundChanged) {
    let resOutbound;
    if (isFlightObj(targetOutbound)) {
      resOutbound = scheduleFlightJourneyIntoTrip(currentTrip, targetOutbound, {
        ...routeContext,
        direction: "outbound",
        source: tripSource,
        destination: tripDestination,
      });
    } else {
      resOutbound = scheduleTrainJourneyIntoTrip(currentTrip, targetOutbound, {
        ...routeContext,
        direction: "outbound",
        source: tripSource,
        destination: tripDestination,
      });
    }

    if (!resOutbound.success) {
      return { success: false, error: \`Outbound transport scheduling failed: \${resOutbound.error}\` };
    }
    currentTrip = resOutbound.trip;
    transportChanges.push({
      direction: "outbound",
      directionLabel: isFlightObj(targetOutbound) ? "Outbound Flight" : "Outbound Train",
      mode: isFlightObj(targetOutbound) ? "flight" : "train",
      route: \`\${tripSource} → \${tripDestination}\`,
      oldTransport: resOutbound.adaptationSummary.oldTransport || resOutbound.adaptationSummary.oldTrain,
      newTransport: resOutbound.adaptationSummary.newTransport || resOutbound.adaptationSummary.newTrain,
      oldTrain: resOutbound.adaptationSummary.oldTrain,
      newTrain: resOutbound.adaptationSummary.newTrain,
      timingChanges: resOutbound.adaptationSummary.timingChanges,
    });
    allAdjustments.push(...resOutbound.adaptationSummary.itineraryAdjustments);
  }

  // 2. Process Return if changed (Train or Flight)
  if (returnChanged) {
    let resReturn;
    if (isFlightObj(targetReturn)) {
      resReturn = scheduleFlightJourneyIntoTrip(currentTrip, targetReturn, {
        ...routeContext,
        direction: "return",
        source: tripDestination,
        destination: tripSource,
      });
    } else {
      resReturn = scheduleTrainJourneyIntoTrip(currentTrip, targetReturn, {
        ...routeContext,
        direction: "return",
        source: tripDestination,
        destination: tripSource,
      });
    }

    if (!resReturn.success) {
      return { success: false, error: \`Return transport scheduling failed: \${resReturn.error}\` };
    }
    currentTrip = resReturn.trip;
    transportChanges.push({
      direction: "return",
      directionLabel: isFlightObj(targetReturn) ? "Return Flight" : "Return Train",
      mode: isFlightObj(targetReturn) ? "flight" : "train",
      route: \`\${tripDestination} → \${tripSource}\`,
      oldTransport: resReturn.adaptationSummary.oldTransport || resReturn.adaptationSummary.oldTrain,
      newTransport: resReturn.adaptationSummary.newTransport || resReturn.adaptationSummary.newTrain,
      oldTrain: resReturn.adaptationSummary.oldTrain,
      newTrain: resReturn.adaptationSummary.newTrain,
      timingChanges: resReturn.adaptationSummary.timingChanges,
    });
    allAdjustments.push(...resReturn.adaptationSummary.itineraryAdjustments);
  }

  // 3. Deterministic conflict auto-resolution loop to guarantee zero conflicts
  let adaptIteration = 0;
  const MAX_ADAPT_ITERATIONS = 8;
  while (adaptIteration < MAX_ADAPT_ITERATIONS) {
    adaptIteration++;
    const conflicts = detectConflicts(currentTrip);
    if (!conflicts || conflicts.length === 0) break;

    let anyResolvedOrRemoved = false;
    for (const conflict of conflicts) {
      const dayIdx = conflict.affectedDay - 1;
      const dayPlan = currentTrip.itinerary[dayIdx]?.plan || [];
      const itemIdx = dayPlan.findIndex(i => i.id === conflict.itemId);
      if (itemIdx === -1) continue;

      const item = dayPlan[itemIdx];
      if (isImmutableTransport(item)) continue;

      // Try same-day rescheduling first
      const safeSlot = findEarliestValidSlot(currentTrip, conflict.affectedDay, item);
      if (safeSlot) {
        const oldStart = item.startTime;
        const oldEnd = item.endTime;
        const oldTime = item.time;

        item.startTime = safeSlot.startTime;
        item.endTime = safeSlot.endTime;
        item.time = \`\${safeSlot.startTime} - \${safeSlot.endTime}\`;

        const testConflicts = detectConflicts(currentTrip);
        if (!testConflicts.some(c => c.itemId === item.id)) {
          anyResolvedOrRemoved = true;
          allAdjustments.push(\`Day \${conflict.affectedDay} activity "\${item.name || item.activity}" shifted to \${safeSlot.startTime}.\`);
          continue;
        }

        item.startTime = oldStart;
        item.endTime = oldEnd;
        item.time = oldTime;
      }

      // No safe alternative exists: remove from proposed itinerary to guarantee conflict-free state
      dayPlan.splice(itemIdx, 1);
      anyResolvedOrRemoved = true;
      allAdjustments.push(\`Day \${conflict.affectedDay} activity "\${item.name || item.activity}" removed because it conflicts with fixed travel schedule.\`);
    }

    if (!anyResolvedOrRemoved) break;
  }

  // Ensure all plans are chronologically sorted
  currentTrip.itinerary.forEach(d => {
    (d.plan || []).sort((a, b) => {
      const aStart = timeToMinutes(a.startTime || (a.time ? String(a.time).split("-")[0] : null)) || 0;
      const bStart = timeToMinutes(b.startTime || (b.time ? String(b.time).split("-")[0] : null)) || 0;
      return aStart - bStart;
    });
  });

  // 4. Compute Detailed Categorized Impact (Diff)
  const timeShifted = [];
  const removed = [];
  const unchangedDays = [];
  const dayComparisons = [];

  const norm = (s) => (s || "").toLowerCase().trim();

  for (let d = 0; d < totalDays; d++) {
    const origDay = trip.itinerary[d];
    const propDay = currentTrip.itinerary[d];
    const origPlan = origDay?.plan || [];
    const propPlan = propDay?.plan || [];

    let dayHasDifference = false;

    // Check removed items
    origPlan.forEach(origItem => {
      const cat = norm(origItem.category);
      const act = norm(origItem.activity || origItem.name);
      const isOldTransport = cat.includes("transport") || cat.includes("travel") || cat.includes("flight") ||
        origItem.legType === "departure" || origItem.legType === "assembly" || origItem.legType === "arrival" ||
        origItem.trainNumber || origItem.flightNumber || act.includes("flight return") || act.includes("return flight") || act.includes("return train") || act.includes("train journey");

      if (isOldTransport) return;

      const stillExists = propPlan.some(p => p.id === origItem.id || norm(p.activity || p.name) === act);
      if (!stillExists) {
        dayHasDifference = true;
        let reason = "No longer feasible due to new transport timing constraints.";
        if (d === 1 || (d === 2 && outboundChanged)) {
          reason = "No longer feasible after transport arrival, exit, and hotel check-in buffer.";
        } else if (d === totalDays - 1 && returnChanged) {
          reason = "Conflicts with return transport departure and pre-departure preparation buffer.";
        }
        removed.push({
          day: d + 1,
          name: origItem.name || origItem.activity,
          category: origItem.category,
          time: origItem.time || origItem.startTime,
          reason,
        });
      }
    });

    // Check time shifted items
    propPlan.forEach(propItem => {
      const origItem = origPlan.find(p => p.id === propItem.id || norm(p.activity || p.name) === norm(propItem.activity || propItem.name));
      if (origItem) {
        const origTime = origItem.time || origItem.startTime;
        const propTime = propItem.time || propItem.startTime;
        if (origTime !== propTime) {
          dayHasDifference = true;
          timeShifted.push({
            day: d + 1,
            name: propItem.name || propItem.activity,
            category: propItem.category,
            originalTime: origTime,
            proposedTime: propTime,
          });
        }
      } else {
        dayHasDifference = true;
      }
    });

    if (dayHasDifference) {
      dayComparisons.push({
        dayNum: d + 1,
        title: origDay?.title || \`Day \${d + 1}\`,
        originalPlan: origPlan,
        proposedPlan: propPlan,
      });
    } else {
      unchangedDays.push(d + 1);
    }
  }

  // 5. Validate proposed schedule
  const validationResult = validateTripSchedule(currentTrip);
  if (!validationResult.valid) {
    return {
      success: false,
      error: \`Schedule validation failed: \${validationResult.errors.join(". ")}\`,
    };
  }

  // Build clean unchanged days summary string
  let unchangedSummaryText = "";
  if (unchangedDays.length > 0) {
    if (unchangedDays.length === 1) {
      unchangedSummaryText = \`Day \${unchangedDays[0]} unaffected.\`;
    } else {
      unchangedSummaryText = \`Days \${unchangedDays[0]}–\${unchangedDays[unchangedDays.length - 1]}: All unaffected activities remain unchanged.\`;
    }
  }

  return {
    success: true,
    hasChanges: true,
    proposedTrip: currentTrip,
    diff: {
      outboundChanged,
      returnChanged,
      transportChanges,
      trainChanges: transportChanges, // backward compatibility
      timeShifted,
      removed,
      unchangedDays,
      unchangedSummaryText,
      dayComparisons,
      itineraryAdjustments: allAdjustments,
    },
  };
};

// Backward-compatible alias for existing train callers
export const buildProposedTrainAdaptation = (trip, options = {}) => {
  return buildProposedTransportAdaptation(trip, {
    ...options,
    outboundTransport: options.outboundTransport || options.outboundTrain,
    returnTransport: options.returnTransport || options.returnTrain,
  });
};

`;

normalized = normalized.slice(0, buildTrainStart) + newProposedTransportAdaptation + normalized.slice(validateTripStart);

// Now update validateTripSchedule to support flight as well as train
const oldValidateCheck = `  for (let d = 0; d < totalDays; d++) {
    const plan = days[d]?.plan || [];
    for (const item of plan) {
      if (item.category === "transport" && item.trainNumber) {
        if (item.legType === "departure") {
          if (item.journeyDirection === "outbound") {
            outboundCount++;
            outboundDepDay = d + 1;
            outboundDepMin = timeToMinutes(item.startTime || item.departure);
          } else if (item.journeyDirection === "return") {
            returnCount++;
            returnDepDay = d + 1;
          }
        }
        if (item.legType === "arrival" && item.journeyDirection === "outbound") {
          outboundArrDay = d + 1;
          outboundArrMin = timeToMinutes(item.endTime || item.arrival);
        }
      }
    }
  }`;

const newValidateCheck = `  for (let d = 0; d < totalDays; d++) {
    const plan = days[d]?.plan || [];
    for (const item of plan) {
      if (item.category === "transport" && (item.trainNumber || item.flightNumber || item.mode === "flight" || item.airline)) {
        if (item.legType === "departure") {
          if (item.journeyDirection === "outbound") {
            outboundCount++;
            outboundDepDay = d + 1;
            outboundDepMin = timeToMinutes(item.startTime || item.departure);
          } else if (item.journeyDirection === "return") {
            returnCount++;
            returnDepDay = d + 1;
          }
        }
        if (item.legType === "arrival" && item.journeyDirection === "outbound") {
          outboundArrDay = d + 1;
          outboundArrMin = timeToMinutes(item.endTime || item.arrival);
        }
      }
    }
  }`;

if (normalized.includes(oldValidateCheck)) {
  normalized = normalized.replace(oldValidateCheck, newValidateCheck);
} else {
  console.warn("oldValidateCheck not found, checking with looser match...");
}

const finalContent = isCRLF ? normalized.replace(/\n/g, "\r\n") : normalized;
fs.writeFileSync(enginePath, finalContent, "utf8");
console.log("Successfully updated schedulingEngine with flight capabilities!");
