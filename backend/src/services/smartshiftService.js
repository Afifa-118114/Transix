const { validateItinerary, isImmutableTransport } = require("./itineraryValidator");
const { searchPlaces } = require("./placesService");

function timeToMinutes(timeStr) {
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
}

function minutesToTimeStr(minutes) {
  if (typeof minutes !== "number" || isNaN(minutes)) return "09:00 AM";
  const normalized = ((minutes % 1440) + 1440) % 1440;
  let hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const pad = (n) => (n < 10 ? `0${n}` : n);
  return `${pad(displayHours)}:${pad(mins)} ${ampm}`;
}

const NEARBY_REPLACEMENTS = [
  {
    name: "Local Spice Market & Tea Lounge",
    activity: "Local Spice Market & Tea Lounge",
    category: "Shopping",
    durationMinutes: 90,
    estimatedCost: 150,
    price: 150,
    description: "Authentic local market tour with organic spice tastings.",
  },
  {
    name: "Botanical Gardens & Heritage Walk",
    activity: "Botanical Gardens & Heritage Walk",
    category: "Sightseeing",
    durationMinutes: 90,
    estimatedCost: 200,
    price: 200,
    description: "Scenic botanical gardens with curated floral paths and covered gazebos.",
  },
  {
    name: "Indoor Cultural Museum & Art Gallery",
    activity: "Indoor Cultural Museum & Art Gallery",
    category: "Museum",
    durationMinutes: 90,
    estimatedCost: 300,
    price: 300,
    description: "State-of-the-art climate-controlled gallery featuring regional heritage.",
  },
];

// Stable Item Finder: Matches by ID or Title/Activity fallback
function findItemLocation(itinerary, itemId, itemObject = null) {
  const targetId = String(itemId || itemObject?.id || itemObject?._id || "").toLowerCase().trim();
  const targetName = String(itemObject?.name || itemObject?.activity || itemObject?.title || "").toLowerCase().trim();

  // 1. Strict ID Match
  if (targetId) {
    for (let dIdx = 0; dIdx < itinerary.length; dIdx++) {
      const day = itinerary[dIdx];
      if (!day.plan) continue;
      for (let pIdx = 0; pIdx < day.plan.length; pIdx++) {
        const p = day.plan[pIdx];
        const pId = String(p.id || p._id || "").toLowerCase().trim();
        if (pId && (pId === targetId || pId.includes(targetId) || targetId.includes(pId))) {
          return { affectedItem: p, originalDayIndex: dIdx, originalItemIndex: pIdx };
        }
      }
    }
  }

  // 2. Title/Name Fallback Match
  if (targetName) {
    for (let dIdx = 0; dIdx < itinerary.length; dIdx++) {
      const day = itinerary[dIdx];
      if (!day.plan) continue;
      for (let pIdx = 0; pIdx < day.plan.length; pIdx++) {
        const p = day.plan[pIdx];
        const pName = String(p.name || p.activity || "").toLowerCase().trim();
        if (pName && (pName === targetName || pName.includes(targetName) || targetName.includes(pName))) {
          return { affectedItem: p, originalDayIndex: dIdx, originalItemIndex: pIdx };
        }
      }
    }
  }

  // 3. Fallback first activity of target day if day index provided
  return { affectedItem: null, originalDayIndex: -1, originalItemIndex: -1 };
}

const generateAlternatives = async (trip, itemId, disruptionType = "ACTIVITY_UNAVAILABLE", itemHint = null) => {
  if (!trip || !trip.itinerary) throw new Error("Invalid trip object.");

  const { affectedItem, originalDayIndex, originalItemIndex } = findItemLocation(trip.itinerary, itemId, itemHint);

  if (!affectedItem) {
    throw new Error("Affected itinerary item no longer exists in current trip.");
  }

  const isMandatory = isImmutableTransport(affectedItem) || String(affectedItem.activity || "").toLowerCase().includes("check");
  const duration = affectedItem.durationMinutes || 90;
  const startOfDayMinutes = 9 * 60; // 09:00 AM
  const endOfDayMinutes = 22 * 60; // 10:00 PM
  const travelBuffer = 30; // 30 mins buffer

  const originalPlan = trip.itinerary[originalDayIndex].plan || [];
  
  // Downstream Impact Analysis
  const downstreamImpacts = [];
  let travelConflict = false;
  let affectedStartMin = timeToMinutes(affectedItem.startTime);

  if (disruptionType === "TRAIN_DELAYED_90M" || disruptionType === "TRANSPORT_DELAYED") {
    affectedStartMin = (affectedStartMin || 9 * 60) + 90;
  }

  const affectedEndMin = (affectedStartMin || 9 * 60) + duration;

  for (let i = originalItemIndex + 1; i < originalPlan.length; i++) {
    const nextItem = originalPlan[i];
    const nextStart = timeToMinutes(nextItem.startTime);

    if (nextStart !== null && nextStart < affectedEndMin) {
      downstreamImpacts.push({
        id: nextItem.id || nextItem._id,
        name: nextItem.name || nextItem.activity,
        startTime: nextItem.startTime,
        endTime: nextItem.endTime,
        conflictType: "TIME_OVERLAP",
        overlapMinutes: affectedEndMin - nextStart,
        message: `Overlaps with ${affectedItem.name || affectedItem.activity} window.`
      });
    } else if (nextStart !== null && nextStart < affectedEndMin + travelBuffer) {
      travelConflict = true;
      downstreamImpacts.push({
        id: nextItem.id || nextItem._id,
        name: nextItem.name || nextItem.activity,
        startTime: nextItem.startTime,
        endTime: nextItem.endTime,
        conflictType: "TRAVEL_BUFFER_VIOLATION",
        message: `Violates 30-minute travel buffer after ${affectedItem.name || affectedItem.activity}.`
      });
    }
  }

  const alternatives = [];

  const buildProposedTimeline = (targetDayIdx, movedOrReplacedItem, actionType) => {
    const dayPlan = JSON.parse(JSON.stringify(trip.itinerary[targetDayIdx].plan || []));
    if (actionType === "REMOVE") {
      return dayPlan.filter((p) => p.id !== affectedItem.id && p._id?.toString() !== affectedItem._id?.toString() && (p.name || p.activity) !== (affectedItem.name || affectedItem.activity));
    }
    const filteredPlan = dayPlan.filter((p) => p.id !== affectedItem.id && p._id?.toString() !== affectedItem._id?.toString() && (p.name || p.activity) !== (affectedItem.name || affectedItem.activity));
    
    const startMin = timeToMinutes(movedOrReplacedItem.startTime);
    let insertIdx = filteredPlan.length;
    for (let i = 0; i < filteredPlan.length; i++) {
      const existingStart = timeToMinutes(filteredPlan[i].startTime);
      if (existingStart !== null && existingStart > startMin) {
        insertIdx = i;
        break;
      }
    }
    filteredPlan.splice(insertIdx, 0, movedOrReplacedItem);
    return filteredPlan;
  };

  // Option 1: Shift Later / Earlier Today
  if (!isMandatory) {
    const origPlanNoItem = originalPlan.filter((i) => i.id !== affectedItem.id && (i.name || i.activity) !== (affectedItem.name || affectedItem.activity));
    let prevEnd = startOfDayMinutes;

    origPlanNoItem.forEach((item) => {
      const itemStart = timeToMinutes(item.startTime);
      const gap = itemStart - prevEnd;
      if (gap >= duration + travelBuffer * 2 && alternatives.length === 0) {
        const newStart = prevEnd + travelBuffer;
        const newEnd = newStart + duration;
        const movedItem = {
          ...affectedItem,
          startTime: minutesToTimeStr(newStart),
          endTime: minutesToTimeStr(newEnd),
          time: `${minutesToTimeStr(newStart)} - ${minutesToTimeStr(newEnd)}`,
          isShifted: true,
        };

        const proposedTimeline = buildProposedTimeline(originalDayIndex, movedItem, "SHIFT");

        alternatives.push({
          id: `opt-shift-today-${Date.now()}`,
          title: `Shift slot today (${movedItem.startTime} - ${movedItem.endTime})`,
          impactLevel: "LOW IMPACT",
          impactExplanation: "Only the activity time changes; all other bookings remain unchanged.",
          reason: "Safely reschedules the activity to an open slot on the same day without schedule conflicts.",
          actionType: "SHIFT",
          changes: {
            fromDay: originalDayIndex + 1,
            toDay: originalDayIndex + 1,
            fromStartTime: affectedItem.startTime,
            fromEndTime: affectedItem.endTime,
            toStartTime: movedItem.startTime,
            toEndTime: movedItem.endTime,
          },
          costImpact: { diff: 0, text: "No additional cost" },
          proposedTimeline,
          _targetDayIndex: originalDayIndex,
          _startMin: newStart,
          _actionType: "SHIFT",
          _tripUpdatedAt: trip.updatedAt,
        });
      }
      prevEnd = timeToMinutes(item.endTime) || (itemStart ? itemStart + (item.durationMinutes || 90) : prevEnd + 90);
    });

    if (endOfDayMinutes - prevEnd >= duration + travelBuffer && alternatives.length === 0) {
      const newStart = prevEnd + travelBuffer;
      const newEnd = newStart + duration;
      const movedItem = {
        ...affectedItem,
        startTime: minutesToTimeStr(newStart),
        endTime: minutesToTimeStr(newEnd),
        time: `${minutesToTimeStr(newStart)} - ${minutesToTimeStr(newEnd)}`,
        isShifted: true,
      };

      const proposedTimeline = buildProposedTimeline(originalDayIndex, movedItem, "SHIFT");

      alternatives.push({
        id: `opt-shift-later-today-${Date.now()}`,
        title: `Shift to later slot today (${movedItem.startTime} - ${movedItem.endTime})`,
        impactLevel: "LOW IMPACT",
        impactExplanation: "Only the activity time changes; all other bookings remain unchanged.",
        reason: "Safely reschedules the activity to an evening slot today.",
        actionType: "SHIFT",
        changes: {
          fromDay: originalDayIndex + 1,
          toDay: originalDayIndex + 1,
          fromStartTime: affectedItem.startTime,
          fromEndTime: affectedItem.endTime,
          toStartTime: movedItem.startTime,
          toEndTime: movedItem.endTime,
        },
        costImpact: { diff: 0, text: "No additional cost" },
        proposedTimeline,
        _targetDayIndex: originalDayIndex,
        _startMin: newStart,
        _actionType: "SHIFT",
        _tripUpdatedAt: trip.updatedAt,
      });
    }
  }

  // Option 2: Move to Another Day
  if (!isMandatory && originalDayIndex + 1 < trip.itinerary.length) {
    const nextDayIdx = originalDayIndex + 1;
    const nextPlan = trip.itinerary[nextDayIdx].plan || [];
    let nPrevEnd = startOfDayMinutes;

    nextPlan.forEach((item) => {
      const itemStart = timeToMinutes(item.startTime);
      const gap = itemStart - nPrevEnd;
      if (gap >= duration + travelBuffer * 2 && alternatives.length < 2) {
        const newStart = nPrevEnd + travelBuffer;
        const newEnd = newStart + duration;
        const movedItem = {
          ...affectedItem,
          startTime: minutesToTimeStr(newStart),
          endTime: minutesToTimeStr(newEnd),
          time: `${minutesToTimeStr(newStart)} - ${minutesToTimeStr(newEnd)}`,
          isShifted: true,
        };

        const proposedTimeline = buildProposedTimeline(nextDayIdx, movedItem, "MOVE_DAY");

        alternatives.push({
          id: `opt-move-day-${nextDayIdx + 1}-${Date.now()}`,
          title: `Move to Day ${nextDayIdx + 1} (${movedItem.startTime} - ${movedItem.endTime})`,
          impactLevel: "MEDIUM IMPACT",
          impactExplanation: `Activity moves to Day ${nextDayIdx + 1} and fits without timing conflicts.`,
          reason: `Safely shifts activity to Day ${nextDayIdx + 1} open slot.`,
          actionType: "MOVE_DAY",
          changes: {
            fromDay: originalDayIndex + 1,
            toDay: nextDayIdx + 1,
            fromStartTime: affectedItem.startTime,
            fromEndTime: affectedItem.endTime,
            toStartTime: movedItem.startTime,
            toEndTime: movedItem.endTime,
          },
          costImpact: { diff: 0, text: "No additional cost" },
          proposedTimeline,
          _targetDayIndex: nextDayIdx,
          _startMin: newStart,
          _actionType: "MOVE_DAY",
          _tripUpdatedAt: trip.updatedAt,
        });
      }
      nPrevEnd = timeToMinutes(item.endTime) || (itemStart ? itemStart + (item.durationMinutes || 90) : nPrevEnd + 90);
    });

    if (endOfDayMinutes - nPrevEnd >= duration + travelBuffer && alternatives.length < 2) {
      const newStart = nPrevEnd + travelBuffer;
      const newEnd = newStart + duration;
      const movedItem = {
        ...affectedItem,
        startTime: minutesToTimeStr(newStart),
        endTime: minutesToTimeStr(newEnd),
        time: `${minutesToTimeStr(newStart)} - ${minutesToTimeStr(newEnd)}`,
        isShifted: true,
      };

      const proposedTimeline = buildProposedTimeline(nextDayIdx, movedItem, "MOVE_DAY");

      alternatives.push({
        id: `opt-move-end-day-${nextDayIdx + 1}-${Date.now()}`,
        title: `Move to end of Day ${nextDayIdx + 1} (${movedItem.startTime} - ${movedItem.endTime})`,
        impactLevel: "MEDIUM IMPACT",
        impactExplanation: `Activity moves to Day ${nextDayIdx + 1} evening without schedule conflict.`,
        reason: `Reschedules activity to Day ${nextDayIdx + 1} evening slot.`,
        actionType: "MOVE_DAY",
        changes: {
          fromDay: originalDayIndex + 1,
          toDay: nextDayIdx + 1,
          fromStartTime: affectedItem.startTime,
          fromEndTime: affectedItem.endTime,
          toStartTime: movedItem.startTime,
          toEndTime: movedItem.endTime,
        },
        costImpact: { diff: 0, text: "No additional cost" },
        proposedTimeline,
        _targetDayIndex: nextDayIdx,
        _startMin: newStart,
        _actionType: "MOVE_DAY",
        _tripUpdatedAt: trip.updatedAt,
      });
    }
  }

  // Option 3: Replace with Nearby Indoor / Weatherproof Alternative
  if (!isMandatory) {
    let replacementCatalog = NEARBY_REPLACEMENTS[0];
    const isWeather = disruptionType === "WEATHER" || disruptionType === "WEATHER_CLOSURE";

    if (isWeather) {
       try {
         const indoorPlaces = await searchPlaces(trip.destination || "Destination", "Indoor museum or gallery");
         if (indoorPlaces && indoorPlaces.length > 0) {
           const p = indoorPlaces[0];
           replacementCatalog = {
              name: p.displayName?.text || "Indoor Cultural Venue",
              activity: p.displayName?.text || "Indoor Cultural Venue",
              category: "Indoor Museum",
              durationMinutes: affectedItem.durationMinutes || 90,
              estimatedCost: p.priceLevel ? 300 : (Number(affectedItem.estimatedCost) || 0),
              price: p.priceLevel ? 300 : (Number(affectedItem.price) || 0),
              description: "Weather-safe indoor alternative matching schedule.",
           };
         }
       } catch(e) {
         console.warn("Failed to fetch indoor alternative, using fallback:", e.message);
       }
    }

    const origCost = Number(affectedItem.price) || Number(affectedItem.estimatedCost) || 0;
    const newCost = replacementCatalog.estimatedCost;
    const diff = newCost - origCost;
    const costText = diff === 0 ? "No cost difference" : diff > 0 ? `+₹${diff} additional cost` : `-₹${Math.abs(diff)} savings`;

    const replacedItem = {
      ...affectedItem,
      name: replacementCatalog.name,
      activity: replacementCatalog.activity,
      category: replacementCatalog.category,
      estimatedCost: newCost,
      price: newCost,
      notes: replacementCatalog.description,
      isReplaced: true,
    };

    const proposedTimeline = buildProposedTimeline(originalDayIndex, replacedItem, "REPLACE");

    alternatives.push({
      id: `opt-replace-${Date.now()}`,
      title: `Replace with ${replacementCatalog.name}`,
      impactLevel: "LOW IMPACT",
      impactExplanation: isWeather ? "Replaces weather-exposed outdoor venue with a safe indoor alternative at the same time." : "Replaces venue with a nearby similar experience within current schedule window.",
      reason: isWeather ? "Safe indoor alternative." : "Preserves current timing while substituting a safe, highly rated nearby venue.",
      actionType: "REPLACE",
      changes: {
        fromDay: originalDayIndex + 1,
        toDay: originalDayIndex + 1,
        fromStartTime: affectedItem.startTime,
        fromEndTime: affectedItem.endTime,
        toStartTime: affectedItem.startTime,
        toEndTime: affectedItem.endTime,
        replacedWith: replacementCatalog.name,
      },
      costImpact: { diff, text: costText },
      proposedTimeline,
      _targetDayIndex: originalDayIndex,
      _startMin: timeToMinutes(affectedItem.startTime) || 10 * 60,
      _actionType: "REPLACE",
      _replacementItem: replacedItem,
      _tripUpdatedAt: trip.updatedAt,
    });
  }

  // Option 4: Remove / Skip Activity
  if (!isMandatory) {
    const origCost = Number(affectedItem.price) || Number(affectedItem.estimatedCost) || 0;
    const costText = origCost > 0 ? `-₹${origCost} estimated refund/savings` : "No cost change";

    const proposedTimeline = buildProposedTimeline(originalDayIndex, null, "REMOVE");

    alternatives.push({
      id: `opt-remove-${Date.now()}`,
      title: `Skip/Remove ${affectedItem.name || affectedItem.activity}`,
      impactLevel: "HIGH IMPACT",
      impactExplanation: "Removes activity from itinerary. Adjusts free time for remaining items.",
      reason: "Cancels this activity window to resolve schedule disruption completely.",
      actionType: "REMOVE",
      changes: {
        fromDay: originalDayIndex + 1,
        toDay: originalDayIndex + 1,
        fromStartTime: affectedItem.startTime,
        fromEndTime: affectedItem.endTime,
        toStartTime: "—",
        toEndTime: "—",
      },
      costImpact: { diff: -origCost, text: costText },
      proposedTimeline,
      _targetDayIndex: originalDayIndex,
      _actionType: "REMOVE",
      _tripUpdatedAt: trip.updatedAt,
    });
  }

  const noSafeOption = alternatives.length === 0 || isMandatory;

  return {
    disruptionDetected: true,
    disruptionType: disruptionType,
    isMandatory: isMandatory,
    affectedItem: {
      id: affectedItem.id || affectedItem._id,
      itemId: affectedItem.id || affectedItem._id,
      title: affectedItem.name || affectedItem.activity,
      day: originalDayIndex + 1,
      startTime: affectedItem.startTime,
      endTime: affectedItem.endTime,
      category: affectedItem.category || "Activity",
    },
    primaryImpact: isMandatory
      ? "Transport or check-in booking requires manual operator intervention."
      : "Activity unavailable during the scheduled window.",
    downstreamImpactCount: downstreamImpacts.length,
    downstreamImpactDetails: downstreamImpacts,
    travelConflict: travelConflict,
    noSafeOption: noSafeOption,
    reasons: noSafeOption
      ? [
          isMandatory
            ? "Immutable transport legs (train/flight/check-in) cannot be automatically shifted."
            : "Remaining time window in the day is insufficient for activity duration.",
          "Alternative slots conflict with existing fixed itinerary items.",
          "Required travel buffer (30 mins) cannot be satisfied.",
        ]
      : [],
    manualActions: [
      { id: "CHOOSE_DAY", label: "Choose another day" },
      { id: "REMOVE_ACTIVITY", label: "Remove activity" },
      { id: "EDIT_SCHEDULE", label: "Edit schedule" },
      { id: "VIEW_NEARBY", label: "View nearby alternatives" },
      { id: "KEEP_PLAN", label: "Keep current plan" },
    ],
    originalTimeline: originalPlan,
    alternatives: alternatives.slice(0, 4),
  };
};

const applyAlternative = (trip, itemId, alternative) => {
  if (!trip || !trip.itinerary) throw new Error("Invalid trip object.");
  if (!itemId) throw new Error("itemId is required.");
  if (!alternative) throw new Error("alternative configuration is required.");

  // Stale data protection
  if (alternative._tripUpdatedAt && trip.updatedAt) {
    const altTime = new Date(alternative._tripUpdatedAt).getTime();
    const tripTime = new Date(trip.updatedAt).getTime();
    if (tripTime > altTime) {
      throw new Error("This recovery plan is outdated because your itinerary changed. Recalculate SmartShift?");
    }
  }

  const { affectedItem, originalDayIndex, originalItemIndex } = findItemLocation(trip.itinerary, itemId, alternative.affectedItem);

  if (originalDayIndex === -1 || !affectedItem) {
    throw new Error("Affected itinerary item no longer exists in current trip.");
  }

  const clonedTrip = JSON.parse(JSON.stringify(trip));
  const previousItinerary = JSON.parse(JSON.stringify(trip.itinerary));

  const actionType = alternative._actionType || alternative.actionType || "SHIFT";
  const targetDayIdx = alternative._targetDayIndex !== undefined ? alternative._targetDayIndex : originalDayIndex;

  if (actionType === "REMOVE") {
    clonedTrip.itinerary[originalDayIndex].plan.splice(originalItemIndex, 1);
  } else if (actionType === "REPLACE") {
    const replacementObj = alternative._replacementItem || {
      name: alternative.changes?.replacedWith || NEARBY_REPLACEMENTS[0].name,
      activity: alternative.changes?.replacedWith || NEARBY_REPLACEMENTS[0].activity,
      category: "Shopping",
      startTime: affectedItem.startTime,
      endTime: affectedItem.endTime,
      time: `${affectedItem.startTime} - ${affectedItem.endTime}`,
      estimatedCost: 150,
      price: 150,
    };
    clonedTrip.itinerary[originalDayIndex].plan[originalItemIndex] = {
      ...affectedItem,
      ...replacementObj,
      id: affectedItem.id || affectedItem._id || `act-${Date.now()}`,
    };
  } else {
    // SHIFT or MOVE_DAY
    const movedItem = clonedTrip.itinerary[originalDayIndex].plan.splice(originalItemIndex, 1)[0];
    const duration = movedItem.durationMinutes || 90;
    const startMin = alternative._startMin || 10 * 60;
    const endMin = startMin + duration;

    movedItem.startTime = minutesToTimeStr(startMin);
    movedItem.endTime = minutesToTimeStr(endMin);
    movedItem.time = `${movedItem.startTime} - ${movedItem.endTime}`;
    movedItem.isShifted = true;

    const targetPlan = clonedTrip.itinerary[targetDayIdx].plan || [];
    let insertIdx = targetPlan.length;
    for (let i = 0; i < targetPlan.length; i++) {
      const existingStart = timeToMinutes(targetPlan[i].startTime);
      if (existingStart !== null && existingStart > startMin) {
        insertIdx = i;
        break;
      }
    }
    targetPlan.splice(insertIdx, 0, movedItem);
  }

  // Validate resulting itinerary schedule conflicts
  const validationResult = validateItinerary(clonedTrip, clonedTrip);
  const scheduleErrors = (validationResult.errors || []).filter(e => e.type === "SCHEDULE_CONFLICT" || e.type === "OVERLAP" || e.type === "INVALID_FORMAT");
  if (scheduleErrors.length > 0) {
    const errorMsg = scheduleErrors.map((e) => e.message).join("; ");
    throw new Error(`SmartShift validation failed: ${errorMsg || "Schedule conflict detected."}`);
  }

  return {
    trip: clonedTrip,
    previousItinerary: previousItinerary,
    appliedAlternative: alternative,
  };
};

module.exports = {
  generateAlternatives,
  applyAlternative,
  findItemLocation,
  timeToMinutes,
  minutesToTimeStr,
};
