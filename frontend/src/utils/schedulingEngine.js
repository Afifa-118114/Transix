import { timeToMinutes, minutesToTimeStr } from "./formatTrip.js";

const BUFFERS = {
  PRE_DEPARTURE: 60,
  POST_ARRIVAL: 60,
  HOTEL_CHECK_IN: 30,
  INTER_ACTIVITY: 15,
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
  
  if (cat.includes("transport") || cat.includes("train") || cat.includes("flight") || cat.includes("bus") || cat.includes("transfer") || cat.includes("travel")) return true;
  if (title.includes("transfer") || title.includes("board train") || title.includes("arrive at") || title.includes("flight") || title.includes("train to") || title.includes("drop") || title.includes("pickup") || title.includes("bus journey") || title.includes("train journey") || title.includes("travel to")) return true;
  
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
      const legStart = timeToMinutes(leg.startTime);
      const legEnd = timeToMinutes(leg.endTime);
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

  if (cat.includes("museum") || cat.includes("fort") || cat.includes("attraction")) return { start: 8 * 60, end: 20 * 60 }; // 8 AM to 8 PM
  if (cat.includes("shopping") || cat.includes("market")) return { start: 9 * 60, end: 22 * 60 }; // 9 AM to 10 PM
  if (cat.includes("sightseeing")) return { start: 6 * 60, end: 22 * 60 }; // 6 AM to 10 PM
  
  return { start: 6 * 60, end: 23 * 60 + 59 }; // Default 6 AM to Midnight
};

const getDayConstraints = (trip, dayNum) => {
  const constraints = [];
  const currentDate = getDateForDay(trip, dayNum);
  if (!currentDate) return constraints;

  const baseOffset = (dayNum - 1) * 1440;

  (trip.travelLegs || []).forEach(leg => {
    if (leg.date === currentDate.toISOString().split("T")[0] || !leg.date) {
      const startMin = timeToMinutes(leg.startTime);
      const endMin = timeToMinutes(leg.endTime);
      
      if (startMin !== null && endMin !== null) {
        let absStart = baseOffset + startMin;
        let absEnd = baseOffset + endMin;
        if (absEnd < absStart) absEnd += 1440;

        constraints.push({ startMin: Math.max(baseOffset, absStart - BUFFERS.PRE_DEPARTURE), endMin: absStart, type: "buffer", reason: `pre-departure buffer for travel to ${leg.to}` });
        constraints.push({ startMin: absStart, endMin: absEnd, type: "travel", reason: `fixed travel departure to ${leg.to}` });
        constraints.push({ startMin: absEnd, endMin: absEnd + BUFFERS.POST_ARRIVAL, type: "buffer", reason: `post-arrival buffer at ${leg.to}` });
      }
    }
  });

  const activeStays = getStaySegmentsForDate(trip, currentDate);
  activeStays.forEach(activeStay => {
    if (activeStay && activeStay.selectedHotel) {
      const checkInDate = parseDate(activeStay.checkIn);
      const checkOutDate = parseDate(activeStay.checkOut);
      const hotelName = activeStay.selectedHotel.name || activeStay.location;

      if (checkInDate && checkInDate.getTime() === currentDate.getTime()) {
        const arrivalLeg = (trip.travelLegs || []).find(leg => leg.to === activeStay.location && (leg.date === currentDate.toISOString().split("T")[0] || !leg.date));
        let arrivalMin = null;
        if (arrivalLeg) arrivalMin = timeToMinutes(arrivalLeg.endTime);
        const defaultCheckInMin = timeToMinutes(activeStay.selectedHotel.checkInTime || "14:00");
        const actualCheckInStart = arrivalMin !== null ? Math.max(arrivalMin, defaultCheckInMin) : defaultCheckInMin;
        
        let absCheckIn = baseOffset + actualCheckInStart;
        constraints.push({ startMin: absCheckIn, endMin: absCheckIn + BUFFERS.HOTEL_CHECK_IN, type: "hotel_checkin", reason: `hotel check-in at ${hotelName}` });
      }

      if (checkOutDate && checkOutDate.getTime() === currentDate.getTime()) {
         const checkoutMin = timeToMinutes(activeStay.selectedHotel.checkOutTime || "11:00");
         let absCheckOut = baseOffset + checkoutMin;
         constraints.push({ startMin: Math.max(baseOffset, absCheckOut - 30), endMin: absCheckOut, type: "hotel_checkout", reason: `hotel check-out from ${hotelName}` });
      }
    }
  });

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

  let prevAbsoluteEnd = 0;

  days.forEach((day, dIdx) => {
    const dayNum = day.day || dIdx + 1;
    const currentDate = getDateForDay(trip, dayNum);
    
    // Add immutable transport to constraints
    const constraints = getDayConstraints(trip, dayNum);
    (day.plan || []).forEach((item) => {
      if (isImmutableTransport(item) && !isDuplicateTransport(item, trip, currentDate)) {
        let tStart = timeToMinutes(item.startTime);
        let tEnd = timeToMinutes(item.endTime);
        if (tStart !== null && tEnd !== null) {
          let baseOffset = (dayNum - 1) * 1440;
          let absStart = baseOffset + tStart;
          if (absStart < prevAbsoluteEnd && (prevAbsoluteEnd - absStart) < 720) {
              absStart += 1440;
              baseOffset += 1440;
          }
          let absEnd = baseOffset + tEnd;
          if (absEnd < absStart) absEnd += 1440;
          
          constraints.push({ startMin: absStart, endMin: absEnd, type: "mandatory_activity", reason: `fixed transport (${item.name || item.activity})`, itemId: item.id });
        }
      }
    });

    const mergedConstraints = mergeConstraints(constraints);
    
    let currentDayBaseOffset = (dayNum - 1) * 1440;

    let sortedPlan = [...(day.plan || [])].sort((a, b) => {
      const aStart = timeToMinutes(a.startTime || (a.time ? String(a.time).split("-")[0] : null)) || 0;
      const bStart = timeToMinutes(b.startTime || (b.time ? String(b.time).split("-")[0] : null)) || 0;
      return aStart - bStart;
    });
    
    sortedPlan.forEach((item) => {
      if (isDuplicateTransport(item, trip, currentDate)) return;

      const tStart = timeToMinutes(item.startTime || (item.time ? String(item.time).split("-")[0] : null));
      const tEnd = timeToMinutes(item.endTime || (item.time ? String(item.time).split("-")[1] : null));

      if (tStart !== null && tEnd !== null) {
        let absStart = currentDayBaseOffset + tStart;
        if (absStart < prevAbsoluteEnd && (prevAbsoluteEnd - absStart) < 720) {
            absStart += 1440;
            currentDayBaseOffset += 1440;
        }
        let absEnd = currentDayBaseOffset + tEnd;
        if (absEnd < absStart) {
            absEnd += 1440;
            currentDayBaseOffset += 1440;
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

        for (const block of mergedConstraints) {
          if (block.itemIds && block.itemIds.includes(item.id)) continue;
          if (absStart < block.endMin && absEnd > block.startMin) {
            
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

            // Check if we already have a TRANSPORT_CONSTRAINT for this item on this day to avoid spam
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

        if (prevAbsoluteEnd !== 0 && absStart < prevAbsoluteEnd) {
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
        
        prevAbsoluteEnd = Math.max(prevAbsoluteEnd, absEnd);
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
    const dayPlan = trip.itinerary[dayIndex].plan;
    const targetItem = dayPlan.find(i => i.id === conflict.itemId);
    
    const conflictSuggestions = [];

    if (targetItem && !isImmutableTransport(targetItem)) {
      const durationMins = (timeToMinutes(targetItem.endTime) - timeToMinutes(targetItem.startTime)) || 90;
      
      const tripDays = trip.itinerary.length;
      
      let foundSuggestions = 0;
      // Sweep through all days and all times in 30 min increments
      for (let sweepDay = 1; sweepDay <= tripDays; sweepDay++) {
        if (foundSuggestions >= 3) break;
        
        for (let minOffset = 8 * 60; minOffset <= 20 * 60; minOffset += 30) {
          if (foundSuggestions >= 3) break;
          
          let candidateTrip = JSON.parse(JSON.stringify(trip));
          let candItem = candidateTrip.itinerary[sweepDay - 1].plan.find(i => i.id === targetItem.id);
          
          if (!candItem) {
            // It was moved to another day
            candidateTrip.itinerary[dayIndex].plan = candidateTrip.itinerary[dayIndex].plan.filter(i => i.id !== targetItem.id);
            candItem = { ...targetItem };
            candidateTrip.itinerary[sweepDay - 1].plan.push(candItem);
            // Re-sort plan by start time
            candidateTrip.itinerary[sweepDay - 1].plan.sort((a,b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
          }
          
          const proposedStartMin = minOffset;
          const proposedEndMin = minOffset + durationMins;
          
          candItem.startTime = minutesToTimeStr(proposedStartMin);
          candItem.endTime = minutesToTimeStr(proposedEndMin);
          
          // Re-sort
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
