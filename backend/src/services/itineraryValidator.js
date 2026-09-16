const BUFFERS = {
  PRE_DEPARTURE: 60,
  POST_ARRIVAL: 60,
  HOTEL_CHECK_IN: 30,
  INTER_ACTIVITY: 15,
};

const timeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const cleaned = String(timeStr).trim();
  const isPM = /pm/i.test(cleaned);
  const isAM = /am/i.test(cleaned);
  const match = cleaned.match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const minutesToTimeStr = (minutes) => {
  if (typeof minutes !== "number" || isNaN(minutes)) return "00:00";
  const normalized = ((minutes % 1440) + 1440) % 1440;
  let hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const pad = (n) => (n < 10 ? `0${n}` : n);
  return `${pad(displayHours)}:${pad(mins)} ${ampm}`;
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

const isImmutableTransport = (item) => {
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
  
  const itemStart = timeToMinutes(item.startTime || (item.time ? String(item.time).split("-")[0] : null));
  const itemEnd = timeToMinutes(item.endTime || (item.time ? String(item.time).split("-")[1] : null));
  const dateStr = currentDate.toISOString().split("T")[0];
  
  const legs = trip.travelLegs || [];
  for (const leg of legs) {
    if (leg.date === dateStr || !leg.date) {
      const legStart = timeToMinutes(leg.startTime);
      const legEnd = timeToMinutes(leg.endTime);
      
      if (itemStart !== null && legStart !== null && itemEnd !== null && legEnd !== null) {
        // If it's a transport activity (which we know it is) and it overlaps with the leg's window (including buffers)
        // Buffer is up to 120 minutes before departure and after arrival.
        if (itemStart < legEnd + 120 && itemEnd > legStart - 120) {
          return true;
        }
      }
    }
  }
  return false;
};

const getActivityLogicalWindow = (item) => {
  const title = (item.name || item.activity || "").toLowerCase();
  const cat = (item.category || "").toLowerCase();

  if (cat.includes("transport") || title.includes("train") || title.includes("flight") || title.includes("bus")) {
      return { start: 0, end: 1440 * 10 }; // Transport can happen anytime, and span across days seamlessly
  }

  if (title.includes("dinner")) return { start: 17 * 60, end: 23 * 60 + 30 };
  if (title.includes("lunch")) return { start: 11 * 60, end: 16 * 60 };
  if (title.includes("breakfast")) return { start: 6 * 60, end: 11 * 60 };

  if (cat.includes("museum") || cat.includes("fort") || cat.includes("attraction")) return { start: 8 * 60, end: 20 * 60 };
  if (cat.includes("shopping") || cat.includes("market")) return { start: 9 * 60, end: 22 * 60 };
  if (cat.includes("sightseeing")) return { start: 6 * 60, end: 22 * 60 };
  
  return { start: 6 * 60, end: 23 * 60 + 59 };
};

// Removed getDayConstraints and mergeConstraints because aiService handles them chronologically

const detectConflicts = (trip) => {
  const conflicts = [];
  const days = trip.days || trip.itinerary || [];
  
  days.forEach((day, dIdx) => {
    (day.plan || []).forEach((item, idx) => {
      if (!item.id) item.id = `temp_id_${day.day || dIdx + 1}_${idx}`;
    });
  });

  let prevAbsoluteEnd = 0;

  days.forEach((day, dIdx) => {
    const dayNum = day.day || dIdx + 1;
    const currentDate = getDateForDay(trip, dayNum);
    
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

      let absStart = item._absStart !== undefined ? item._absStart : null;
      let absEnd = item._absEnd !== undefined ? item._absEnd : null;

      if (absStart === null && tStart !== null) {
          absStart = currentDayBaseOffset + tStart;
          if (absStart < prevAbsoluteEnd && (prevAbsoluteEnd - absStart) < 720) {
              absStart += 1440;
              currentDayBaseOffset += 1440;
          }
      }
      
      if (absEnd === null && tEnd !== null) {
          absEnd = currentDayBaseOffset + tEnd;
          if (absEnd < absStart) {
              absEnd += 1440;
              currentDayBaseOffset += 1440;
          }
      }

      if (absStart !== null && absEnd !== null) {
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

const validateItinerary = (itinerary, tripInput) => {
  const result = {
    valid: true,
    errors: [],
    warnings: [],
  };

  const addError = (type, day, message) => {
    result.valid = false;
    result.errors.push({ type, day, message });
  };

  const addWarning = (type, day, message) => {
    result.warnings.push({ type, day, message });
  };

  if (!itinerary || typeof itinerary !== "object") {
    addError("INVALID_FORMAT", null, "Itinerary is not a valid object.");
    return result;
  }

  // 1. Budget Validation
  let totalCost = 0;
  let hasOverallHotelCost = false;
  
  if (Array.isArray(itinerary.days)) {
    itinerary.days.forEach(day => {
      if (Array.isArray(day.plan)) {
        day.plan.forEach(item => {
          const cost = parseFloat(item.estimatedCost);
          if (!isNaN(cost) && cost > 0) {
            const cat = String(item.category || "").toLowerCase();
            const act = String(item.activity || "").toLowerCase();
            
            const userBudget = parseFloat(tripInput.budget) || 0;
            if (day.day === 1 && (cat.includes("hotel") || cat.includes("stay") || act.includes("hotel")) && cost > (userBudget * 0.25)) {
              hasOverallHotelCost = true;
            }
            
            if (hasOverallHotelCost && day.day > 1 && (cat.includes("hotel") || cat.includes("stay") || act.includes("hotel"))) {
              // skip
            } else {
              totalCost += cost;
            }
          }
        });
      }
    });
  }
  
  const userBudget = parseFloat(tripInput.budget) || 0;
  if (userBudget > 0 && totalCost > userBudget) {
    addError("BUDGET_EXCEEDED", null, `Total estimated cost (${totalCost}) strictly exceeds the maximum user budget (${userBudget}). Planners must stay within the budget.`);
  }

  // 2. Stay Segments Validation
  let tripStart = parseDate(tripInput.startDate);
  let tripEnd = parseDate(tripInput.endDate);
  
  if (Array.isArray(itinerary.staySegments) && itinerary.staySegments.length > 0) {
    let previousCheckOut = null;
    let totalNights = 0;
    
    itinerary.staySegments.forEach((stay, index) => {
      const checkIn = parseDate(stay.checkIn);
      const checkOut = parseDate(stay.checkOut);
      
      if (!checkIn || !checkOut) {
        addError("STAY_DATES_INVALID", null, `Stay segment ${index + 1} has invalid or missing dates.`);
        return;
      }

      if (checkIn >= checkOut) {
        addError("STAY_DATES_NEGATIVE", null, `Stay segment ${index + 1} check-out must be after check-in.`);
      }

      const diffTime = checkOut.getTime() - checkIn.getTime();
      const calculatedNights = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (calculatedNights !== stay.nights) {
        addError("STAY_NIGHTS_MISMATCH", null, `Stay segment ${index + 1} has ${stay.nights} nights, but dates suggest ${calculatedNights} nights.`);
      }
      
      totalNights += calculatedNights;

      if (previousCheckOut && previousCheckOut.getTime() !== checkIn.getTime()) {
        addError("STAY_DISCONTIGUOUS", null, `Stay segment ${index + 1} check-in (${checkIn.toISOString().split('T')[0]}) does not align with previous check-out (${previousCheckOut.toISOString().split('T')[0]}).`);
      }

      if (index === 0 && tripStart && checkIn.getTime() !== tripStart.getTime()) {
        addError("STAY_START_MISMATCH", null, `First stay check-in does not equal trip start date.`);
      }
      if (index === itinerary.staySegments.length - 1 && tripEnd && checkOut.getTime() !== tripEnd.getTime()) {
        addError("STAY_END_MISMATCH", null, `Last stay check-out does not equal trip end date.`);
      }

      previousCheckOut = checkOut;
    });
    
    if (tripStart && tripEnd) {
      let transitNights = 0;
      if (Array.isArray(itinerary.days)) {
        itinerary.days.forEach(day => {
          if (Array.isArray(day.plan)) {
            day.plan.forEach(item => {
              const cat = String(item.category || "").toLowerCase();
              if (cat.includes("transport") || item.trainNumber || item.flightNumber) {
                 const tStart = timeToMinutes(item.startTime || (item.time ? String(item.time).split("-")[0] : null));
                 const tEnd = timeToMinutes(item.endTime || (item.time ? String(item.time).split("-")[1] : null));
                 // An overnight transport crosses midnight
                 if (tStart !== null && tEnd !== null && tEnd < tStart) {
                     transitNights++;
                 }
              }
            });
          }
        });
      }
      const expectedTotalNights = Math.round((tripEnd.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) - transitNights;
      if (totalNights !== expectedTotalNights) {
        addError("STAY_TOTAL_NIGHTS_MISMATCH", null, `Total stay nights (${totalNights}) do not equal expected trip nights (${expectedTotalNights}) after accounting for ${transitNights} transit nights.`);
      }
    }
  } else {
    addError("STAY_MISSING", null, `No stay segments found in itinerary.`);
  }

  // 3. Interest Alignment Validation
  let matchedInterests = 0;
  let meaningfulActivitiesCount = 0;
  const userInterests = Array.isArray(tripInput.interests) ? tripInput.interests.map(i => i.toLowerCase()) : [];
  
  if (userInterests.length > 0 && Array.isArray(itinerary.days)) {
    itinerary.days.forEach(day => {
      if (Array.isArray(day.plan)) {
        day.plan.forEach(item => {
          const actStr = String(item.activity || "").toLowerCase() + " " + String(item.category || "").toLowerCase() + " " + String(item.notes || "").toLowerCase();
          const cat = String(item.category || "").toLowerCase();
          
          const isNeutral = cat.includes("transport") || cat.includes("hotel") || cat.includes("food") || cat.includes("meal") || actStr.includes("check-in") || actStr.includes("check out") || actStr.includes("arrival") || actStr.includes("departure") || actStr.includes("travel");
          
          if (!isNeutral) {
            meaningfulActivitiesCount++;
            const matches = userInterests.some(interest => actStr.includes(interest));
            if (matches) matchedInterests++;
          }
        });
      }
    });
    
    if (meaningfulActivitiesCount > 0 && matchedInterests === 0) {
      addError("INTEREST_MISMATCH", null, `The itinerary generated ${meaningfulActivitiesCount} main activities, but NONE match the requested interests (${userInterests.join(", ")}). You MUST align activities with user interests.`);
    }
  }

  const normalizeLocation = (loc) => {
    if (!loc) return "";
    return String(loc).toLowerCase().replace(/[.,]/g, "").replace(/\b(india|state|district|city)\b/g, "").trim();
  };

  if (Array.isArray(itinerary.days)) {
    itinerary.days.forEach(day => {
      const dayNum = day.day;
      if (Array.isArray(day.plan)) {
        day.plan.forEach(item => {
          if (tripStart) {
            const currentDayDate = new Date(tripStart.getTime());
            currentDayDate.setDate(currentDayDate.getDate() + (dayNum - 1));
            const activeStays = getStaySegmentsForDate(itinerary, currentDayDate);
            const activeStay = activeStays.length > 0 ? activeStays[0] : null;
            
            if (activeStay && item.place) {
              const actPlace = normalizeLocation(item.place);
              const actName = String(item.activity).toLowerCase();
              const stayLoc = normalizeLocation(activeStay.location);
              const isTravelLeg = actName.includes("travel") || actName.includes("flight") || actName.includes("train");
              
              const actPlaceWords = actPlace.split(/\s+/).filter(w => w.length > 3);
              const stayLocWords = stayLoc.split(/\s+/).filter(w => w.length > 3);
              const hasCommonWord = actPlaceWords.some(w => stayLoc.includes(w)) || stayLocWords.some(w => actPlace.includes(w));
              
              if (!isTravelLeg && !actPlace.includes(stayLoc) && !stayLoc.includes(actPlace) && !hasCommonWord) {
                 let isFeasibleByTravelLeg = false;
                 if (Array.isArray(itinerary.travelLegs)) {
                   const currDateStr = currentDayDate.toISOString().split("T")[0];
                   for (const leg of itinerary.travelLegs) {
                     const isCorrectDate = (leg.date === currDateStr || !leg.date);
                     const legTo = normalizeLocation(leg.to);
                     const legFrom = normalizeLocation(leg.from);
                     
                     if (isCorrectDate && (legTo.includes(actPlace) || legFrom.includes(actPlace) || legTo.includes(stayLoc) || legFrom.includes(stayLoc))) {
                       isFeasibleByTravelLeg = true;
                     }
                   }
                 }
                 if (!isFeasibleByTravelLeg) {
                   addWarning("LOCATION_CONSISTENCY", dayNum, `Activity location "${item.place}" is geographically impossible without a valid prior travel leg from current stay location "${activeStay.location}".`);
                 }
              }
            }
          }
        });
      }
    });
  }

  // Run shared schedule conflict detection
  const tripForValidation = { ...itinerary, startDate: itinerary.startDate || tripInput.startDate };
  const conflicts = detectConflicts(tripForValidation);
  
  conflicts.forEach(c => {
    addWarning("SCHEDULE_CONFLICT", c.affectedDay, `Activity "${c.itemTitle}" ${c.reason}`);
  });

  return result;
};

module.exports = {
  validateItinerary,
  isImmutableTransport,
  timeToMinutes,
  minutesToTimeStr
};
