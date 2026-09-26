import { timeToMinutes, minutesToTimeStr } from "./formatTrip";

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

export function findItemLocation(itinerary, itemId, itemObject = null) {
  if (!Array.isArray(itinerary)) return { affectedItem: null, originalDayIndex: -1, originalItemIndex: -1 };

  const targetId = String(itemId || itemObject?.id || itemObject?._id || "").toLowerCase().trim();
  const targetName = String(itemObject?.name || itemObject?.activity || itemObject?.title || "").toLowerCase().trim();

  // 1. Match by ID
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

  // 2. Match by Name/Title
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

  return { affectedItem: null, originalDayIndex: -1, originalItemIndex: -1 };
}

export function applySmartShiftLocal(trip, itemId, alternative) {
  if (!trip || !trip.itinerary) throw new Error("Invalid trip object.");
  if (!alternative) throw new Error("Alternative configuration is required.");

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

  return {
    trip: clonedTrip,
    previousItinerary: previousItinerary,
    appliedAlternative: alternative,
  };
}
