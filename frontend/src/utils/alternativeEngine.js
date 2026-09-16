import { detectConflicts, isImmutableTransport, getActivityLogicalWindow, findEarliestValidSlot } from './schedulingEngine.js';
import { timeToMinutes, minutesToTimeStr } from './formatTrip.js';

const cloneTrip = (trip) => JSON.parse(JSON.stringify(trip));

const validateCandidate = (candidateTrip) => {
  return detectConflicts(candidateTrip);
};

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
  
  day.plan.sort((a, b) => {
    const aStart = timeToMinutes(a.startTime);
    const bStart = timeToMinutes(b.startTime);
    return aStart - bStart;
  });
  return true;
};

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

const evaluateCandidate = (candidateTrip, description, penalty, actions) => {
  const conflicts = validateCandidate(candidateTrip);
  if (conflicts.length === 0) {
    return { candidateTrip, description, penalty, actions };
  }
  return null;
};

export const generateSmartAlternatives = (trip, item, currentDayNum) => {
  const alternatives = [];
  
  if (!trip || !trip.itinerary || !item) return alternatives;
  if (isImmutableTransport(item)) return alternatives;

  const durationMins = item.durationMinutes || 120;

  // 1. FREE_SLOT: Search all days for a complete free gap
  trip.itinerary.forEach((dayData, index) => {
    const dayNum = index + 1;
    const slot = findEarliestValidSlot(trip, dayNum, item);
    if (slot) {
       const candidate = cloneTrip(trip);
       const targetDay = candidate.itinerary[index];
       if (targetDay) {
          const newItem = {
             ...item,
             startTime: slot.startTime,
             endTime: slot.endTime,
             time: `${slot.startTime} - ${slot.endTime}`
          };
          
          targetDay.plan = [...(targetDay.plan || [])];
          
          const insertMin = timeToMinutes(slot.startTime);
          const insertIdx = targetDay.plan.findIndex(p => timeToMinutes(p.startTime) > insertMin);
          if (insertIdx !== -1) {
             targetDay.plan.splice(insertIdx, 0, newItem);
          } else {
             targetDay.plan.push(newItem);
          }

          const evaluated = evaluateCandidate(candidate, `Move to Day ${dayNum} at ${slot.startTime}`, 10, [
             {
               type: 'FREE_SLOT',
               itemId: item.id,
               newDay: dayNum,
               newStartTime: slot.startTime,
               newEndTime: slot.endTime,
               durationMinutes: durationMins
             }
          ]);
          if (evaluated) alternatives.push(evaluated);
       }
    }
  });

  if (alternatives.length > 0) return alternatives;

  // 2. REBALANCE: No free slot exists. Find flexible items to shorten.
  const currentDay = trip.itinerary[currentDayNum - 1];
  if (!currentDay) return alternatives;
  
  const currentPlan = currentDay.plan || [];
  
  const reqStart = timeToMinutes(item.startTime);
  const reqEnd = timeToMinutes(item.endTime);

  for (let i = 0; i < currentPlan.length; i++) {
    const existing = currentPlan[i];
    
    if (isImmutableTransport(existing)) continue;
    
    const existingDur = existing.durationMinutes || 120;
    if (existingDur <= 60) continue;
    
    const existStart = timeToMinutes(existing.startTime);
    const existEnd = timeToMinutes(existing.endTime);
    
    if (existStart === null || existEnd === null) continue;
    
    const shrinkAmount = Math.min(60, Math.floor(existingDur / 2));
    const newExistingDur = existingDur - shrinkAmount;
    
    const newExistEnd = existStart + newExistingDur;
    
    const candidate = cloneTrip(trip);
    const targetDay = candidate.itinerary[currentDayNum - 1];
    
    const modifiedExisting = {
       ...existing,
       endTime: minutesToTimeStr(newExistEnd),
       durationMinutes: newExistingDur,
       time: `${existing.startTime} - ${minutesToTimeStr(newExistEnd)}`,
       duration: `${Math.floor(newExistingDur/60)}h ${newExistingDur%60}m`
    };
    
    const newStart = newExistEnd + 15; // 15 min buffer
    const newEnd = newStart + durationMins;
    
    const newItem = {
       ...item,
       startTime: minutesToTimeStr(newStart),
       endTime: minutesToTimeStr(newEnd),
       time: `${minutesToTimeStr(newStart)} - ${minutesToTimeStr(newEnd)}`
    };
    
    targetDay.plan = currentPlan.map(p => p.id === existing.id ? modifiedExisting : p);
    
    const insertIdx = targetDay.plan.findIndex(p => timeToMinutes(p.startTime) > newStart);
    if (insertIdx !== -1) {
       targetDay.plan.splice(insertIdx, 0, newItem);
    } else {
       targetDay.plan.push(newItem);
    }
    
    const evaluated = evaluateCandidate(candidate, `Shorten ${existing.name || existing.activity}`, 5, [
       {
          type: 'REBALANCE',
          flexibleItemId: existing.id,
          flexibleItemName: existing.name || existing.activity,
          oldStartTime: existing.startTime,
          oldEndTime: existing.endTime,
          oldDuration: `${Math.floor(existingDur/60)}h ${existingDur%60}m`,
          newStartTime: existing.startTime,
          newEndTime: modifiedExisting.endTime,
          newDuration: modifiedExisting.duration,
          targetStartTime: newItem.startTime,
          targetEndTime: newItem.endTime,
          targetDuration: `${Math.floor(durationMins/60)}h ${durationMins%60}m`,
          freedMinutes: shrinkAmount
       }
    ]);
    
    if (evaluated) alternatives.push(evaluated);
  }

  return alternatives;
};
