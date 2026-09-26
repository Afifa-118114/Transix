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
  
  // Active night stay: on or after check-in, and strictly before check-out
  const active = trip.staySegments.filter(stay => {
    const ci = parseDate(stay.checkIn);
    const co = parseDate(stay.checkOut);
    if (!ci || !co) return false;
    return currTime >= ci.getTime() && currTime < co.getTime();
  });

  if (active.length > 0) return active;

  // On check-out day (or final departure date), associate with the departing stay segment
  const checkoutStay = trip.staySegments.find(stay => {
    const co = parseDate(stay.checkOut);
    return co && currTime === co.getTime();
  });

  return checkoutStay ? [checkoutStay] : [];
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
      const tStart = timeToMinutes(item.startTime || (item.time ? String(item.time).split("-")[0] : null));
      const tEnd = timeToMinutes(item.endTime || (item.time ? String(item.time).split("-")[1] : null));

      let absStart = item._absStart !== undefined ? item._absStart : null;
      let absEnd = item._absEnd !== undefined ? item._absEnd : null;

      if (absStart === null && tStart !== null) {
        absStart = currentDayBaseOffset + tStart;
      }
      
      if (absEnd === null && tEnd !== null) {
        absEnd = currentDayBaseOffset + tEnd;
        if (absEnd < absStart) {
          absEnd += 1440; // Crosses midnight
        }
      }

      if (isDuplicateTransport(item, trip, currentDate)) {
        if (absEnd !== null) {
          prevAbsoluteEnd = Math.max(prevAbsoluteEnd, absEnd);
        }
        return;
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

const calculateCampusGroupRoomRate = (baseRate, requiredRooms = 1) => {
  if (!baseRate || baseRate <= 0) return 1800;

  if (baseRate <= 2500) {
    return Math.max(1200, Math.round(baseRate));
  }

  let discount = 0.25;
  if (requiredRooms >= 50) {
    discount = 0.50;
  } else if (requiredRooms >= 20) {
    discount = 0.40;
  } else if (requiredRooms >= 10) {
    discount = 0.30;
  }

  let discountedRate = Math.round(baseRate * (1 - discount));
  if (discountedRate > 2500) {
    discountedRate = 2500;
  }
  if (discountedRate < 1200) {
    discountedRate = Math.min(baseRate, 1200);
  }
  return discountedRate;
};

const getTripDurationDays = (trip) => {
  if (!trip) return 10;
  if (trip.startDate && trip.endDate) {
    const startStr = String(trip.startDate);
    const endStr = String(trip.endDate);
    const start = new Date(startStr + (startStr.includes('T') ? '' : 'T00:00:00Z'));
    const end = new Date(endStr + (endStr.includes('T') ? '' : 'T00:00:00Z'));
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (days > 0) return days;
    }
  }
  if (Array.isArray(trip.itinerary) && trip.itinerary.length > 0) return trip.itinerary.length;
  if (Array.isArray(trip.days) && trip.days.length > 0) return trip.days.length;
  if (trip.duration) {
    if (typeof trip.duration === "number" && trip.duration > 0) return trip.duration;
    const match = String(trip.duration).match(/(\d+)/);
    if (match) {
      const days = parseInt(match[1], 10);
      if (days > 0) return days;
    }
  }
  return trip?.tripCategory === "CAMPUS" ? 10 : 5;
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
  const isCampus = tripInput.tripCategory === "CAMPUS";
  let totalCost = 0;
  let totalHotelCost = 0;
  let hasOverallHotelCost = false;
  
  if (Array.isArray(itinerary.days)) {
    itinerary.days.forEach(day => {
      if (Array.isArray(day.plan)) {
        day.plan.forEach(item => {
          const cost = parseFloat(item.estimatedCost);
          if (!isNaN(cost) && cost > 0) {
            const cat = String(item.category || "").toLowerCase();
            const act = String(item.activity || "").toLowerCase();
            
            if (isCampus) {
              const inclusions = tripInput.campusConfig?.inclusions;
              const mealInclusions = tripInput.campusConfig?.mealInclusions;

              const isHotel = cat.includes("hotel") || cat.includes("stay") || act.includes("hotel") || (cat.includes("operational") && act.includes("check-in"));
              const isTravel = cat.includes("transport") || act.includes("travel") || act.includes("return");
              const isLocalTransport = cat.includes("local") || cat.includes("taxi") || cat.includes("cab");
              const isActivity = cat.includes("activity") || cat.includes("sightseeing") || cat.includes("visit");
              const isBreakfast = act.includes("breakfast");
              const isLunch = act.includes("lunch");
              const isDinner = act.includes("dinner");
              const isShopping = cat.includes("shopping") || act.includes("shopping");

              if (isHotel) {
                totalHotelCost += cost;
              }

              if (inclusions?.accommodation === false && isHotel) return;
              if (inclusions?.travel === false && isTravel) return;
              if (inclusions?.localTransport === false && isLocalTransport) return;
              if (inclusions?.activities === false && isActivity) return;
              if (mealInclusions?.breakfast === false && isBreakfast) return;
              if (mealInclusions?.lunch === false && isLunch) return;
              if (mealInclusions?.dinner === false && isDinner) return;
              if (isShopping || item.isExcluded || item.optional) return;

              totalCost += cost;
            } else {
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
          }
        });
      }
    });
  }
  
    // Check uncounted stay segment costs if not already in day plan
    if (!isCampus && totalHotelCost === 0 && Array.isArray(itinerary.staySegments)) {
      itinerary.staySegments.forEach(s => {
        const sCost = parseFloat(s.estimatedCost) || 0;
        if (sCost > 0) {
          totalHotelCost += sCost;
          totalCost += sCost;
        }
      });
    }

    // Check uncounted transport leg costs if not already in day plan
    let hasTransportInPlan = false;
    if (Array.isArray(itinerary.days)) {
      itinerary.days.forEach(day => {
        if (Array.isArray(day.plan)) {
          if (day.plan.some(p => {
            const cat = String(p.category || "").toLowerCase();
            const act = String(p.activity || p.name || "").toLowerCase();
            return (cat.includes("transport") || act.includes("travel") || p.trainNumber || p.flightNumber) && parseFloat(p.estimatedCost) > 0;
          })) {
            hasTransportInPlan = true;
          }
        }
      });
    }
    if (!isCampus && !hasTransportInPlan && Array.isArray(itinerary.travelLegs)) {
      itinerary.travelLegs.forEach(leg => {
        const tCost = parseFloat(leg.estimatedCost) || 0;
        if (tCost > 0) totalCost += tCost;
      });
    }
  
  if (isCampus) {
    const budgetPerStudent = parseFloat(tripInput.campusConfig?.budgetPerStudent) || parseFloat(tripInput.budget) || 0;
    const expectedStudents = parseInt(tripInput.campusConfig?.expectedParticipants, 10) || parseInt(tripInput.travelers, 10) || 1;
    const totalGroupBudget = budgetPerStudent * expectedStudents;

    const tripDurationDays = getTripDurationDays(tripInput);
    const accommodationAllocationPerStudent = Math.min(
      budgetPerStudent > 0 ? budgetPerStudent : 10000,
      tripDurationDays * 1000,
      10000
    );
    const accommodationGroupAllocation = accommodationAllocationPerStudent * expectedStudents;

    // Accommodation Allocation Check (Separate from overall trip budget)
    const inclusions = tripInput.campusConfig?.inclusions;
    if (inclusions?.accommodation !== false && accommodationGroupAllocation > 0 && totalHotelCost > accommodationGroupAllocation) {
      const diff = totalHotelCost - accommodationGroupAllocation;
      const perStudentDiff = Math.round(diff / expectedStudents);
      addError(
        "ACCOMMODATION_BUDGET_EXCEEDED",
        null,
        `Campus accommodation allocation exceeded. Allocation per student: ₹${accommodationAllocationPerStudent.toLocaleString('en-IN')}, Estimated accommodation per student: ₹${Math.round(totalHotelCost / expectedStudents).toLocaleString('en-IN')}, Over by: ₹${perStudentDiff.toLocaleString('en-IN')} / student (Group over by: ₹${diff.toLocaleString('en-IN')}). Accommodation must stay within the allocation ceiling.`
      );
    }

    // Overall Campus Trip Budget Check
    if (totalGroupBudget > 0 && totalCost > totalGroupBudget) {
      const diff = totalCost - totalGroupBudget;
      addError(
        "BUDGET_EXCEEDED",
        null,
        `Campus Trip budget exceeded. Budget per student: ₹${budgetPerStudent.toLocaleString('en-IN')}, Expected students: ${expectedStudents}, Total group budget: ₹${totalGroupBudget.toLocaleString('en-IN')}, Estimated group cost: ₹${totalCost.toLocaleString('en-IN')}, Difference: ₹${diff.toLocaleString('en-IN')}. Planners must stay within the budget.`
      );
    }
  } else {
    const userBudget = parseFloat(tripInput.budget) || 0;
    if (userBudget > 0 && totalCost > userBudget) {
      addError("BUDGET_EXCEEDED", null, `Total estimated cost (${totalCost}) strictly exceeds the maximum user budget (${userBudget}). Planners must stay within the budget.`);
    }
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

      previousCheckOut = checkOut;
    });

    if (tripStart && tripEnd) {
      const totalTripNights = Math.round((tripEnd.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24));

      // Collect all intercity/overnight transport candidates from travelLegs and day plans
      const transportCandidates = [];
      const seenLegKeys = new Set();

      const addCandidate = (leg, defaultDate) => {
        if (!leg) return;
        const depDate = leg.departureDate || leg.date || defaultDate;
        let arrDate = leg.arrivalDate || null;
        const sTime = leg.departureTime || leg.startTime || (leg.time ? String(leg.time).split("-")[0] : null);
        const eTime = leg.arrivalTime || leg.endTime || (leg.time ? String(leg.time).split("-")[1] : null);
        const sMin = timeToMinutes(sTime);
        const eMin = timeToMinutes(eTime);

        if (!arrDate && depDate) {
          if (leg.durationMinutes) {
            const daysAdded = Math.floor(((sMin || 0) + leg.durationMinutes) / 1440);
            const depDateObj = new Date(depDate + (depDate.includes('T') ? '' : 'T00:00:00Z'));
            arrDate = new Date(depDateObj.getTime() + daysAdded * 86400000).toISOString().split("T")[0];
          } else if (sMin !== null && eMin !== null && eMin < sMin) {
            const depDateObj = new Date(depDate + (depDate.includes('T') ? '' : 'T00:00:00Z'));
            arrDate = new Date(depDateObj.getTime() + 86400000).toISOString().split("T")[0];
          } else {
            arrDate = depDate;
          }
        }

        const isOvernight = Boolean(leg.isOvernight || (depDate && arrDate && depDate !== arrDate) || (sMin !== null && eMin !== null && eMin < sMin));
        const key = `${depDate}_${sTime}_${arrDate}_${eTime}_${leg.trainNumber || leg.flightNumber || leg.mode || ''}`;
        if (!seenLegKeys.has(key)) {
          seenLegKeys.add(key);
          transportCandidates.push({
            name: leg.name || leg.activity || leg.mode || "Transport",
            departureDate: depDate,
            departureTime: sTime,
            departureDateTime: leg.departureDateTime || (depDate && sTime ? `${depDate}T${sTime}` : null),
            arrivalDate: arrDate,
            arrivalTime: eTime,
            arrivalDateTime: leg.arrivalDateTime || (arrDate && eTime ? `${arrDate}T${eTime}` : null),
            startTime: sTime,
            endTime: eTime,
            durationMinutes: leg.durationMinutes,
            isOvernight
          });
        }
      };

      if (Array.isArray(itinerary.travelLegs)) {
        itinerary.travelLegs.forEach(leg => addCandidate(leg, leg.date));
      }

      if (Array.isArray(itinerary.days)) {
        itinerary.days.forEach(day => {
          const dayNum = day.day || 1;
          const dayDate = getDateForDay({ startDate: tripInput.startDate || itinerary.startDate }, dayNum);
          const dayDateStr = dayDate ? dayDate.toISOString().split("T")[0] : null;

          if (Array.isArray(day.plan)) {
            day.plan.forEach(item => {
              const cat = String(item.category || "").toLowerCase();
              if (cat.includes("transport") || item.trainNumber || item.flightNumber) {
                addCandidate(item, dayDateStr);
              }
            });
          }
        });
      }

      // Check whether a transport leg covers a given calendar overnight (nightDateStr to nightDateStr + 1 day)
      const legCoversNight = (leg, nightDateStr, nextDateStr) => {
        if (!leg.isOvernight) return false;
        if (leg.departureDate && leg.arrivalDate) {
          return leg.departureDate <= nightDateStr && leg.arrivalDate >= nextDateStr;
        }
        return leg.departureDate === nightDateStr;
      };

      // Check each calendar night from tripStart to tripEnd
      let totalAccommodationNights = 0;
      let actualTransitNights = 0;

      for (let i = 0; i < totalTripNights; i++) {
        const nightTime = tripStart.getTime() + i * 24 * 60 * 60 * 1000;
        const nightDate = new Date(nightTime);
        const nightDateStr = nightDate.toISOString().split("T")[0];
        const nextDateStr = new Date(nightTime + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

        // Is this night covered by any stay segment?
        const coveringStays = itinerary.staySegments.filter(stay => {
          const ci = parseDate(stay.checkIn);
          const co = parseDate(stay.checkOut);
          if (!ci || !co) return false;
          return ci.getTime() <= nightTime && nightTime < co.getTime();
        });

        if (coveringStays.length > 1) {
          addError("STAY_OVERLAP", null, `Multiple stay segments cover night ${nightDateStr} (${coveringStays.map(s => s.location).join(", ")}).`);
        } else if (coveringStays.length === 1) {
          totalAccommodationNights++;
        } else {
          // Not covered by stay: check if covered by overnight transport
          const hasOvernightTransit = transportCandidates.some(leg => legCoversNight(leg, nightDateStr, nextDateStr));
          if (hasOvernightTransit) {
            actualTransitNights++;
          }
        }
      }

      // Diagnostic logging as requested by user
      console.log("[Stay Debug]", {
        tripStart: tripInput.startDate,
        tripEnd: tripInput.endDate,
        staySegments: itinerary.staySegments.map(s => ({
          location: s.location,
          checkIn: s.checkIn,
          checkOut: s.checkOut,
          nights: s.nights
        })),
        totalTripNights,
        accommodationNights: totalAccommodationNights,
        transitNights: actualTransitNights
      });

      console.log(
        "[Transit Night Debug]",
        transportCandidates.filter(t => t.isOvernight).map(t => ({
          title: t.name,
          departureDate: t.departureDate,
          arrivalDate: t.arrivalDate,
          startTime: t.startTime,
          endTime: t.endTime
        }))
      );

      // Check start date alignment:
      // If Night 0 is an overnight transit night, first stay begins on Day 2
      const firstStay = itinerary.staySegments[0];
      const firstStayIn = parseDate(firstStay.checkIn);
      const day1Str = tripInput.startDate;
      const day2Str = new Date(tripStart.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const isNight0Transit = transportCandidates.some(leg => legCoversNight(leg, day1Str, day2Str));

      if (isNight0Transit) {
        const expectedFirstIn = new Date(tripStart.getTime() + 24 * 60 * 60 * 1000);
        if (firstStayIn && firstStayIn.getTime() !== expectedFirstIn.getTime() && firstStayIn.getTime() !== tripStart.getTime()) {
          addError("STAY_START_MISMATCH", null, `First stay check-in (${firstStay.checkIn}) must be ${expectedFirstIn.toISOString().split('T')[0]} following overnight travel on trip start date.`);
        }
      } else {
        if (firstStayIn && firstStayIn.getTime() !== tripStart.getTime()) {
          addError("STAY_START_MISMATCH", null, `First stay check-in does not equal trip start date.`);
        }
      }

      // Check end date alignment:
      // If last night is an overnight return transit night, last stay ends on departure date
      const lastStay = itinerary.staySegments[itinerary.staySegments.length - 1];
      const lastStayOut = parseDate(lastStay.checkOut);
      const lastNightStr = new Date(tripEnd.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const tripEndStr = tripInput.endDate;
      const isLastNightTransit = transportCandidates.some(leg => legCoversNight(leg, lastNightStr, tripEndStr));

      if (isLastNightTransit) {
        const expectedLastOut = new Date(tripEnd.getTime() - 24 * 60 * 60 * 1000);
        if (lastStayOut && lastStayOut.getTime() !== expectedLastOut.getTime()) {
          addError("STAY_END_MISMATCH", null, `Last stay check-out (${lastStay.checkOut}) must be ${expectedLastOut.toISOString().split('T')[0]} prior to return overnight travel arriving on trip end date.`);
        }
      } else {
        if (lastStayOut && lastStayOut.getTime() !== tripEnd.getTime()) {
          addError("STAY_END_MISMATCH", null, `Last stay check-out does not equal trip end date.`);
        }
      }

      // Total nights verification:
      // totalAccommodationNights + actualTransitNights must equal totalTripNights
      if (totalAccommodationNights + actualTransitNights !== totalTripNights) {
        addError(
          "STAY_TOTAL_NIGHTS_MISMATCH",
          null,
          `Total stay nights (${totalAccommodationNights}) do not equal expected trip nights (${totalTripNights}) after accounting for ${actualTransitNights} transit nights.`
        );
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
    if (c.type === "OVERLAP") {
      addError("SCHEDULE_CONFLICT", c.affectedDay, `Activity "${c.itemTitle}" ${c.reason}`);
    } else {
      addWarning("SCHEDULE_CONFLICT", c.affectedDay, `Activity "${c.itemTitle}" ${c.reason}`);
    }
  });

  return result;
};

module.exports = {
  validateItinerary,
  isImmutableTransport,
  timeToMinutes,
  minutesToTimeStr,
  getTripDurationDays,
  calculateCampusGroupRoomRate,
  detectConflicts
};
