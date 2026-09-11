import { detectConflicts, isImmutableTransport, getActivityLogicalWindow } from './schedulingEngine.js';
import { timeToMinutes, minutesToTimeStr } from './formatTrip.js';

/**
 * Clones the trip deeply to avoid mutating state during validation.
 */
const cloneTrip = (trip) => JSON.parse(JSON.stringify(trip));

/**
 * Validates a candidate trip. Returns the conflicts array.
 */
const validateCandidate = (candidateTrip) => {
  return detectConflicts(candidateTrip);
};

/**
 * Helper to update an item's time in a candidate trip.
 */
const applyTimeChange = (candidateTrip, dayNum, itemId, newStartMin, durationMin) => {
  const days = candidateTrip.days || candidateTrip.itinerary || [];
  const day = days[dayNum - 1];
  if (!day) return false;
  
  const item = day.plan.find(p => p.id === itemId);
  if (!item) return false;
  
  const endMin = (newStartMin + durationMin) % 1440;
  item.startTime = minutesToTimeStr(newStartMin % 1440);
  item.endTime = minutesToTimeStr(endMin);
  item.time = `${item.startTime} - ${item.endTime}`;
  item.durationMinutes = durationMin;
  
  // Re-sort the day's plan
  day.plan.sort((a, b) => {
    const aStart = timeToMinutes(a.startTime);
    const bStart = timeToMinutes(b.startTime);
    return aStart - bStart;
  });
  return true;
};

/**
 * Helper to move an item to another day.
 */
const applyDayChange = (candidateTrip, fromDayNum, toDayNum, itemId, newStartMin, durationMin) => {
  const days = candidateTrip.days || candidateTrip.itinerary || [];
  const fromDay = days[fromDayNum - 1];
  const toDay = days[toDayNum - 1];
  if (!fromDay || !toDay) return false;
  
  const itemIdx = fromDay.plan.findIndex(p => p.id === itemId);
  if (itemIdx === -1) return false;
  
  const item = { ...fromDay.plan[itemIdx] };
  fromDay.plan.splice(itemIdx, 1);
  
  const endMin = (newStartMin + durationMin) % 1440;
  item.startTime = minutesToTimeStr(newStartMin % 1440);
  item.endTime = minutesToTimeStr(endMin);
  item.time = `${item.startTime} - ${item.endTime}`;
  item.durationMinutes = durationMin;
  
  toDay.plan = toDay.plan || [];
  toDay.plan.push(item);
  toDay.plan.sort((a, b) => {
    const aStart = timeToMinutes(a.startTime);
    const bStart = timeToMinutes(b.startTime);
    return aStart - bStart;
  });
  return true;
};

/**
 * Evaluates candidate and returns it if valid (0 conflicts).
 */
const evaluateCandidate = (candidateTrip, description, penalty, actions) => {
  const conflicts = validateCandidate(candidateTrip);
  if (conflicts.length === 0) {
    return { candidateTrip, description, penalty, actions };
  }
  return null;
};

/**
 * Generates smart alternatives for a scheduling conflict.
 */
export const generateSmartAlternatives = (trip, conflictingItem, targetDayNum) => {
  const alternatives = [];
  
  let currentDayNum = targetDayNum;
  let item = conflictingItem;
  
  const days = trip.days || trip.itinerary || [];
  
  if (!targetDayNum) {
    days.forEach((d, idx) => {
      const found = (d.plan || []).find(p => p.id === conflictingItem.id);
      if (found) {
        currentDayNum = d.day || idx + 1;
        item = found;
      }
    });
  }
  
  if (!currentDayNum || !item || isImmutableTransport(item)) {
    return []; // Cannot generate alternatives for missing items or immutable transport
  }

  const durationMin = item.durationMinutes || 120;

  // Alternative A: Move to another time on the same day
  for (let startMin = 8 * 60; startMin <= 22 * 60; startMin += 30) {
    const window = getActivityLogicalWindow(item);
    if (startMin < window.start || (startMin + durationMin) > window.end) continue;
    
    if (timeToMinutes(item.startTime) === startMin) continue;

    const candidate = cloneTrip(trip);
    if (!candidate.days && candidate.itinerary) candidate.days = candidate.itinerary; 
    
    const day = candidate.days[currentDayNum - 1];
    if (!day.plan.find(p => p.id === item.id)) {
        day.plan.push({...item});
    }

    applyTimeChange(candidate, currentDayNum, item.id, startMin, durationMin);
    
    const alt = evaluateCandidate(candidate, `Move ${item.name || item.activity} to ${minutesToTimeStr(startMin)}`, 5, [
      { type: 'MOVE', itemId: item.id, newStartTime: minutesToTimeStr(startMin), newEndTime: minutesToTimeStr(startMin + durationMin) }
    ]);
    if (alt) alternatives.push(alt);
  }

  // Alternative B: Shorten Flexible Activity
  if (durationMin >= 60) {
    const shortenedDurations = [Math.max(30, Math.floor(durationMin * 0.75)), Math.max(30, Math.floor(durationMin * 0.5))];
    for (const shortDur of shortenedDurations) {
      const startMin = timeToMinutes(item.startTime) || (14 * 60);

      const candidate = cloneTrip(trip);
      if (!candidate.days && candidate.itinerary) candidate.days = candidate.itinerary;
      
      const day = candidate.days[currentDayNum - 1];
      if (!day.plan.find(p => p.id === item.id)) {
          day.plan.push({...item});
      }

      applyTimeChange(candidate, currentDayNum, item.id, startMin, shortDur);
      
      const alt = evaluateCandidate(candidate, `Shorten ${item.name || item.activity} to ${Math.round(shortDur/60)}h`, 10, [
        { type: 'SHORTEN', itemId: item.id, newStartTime: minutesToTimeStr(startMin), newEndTime: minutesToTimeStr(startMin + shortDur) }
      ]);
      if (alt) alternatives.push(alt);
    }
  }

  // Alternative C: Move to another day
  for (let i = 0; i < days.length; i++) {
    const dNum = days[i].day || i + 1;
    if (dNum === currentDayNum) continue;
    
    const startMin = 9 * 60 + 30;
    
    const candidate = cloneTrip(trip);
    if (!candidate.days && candidate.itinerary) candidate.days = candidate.itinerary;
    
    const day = candidate.days[currentDayNum - 1];
    if (!day.plan.find(p => p.id === item.id)) {
        day.plan.push({...item});
    }

    applyDayChange(candidate, currentDayNum, dNum, item.id, startMin, durationMin);
    
    const alt = evaluateCandidate(candidate, `Move ${item.name || item.activity} to Day ${dNum}`, 15, [
      { type: 'MOVE_DAY', itemId: item.id, newDay: dNum, newStartTime: minutesToTimeStr(startMin), newEndTime: minutesToTimeStr(startMin + durationMin) }
    ]);
    if (alt) alternatives.push(alt);
  }

  // Alternative D: Move ANOTHER flexible activity to make room
  const currentPlan = days[currentDayNum - 1].plan || [];
  const overlaps = currentPlan.filter(p => p.id !== item.id && !isImmutableTransport(p));
  
  for (const existingItem of overlaps) {
     const startMin = timeToMinutes(existingItem.startTime);
     if (startMin === null) continue;
     
     const newStarts = [startMin - 120, startMin + 120];
     for (const ns of newStarts) {
         if (ns < 6 * 60 || ns > 22 * 60) continue;
         
         const candidate = cloneTrip(trip);
         if (!candidate.days && candidate.itinerary) candidate.days = candidate.itinerary;
         
         const day = candidate.days[currentDayNum - 1];
         if (!day.plan.find(p => p.id === item.id)) {
             day.plan.push({...item}); 
         }
         
         const targetStartMin = timeToMinutes(item.startTime) || (14 * 60);
         applyTimeChange(candidate, currentDayNum, item.id, targetStartMin, durationMin);
         applyTimeChange(candidate, currentDayNum, existingItem.id, ns, existingItem.durationMinutes || 60);
         
         const alt = evaluateCandidate(candidate, `Move ${existingItem.name || existingItem.activity} to ${minutesToTimeStr(ns)}`, 12, [
           { type: 'MOVE', itemId: existingItem.id, newStartTime: minutesToTimeStr(ns), newEndTime: minutesToTimeStr(ns + (existingItem.durationMinutes || 60)) },
           { type: 'KEEP', itemId: item.id, newStartTime: minutesToTimeStr(targetStartMin), newEndTime: minutesToTimeStr(targetStartMin + durationMin) }
         ]);
         
         if (alt) alternatives.push(alt);
     }
  }

  // Score and Deduplicate
  const uniqueAlts = [];
  const seenActions = new Set();
  
  for (const alt of alternatives) {
    const actionKey = JSON.stringify(alt.actions);
    if (!seenActions.has(actionKey)) {
      seenActions.add(actionKey);
      uniqueAlts.push(alt);
    }
  }
  
  uniqueAlts.sort((a, b) => a.penalty - b.penalty);
  
  return uniqueAlts.slice(0, 3); // Return top 3 alternatives
};
