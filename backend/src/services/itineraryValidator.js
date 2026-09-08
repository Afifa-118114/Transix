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

  // Helper to parse time string like "09:30 AM" or "14:00" to minutes
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

  // Helper to parse dates
  const parseDate = (dStr) => {
    if (!dStr) return null;
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? null : d;
  };

  // Helper to normalize location strings
  const normalizeLocation = (loc) => {
    if (!loc) return "";
    return String(loc)
      .toLowerCase()
      .replace(/[.,]/g, "")
      .replace(/\b(india|state|district|city)\b/g, "")
      .trim();
  };

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
            
            // Check for double counting: if day 1 has a massive hotel cost, it might be the entire trip.
            // If it's a hotel/stay cost on Day 1 that's > 25% of the total budget, we assume it's an overall cost.
            const userBudget = parseFloat(tripInput.budget) || 0;
            if (day.day === 1 && (cat.includes("hotel") || cat.includes("stay") || act.includes("hotel")) && cost > (userBudget * 0.25)) {
              hasOverallHotelCost = true;
            }
            
            // If we detected an overall hotel cost on Day 1, we shouldn't count subsequent smaller hotel costs
            // to avoid double-counting.
            if (hasOverallHotelCost && day.day > 1 && (cat.includes("hotel") || cat.includes("stay") || act.includes("hotel"))) {
              // skip summing this to avoid double counting
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

      // Check math: checkOut - checkIn == nights
      const diffTime = checkOut.getTime() - checkIn.getTime();
      const calculatedNights = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (calculatedNights !== stay.nights) {
        addError("STAY_NIGHTS_MISMATCH", null, `Stay segment ${index + 1} has ${stay.nights} nights, but dates suggest ${calculatedNights} nights.`);
      }
      
      totalNights += calculatedNights;

      // Check contiguity
      if (previousCheckOut && previousCheckOut.getTime() !== checkIn.getTime()) {
        addError("STAY_DISCONTIGUOUS", null, `Stay segment ${index + 1} check-in (${checkIn.toISOString().split('T')[0]}) does not align with previous check-out (${previousCheckOut.toISOString().split('T')[0]}).`);
      }

      // Trip boundaries
      if (index === 0 && tripStart && checkIn.getTime() !== tripStart.getTime()) {
        addError("STAY_START_MISMATCH", null, `First stay check-in does not equal trip start date.`);
      }
      if (index === itinerary.staySegments.length - 1 && tripEnd && checkOut.getTime() !== tripEnd.getTime()) {
        addError("STAY_END_MISMATCH", null, `Last stay check-out does not equal trip end date.`);
      }

      previousCheckOut = checkOut;
    });
    
    if (tripStart && tripEnd) {
      const expectedTotalNights = Math.round((tripEnd.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24));
      if (totalNights !== expectedTotalNights) {
        addError("STAY_TOTAL_NIGHTS_MISMATCH", null, `Total stay nights (${totalNights}) do not equal expected trip nights (${expectedTotalNights}).`);
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
          
          // Neutral activities: don't count them against the interest check
          const isNeutral = cat.includes("transport") || cat.includes("hotel") || cat.includes("food") || cat.includes("meal") || actStr.includes("check-in") || actStr.includes("check out") || actStr.includes("arrival") || actStr.includes("departure") || actStr.includes("travel");
          
          if (!isNeutral) {
            meaningfulActivitiesCount++;
            const matches = userInterests.some(interest => actStr.includes(interest));
            if (matches) matchedInterests++;
          }
        });
      }
    });
    
    // If there are meaningful activities, but NONE of them match the user's explicit interests, throw a hard error to correct it.
    if (meaningfulActivitiesCount > 0 && matchedInterests === 0) {
      addError("INTEREST_MISMATCH", null, `The itinerary generated ${meaningfulActivitiesCount} main activities, but NONE match the requested interests (${userInterests.join(", ")}). You MUST align activities with user interests.`);
    }
  }

  // 4. Activity Schedule & Consistency Validation
  
  // Helper to find which stay segment covers a specific date
  const getActiveStaySegment = (currentDate) => {
    if (!currentDate || !Array.isArray(itinerary.staySegments)) return null;
    const currTime = currentDate.getTime();
    return itinerary.staySegments.find(stay => {
      const ci = parseDate(stay.checkIn);
      const co = parseDate(stay.checkOut);
      if (!ci || !co) return false;
      return currTime >= ci.getTime() && currTime <= co.getTime();
    });
  };
  if (Array.isArray(itinerary.days)) {
    itinerary.days.forEach(day => {
      const dayNum = day.day;
      if (Array.isArray(day.plan)) {
        let prevEnd = null;
        
        day.plan.forEach(item => {
          let startMin = null;
          let endMin = null;
          
          if (item.startTime && item.endTime) {
            startMin = timeToMinutes(item.startTime);
            endMin = timeToMinutes(item.endTime);
          } else if (item.time) {
            const parts = String(item.time).split("-").map(t => t.trim());
            if (parts.length > 0) startMin = timeToMinutes(parts[0]);
            if (parts.length > 1) endMin = timeToMinutes(parts[1]);
          }

          if (startMin !== null && endMin !== null) {
            if (startMin >= endMin) {
              addError("SCHEDULE_NEGATIVE", dayNum, `Activity "${item.activity}" ends before or when it starts (${item.startTime} - ${item.endTime}).`);
            }
            if (prevEnd !== null && startMin < prevEnd) {
              addError("SCHEDULE_OVERLAP", dayNum, `Activity "${item.activity}" starts at ${item.startTime}, overlapping with previous activity ending at ${minutesToTimeStr(prevEnd)}.`);
            } else if (prevEnd !== null && startMin - prevEnd < 15) {
              addWarning("SCHEDULE_TIGHT_BUFFER", dayNum, `Activity "${item.activity}" starts at ${item.startTime}, leaving less than 15 mins buffer from the previous activity.`);
            }
            prevEnd = endMin;
          }
          
          // Activity/Stay Consistency: Check if activity location matches the current stay segment or a travel leg
          if (tripStart) {
            const currentDayDate = new Date(tripStart.getTime());
            currentDayDate.setDate(currentDayDate.getDate() + (dayNum - 1));
            const activeStay = getActiveStaySegment(currentDayDate);
            
            if (activeStay && item.place) {
              const actPlace = normalizeLocation(item.place);
              const actName = String(item.activity).toLowerCase();
              const stayLoc = normalizeLocation(activeStay.location);
              const isTravelLeg = actName.includes("travel") || actName.includes("flight") || actName.includes("train");
              
              if (!isTravelLeg && !actPlace.includes(stayLoc) && !stayLoc.includes(actPlace)) {
                 // It doesn't match the stay location. Check if there's a valid travel leg to this place today.
                 let isFeasibleByTravelLeg = false;
                 if (Array.isArray(itinerary.travelLegs)) {
                   const currDateStr = currentDayDate.toISOString().split("T")[0];
                   
                   for (const leg of itinerary.travelLegs) {
                     const isCorrectDate = (leg.date === currDateStr || !leg.date);
                     const legTo = normalizeLocation(leg.to);
                     const legFrom = normalizeLocation(leg.from);
                     
                     if (isCorrectDate && (legTo.includes(actPlace) || legFrom.includes(actPlace) || legTo.includes(stayLoc) || legFrom.includes(stayLoc))) {
                       // We found a travel leg. Now we MUST chronologically validate it.
                       let legEndMin = timeToMinutes(leg.endTime);
                       // If we are arriving at this new place, the travel must end before the activity starts
                       if (legTo.includes(actPlace) && startMin !== null && legEndMin !== null) {
                         if (startMin < legEndMin) {
                           addError("SCHEDULE_OVERLAP", dayNum, `Activity "${item.activity}" starts at ${item.startTime}, which is before the travel to ${leg.to} ends at ${leg.endTime}.`);
                         } else {
                           isFeasibleByTravelLeg = true;
                         }
                       } else {
                         // If it's a departure or we lack exact time, we loosely accept it
                         isFeasibleByTravelLeg = true;
                       }
                     }
                   }
                 }
                 
                 if (!isFeasibleByTravelLeg) {
                   addError("LOCATION_CONSISTENCY", dayNum, `Activity location "${item.place}" is geographically impossible without a valid prior travel leg from current stay location "${activeStay.location}".`);
                 }
              }
            }
          }
        });
      }
    });
  }

  return result;
};

// Helper for generating overlap message
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

module.exports = {
  validateItinerary
};
