import { timeToMinutes, minutesToTimeStr, parsePrice } from "./formatTrip.js";

const BUFFERS = {
  PRE_DEPARTURE_OUTBOUND: 90, // at least 90m safe pre-departure buffer (60m assembly + 30m travel)
  PRE_DEPARTURE_RETURN: 120, // MINIMUM 2-3 hour (180m) safe pre-departure buffer for return
  POST_ARRIVAL: 90, // 90m post-arrival deboarding & station transfer buffer
  HOTEL_CHECK_IN: 30,
  INTER_ACTIVITY: 20,
};

const parseDate = (dStr) => {
  if (!dStr) return null;
  const d = new Date(dStr);
  return isNaN(d.getTime()) ? null : d;
};

const getDateForDay = (trip, dayNum) => {
  const start = parseDate(trip.startDate || (trip.staySegments && trip.staySegments[0] && trip.staySegments[0].checkIn));
  if (!start) return null;
  const d = new Date(start.getTime());
  d.setDate(d.getDate() + (dayNum - 1));
  return d;
};

const getStaySegmentsForDate = (trip, date) => {
  if (!trip.staySegments || !date) return [];
  const currTime = date.getTime();
  return trip.staySegments.filter(stay => {
    const ci = parseDate(stay.checkIn);
    const co = parseDate(stay.checkOut);
    if (!ci || !co) return false;
    return currTime >= ci.getTime() && currTime <= co.getTime();
  });
};

export const isImmutableTransport = (item) => {
  if (!item) return false;
  const cat = String(item.category || "").toLowerCase();
  const title = String(item.name || item.activity || "").toLowerCase();
  const legType = String(item.legType || "").toLowerCase();
  
  if (legType === "assembly" || legType === "transit" || legType === "departure" || legType === "arrival") return true;
  if (cat.includes("transport") || cat.includes("train") || cat.includes("flight") || cat.includes("bus") || cat.includes("transfer") || cat.includes("travel")) return true;
  if (title.includes("transfer") || title.includes("board train") || title.includes("arrive at") || title.includes("flight") || title.includes("train to") || title.includes("drop") || title.includes("pickup") || title.includes("bus journey") || title.includes("train journey") || title.includes("travel to") || title.includes("assembly") || title.includes("station transfer")) return true;
  
  return false;
};

const isDuplicateTransport = (item, trip, currentDate) => {
  if (!isImmutableTransport(item)) return false;
  if (!currentDate) return false;
  
  const itemStart = timeToMinutes(item.startTime);
  const itemEnd = timeToMinutes(item.endTime);
  const dateStr = currentDate.toISOString().split("T")[0];
  
  const legs = trip.travelLegs || [];
  for (const leg of legs) {
    if (leg.date === dateStr || !leg.date) {
      const legStart = timeToMinutes(leg.startTime || leg.departure);
      const legEnd = timeToMinutes(leg.endTime || leg.arrival);
      const title = String(item.name || item.activity || "").toLowerCase();
      const legTo = String(leg.to || "").toLowerCase();
      const legFrom = String(leg.from || "").toLowerCase();
      
      if (itemStart !== null && legStart !== null && itemEnd !== null && legEnd !== null) {
        if (Math.abs(itemStart - legStart) <= 60 && Math.abs(itemEnd - legEnd) <= 60) {
           if (title.includes(legTo) || title.includes(legFrom) || title.includes("travel") || title.includes("journey") || title.includes("transfer") || title.includes("bus") || title.includes("train") || title.includes("flight")) {
             return true;
           }
        }
        if ((title.includes(legTo) || title.includes(legFrom)) && itemStart < legEnd && itemEnd > legStart) {
          return true;
        }
      }
    }
  }
  return false;
};

export const getActivityLogicalWindow = (item) => {
  const cat = String(item.category || "").toLowerCase();
  const title = String(item.name || item.activity || "").toLowerCase();

  if (isImmutableTransport(item)) return { start: 0, end: 1440 }; // Transport can be anytime
  if (title.includes("dinner")) return { start: 17 * 60, end: 23 * 60 + 30 }; // 5 PM to 11:30 PM
  if (title.includes("lunch")) return { start: 11 * 60, end: 16 * 60 }; // 11 AM to 4 PM
  if (title.includes("breakfast")) return { start: 6 * 60, end: 11 * 60 }; // 6 AM to 11 AM

  if (cat.includes("hotel") || cat.includes("stay") || cat.includes("operational") || title.includes("checkout") || title.includes("check-out") || title.includes("check out")) {
    return { start: 4 * 60, end: 23 * 60 + 59 }; // Permits early morning checkout from 4 AM onwards
  }
  if (title.includes("check-in") || title.includes("check in")) {
    return { start: 6 * 60, end: 23 * 60 + 59 };
  }

  if (cat.includes("museum") || cat.includes("fort") || cat.includes("attraction")) return { start: 8 * 60, end: 20 * 60 }; // 8 AM to 8 PM
  if (cat.includes("shopping") || cat.includes("market")) return { start: 9 * 60, end: 22 * 60 }; // 9 AM to 10 PM
  if (cat.includes("sightseeing")) return { start: 6 * 60, end: 22 * 60 }; // 6 AM to 10 PM
  
  return { start: 6 * 60, end: 23 * 60 + 59 }; // Default 6 AM to Midnight
};

export const getDayConstraints = (trip, dayNum) => {
  const constraints = [];
  if (!trip) return constraints;

  const baseOffset = (dayNum - 1) * 1440;
  const days = trip.itinerary || trip.days || [];
  const totalDays = days.length || 10;

  // Process travel legs
  (trip.travelLegs || []).forEach(leg => {
    const depDay = leg.departureDay || (leg.journeyDirection === "return" ? totalDays : 1);
    const arrDay = leg.arrivalDay || depDay;
    const depMin = timeToMinutes(leg.startTime || leg.departure);
    const arrMin = timeToMinutes(leg.endTime || leg.arrival);

    if (depMin === null) return;

    const isFlight = leg.mode === "flight" || Boolean(leg.flightNumber);
    const transportTypeLabel = isFlight ? "flight" : "train";
    const transportName = leg.flightNumber ? `${leg.airline || "Flight"} #${leg.flightNumber}` : (leg.trainName || "train");

    if (leg.journeyDirection === "outbound") {
      // Day 1: Station / Airport assembly & pre-departure preparation window
      if (dayNum === depDay) {
        const preBuffer = isFlight ? 120 : BUFFERS.PRE_DEPARTURE_OUTBOUND;
        constraints.push({
          startMin: Math.max(baseOffset, baseOffset + depMin - preBuffer),
          endMin: baseOffset + depMin,
          type: "buffer",
          reason: `pre-departure ${isFlight ? "airport security & check-in" : "station assembly"} buffer for outbound ${transportTypeLabel} (${transportName})`,
        });
        const endDayMin = (arrDay === depDay && arrMin !== null) ? arrMin : 1440;
        constraints.push({
          startMin: baseOffset + depMin,
          endMin: baseOffset + endDayMin,
          type: "travel",
          reason: `outbound ${transportTypeLabel} journey to ${leg.to || "destination"}`,
        });
        if (arrDay === depDay && arrMin !== null && arrMin < 1440) {
          constraints.push({
            startMin: baseOffset + arrMin,
            endMin: Math.min(baseOffset + 1440, baseOffset + arrMin + (isFlight ? 60 : BUFFERS.POST_ARRIVAL)),
            type: "buffer",
            reason: `post-arrival ${isFlight ? "airport exit & transfer" : "station transfer"} buffer at ${leg.to || "destination"}`,
          });
        }
      } else if (dayNum > depDay && dayNum < arrDay) {
        // Intermediate days: entire calendar day occupied by transit
        constraints.push({
          startMin: baseOffset,
          endMin: baseOffset + 1440,
          type: "travel",
          reason: `${transportTypeLabel} journey in transit to ${leg.to || "destination"}`,
        });
      } else if (dayNum === arrDay && arrDay > depDay) {
        // Arrival day: travel until arrival + post-arrival buffer
        const actualArr = arrMin !== null ? arrMin : 8 * 60;
        constraints.push({
          startMin: baseOffset,
          endMin: baseOffset + actualArr,
          type: "travel",
          reason: `overnight ${transportTypeLabel} arrival at ${leg.to || "destination"}`,
        });
        constraints.push({
          startMin: baseOffset + actualArr,
          endMin: Math.min(baseOffset + 1440, baseOffset + actualArr + (isFlight ? 60 : BUFFERS.POST_ARRIVAL)),
          type: "buffer",
          reason: `post-arrival ${isFlight ? "airport exit & transfer" : "station transfer"} buffer at ${leg.to || "destination"}`,
        });
      }
    } else if (leg.journeyDirection === "return") {
      // Return journey: Day 10 (or final day)
      if (dayNum === depDay) {
        const preBuffer = isFlight ? 120 : BUFFERS.PRE_DEPARTURE_RETURN;
        const bufferStart = Math.max(baseOffset, baseOffset + depMin - preBuffer);
        constraints.push({
          startMin: bufferStart,
          endMin: baseOffset + depMin,
          type: "buffer",
          reason: `return ${isFlight ? "airport transfer & security clearance" : "station preparation and transfer"} buffer`,
        });
        const retEndMin = (arrDay === depDay && arrMin !== null && arrMin > depMin) ? arrMin : 1440;
        constraints.push({
          startMin: baseOffset + depMin,
          endMin: baseOffset + retEndMin,
          type: "travel",
          reason: `return ${transportTypeLabel} journey to ${leg.to || "origin"}`,
        });
      }
    }
  });

  // Hotel Stay Constraints
  const currentDate = getDateForDay(trip, dayNum);
  if (currentDate) {
    const activeStays = getStaySegmentsForDate(trip, currentDate);
    activeStays.forEach(activeStay => {
      if (activeStay && activeStay.selectedHotel) {
        const checkInDate = parseDate(activeStay.checkIn);
        const checkOutDate = parseDate(activeStay.checkOut);
        const hotelName = activeStay.selectedHotel.name || activeStay.location;

        if (checkInDate && checkInDate.getTime() === currentDate.getTime()) {
          const defaultCheckInMin = timeToMinutes(activeStay.selectedHotel.checkInTime || "14:00");
          let absCheckIn = baseOffset + defaultCheckInMin;
          constraints.push({
            startMin: absCheckIn,
            endMin: absCheckIn + BUFFERS.HOTEL_CHECK_IN,
            type: "hotel_checkin",
            reason: `hotel check-in at ${hotelName}`,
          });
        }

        if (checkOutDate && checkOutDate.getTime() === currentDate.getTime()) {
          const checkoutMin = timeToMinutes(activeStay.selectedHotel.checkOutTime || "11:00");
          let absCheckOut = baseOffset + checkoutMin;
          constraints.push({
            startMin: Math.max(baseOffset, absCheckOut - 30),
            endMin: absCheckOut,
            type: "hotel_checkout",
            reason: `hotel check-out from ${hotelName}`,
          });
        }
      }
    });
  }

  return constraints;
};

const mergeConstraints = (constraints) => {
  if (constraints.length === 0) return [];
  const sorted = [...constraints].sort((a, b) => a.startMin - b.startMin);
  const merged = [ { ...sorted[0], originalReasons: [sorted[0].reason], itemIds: sorted[0].itemId ? [sorted[0].itemId] : [] } ];

  for (let i = 1; i < sorted.length; i++) {
    const curr = sorted[i];
    const prev = merged[merged.length - 1];

    if (curr.startMin <= prev.endMin) {
      prev.endMin = Math.max(prev.endMin, curr.endMin);
      if (!prev.originalReasons.includes(curr.reason)) prev.originalReasons.push(curr.reason);
      if (curr.itemId && !prev.itemIds.includes(curr.itemId)) prev.itemIds.push(curr.itemId);
    } else {
      merged.push({ ...curr, originalReasons: [curr.reason], itemIds: curr.itemId ? [curr.itemId] : [] });
    }
  }

  merged.forEach(m => {
     const meaningful = m.originalReasons.filter(r => !r.includes("buffer"));
     m.reason = meaningful.length > 0 ? meaningful.join(" and ") : m.originalReasons.join(" and ");
  });

  return merged;
};

export const findEarliestValidSlot = (trip, dayNum, item) => {
  const constraints = mergeConstraints(getDayConstraints(trip, dayNum));
  const currentDate = getDateForDay(trip, dayNum);
  const dayIndex = dayNum - 1;
  const days = trip.days || trip.itinerary || [];
  const day = days[dayIndex];
  
  if (!day) return null;

  const currentPlan = [...(day.plan || [])].sort((a, b) => {
    const aStart = timeToMinutes(a.startTime);
    const bStart = timeToMinutes(b.startTime);
    return aStart - bStart;
  });

  const baseOffset = dayIndex * 1440;
  
  // Create occupied blocks (combining constraints and existing items)
  const occupiedBlocks = [...constraints];
  
  let prevAbsoluteEnd = baseOffset;
  currentPlan.forEach(p => {
    if (!isImmutableTransport(p) && !isDuplicateTransport(p, trip, currentDate)) {
      const tStart = timeToMinutes(p.startTime);
      const tEnd = timeToMinutes(p.endTime);
      if (tStart !== null && tEnd !== null) {
        let absStart = baseOffset + tStart;
        if (absStart < prevAbsoluteEnd && (prevAbsoluteEnd - absStart) < 720) {
            absStart += 1440;
        }
        let absEnd = baseOffset + tEnd;
        if (absEnd < absStart) absEnd += 1440;
        
        occupiedBlocks.push({
          startMin: Math.max(baseOffset, absStart),
          endMin: absEnd,
          type: "existing_activity",
          reason: p.activity
        });
        prevAbsoluteEnd = Math.max(prevAbsoluteEnd, absEnd);
      }
    }
  });

  const mergedOccupied = mergeConstraints(occupiedBlocks);

  const durationMinutes = item.durationMinutes || 120;
  const window = getActivityLogicalWindow(item);
  
  let searchStart = baseOffset + window.start;
  // Allow searchEnd to push past midnight if needed for late activities
  let searchEnd = baseOffset + Math.max(1440, window.end);
  
  let defaultStart = baseOffset + (9 * 60 + 30);
  let candidateStart = Math.max(searchStart, defaultStart);

  for (let i = 0; i <= mergedOccupied.length; i++) {
    const prevBlock = i === 0 ? null : mergedOccupied[i - 1];
    const nextBlock = i === mergedOccupied.length ? null : mergedOccupied[i];
    
    let gapStart = prevBlock ? prevBlock.endMin + BUFFERS.INTER_ACTIVITY : (i === 0 ? candidateStart : searchStart);
    gapStart = Math.max(gapStart, searchStart);
    
    // Do not rigidly clamp gapEnd to 1440 if there is legitimate free time until the next block or next day's 6AM.
    let maxAllowedEnd = nextBlock ? nextBlock.startMin - BUFFERS.INTER_ACTIVITY : (baseOffset + 1440 + 360); 
    let gapEnd = Math.min(maxAllowedEnd, searchEnd);

    if (gapEnd - gapStart >= durationMinutes) {
      const finalStartMin = gapStart % 1440;
      const finalEndMin = (gapStart + durationMinutes) % 1440;
      
      return {
        startTime: minutesToTimeStr(finalStartMin),
        endTime: minutesToTimeStr(finalEndMin),
      };
    }
  }

  return null; 
};

export const detectConflicts = (trip) => {
  const conflicts = [];
  const days = trip.days || trip.itinerary || [];
  
  // Assign temporary IDs
  days.forEach((day, dIdx) => {
    (day.plan || []).forEach((item, idx) => {
      if (!item.id) item.id = `temp_id_${day.day || dIdx + 1}_${idx}`;
    });
  });

  days.forEach((day, dIdx) => {
    const dayNum = day.day || dIdx + 1;
    const currentDate = getDateForDay(trip, dayNum);
    const baseOffset = (dayNum - 1) * 1440;
    
    // Add immutable transport to constraints
    const constraints = getDayConstraints(trip, dayNum);
    (day.plan || []).forEach((item) => {
      if (isImmutableTransport(item) && !isDuplicateTransport(item, trip, currentDate)) {
        let tStart = timeToMinutes(item.startTime);
        let tEnd = timeToMinutes(item.endTime);
        if (tStart !== null && tEnd !== null) {
          let absStart = baseOffset + tStart;
          let absEnd = baseOffset + tEnd;
          if (absEnd < absStart) absEnd += 1440;
          
          constraints.push({
            startMin: absStart,
            endMin: absEnd,
            type: "mandatory_activity",
            reason: `fixed transport (${item.name || item.activity})`,
            itemId: item.id
          });
        }
      }
    });

    const mergedConstraints = mergeConstraints(constraints);

    let sortedPlan = [...(day.plan || [])].sort((a, b) => {
      const aStart = timeToMinutes(a.startTime || (a.time ? String(a.time).split("-")[0] : null)) || 0;
      const bStart = timeToMinutes(b.startTime || (b.time ? String(b.time).split("-")[0] : null)) || 0;
      return aStart - bStart;
    });

    // Track intra-day previous end strictly scoped to this day
    let dayPrevEnd = baseOffset;
    
    sortedPlan.forEach((item) => {
      if (isDuplicateTransport(item, trip, currentDate)) return;

      const tStart = timeToMinutes(item.startTime || (item.time ? String(item.time).split("-")[0] : null));
      const tEnd = timeToMinutes(item.endTime || (item.time ? String(item.time).split("-")[1] : null));

      if (tStart !== null && tEnd !== null) {
        let absStart = baseOffset + tStart;
        let absEnd = baseOffset + tEnd;
        if (absEnd < absStart) {
          absEnd += 1440;
        }

        const localTimeStart = absStart % 1440;
        const logicalWindow = getActivityLogicalWindow(item);
        
        if (localTimeStart < logicalWindow.start || localTimeStart > logicalWindow.end) {
           conflicts.push({
             type: "LOGICAL_TIME_VIOLATION",
             severity: "high",
             itemId: item.id,
             itemTitle: item.name || item.activity,
             reason: `Activity type is not suitable for this time window.`,
             affectedDay: dayNum
           });
        }

        let hasTransportConflict = false;
        const actLower = String(item.activity || item.name || "").toLowerCase();
        const placeLower = String(item.place || item.location || "").toLowerCase();
        const notesLower = String(item.notes || "").toLowerCase();
        const catLower = String(item.category || "").toLowerCase();
        const isOnBoardTrain = actLower.includes("on train") || actLower.includes("in transit") || placeLower.includes("train") || notesLower.includes("on train") || notesLower.includes("train");
        const isCheckout = (catLower.includes("hotel") || catLower.includes("stay") || catLower.includes("operational")) &&
          (actLower.includes("check-out") || actLower.includes("checkout") || actLower.includes("check out"));

        for (const block of mergedConstraints) {
          if (block.itemIds && block.itemIds.includes(item.id)) continue;
          if (isImmutableTransport(item)) continue;

          // On-board meal or activity taking place during train transit is completely valid
          if (isOnBoardTrain && (block.type === "travel" || block.reason?.includes("train"))) {
            continue;
          }

          // Hotel check-out preceding return station transfer/departure does not conflict with station buffer or check-out constraint
          if (isCheckout && (block.type === "buffer" || block.type === "hotel_checkout") && absEnd <= block.endMin) {
            continue;
          }

          if (absStart < block.endMin && absEnd > block.startMin) {
            hasTransportConflict = true;
            // Deduplicate internal buffers into a single meaningful message
            let reason = `Conflicts with ${block.reason}`;
            let type = "HARD_CONSTRAINT_VIOLATION";
            if (block.type === "buffer" || block.type === "travel") {
                reason = block.reason.includes("travel to") 
                  ? `Activity conflicts with your travel leg to ${block.reason.split("travel to ")[1]}` 
                  : `Activity conflicts with fixed transport.`;
                type = "TRANSPORT_CONSTRAINT";
            } else if (block.type === "hotel_checkin" || block.type === "hotel_checkout") {
                type = "STAY_BOUNDARY";
            }

            const existing = conflicts.find(c => c.itemId === item.id && c.type === type);
            if (!existing) {
              conflicts.push({
                type,
                severity: "high",
                itemId: item.id,
                itemTitle: item.name || item.activity,
                conflictingItemId: block.itemIds && block.itemIds.length > 0 ? block.itemIds[0] : null,
                reason,
                affectedDay: dayNum
              });
            }
          }
        }

        // Intra-day overlap check between non-transport activities in the same day.
        // Do not double-flag an activity that already violated the preceding transport block.
        if (!hasTransportConflict && dayPrevEnd > baseOffset && absStart < dayPrevEnd) {
           if (!isImmutableTransport(item)) {
             conflicts.push({
               type: "OVERLAP",
               severity: "high",
               itemId: item.id,
               itemTitle: item.name || item.activity,
               conflictingItemId: null,
               reason: `Overlaps with previous activities`,
               affectedDay: dayNum
             });
           }
        }
        
        dayPrevEnd = Math.max(dayPrevEnd, absEnd);
      }
    });
  });

  const uniqueKeys = new Set();
  const deduplicatedConflicts = [];
  
  for (const c of conflicts) {
    const key = `${c.affectedDay}_${c.itemId}_${c.conflictingItemId || 'none'}_${c.reason}`;
    if (!uniqueKeys.has(key)) {
      uniqueKeys.add(key);
      deduplicatedConflicts.push(c);
    }
  }

  return deduplicatedConflicts;
};

export const generateConflictSuggestions = (trip, specificItemId = null) => {
  const initialConflicts = detectConflicts(trip);
  if (initialConflicts.length === 0) return { trip, enrichedConflicts: [] };

  const enrichedConflicts = [];
  const conflictsToProcess = specificItemId 
    ? initialConflicts.filter(c => c.itemId === specificItemId)
    : initialConflicts;

  for (const conflict of conflictsToProcess) {
    const dayIndex = conflict.affectedDay - 1;
    const dayPlan = trip.itinerary[dayIndex]?.plan || [];
    const targetItem = dayPlan.find(i => i.id === conflict.itemId);
    
    const conflictSuggestions = [];

    if (targetItem && !isImmutableTransport(targetItem)) {
      const durationMins = (timeToMinutes(targetItem.endTime) - timeToMinutes(targetItem.startTime)) || 90;
      const tripDays = trip.itinerary.length;
      
      let foundSuggestions = 0;

      // Order of days to search:
      // 1. FIRST PRIORITY: Same affected day! (never move across days if time shift resolves it)
      // 2. Meals and hotel events must NEVER move across days!
      const cat = String(targetItem.category || "").toLowerCase();
      const title = String(targetItem.name || targetItem.activity || "").toLowerCase();
      const isMealOrHotel = cat === "food" || cat === "operational" || title.includes("breakfast") || title.includes("lunch") || title.includes("dinner") || title.includes("check");

      const candidateDays = [conflict.affectedDay];
      if (!isMealOrHotel) {
        if (conflict.affectedDay + 1 <= tripDays) candidateDays.push(conflict.affectedDay + 1);
        if (conflict.affectedDay - 1 >= 1) candidateDays.push(conflict.affectedDay - 1);
      }

      for (const sweepDay of candidateDays) {
        if (foundSuggestions >= 3) break;
        
        for (let minOffset = 8 * 60; minOffset <= 20 * 60; minOffset += 30) {
          if (foundSuggestions >= 3) break;
          
          let candidateTrip = JSON.parse(JSON.stringify(trip));
          let candItem = candidateTrip.itinerary[sweepDay - 1].plan.find(i => i.id === targetItem.id);
          
          if (!candItem) {
            candidateTrip.itinerary[dayIndex].plan = candidateTrip.itinerary[dayIndex].plan.filter(i => i.id !== targetItem.id);
            candItem = { ...targetItem };
            candidateTrip.itinerary[sweepDay - 1].plan.push(candItem);
          }
          
          const proposedStartMin = minOffset;
          const proposedEndMin = minOffset + durationMins;
          
          candItem.startTime = minutesToTimeStr(proposedStartMin);
          candItem.endTime = minutesToTimeStr(proposedEndMin);
          candItem.time = `${minutesToTimeStr(proposedStartMin)} - ${minutesToTimeStr(proposedEndMin)}`;
          
          candidateTrip.itinerary[sweepDay - 1].plan.sort((a,b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
          
          const testConflicts = detectConflicts(candidateTrip);
          const stillConflicts = testConflicts.some(c => c.itemId === candItem.id);
          
          if (!stillConflicts) {
             const actionType = sweepDay === conflict.affectedDay ? "MOVE_TIME" : "MOVE_DAY";
             const text = actionType === "MOVE_TIME" 
               ? `Move "${targetItem.name || targetItem.activity}" to ${minutesToTimeStr(proposedStartMin)}`
               : `Move "${targetItem.name || targetItem.activity}" to Day ${sweepDay} at ${minutesToTimeStr(proposedStartMin)}`;
               
             conflictSuggestions.push({
               suggestionText: text,
               action: {
                 type: actionType,
                 itemId: targetItem.id,
                 day: sweepDay,
                 fromDay: conflict.affectedDay,
                 toDay: sweepDay,
                 startTime: minutesToTimeStr(proposedStartMin),
                 endTime: minutesToTimeStr(proposedEndMin)
               }
             });
             foundSuggestions++;
          }
        }
      }
    }
    
    enrichedConflicts.push({
      conflict,
      suggestions: conflictSuggestions
    });
  }

  return { trip, enrichedConflicts };
};

// Utility to discover existing transport baseline (train or flight) from canonical trip
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
        name: isFlight ? `${leg.airline || "Flight"} #${leg.flightNumber || ""}` : (leg.trainName || "Train"),
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

        const isReturnIndicator = itemDir === "return" || act.includes("return") || act.includes("farewell") || (tripSrc && act.includes(`to ${tripSrc}`));
        if (targetDir === "return" && !isReturnIndicator && dIdx < trip.itinerary.length - 1) continue;
        if (targetDir === "outbound" && isReturnIndicator) continue;

        const depTime = item.departure || item.startTime || (item.time ? String(item.time).split("-")[0].trim() : null);
        const arrTime = item.arrival || item.endTime || (item.time ? String(item.time).split("-")[1].trim() : null);
        const depMin = timeToMinutes(depTime);
        const arrMin = timeToMinutes(arrTime);

        if (depMin !== null || hasTrainNum || hasFlightNum) {
          const isFlight = hasFlightNum || item.mode === "flight";
          const matchedTrainNum = item.trainNumber || (act.match(/#?(\d{4,5})/)?.[1]) || (isFlight ? null : "DEFAULT");
          const matchedFlightNum = item.flightNumber || (act.match(/([A-Z0-9]{2,3}\s?\d{3,4})/)?.[1]) || null;
          const depDay = dIdx + 1;
          const itemDur = item.durationMinutes || (depMin !== null && arrMin !== null ? (arrMin >= depMin ? arrMin - depMin : arrMin + 1440 - depMin) : 180);
          const arrDay = targetDir === "outbound" ? (depDay + Math.floor(((depMin || 0) + itemDur) / 1440)) : depDay;
          return {
            mode: isFlight ? "flight" : "train",
            flightNumber: matchedFlightNum ? String(matchedFlightNum) : null,
            airline: item.airline || (isFlight ? "Scheduled Airline" : null),
            trainNumber: matchedTrainNum ? String(matchedTrainNum) : (isFlight ? null : "DEFAULT"),
            trainName: item.trainName || item.name || item.activity || (isFlight ? "Scheduled Flight" : "Default Train"),
            name: isFlight ? `${item.airline || "Flight"} #${matchedFlightNum || ""}` : (item.trainName || item.name || "Train"),
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

export const scheduleTrainJourneyIntoTrip = (trip, train, routeContext = {}) => {
  if (!trip || !train || !train.trainNumber) {
    return { success: false, error: "Invalid train or trip data" };
  }

  const direction = (routeContext.direction || "outbound").toLowerCase();
  const tripSource = trip.source || "Mumbai";
  const tripDestination = trip.destination || "Destination";

  const journeySource = direction === "return" ? (routeContext.source || tripDestination) : (routeContext.source || tripSource);
  const journeyDestination = direction === "return" ? (routeContext.destination || tripSource) : (routeContext.destination || tripDestination);

  const norm = (str) => (str || "").toLowerCase().trim();
  const fromName = train.from?.name || train.from?.code || train.source || journeySource;
  const toName = train.to?.name || train.to?.code || train.destination || journeyDestination;
  const fromCode = train.from?.code || "";
  const toCode = train.to?.code || "";

  const depTimeStr = train.departure;
  const depMin = timeToMinutes(depTimeStr);
  if (depMin === null) {
    return { success: false, error: "Selected train has an invalid departure time." };
  }

  const durationMins = train.durationMinutes || (typeof train.duration === "string" ? (() => {
    const hMatch = train.duration.match(/(\d+)\s*h/i);
    const mMatch = train.duration.match(/(\d+)\s*m/i);
    const hrs = hMatch ? parseInt(hMatch[1], 10) : 0;
    const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
    return (hrs * 60 + mins) || 180;
  })() : 180);

  const priceVal = parsePrice(train.price || train.fare || 0);

  // Deep clone existing canonical itinerary to protect unaffected days and objects
  let itinerary = Array.isArray(trip.itinerary) && trip.itinerary.length > 0
    ? trip.itinerary.map(d => ({ ...d, plan: [...(d.plan || [])] }))
    : [];

  if (itinerary.length === 0) {
    return { success: false, error: "Trip itinerary has no days configured." };
  }

  const totalDays = itinerary.length;

  // 1. Identify existing baseline train from the canonical itinerary
  const oldTrain = findExistingTrainRecord(trip, direction, routeContext) || {
    trainNumber: "DEFAULT",
    trainName: "Default Train",
    departure: direction === "return" ? "17:00" : "13:00",
    arrival: direction === "return" ? "12:00" : "18:00",
    departureDay: direction === "return" ? totalDays : 1,
    arrivalDay: direction === "return" ? totalDays : 2,
  };

  const itineraryAdjustments = [];

  // Helper to identify ONLY the specific intercity train journey records to remove/replace
  const isMatchingTransportItem = (item, dayIdx) => {
    if (!item) return false;
    const act = norm(item.activity || item.name || "");
    const leg = norm(item.legType || "");
    const dir = norm(item.journeyDirection || "");
    const trainNum = item.trainNumber ? String(item.trainNumber) : "";
    const id = norm(item.id || item._id || "");
    const cat = norm(item.category || "");

    // Stale or specific train markers
    if (id.includes("train-02198") || act.includes("mumbai → kerala")) return true;

    if (direction === "outbound") {
      if (dir === "outbound") return true;
      if (leg === "assembly" && dayIdx === 0) return true;
      if (leg === "departure" && dayIdx === 0) return true;
      if (leg === "transit" && (dayIdx === 1 || dayIdx === 2)) return true;
      if (leg === "arrival" && (dayIdx === 1 || dayIdx === 2)) return true;
      if (dayIdx === 0 && (act.includes("pre-departure station buffer") || act.includes("overnight train journey"))) return true;
      if ((dayIdx === 0 || dayIdx === 1) && trainNum && dir !== "return") return true;
      return false;
    } else {
      if (dir === "return") return true;
      if (leg === "assembly" && dayIdx >= totalDays - 2) return true;
      if (leg === "departure" && dayIdx >= totalDays - 2) return true;
      if (leg === "transfer" && dayIdx >= totalDays - 2 && (act.includes("station") || act.includes("airport"))) return true;
      if (trainNum && (dayIdx >= totalDays - 2 || act.includes("return train"))) return true;
      if (dayIdx >= totalDays - 1) {
        // Cleanly remove old return transport (train, flight, bus, or airport buffer) on return day
        if (cat === "transport" || cat === "travel" || cat === "flight" || leg === "departure" || leg === "assembly") {
          if (act.includes("return") || act.includes("flight") || act.includes("train") || act.includes("airport") || act.includes("buffer")) {
            return true;
          }
        }
        if (act.includes("flight return") || act.includes("return flight") || act.includes("return train") || act.includes("return: ") || act.includes("return train journey")) return true;
      }
      return false;
    }
  };

  // Remove ONLY matching old transport items for this direction
  itinerary = itinerary.map((d, dIdx) => ({
    ...d,
    plan: (d.plan || []).filter(item => !isMatchingTransportItem(item, dIdx)),
  }));

  // Clean travelLegs: preserve opposite direction, replace this direction
  let updatedTravelLegs = Array.isArray(trip.travelLegs)
    ? trip.travelLegs.filter(l => {
        if (direction === "outbound") {
          return l.journeyDirection !== "outbound" && l.id !== "leg-outbound-train";
        } else {
          return l.journeyDirection !== "return" && l.id !== "leg-return-train";
        }
      })
    : [];

  let arrDayNum = 2;

  if (direction === "outbound") {
    // ====================================================
    // SURGICAL ADAPTATION: OUTBOUND TRAIN
    // ====================================================
    const arrAbsMin = depMin + durationMins;
    const arrDayIdx = Math.min(totalDays - 1, Math.floor(arrAbsMin / 1440));
    arrDayNum = arrDayIdx + 1;
    const arrLocalMin = arrAbsMin % 1440;
    const arrTimeStr = train.arrival || minutesToTimeStr(arrLocalMin);

    const assemblyDuration = 60; // 1 hour assembly buffer before departure
    const assemblyStartMin = Math.max(0, depMin - assemblyDuration);

    const assemblyItem = {
      id: `train-outbound-assembly-${train.trainNumber}`,
      activity: `Station Assembly & Boarding: ${fromName}`,
      name: `Assemble at ${fromName} Station`,
      place: `${fromName} Railway Station`,
      location: `${fromName} Railway Station`,
      time: `${minutesToTimeStr(assemblyStartMin)} - ${train.departure}`,
      startTime: minutesToTimeStr(assemblyStartMin),
      endTime: train.departure,
      duration: "1 hour",
      durationMinutes: 60,
      category: "transport",
      categoryLabel: "Transport",
      journeyDirection: "outbound",
      legType: "assembly",
      trainNumber: train.trainNumber,
      icon: "🚉",
      notes: `Report to ${fromName} platform by ${minutesToTimeStr(assemblyStartMin)} (1 hour before departure) for platform navigation, luggage check, and boarding.`,
    };

    const departureItem = {
      id: `train-outbound-dep-${train.trainNumber}`,
      activity: `Outbound Train Journey: ${fromName}${fromCode ? ` (${fromCode})` : ""} → ${toName}${toCode ? ` (${toCode})` : ""}`,
      name: `${train.trainName} (#${train.trainNumber})`,
      place: `Departing ${fromName}`,
      location: `${fromName} → ${toName}`,
      routeSource: journeySource,
      routeDestination: journeyDestination,
      source: fromName,
      destination: toName,
      time: `${train.departure} - ${arrTimeStr}`,
      startTime: train.departure,
      endTime: arrTimeStr,
      departure: train.departure,
      arrival: train.arrival,
      duration: train.duration,
      durationMinutes: durationMins,
      price: priceVal,
      displayPrice: priceVal > 0 ? `₹${priceVal.toLocaleString("en-IN")}` : null,
      estimatedCost: priceVal > 0 ? `₹${priceVal.toLocaleString("en-IN")}` : null,
      category: "transport",
      categoryLabel: "Transport",
      journeyDirection: "outbound",
      legType: "departure",
      trainNumber: train.trainNumber,
      trainName: train.trainName,
      type: train.type || "Express",
      from: train.from,
      to: train.to,
      stops: train.stops !== undefined ? train.stops : train.totalStops,
      totalStops: train.totalStops !== undefined ? train.totalStops : train.stops,
      route: train.route || [],
      fares: train.fares || null,
      runningDays: train.runningDays || null,
      isGateway: Boolean(train.isGateway),
      gatewayLabel: train.gatewayLabel || null,
      icon: "🚆",
      notes: `Outbound Journey • Departs ${train.departure} (Day 1) from ${fromName} • Arrives ${train.arrival} (Day ${arrDayNum}) at ${toName} • Duration: ${train.duration}${train.stops !== undefined ? ` • ${train.stops} stops` : ""}`,
    };

    // --- Adapt Day 1 Plan ---
    const day1Plan = itinerary[0]?.plan || [];
    const preservedDay1Plan = [];
    let morningTimeSlot = 8 * 60;

    day1Plan.forEach(item => {
      const itemStart = timeToMinutes(item.startTime || (item.time ? String(item.time).split("-")[0] : null));
      const itemEnd = timeToMinutes(item.endTime || (item.time ? String(item.time).split("-")[1] : null));
      const dur = item.durationMinutes || (itemStart !== null && itemEnd !== null ? Math.max(30, itemEnd - itemStart) : 60);

      if (itemEnd !== null && itemEnd <= assemblyStartMin) {
        // Unaffected: Keep at exact time
        preservedDay1Plan.push(item);
        morningTimeSlot = Math.max(morningTimeSlot, itemEnd + 15);
      } else if (morningTimeSlot + dur <= assemblyStartMin) {
        // Can fit earlier in the morning before assembly
        const newStart = morningTimeSlot;
        const newEnd = morningTimeSlot + dur;
        morningTimeSlot = newEnd + 15;
        preservedDay1Plan.push({
          ...item,
          startTime: minutesToTimeStr(newStart),
          endTime: minutesToTimeStr(newEnd),
          time: `${minutesToTimeStr(newStart)} - ${minutesToTimeStr(newEnd)}`,
        });
        itineraryAdjustments.push(`Day 1 activity "${item.name || item.activity}" shifted to ${minutesToTimeStr(newStart)} to conclude before train assembly.`);
      } else {
        itineraryAdjustments.push(`Day 1 activity "${item.name || item.activity}" removed because it conflicts with train departure at ${train.departure}.`);
      }
    });

    itinerary[0] = {
      ...itinerary[0],
      plan: [...preservedDay1Plan, assemblyItem, departureItem],
    };

    // --- Adapt Arrival Day (Day 2 or Day 3) ---
    if (arrDayIdx === 1) {
      const arrLocal = arrLocalMin;
      const exitStationMin = Math.min(1440, arrLocal + 60);
      const hotelArrivalMin = Math.min(1440, arrLocal + BUFFERS.POST_ARRIVAL);
      const checkInEndMin = Math.min(1440, hotelArrivalMin + 30);
      const freshenUpEndMin = Math.min(1440, checkInEndMin + 30);
      
      let usableDaytimeStartMin = freshenUpEndMin;
      const dinnerStartMin = Math.max(20 * 60, freshenUpEndMin + 15);
      const usableDaytimeEndMin = Math.min(dinnerStartMin - 15, 20 * 60);

      const arrivalItem = {
        id: `train-outbound-arr-${train.trainNumber}`,
        activity: `Outbound Train Arrival: ${fromName} → ${toName}${toCode ? ` (${toCode})` : ""}`,
        name: `${train.trainName} (#${train.trainNumber})`,
        place: `Arrived at ${toName}`,
        location: `${fromName} → ${toName}`,
        time: `Arrives ${arrTimeStr}`,
        startTime: arrTimeStr,
        endTime: minutesToTimeStr(exitStationMin),
        departure: train.departure,
        arrival: arrTimeStr,
        duration: train.duration,
        durationMinutes: durationMins,
        category: "transport",
        categoryLabel: "Transport",
        journeyDirection: "outbound",
        legType: "arrival",
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        icon: "🚆",
        notes: `Deboard train at ${toName} (${arrTimeStr}). Collect luggage and station transfer to accommodation.`,
      };

      const day2Plan = itinerary[1]?.plan || [];
      const preservedDay2 = [];
      let checkInFound = false;
      let dinnerFound = false;

      day2Plan.forEach(item => {
        const cat = norm(item.category || "");
        const act = norm(item.activity || item.name || "");

        // Hotel Check-in
        const isCheckIn = (cat === "operational" || cat === "accommodation" || cat === "stay") &&
          (act.includes("check-in") || act.includes("check in") || act.includes("hotel") || act.includes("refresh"));
        if (isCheckIn && !checkInFound) {
          checkInFound = true;
          const ciStart = minutesToTimeStr(hotelArrivalMin);
          const ciEnd = minutesToTimeStr(checkInEndMin);
          preservedDay2.push({
            ...item,
            startTime: ciStart,
            endTime: ciEnd,
            time: `${ciStart} - ${ciEnd}`,
          });
          itineraryAdjustments.push(`Hotel check-in shifted to ${ciStart} based on train arrival.`);
          return;
        }

        // Dinner
        const isDinner = act.includes("dinner") || (cat === "food" && act.includes("evening"));
        if (isDinner) {
          dinnerFound = true;
          const dStart = minutesToTimeStr(dinnerStartMin);
          const dEnd = minutesToTimeStr(Math.min(1440, dinnerStartMin + 60));
          preservedDay2.push({
            ...item,
            startTime: dStart,
            endTime: dEnd,
            time: `${dStart} - ${dEnd}`,
          });
          itineraryAdjustments.push(`Dinner shifted to ${dStart}.`);
          return;
        }

        // Breakfast / Lunch
        if (act.includes("breakfast") || (cat === "food" && act.includes("morning"))) {
          if (arrLocal >= 11 * 60) return;
        }
        if (act.includes("lunch") || (cat === "food" && act.includes("afternoon"))) {
          if (arrLocal >= 15 * 60) {
            return;
          } else if (arrLocal < 12 * 60 && usableDaytimeStartMin <= 14 * 60) {
            const lStart = minutesToTimeStr(Math.max(12 * 60, usableDaytimeStartMin));
            const lEnd = minutesToTimeStr(Math.max(13 * 60, usableDaytimeStartMin + 60));
            usableDaytimeStartMin = timeToMinutes(lEnd) + 15;
            preservedDay2.push({
              ...item,
              startTime: lStart,
              endTime: lEnd,
              time: `${lStart} - ${lEnd}`,
            });
            return;
          }
        }

        // Regular Activities
        const itemStart = timeToMinutes(item.startTime || (item.time ? String(item.time).split("-")[0] : null));
        const itemEnd = timeToMinutes(item.endTime || (item.time ? String(item.time).split("-")[1] : null));
        const dur = item.durationMinutes || (itemStart !== null && itemEnd !== null ? Math.max(45, itemEnd - itemStart) : 90);

        const logicalWindow = getActivityLogicalWindow(item);
        const maxActivityEnd = Math.min(usableDaytimeEndMin, logicalWindow.end);

        if (usableDaytimeStartMin + dur <= maxActivityEnd) {
          if (itemStart !== null && itemStart >= usableDaytimeStartMin && (itemEnd || itemStart + dur) <= maxActivityEnd) {
            preservedDay2.push(item);
            usableDaytimeStartMin = Math.max(usableDaytimeStartMin, (itemEnd || itemStart + dur) + 15);
            itineraryAdjustments.push(`Day 2 activity "${item.name || item.activity}" retained.`);
          } else {
            const newStart = usableDaytimeStartMin;
            const newEnd = usableDaytimeStartMin + dur;
            usableDaytimeStartMin = newEnd + 15;
            preservedDay2.push({
              ...item,
              startTime: minutesToTimeStr(newStart),
              endTime: minutesToTimeStr(newEnd),
              time: `${minutesToTimeStr(newStart)} - ${minutesToTimeStr(newEnd)}`,
            });
            itineraryAdjustments.push(`Day 2 activity "${item.name || item.activity}" shifted to ${minutesToTimeStr(newStart)}.`);
          }
        } else {
          // Late arrival: do NOT force into night
          let movedToNextDay = false;
          for (let nextIdx = 2; nextIdx < Math.min(totalDays, 5); nextIdx++) {
            const nextDayPlan = itinerary[nextIdx]?.plan || [];
            const lastItem = nextDayPlan[nextDayPlan.length - 1];
            const lastEnd = lastItem ? timeToMinutes(lastItem.endTime || (lastItem.time ? String(lastItem.time).split("-")[1] : null)) || 17 * 60 : 17 * 60;
            if (lastEnd + dur <= 19 * 60) {
              const newStart = lastEnd + 15;
              const newEnd = newStart + dur;
              itinerary[nextIdx].plan.push({
                ...item,
                startTime: minutesToTimeStr(newStart),
                endTime: minutesToTimeStr(newEnd),
                time: `${minutesToTimeStr(newStart)} - ${minutesToTimeStr(newEnd)}`,
              });
              itineraryAdjustments.push(`Day 2 activity "${item.name || item.activity}" moved to Day ${nextIdx + 1} at ${minutesToTimeStr(newStart)}.`);
              movedToNextDay = true;
              break;
            }
          }

          if (!movedToNextDay) {
            itineraryAdjustments.push(`Day 2 activity "${item.name || item.activity}" removed because there is no longer enough daytime after late train arrival (${train.arrival}).`);
          }
        }
      });

      if (!checkInFound) {
        const ciStart = minutesToTimeStr(hotelArrivalMin);
        const ciEnd = minutesToTimeStr(checkInEndMin);
        preservedDay2.push({
          id: `sync-checkin-arrival-day`,
          activity: `Hotel Check-in & Freshen Up`,
          name: `Hotel Check-in & Freshen Up`,
          place: toName,
          category: "operational",
          categoryLabel: "Operational",
          startTime: ciStart,
          endTime: ciEnd,
          time: `${ciStart} - ${ciEnd}`,
          duration: "30m",
          durationMinutes: 30,
        });
        itineraryAdjustments.push(`Hotel check-in set to ${ciStart}.`);
      }

      if (!dinnerFound && arrLocal >= 16 * 60) {
        const dStart = minutesToTimeStr(dinnerStartMin);
        const dEnd = minutesToTimeStr(Math.min(1440, dinnerStartMin + 60));
        preservedDay2.push({
          id: `sync-dinner-arrival-day`,
          activity: `Dinner at Destination`,
          name: `Dinner & Relax`,
          place: toName,
          category: "food",
          categoryLabel: "Food",
          startTime: dStart,
          endTime: dEnd,
          time: `${dStart} - ${dEnd}`,
          duration: "1h",
          durationMinutes: 60,
        });
        itineraryAdjustments.push(`Dinner scheduled for ${dStart}.`);
      }

      itinerary[1] = {
        ...itinerary[1],
        plan: [arrivalItem, ...preservedDay2],
      };

      itineraryAdjustments.push(`Day 3 through Day ${totalDays} itinerary unchanged.`);

    } else if (arrDayIdx >= 2) {
      for (let d = 1; d < arrDayIdx; d++) {
        const transitDayNum = d + 1;
        const transitItem = {
          id: `train-outbound-transit-${train.trainNumber}-day${transitDayNum}`,
          activity: `Train Journey in Transit: ${fromName} → ${toName}`,
          name: `${train.trainName} (#${train.trainNumber})`,
          place: `En Route to ${toName}`,
          location: `${fromName} → ${toName}`,
          time: "All Day • Overnight Transit",
          startTime: "00:00",
          endTime: "23:59",
          duration: "All Day",
          durationMinutes: 1440,
          category: "transport",
          categoryLabel: "Transport",
          journeyDirection: "outbound",
          legType: "transit",
          trainNumber: train.trainNumber,
          trainName: train.trainName,
          icon: "🚆",
          notes: `En route to ${toName} aboard ${train.trainName} (#${train.trainNumber}). Full day rail transit. Meals served onboard.`,
        };

        // Full day rail transit: destination activities/meals cannot occur aboard train
        itinerary[d] = {
          ...itinerary[d],
          plan: [transitItem],
        };
      }

      const exitStationMin = Math.min(1440, arrLocalMin + 50);
      const arrivalItem = {
        id: `train-outbound-arr-${train.trainNumber}`,
        activity: `Outbound Train Arrival: ${fromName} → ${toName}${toCode ? ` (${toCode})` : ""}`,
        name: `${train.trainName} (#${train.trainNumber})`,
        place: `Arrived at ${toName}`,
        location: `${fromName} → ${toName}`,
        time: `Arrives ${arrTimeStr}`,
        startTime: arrTimeStr,
        endTime: minutesToTimeStr(exitStationMin),
        departure: train.departure,
        arrival: arrTimeStr,
        duration: train.duration,
        durationMinutes: durationMins,
        category: "transport",
        categoryLabel: "Transport",
        journeyDirection: "outbound",
        legType: "arrival",
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        icon: "🚆",
        notes: `Train arrives at ${toName} at ${arrTimeStr} (Day ${arrDayNum}). Deboard, collect luggage, and station transfer.`,
      };

      const day3Plan = (itinerary[arrDayIdx]?.plan || []).filter(item => {
        const itemStart = timeToMinutes(item.startTime || (item.time ? String(item.time).split("-")[0] : null));
        return itemStart === null || itemStart >= exitStationMin;
      });

      itinerary[arrDayIdx] = {
        ...itinerary[arrDayIdx],
        plan: [arrivalItem, ...day3Plan],
      };

      if (totalDays > arrDayNum) {
        itineraryAdjustments.push(`Day ${arrDayNum + 1} through Day ${totalDays} itinerary unchanged.`);
      }
    }

    updatedTravelLegs.push({
      id: `leg-outbound-train`,
      journeyDirection: "outbound",
      mode: "train",
      type: "train",
      operator: train.trainName,
      trainName: train.trainName,
      trainNumber: train.trainNumber,
      from: fromName,
      to: toName,
      source: fromName,
      destination: toName,
      departure: train.departure,
      arrival: train.arrival,
      startTime: train.departure,
      endTime: train.arrival,
      duration: train.duration,
      durationMinutes: durationMins,
      fare: priceVal,
      price: priceVal,
      estimatedCost: priceVal,
      departureDay: 1,
      arrivalDay: arrDayNum,
    });
  } else {
    // ====================================================
    // SURGICAL ADAPTATION: RETURN TRAIN
    // ====================================================
    const finalDayIdx = Math.max(0, totalDays - 1);
    const finalDayNum = finalDayIdx + 1;

    const retDepMin = depMin;
    const retDaysOffset = Math.floor((retDepMin + durationMins) / 1440);
    arrDayNum = finalDayNum + retDaysOffset;

    // Safe pre-departure preparation window (2-3 hours)
    const returnBufferMins = 150;
    const retActivityCutoffMin = Math.max(0, retDepMin - returnBufferMins);
    const assemblyStartMin = Math.max(0, retDepMin - 90);

    const returnAssemblyItem = {
      id: `train-return-assembly-${train.trainNumber}`,
      activity: `Station Transfer & Assembly: ${fromName}`,
      name: `Assemble at ${fromName} Station`,
      place: `${fromName} Railway Station`,
      location: `${fromName} Railway Station`,
      time: `${minutesToTimeStr(assemblyStartMin)} - ${train.departure}`,
      startTime: minutesToTimeStr(assemblyStartMin),
      endTime: train.departure,
      duration: "1.5 hours",
      durationMinutes: 90,
      category: "transport",
      categoryLabel: "Transport",
      journeyDirection: "return",
      legType: "assembly",
      trainNumber: train.trainNumber,
      icon: "🚉",
      notes: `Hotel check-out, transfer to ${fromName} station, assemble at platform, luggage check, and prepare for boarding.`,
    };

    const returnDepartureItem = {
      id: `train-return-dep-${train.trainNumber}`,
      activity: `Return Train Journey: ${fromName}${fromCode ? ` (${fromCode})` : ""} → ${toName}${toCode ? ` (${toCode})` : ""}`,
      name: `${train.trainName} (#${train.trainNumber})`,
      place: `Departing ${fromName}`,
      location: `${fromName} → ${toName}`,
      routeSource: journeySource,
      routeDestination: journeyDestination,
      source: fromName,
      destination: toName,
      time: `${train.departure} - ${train.arrival}`,
      startTime: train.departure,
      endTime: train.arrival,
      departure: train.departure,
      arrival: train.arrival,
      duration: train.duration,
      durationMinutes: durationMins,
      price: priceVal,
      displayPrice: priceVal > 0 ? `₹${priceVal.toLocaleString("en-IN")}` : null,
      estimatedCost: priceVal > 0 ? `₹${priceVal.toLocaleString("en-IN")}` : null,
      category: "transport",
      categoryLabel: "Transport",
      journeyDirection: "return",
      legType: "departure",
      trainNumber: train.trainNumber,
      trainName: train.trainName,
      type: train.type || "Express",
      from: train.from,
      to: train.to,
      stops: train.stops !== undefined ? train.stops : train.totalStops,
      totalStops: train.totalStops !== undefined ? train.totalStops : train.stops,
      route: train.route || [],
      fares: train.fares || null,
      runningDays: train.runningDays || null,
      isGateway: Boolean(train.isGateway),
      gatewayLabel: train.gatewayLabel || null,
      icon: "🚆",
      notes: `Return journey departs ${train.departure} for ${toName}. Rail transit. Arrival at ${train.arrival}.`,
    };

    // Filter and adapt Day 10 activities
    const preservedFinalDay = [];
    const finalDayPlan = itinerary[finalDayIdx]?.plan || [];
    let morningTimeSlot = 8 * 60;
    let checkoutFound = false;

    finalDayPlan.forEach(item => {
      const cat = norm(item.category || "");
      const act = norm(item.activity || item.name || "");

      // Check for Hotel Check-out: NEVER remove check-out!
      const isCheckout = (cat === "hotel" || cat === "operational" || cat === "accommodation" || cat === "stay") &&
        (act.includes("checkout") || act.includes("check-out") || act.includes("check out") || act.includes("check-in / check-out")) ||
        act.includes("hotel check-out") || act.includes("hotel checkout");
      if (isCheckout) {
        checkoutFound = true;
        // Check-out should adapt to departure time: standard 10:30 or 11:00 AM, or before station assembly
        const existingStart = timeToMinutes(item.startTime || (item.time ? String(item.time).split("-")[0] : null));
        let coStartMin = 11 * 60;
        if (assemblyStartMin <= 11 * 60) {
          coStartMin = Math.max(4 * 60, assemblyStartMin - 35);
        } else if (existingStart !== null && existingStart + 30 <= assemblyStartMin && existingStart >= 4 * 60) {
          coStartMin = Math.min(existingStart, assemblyStartMin - 35);
        } else {
          coStartMin = Math.min(11 * 60, assemblyStartMin - 35);
        }
        preservedFinalDay.push({
          ...item,
          category: item.category || "hotel",
          startTime: minutesToTimeStr(coStartMin),
          endTime: minutesToTimeStr(coStartMin + 30),
          time: `${minutesToTimeStr(coStartMin)} - ${minutesToTimeStr(coStartMin + 30)}`,
        });
        itineraryAdjustments.push(`Hotel check-out scheduled for ${minutesToTimeStr(coStartMin)}.`);
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
          time: `${minutesToTimeStr(newStart)} - ${minutesToTimeStr(newEnd)}`,
        });
        itineraryAdjustments.push(`Day ${finalDayNum} activity "${item.name || item.activity}" shifted to ${minutesToTimeStr(newStart)}.`);
      } else {
        itineraryAdjustments.push(`Day ${finalDayNum} activity "${item.name || item.activity}" removed because it conflicts with return train departure (${train.departure}).`);
      }
    });

    // If check-out wasn't in the plan, insert standard check-out before station assembly
    if (!checkoutFound) {
      let coStartMin = 11 * 60;
      if (assemblyStartMin <= 11 * 60) {
        coStartMin = Math.max(4 * 60, assemblyStartMin - 35);
      } else {
        coStartMin = Math.min(11 * 60, assemblyStartMin - 35);
      }
      preservedFinalDay.push({
        id: `sync-checkout-final-day`,
        activity: `Hotel Check-out & Luggage Storage`,
        name: `Hotel Check-out`,
        place: fromName,
        category: "hotel",
        categoryLabel: "Stay",
        startTime: minutesToTimeStr(coStartMin),
        endTime: minutesToTimeStr(coStartMin + 30),
        time: `${minutesToTimeStr(coStartMin)} - ${minutesToTimeStr(coStartMin + 30)}`,
        duration: "30m",
        durationMinutes: 30,
      });
      itineraryAdjustments.push(`Hotel check-out scheduled for ${minutesToTimeStr(coStartMin)}.`);
    }

    itinerary[finalDayIdx] = {
      ...itinerary[finalDayIdx],
      plan: [...preservedFinalDay, returnAssemblyItem, returnDepartureItem],
    };

    itineraryAdjustments.push(`Day 1 through Day ${finalDayNum - 1} itinerary unchanged.`);

    updatedTravelLegs.push({
      id: `leg-return-train`,
      journeyDirection: "return",
      mode: "train",
      type: "train",
      operator: train.trainName,
      trainName: train.trainName,
      trainNumber: train.trainNumber,
      from: fromName,
      to: toName,
      source: fromName,
      destination: toName,
      departure: train.departure,
      arrival: train.arrival,
      startTime: train.departure,
      endTime: train.arrival,
      duration: train.duration,
      durationMinutes: durationMins,
      fare: priceVal,
      price: priceVal,
      estimatedCost: priceVal,
      departureDay: finalDayNum,
      arrivalDay: arrDayNum,
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

  // Adjust staySegments so check-in does not precede train arrival
  let updatedStaySegments = Array.isArray(trip.staySegments) ? [...trip.staySegments] : [];
  if (direction === "outbound" && updatedStaySegments.length > 0 && trip.startDate) {
    const outboundLeg = updatedTravelLegs.find(l => l.journeyDirection === "outbound");
    if (outboundLeg && outboundLeg.arrivalDay > 1) {
      const startObj = new Date(trip.startDate);
      if (!isNaN(startObj.getTime())) {
        const arrivalDateObj = new Date(startObj.getTime() + (outboundLeg.arrivalDay - 1) * 86400000);
        const arrivalDateStr = arrivalDateObj.toISOString().split("T")[0];
        if (updatedStaySegments[0].checkIn < arrivalDateStr) {
          updatedStaySegments[0] = {
            ...updatedStaySegments[0],
            checkIn: arrivalDateStr,
          };
        }
      }
    }
  }

  const scheduledTrip = {
    ...trip,
    itinerary,
    travelLegs: updatedTravelLegs,
    staySegments: updatedStaySegments,
  };

  const adaptationSummary = {
    direction,
    directionLabel: direction === "return" ? "Return" : "Outbound",
    oldTrain: {
      trainNumber: oldTrain.trainNumber,
      trainName: oldTrain.trainName,
      departure: oldTrain.departure,
      arrival: oldTrain.arrival,
      departureDay: oldTrain.departureDay || 1,
      arrivalDay: oldTrain.arrivalDay || 2,
    },
    newTrain: {
      trainNumber: train.trainNumber,
      trainName: train.trainName,
      departure: train.departure,
      arrival: train.arrival,
      departureDay: direction === "return" ? totalDays : 1,
      arrivalDay: arrDayNum,
    },
    timingChanges: {
      trainChanged: `${oldTrain.trainNumber} → ${train.trainNumber}`,
      departureChange: `Day ${oldTrain.departureDay || (direction === "return" ? totalDays : 1)} ${oldTrain.departure || "N/A"} → Day ${direction === "return" ? totalDays : 1} ${train.departure}`,
      arrivalChange: `Day ${oldTrain.arrivalDay || (direction === "return" ? totalDays : 2)} ${oldTrain.arrival || "N/A"} → Day ${arrDayNum} ${train.arrival}`,
    },
    itineraryAdjustments,
  };

  return {
    success: true,
    trip: scheduledTrip,
    adaptationSummary,
  };
};

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
  const durationStr = `${durHours}h ${durRemainderMins}m`;

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
      id: `flight-outbound-assembly-${flight.flightNumber}`,
      activity: `Airport Transfer & Security Clearance: ${fromName}${fromCode ? ` (${fromCode})` : ""}`,
      name: `Report to ${fromName} Airport (${fromCode || "Airport"})`,
      place: `${fromName} Airport (${fromCode})`,
      location: `${fromName} Airport`,
      time: `${minutesToTimeStr(assemblyStartMin)} - ${depTimeStr}`,
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
      notes: `Report to ${fromName} airport 2 hours prior to departure for check-in, security clearance, and boarding gate arrival.`,
    };

    const departureItem = {
      id: `flight-outbound-dep-${flight.flightNumber}`,
      activity: `Outbound Flight: ${fromName}${fromCode ? ` (${fromCode})` : ""} → ${toName}${toCode ? ` (${toCode})` : ""}`,
      name: `${flight.airline} (${flight.flightNumber})`,
      place: `Departing ${fromName} (${fromCode})`,
      location: `${fromName} → ${toName}`,
      routeSource: journeySource,
      routeDestination: journeyDestination,
      source: fromName,
      destination: toName,
      time: `${depTimeStr} - ${arrTimeStr}`,
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
      notes: `Verified flight schedule: ${flight.airline} ${flight.flightNumber} departs ${fromName} (${fromCode}) at ${depTimeStr}, lands at ${toName} (${toCode}) at ${arrTimeStr}.`,
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
          time: `${minutesToTimeStr(newStart)} - ${minutesToTimeStr(newEnd)}`,
        });
        itineraryAdjustments.push(`Day 1 activity "${item.name || item.activity}" shifted to ${minutesToTimeStr(newStart)} before airport departure.`);
      } else {
        itineraryAdjustments.push(`Day 1 activity "${item.name || item.activity}" removed due to flight departure at ${depTimeStr}.`);
      }
    });

    // Handle Arrival (Same-day domestic flight vs Overnight)
    const isOvernight = arrMin <= depMin;
    arrDayNum = isOvernight ? 2 : 1;

    const exitAirportMin = Math.min(1440, arrMin + 60);
    const hotelArrivalMin = Math.min(1440, arrMin + 90);
    const checkInEndMin = Math.min(1440, hotelArrivalMin + 30);

    const arrivalItem = {
      id: `flight-outbound-arr-${flight.flightNumber}`,
      activity: `Flight Arrival & Airport Transfer: ${toName}${toCode ? ` (${toCode})` : ""}`,
      name: `Arrive at ${toName} Airport (${toCode})`,
      place: `${toName} Airport (${toCode})`,
      location: `${toName}`,
      time: `${arrTimeStr} - ${minutesToTimeStr(exitAirportMin)}`,
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
      notes: `Deplane at ${toName} (${toCode}), collect baggage, and transfer to accommodation.`,
    };

    const checkInItem = {
      id: `flight-outbound-checkin-${flight.flightNumber}`,
      activity: `Hotel Check-in & Freshen Up`,
      name: `Hotel Check-in & Freshen Up`,
      place: toName,
      category: "hotel",
      categoryLabel: "Stay",
      startTime: minutesToTimeStr(hotelArrivalMin),
      endTime: minutesToTimeStr(checkInEndMin),
      time: `${minutesToTimeStr(hotelArrivalMin)} - ${minutesToTimeStr(checkInEndMin)}`,
      duration: "30m",
      durationMinutes: 30,
    };

    if (!isOvernight) {
      // Lands on Day 1!
      let day1AfternoonItems = [];
      let eveningStartMin = Math.max(checkInEndMin + 30, 18 * 60);
      if (checkInEndMin <= 19 * 60) {
        day1AfternoonItems.push({
          id: `flight-day1-dinner`,
          activity: `Welcome Dinner at ${toName}`,
          name: `Welcome Dinner & Leisure`,
          place: toName,
          category: "food",
          categoryLabel: "Food",
          startTime: minutesToTimeStr(eveningStartMin),
          endTime: minutesToTimeStr(Math.min(1440, eveningStartMin + 60)),
          time: `${minutesToTimeStr(eveningStartMin)} - ${minutesToTimeStr(Math.min(1440, eveningStartMin + 60))}`,
          duration: "1h",
          durationMinutes: 60,
        });
      }

      itinerary[0] = {
        ...itinerary[0],
        plan: [...preservedDay1Morning, assemblyItem, departureItem, arrivalItem, checkInItem, ...day1AfternoonItems],
      };

      itineraryAdjustments.push(`Flight arrives on Day 1 at ${arrTimeStr}. Hotel check-in scheduled for ${minutesToTimeStr(hotelArrivalMin)}.`);
      itineraryAdjustments.push(`Day 2 through Day ${totalDays} itinerary preserved.`);
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

      itineraryAdjustments.push(`Overnight flight arrives on Day 2 at ${arrTimeStr}. Hotel check-in scheduled for ${minutesToTimeStr(hotelArrivalMin)}.`);
      if (totalDays > 2) {
        itineraryAdjustments.push(`Day 3 through Day ${totalDays} itinerary preserved.`);
      }
    }

    updatedTravelLegs.push({
      id: `leg-outbound-flight`,
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
      id: `flight-return-assembly-${flight.flightNumber}`,
      activity: `Airport Transfer & Security Clearance: ${fromName}${fromCode ? ` (${fromCode})` : ""}`,
      name: `Report to ${fromName} Airport (${fromCode || "Airport"})`,
      place: `${fromName} Airport (${fromCode})`,
      location: `${fromName} Airport`,
      time: `${minutesToTimeStr(assemblyStartMin)} - ${depTimeStr}`,
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
      notes: `Transfer from accommodation to ${fromName} airport, security clearance, and boarding for return flight.`,
    };

    const returnDepartureItem = {
      id: `flight-return-dep-${flight.flightNumber}`,
      activity: `Return Flight: ${fromName}${fromCode ? ` (${fromCode})` : ""} → ${toName}${toCode ? ` (${toCode})` : ""}`,
      name: `${flight.airline} (${flight.flightNumber})`,
      place: `Departing ${fromName} (${fromCode})`,
      location: `${fromName} → ${toName}`,
      routeSource: journeySource,
      routeDestination: journeyDestination,
      source: fromName,
      destination: toName,
      time: `${depTimeStr} - ${arrTimeStr}`,
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
      notes: `Verified return flight: ${flight.airline} ${flight.flightNumber} departs ${fromName} (${fromCode}) at ${depTimeStr}, arrives at ${toName} (${toCode}) at ${arrTimeStr}.`,
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
          time: `${minutesToTimeStr(coStartMin)} - ${minutesToTimeStr(coStartMin + 30)}`,
        });
        itineraryAdjustments.push(`Hotel check-out scheduled for ${minutesToTimeStr(coStartMin)}.`);
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
          time: `${minutesToTimeStr(newStart)} - ${minutesToTimeStr(newEnd)}`,
        });
        itineraryAdjustments.push(`Day ${finalDayNum} activity "${item.name || item.activity}" shifted to ${minutesToTimeStr(newStart)}.`);
      } else {
        itineraryAdjustments.push(`Day ${finalDayNum} activity "${item.name || item.activity}" removed due to return flight departure at ${depTimeStr}.`);
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
        id: `sync-checkout-final-day`,
        activity: `Hotel Check-out & Luggage Storage`,
        name: `Hotel Check-out`,
        place: fromName,
        category: "hotel",
        categoryLabel: "Stay",
        startTime: minutesToTimeStr(coStartMin),
        endTime: minutesToTimeStr(coStartMin + 30),
        time: `${minutesToTimeStr(coStartMin)} - ${minutesToTimeStr(coStartMin + 30)}`,
        duration: "30m",
        durationMinutes: 30,
      });
      itineraryAdjustments.push(`Hotel check-out scheduled for ${minutesToTimeStr(coStartMin)}.`);
    }

    itinerary[finalDayIdx] = {
      ...itinerary[finalDayIdx],
      plan: [...preservedFinalDay, returnAssemblyItem, returnDepartureItem],
    };

    itineraryAdjustments.push(`Day 1 through Day ${finalDayNum - 1} itinerary unchanged.`);

    updatedTravelLegs.push({
      id: `leg-return-flight`,
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
    ? `${oldTransport.airline || "Flight"} #${oldTransport.flightNumber || "DEFAULT"}`
    : `Train #${oldTransport.trainNumber || "DEFAULT"}`;
  const newLabel = `${flight.airline} #${flight.flightNumber}`;

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
      transportChanged: `${oldLabel} → ${newLabel}`,
      trainChanged: `${oldLabel} → ${newLabel}`,
      departureChange: `Day ${oldTransport.departureDay || (direction === "return" ? totalDays : 1)} ${oldTransport.departure || "N/A"} → Day ${direction === "return" ? totalDays : 1} ${depTimeStr}`,
      arrivalChange: `Day ${oldTransport.arrivalDay || (direction === "return" ? totalDays : 1)} ${oldTransport.arrival || "N/A"} → Day ${arrDayNum} ${arrTimeStr}`,
    },
    itineraryAdjustments,
  };

  return {
    success: true,
    trip: scheduledTrip,
    adaptationSummary,
  };
};


// Pure non-mutating preview engine for Outbound, Return, or Both (supporting Train or Flight independently)
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
      return { success: false, error: `Outbound transport scheduling failed: ${resOutbound.error}` };
    }
    currentTrip = resOutbound.trip;
    transportChanges.push({
      direction: "outbound",
      directionLabel: isFlightObj(targetOutbound) ? "Outbound Flight" : "Outbound Train",
      mode: isFlightObj(targetOutbound) ? "flight" : "train",
      route: `${tripSource} → ${tripDestination}`,
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
      return { success: false, error: `Return transport scheduling failed: ${resReturn.error}` };
    }
    currentTrip = resReturn.trip;
    transportChanges.push({
      direction: "return",
      directionLabel: isFlightObj(targetReturn) ? "Return Flight" : "Return Train",
      mode: isFlightObj(targetReturn) ? "flight" : "train",
      route: `${tripDestination} → ${tripSource}`,
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
        item.time = `${safeSlot.startTime} - ${safeSlot.endTime}`;

        const testConflicts = detectConflicts(currentTrip);
        if (!testConflicts.some(c => c.itemId === item.id)) {
          anyResolvedOrRemoved = true;
          allAdjustments.push(`Day ${conflict.affectedDay} activity "${item.name || item.activity}" shifted to ${safeSlot.startTime}.`);
          continue;
        }

        item.startTime = oldStart;
        item.endTime = oldEnd;
        item.time = oldTime;
      }

      // No safe alternative exists: remove from proposed itinerary to guarantee conflict-free state
      dayPlan.splice(itemIdx, 1);
      anyResolvedOrRemoved = true;
      allAdjustments.push(`Day ${conflict.affectedDay} activity "${item.name || item.activity}" removed because it conflicts with fixed travel schedule.`);
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
        title: origDay?.title || `Day ${d + 1}`,
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
      error: `Schedule validation failed: ${validationResult.errors.join(". ")}`,
    };
  }

  // Build clean unchanged days summary string
  let unchangedSummaryText = "";
  if (unchangedDays.length > 0) {
    if (unchangedDays.length === 1) {
      unchangedSummaryText = `Day ${unchangedDays[0]} unaffected.`;
    } else {
      unchangedSummaryText = `Days ${unchangedDays[0]}–${unchangedDays[unchangedDays.length - 1]}: All unaffected activities remain unchanged.`;
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

export const validateTripSchedule = (trip) => {
  const errors = [];
  if (!trip || !Array.isArray(trip.itinerary)) {
    return { valid: false, errors: ["Invalid trip structure: itinerary is not an array."] };
  }

  const days = trip.itinerary;
  const totalDays = days.length;

  let outboundCount = 0;
  let returnCount = 0;
  let outboundDepDay = null;
  let outboundArrDay = null;
  let outboundDepMin = null;
  let outboundArrMin = null;
  let returnDepDay = null;

  for (let d = 0; d < totalDays; d++) {
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
  }

  if (outboundCount > 1) {
    errors.push(`Duplicate outbound train detected (${outboundCount} found). Only 1 outbound train is permitted.`);
  }
  if (returnCount > 1) {
    errors.push(`Duplicate return train detected (${returnCount} found). Only 1 return train is permitted.`);
  }

  if (outboundDepDay && outboundDepDay !== 1) {
    errors.push(`Outbound train departure must be on Day 1 (found on Day ${outboundDepDay}).`);
  }
  if (returnDepDay && returnDepDay !== totalDays) {
    errors.push(`Return train departure must be on Day ${totalDays} (found on Day ${returnDepDay}).`);
  }

  if (outboundDepDay && outboundArrDay) {
    if (outboundArrDay < outboundDepDay) {
      errors.push(`Train arrival day (Day ${outboundArrDay}) cannot precede departure day (Day ${outboundDepDay}).`);
    } else if (outboundArrDay === outboundDepDay && outboundArrMin !== null && outboundDepMin !== null && outboundArrMin <= outboundDepMin) {
      errors.push(`Train arrival time (${minutesToTimeStr(outboundArrMin)}) cannot precede departure time (${minutesToTimeStr(outboundDepMin)}).`);
    }
  }

  // Detect physical conflicts using canonical detector
  const conflicts = detectConflicts(trip);
  if (conflicts && conflicts.length > 0) {
    conflicts.forEach(c => {
      errors.push(`Day ${c.affectedDay}: Activity "${c.itemTitle}" has conflict: ${c.reason}`);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
