const { validateItinerary } = require("./itineraryValidator");

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

const generateAlternatives = (trip, itemId) => {
  if (!trip || !trip.itinerary) throw new Error("Invalid trip");

  if (!itemId) throw new Error("itemId is required");

  let affectedItem = null;
  let originalDayIndex = -1;
  let originalItemIndex = -1;

  // 1. Locate the item
  for (let dIdx = 0; dIdx < trip.itinerary.length; dIdx++) {
    const day = trip.itinerary[dIdx];
    if (!day.plan) continue;
    for (let pIdx = 0; pIdx < day.plan.length; pIdx++) {
      const p = day.plan[pIdx];
      const matchById = p.id === itemId || p._id?.toString() === itemId;
      
      if (matchById) {
        affectedItem = p;
        originalDayIndex = dIdx;
        originalItemIndex = pIdx;
        break;
      }
    }
    if (affectedItem) break;
  }

  if (!affectedItem) {
    throw new Error("Affected itinerary item no longer exists.");
  }

  // Mandatory checks
  const { isImmutableTransport } = require("./itineraryValidator");
  const cat = (affectedItem.category || "").toLowerCase();
  const isMandatory = isImmutableTransport(affectedItem) || affectedItem.activity.toLowerCase().includes("check");
  if (isMandatory) {
    throw new Error("This item requires manual/operator intervention.");
  }

  const duration = affectedItem.durationMinutes || 90;
  const alternatives = [];
  const startOfDayMinutes = 9 * 60; // 09:00 AM
  const endOfDayMinutes = 22 * 60; // 22:00 PM
  const travelBuffer = 30; // 30 min buffer

  // Helper to clone trip and apply move
  const createAlternative = (targetDayIdx, startMin, optionTitle, optionReason) => {
    const endMin = startMin + duration;
    const clonedTrip = JSON.parse(JSON.stringify(trip)); // deep clone
    
    // Remove from original
    const movedItem = clonedTrip.itinerary[originalDayIndex].plan.splice(originalItemIndex, 1)[0];
    
    // Update times
    movedItem.startTime = minutesToTimeStr(startMin);
    movedItem.endTime = minutesToTimeStr(endMin);
    movedItem.time = `${movedItem.startTime} - ${movedItem.endTime}`;
    
    // Insert into target day
    const targetPlan = clonedTrip.itinerary[targetDayIdx].plan || [];
    
    // Maintain chronological order
    let insertIdx = targetPlan.length;
    for (let i = 0; i < targetPlan.length; i++) {
      const existingStart = timeToMinutes(targetPlan[i].startTime);
      if (existingStart !== null && existingStart > startMin) {
        insertIdx = i;
        break;
      }
    }
    targetPlan.splice(insertIdx, 0, movedItem);
    
    // Validate
    const validationResult = validateItinerary(clonedTrip, clonedTrip);
    
    if (validationResult.valid === true && validationResult.errors.length === 0) {
      alternatives.push({
        id: `smartshift-${Date.now()}-${alternatives.length}`,
        title: optionTitle,
        reason: optionReason,
        changes: {
          fromDay: originalDayIndex + 1,
          toDay: targetDayIdx + 1,
          fromStartTime: affectedItem.startTime,
          fromEndTime: affectedItem.endTime,
          toStartTime: movedItem.startTime,
          toEndTime: movedItem.endTime,
        },
        impact: {
          conflicts: 0,
          additionalCost: 0,
          hotelChanged: false,
          travelChanged: false,
        },
        validation: { valid: true },
        // internal payload to apply later
        _targetDayIndex: targetDayIdx,
        _startMin: startMin,
        _tripUpdatedAt: trip.updatedAt
      });
    }
  };

  // 2. Find slots in Original Day
  const origPlan = trip.itinerary[originalDayIndex].plan.filter(i => i.id !== itemId);
  let prevEnd = startOfDayMinutes;

  origPlan.forEach((item, idx) => {
    const itemStart = timeToMinutes(item.startTime);
    const gap = itemStart - prevEnd;
    if (gap >= duration + travelBuffer * 2) {
      createAlternative(originalDayIndex, prevEnd + travelBuffer, "Move to an earlier slot today", "Keeps the activity on the same day with no schedule conflicts.");
    }
    prevEnd = timeToMinutes(item.endTime) || (itemStart + (item.durationMinutes || 90));
  });

  // Check end of original day
  if (endOfDayMinutes - prevEnd >= duration + travelBuffer) {
    createAlternative(originalDayIndex, prevEnd + travelBuffer, "Move to a later slot today", "Keeps the activity on the same day with no schedule conflicts.");
  }

  // 3. Find slots in Next Day (if exists)
  if (alternatives.length < 3 && originalDayIndex + 1 < trip.itinerary.length) {
    const nextDayIdx = originalDayIndex + 1;
    const nextPlan = trip.itinerary[nextDayIdx].plan || [];
    let nPrevEnd = startOfDayMinutes;

    nextPlan.forEach((item) => {
      const itemStart = timeToMinutes(item.startTime);
      const gap = itemStart - nPrevEnd;
      if (gap >= duration + travelBuffer * 2 && alternatives.length < 3) {
        createAlternative(nextDayIdx, nPrevEnd + travelBuffer, `Move to Day ${nextDayIdx + 1}`, "Safely reschedules the activity to an available slot tomorrow.");
      }
      nPrevEnd = timeToMinutes(item.endTime) || (itemStart + (item.durationMinutes || 90));
    });

    if (endOfDayMinutes - nPrevEnd >= duration + travelBuffer && alternatives.length < 3) {
      createAlternative(nextDayIdx, nPrevEnd + travelBuffer, `Move to end of Day ${nextDayIdx + 1}`, "Safely reschedules the activity to an available slot tomorrow.");
    }
  }

  return {
    affectedItem: {
      itemId: affectedItem.id,
      title: affectedItem.name || affectedItem.activity,
      day: originalDayIndex + 1,
      startTime: affectedItem.startTime,
      endTime: affectedItem.endTime
    },
    alternatives: alternatives.slice(0, 3)
  };
};

const applyAlternative = (trip, itemId, alternative) => {
  if (!trip || !trip.itinerary) throw new Error("Invalid trip");

  // Protect against stale alternative by checking updatedAt
  if (alternative._tripUpdatedAt && new Date(trip.updatedAt).getTime() > new Date(alternative._tripUpdatedAt).getTime()) {
      throw new Error("This itinerary has changed since SmartShift created these suggestions. Please generate new suggestions.");
  }

  let originalDayIndex = -1;
  let originalItemIndex = -1;

  for (let dIdx = 0; dIdx < trip.itinerary.length; dIdx++) {
    const day = trip.itinerary[dIdx];
    if (!day.plan) continue;
    for (let pIdx = 0; pIdx < day.plan.length; pIdx++) {
      const p = day.plan[pIdx];
      const matchById = p.id === itemId || p._id?.toString() === itemId;
      
      if (matchById) {
        originalDayIndex = dIdx;
        originalItemIndex = pIdx;
        break;
      }
    }
    if (originalDayIndex !== -1) break;
  }

  if (originalDayIndex === -1) {
    throw new Error("Affected itinerary item no longer exists.");
  }

  const clonedTrip = JSON.parse(JSON.stringify(trip));
  
  // Budget integrity snapshot BEFORE
  const beforeCost = clonedTrip.itinerary.reduce((sum, d) => sum + (d.plan || []).reduce((s, p) => s + (Number(p.price) || Number(p.estimatedCost) || 0), 0), 0);
  const beforeItemCount = clonedTrip.itinerary.reduce((count, d) => count + (d.plan || []).length, 0);

  const movedItem = clonedTrip.itinerary[originalDayIndex].plan.splice(originalItemIndex, 1)[0];
  const movedItemCost = Number(movedItem.price) || Number(movedItem.estimatedCost) || 0;
  
  const targetDayIdx = alternative._targetDayIndex;
  const startMin = alternative._startMin;
  const endMin = startMin + (movedItem.durationMinutes || 90);

  movedItem.startTime = minutesToTimeStr(startMin);
  movedItem.endTime = minutesToTimeStr(endMin);
  movedItem.time = `${movedItem.startTime} - ${movedItem.endTime}`;

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

  // Budget integrity snapshot AFTER
  const afterCost = clonedTrip.itinerary.reduce((sum, d) => sum + (d.plan || []).reduce((s, p) => s + (Number(p.price) || Number(p.estimatedCost) || 0), 0), 0);
  const afterItemCount = clonedTrip.itinerary.reduce((count, d) => count + (d.plan || []).length, 0);

  if (beforeCost !== afterCost) {
    throw new Error("Budget integrity violation: Total activity cost changed during SmartShift.");
  }
  if (beforeItemCount !== afterItemCount) {
    throw new Error("Data integrity violation: Total activity count changed during SmartShift.");
  }

  const validationResult = validateItinerary(clonedTrip, clonedTrip);
  if (validationResult.valid !== true || validationResult.errors.length > 0) {
    throw new Error("Failed validation during apply. The itinerary may have changed.");
  }

  return clonedTrip;
};

module.exports = {
  generateAlternatives,
  applyAlternative
};
