import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { getDestinationInventory } from "../services/inventoryService";
import {
  detectConflicts,
  findEarliestValidSlot,
  isImmutableTransport,
  scheduleTrainJourneyIntoTrip,
  scheduleFlightJourneyIntoTrip,
  validateTripSchedule,
  generateConflictSuggestions,
  findExistingTrainRecord,
  findExistingTransportRecord,
  buildProposedTrainAdaptation,
  buildProposedTransportAdaptation,
} from "../utils/schedulingEngine";
import { generateSmartAlternatives } from "../utils/alternativeEngine";
import { normalizeTrip, getDuration, timeToMinutes, minutesToTimeStr, parsePrice, parseDurationMinutes } from "../utils/formatTrip";
import { normalizeInventoryItem } from "../utils/normalizeInventoryItem";
import { updateTrip } from "../api/tripApi";
import { calculateTripBudgetAnalysis, calculateStayAccommodation } from "../utils/campusBudgetUtils";
import { detectBusRequirements } from "../utils/busRequirementDetector";

export const TripBuilderContext = createContext();

export const useTripBuilder = () => {
  const context = useContext(TripBuilderContext);
  if (!context) {
    throw new Error("useTripBuilder must be used within a TripBuilderProvider");
  }
  return context;
};

// Generate default itinerary framework for any selected destination
export function generateDefaultItinerary(source = "Mumbai", destination = "Destination", numDays = 5) {
  const days = [];
  const dayTitles = [
    `Arrival & ${destination} Orientation`,
    `Heritage & Iconic Landmarks in ${destination}`,
    `Nature, Culture & Local Exploration`,
    `Coastal / Scenic Discovery & Adventures`,
    `Shopping & Farewell Journey back to ${source}`,
  ];

  for (let i = 1; i <= numDays; i++) {
    days.push({
      day: i,
      title: dayTitles[i - 1] || `Day ${i} — ${destination} Exploration`,
      date: `Day ${i}`,
      plan: [],
    });
  }

  return normalizeTrip({
    _id: `trip-${Date.now()}`,
    source: source || "Mumbai",
    destination: destination || "Destination",
    duration: `${numDays} Days`,
    travelers: 2,
    budget: 50000,
    currency: "INR",
    travelMode: "Train",
    hotelType: "Standard",
    itinerary: days,
  });
}

export function TripBuilderProvider({ children }) {
  const [trip, setTripInternal] = useState(() => {
    try {
      const savedCurrentTrip = localStorage.getItem("currentTrip") || localStorage.getItem("transix_builder_trip");
      if (savedCurrentTrip) {
        const parsed = JSON.parse(savedCurrentTrip);
        if (parsed && typeof parsed === "object" && (parsed.destination || parsed.source)) {
          return normalizeTrip(parsed);
        }
      }
    } catch (e) {
      console.error("Error initializing trip state in builder:", e);
    }
    return null;
  });

  // Single authoritative trip updater that keeps state, storage, and cross-component listeners 100% in sync
  const setTrip = useCallback((newTripOrUpdater) => {
    setTripInternal((prevTrip) => {
      const nextTrip = typeof newTripOrUpdater === "function" ? newTripOrUpdater(prevTrip) : newTripOrUpdater;
      if (!nextTrip) {
        localStorage.removeItem("currentTrip");
        localStorage.removeItem("transix_builder_trip");
        return null;
      }
      const normalized = normalizeTrip(nextTrip);
      try {
        localStorage.setItem("currentTrip", JSON.stringify(normalized));
        localStorage.removeItem("transix_builder_trip");
      } catch (err) {
        console.error("LocalStorage sync error:", err);
      }
      return normalized;
    });
  }, []);

  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragSource, setDragSource] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(true);

  // Dynamic real inventory loaded for current destination
  const [destinationInventory, setDestinationInventory] = useState({
    all: [],
    hotels: [],
    activities: [],
    food: [],
    trains: [],
    flights: [],
    buses: [],
    transport: [],
    experiences: [],
    shopping: [],
  });
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

  // Function to initialize a new trip dynamically
  const initializeTrip = useCallback((source, destination, numDays = 5) => {
    const newTrip = generateDefaultItinerary(source, destination, numDays);
    setTrip(newTrip);
    return newTrip;
  }, [setTrip]);

  // Sync with same-tab updates and cross-tab storage changes
  useEffect(() => {
    const handleCustomUpdate = (e) => {
      if (e.detail) {
        const normalized = normalizeTrip(e.detail);
        setTripInternal(normalized);
      } else if (e.detail === null) {
        setTripInternal(null);
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === "currentTrip" || e.key === "transix_builder_trip") {
        if (!e.newValue) {
          setTripInternal(null);
        } else {
          try {
            const parsed = JSON.parse(e.newValue);
            if (parsed && typeof parsed === "object") {
              setTripInternal(normalizeTrip(parsed));
            }
          } catch (err) {
            console.error("Storage change sync error:", err);
          }
        }
      }
    };

    window.addEventListener("transix_trip_updated", handleCustomUpdate);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("transix_trip_updated", handleCustomUpdate);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Fetch unified destination inventory whenever destination changes
  useEffect(() => {
    if (!trip?.destination) return;
    const destination = trip.destination;
    let isMounted = true;

    async function loadInventory() {
      setIsLoadingInventory(true);
      try {
        const data = await getDestinationInventory(destination, trip);
        if (isMounted && data) {
          setDestinationInventory(data);
        }
      } catch (err) {
        console.error("Failed to load destination inventory in builder:", err);
      } finally {
        if (isMounted) setIsLoadingInventory(false);
      }
    }

    loadInventory();
    return () => {
      isMounted = false;
    };
  }, [trip?.destination, trip?.source]);

  // Sync to localStorage
  useEffect(() => {
    if (trip) {
      localStorage.setItem("currentTrip", JSON.stringify(trip));
      localStorage.removeItem("transix_builder_trip");
    }
  }, [trip]);

  const [pendingAlternatives, setPendingAlternatives] = useState(null);

  // Auto-calculate smart start time when adding a new item to a day
  const calculateSuggestedStartTime = useCallback((existingPlan, durationMinutes = 90) => {
    if (!existingPlan || existingPlan.length === 0) {
      return {
        startTime: "09:30 AM",
        endTime: minutesToTimeStr(9 * 60 + 30 + durationMinutes),
      };
    }

    const lastItem = existingPlan[existingPlan.length - 1];
    let lastEndMin = timeToMinutes(lastItem.endTime);

    if (lastEndMin === null) {
      const lastStartMin = timeToMinutes(lastItem.startTime) || 9 * 60;
      lastEndMin = lastStartMin + (lastItem.durationMinutes || 90);
    }

    // Add 30 minutes travel buffer between activities
    const suggestedStartMin = lastEndMin + 30;
    const suggestedEndMin = suggestedStartMin + durationMinutes;

    return {
      startTime: minutesToTimeStr(suggestedStartMin),
      endTime: minutesToTimeStr(suggestedEndMin),
    };
  }, []);

  // Validate before commit
  const proposeTripUpdate = (proposedTrip, options = {}) => {
    const conflicts = detectConflicts(proposedTrip);
    if (conflicts.length > 0) {
      return false; // Trip update rejected
    }
    setTrip(proposedTrip);
    return true; // Accepted
  };

  const applyAlternative = (alternative) => {
    if (alternative && alternative.candidateTrip) {
       const finalConflicts = detectConflicts(alternative.candidateTrip);
       if (finalConflicts.length > 0) {
           toast.error("Cannot apply this change safely. It conflicts with other constraints.");
           return;
       }
       setTrip(alternative.candidateTrip);
       setPendingAlternatives(null);
       toast.success("Schedule adjusted successfully!");
    }
  };

  // Calculate requested time based on drop position
  const calculateDropTime = (prevTrip, dayIndex, item, targetIndex) => {
    const day = prevTrip.itinerary[dayIndex] || prevTrip.itinerary[0];
    const plan = day.plan || [];
    const durationMins = item.durationMinutes || 120;
    
    if (plan.length === 0) {
      return { startTime: "09:30 AM", endTime: minutesToTimeStr(9 * 60 + 30 + durationMins) };
    }
    
    if (targetIndex === 0) {
      const firstItemStart = timeToMinutes(plan[0].startTime);
      if (firstItemStart !== null && firstItemStart > durationMins + 30) {
        return { startTime: minutesToTimeStr(firstItemStart - durationMins - 30), endTime: minutesToTimeStr(firstItemStart - 30) };
      }
      return { startTime: "08:00 AM", endTime: minutesToTimeStr(8 * 60 + durationMins) };
    }
    
    const prevItemIndex = (targetIndex === null || targetIndex > plan.length) ? plan.length - 1 : targetIndex - 1;
    const prevItem = plan[prevItemIndex];
    
    let lastEndMin = timeToMinutes(prevItem.endTime);
    if (lastEndMin === null) {
      const lastStartMin = timeToMinutes(prevItem.startTime) || 9 * 60;
      lastEndMin = lastStartMin + (prevItem.durationMinutes || 90);
    }
    
    const suggestedStartMin = lastEndMin + 15; // 15 min travel buffer
    const suggestedEndMin = suggestedStartMin + durationMins;
    
    return {
      startTime: minutesToTimeStr(suggestedStartMin),
      endTime: minutesToTimeStr(suggestedEndMin)
    };
  };

  // Add Item to a Day
  const addItemToDay = (dayIndex, item, targetIndex = null) => {
    let normalizedItem;
    try {
      normalizedItem = normalizeInventoryItem(item);
    } catch (err) {
      toast.error("Invalid item. Cannot schedule.");
      return;
    }

    setTrip((prevTrip) => {
      const newItinerary = [...prevTrip.itinerary];
      const targetDay = newItinerary[dayIndex] || newItinerary[0];
      if (!targetDay) return prevTrip;
      
      const currentPlan = [...(targetDay.plan || [])];

      const dropTime = calculateDropTime(prevTrip, dayIndex, normalizedItem, targetIndex);

      const newItem = {
        ...normalizedItem,
        startTime: dropTime.startTime,
        endTime: dropTime.endTime,
        time: `${dropTime.startTime} - ${dropTime.endTime}`,
      };

      let insertIdx = targetIndex !== null && targetIndex >= 0 && targetIndex <= currentPlan.length 
          ? targetIndex 
          : currentPlan.length;

      currentPlan.splice(insertIdx, 0, newItem);
      newItinerary[dayIndex] = { ...targetDay, plan: currentPlan };
      const proposedTrip = { ...prevTrip, itinerary: newItinerary };

      const conflicts = detectConflicts(proposedTrip);
      const itemConflicts = conflicts.filter(c => c.itemId === newItem.id);

      if (itemConflicts.length > 0) {
         const firstConflict = itemConflicts[0];
         let conflictingItemDetails = null;
         let overlapMinutes = 0;
         
         if (firstConflict.conflictingItemId) {
            const cItem = currentPlan.find(p => p.id === firstConflict.conflictingItemId);
            if (cItem) {
               conflictingItemDetails = cItem;
               const aStart = timeToMinutes(newItem.startTime);
               const aEnd = timeToMinutes(newItem.endTime);
               const bStart = timeToMinutes(cItem.startTime);
               const bEnd = timeToMinutes(cItem.endTime);
               if (aStart !== null && bStart !== null) {
                  const overlapStart = Math.max(aStart, bStart);
                  const overlapEnd = Math.min(aEnd, bEnd);
                  overlapMinutes = Math.max(0, overlapEnd - overlapStart);
               }
            }
         }

         const alternatives = generateSmartAlternatives(prevTrip, newItem, dayIndex + 1);
         setPendingAlternatives({ 
            item: newItem, 
            targetDay: dayIndex + 1, 
            requestedTime: newItem.time,
            conflictInfo: {
                reason: firstConflict.reason,
                conflictingItem: conflictingItemDetails,
                overlapMinutes
            },
            alternatives 
         });
         return prevTrip;
      }

      toast.success(`Added "${newItem.name}" to Day ${dayIndex + 1}!`, {
         icon: newItem.icon || "✨",
      });
      return proposedTrip;
    });
    
    setIsSaved(false);
  };

  // Remove Item from a Day
  const removeItemFromDay = (dayIndex, itemId) => {
    setTrip((prevTrip) => {
      const newItinerary = [...prevTrip.itinerary];
      const targetDay = newItinerary[dayIndex];
      if (!targetDay) return prevTrip;

      const updatedPlan = targetDay.plan.filter((i) => i.id !== itemId);
      newItinerary[dayIndex] = {
        ...targetDay,
        plan: updatedPlan,
      };

      return {
        ...prevTrip,
        itinerary: newItinerary,
      };
    });

    setIsSaved(false);
    toast.success("Activity removed", { icon: "🗑️" });
  };

  // Update Activity Timing
  const updateItemTime = (dayIndex, itemId, { startTime, endTime, travelBuffer = 30 }) => {
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);

    if (startMin === null || endMin === null) {
      toast.error("Please enter valid time format (e.g. 10:30 AM)");
      return false;
    }

    if (startMin >= endMin) {
      toast.error("Start time must be earlier than end time!");
      return false;
    }

    const durationMinutes = endMin - startMin;

    setTrip((prevTrip) => {
      const newItinerary = [...prevTrip.itinerary];
      const targetDay = newItinerary[dayIndex];
      if (!targetDay) return prevTrip;

      const updatedPlan = targetDay.plan.map((item) => {
        if (item.id === itemId) {
          const formattedStart = minutesToTimeStr(startMin);
          const formattedEnd = minutesToTimeStr(endMin);
          return {
            ...item,
            startTime: formattedStart,
            endTime: formattedEnd,
            time: `${formattedStart} - ${formattedEnd}`,
            duration: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
            durationMinutes,
            travelBuffer,
          };
        }
        return item;
      });

      newItinerary[dayIndex] = {
        ...targetDay,
        plan: updatedPlan,
      };

      return {
        ...prevTrip,
        itinerary: newItinerary,
      };
    });

    setIsSaved(false);
    toast.success("Timing updated successfully!", { icon: "⏰" });
    return true;
  };

  const handleItemMoveWithValidation = (prevTrip, sourceDayIndex, targetDayIndex, sourceIndex, targetIndex) => {
      const newItinerary = [...prevTrip.itinerary];
      const sourceDay = newItinerary[sourceDayIndex];
      const targetDay = newItinerary[targetDayIndex];
      if (!sourceDay || !targetDay) return prevTrip;

      const sourcePlan = [...sourceDay.plan];
      const [movedItem] = sourcePlan.splice(sourceIndex, 1);
      
      newItinerary[sourceDayIndex] = { ...sourceDay, plan: sourcePlan };
      
      const intermediateTrip = { ...prevTrip, itinerary: newItinerary };
      const dropTime = calculateDropTime(intermediateTrip, targetDayIndex, movedItem, targetIndex);
      
      const newItem = {
          ...movedItem,
          startTime: dropTime.startTime,
          endTime: dropTime.endTime,
          time: `${dropTime.startTime} - ${dropTime.endTime}`
      };
      
      const targetPlan = sourceDayIndex === targetDayIndex ? sourcePlan : [...targetDay.plan];
      
      let insertIdx = targetIndex !== null && targetIndex >= 0 && targetIndex <= targetPlan.length 
          ? targetIndex 
          : targetPlan.length;

      targetPlan.splice(insertIdx, 0, newItem);
      newItinerary[targetDayIndex] = { ...targetDay, plan: targetPlan };
      
      const proposedTrip = { ...prevTrip, itinerary: newItinerary };
      
      const conflicts = detectConflicts(proposedTrip);
      const itemConflicts = conflicts.filter(c => c.itemId === newItem.id);

      if (itemConflicts.length > 0) {
         const firstConflict = itemConflicts[0];
         let conflictingItemDetails = null;
         let overlapMinutes = 0;
         
         if (firstConflict.conflictingItemId) {
            const cItem = targetPlan.find(p => p.id === firstConflict.conflictingItemId);
            if (cItem) {
               conflictingItemDetails = cItem;
               const aStart = timeToMinutes(newItem.startTime);
               const aEnd = timeToMinutes(newItem.endTime);
               const bStart = timeToMinutes(cItem.startTime);
               const bEnd = timeToMinutes(cItem.endTime);
               if (aStart !== null && bStart !== null) {
                  const overlapStart = Math.max(aStart, bStart);
                  const overlapEnd = Math.min(aEnd, bEnd);
                  overlapMinutes = Math.max(0, overlapEnd - overlapStart);
               }
            }
         }

         const alternatives = generateSmartAlternatives(intermediateTrip, newItem, targetDayIndex + 1);
         setPendingAlternatives({ 
            item: newItem, 
            targetDay: targetDayIndex + 1, 
            requestedTime: newItem.time,
            conflictInfo: {
                reason: firstConflict.reason,
                conflictingItem: conflictingItemDetails,
                overlapMinutes
            },
            alternatives 
         });
         return prevTrip;
      }

      toast.success(`Schedule updated`, { icon: "🔄" });
      return proposedTrip;
  };

  // Reorder Items within the same Day
  const reorderInDay = (dayIndex, sourceIndex, targetIndex) => {
    if (sourceIndex === targetIndex) return;
    setTrip((prevTrip) => handleItemMoveWithValidation(prevTrip, dayIndex, dayIndex, sourceIndex, targetIndex));
    setIsSaved(false);
  };

  // Move Item from one Day to another Day
  const moveBetweenDays = (sourceDayIndex, targetDayIndex, sourceIndex, targetIndex = null) => {
    setTrip((prevTrip) => handleItemMoveWithValidation(prevTrip, sourceDayIndex, targetDayIndex, sourceIndex, targetIndex));
    setIsSaved(false);
  };

  // Duplicate Item
  const duplicateItem = (dayIndex, itemId) => {
    setTrip((prevTrip) => {
      const newItinerary = [...prevTrip.itinerary];
      const targetDay = newItinerary[dayIndex];
      if (!targetDay) return prevTrip;

      const plan = [...targetDay.plan];
      const itemIdx = plan.findIndex((i) => i.id === itemId);
      if (itemIdx === -1) return prevTrip;

      const original = plan[itemIdx];
      const clone = {
        ...original,
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: `${original.name || original.activity} (Copy)`,
        activity: `${original.activity || original.name} (Copy)`,
      };

      plan.splice(itemIdx + 1, 0, clone);

      newItinerary[dayIndex] = { ...targetDay, plan };

      return {
        ...prevTrip,
        itinerary: newItinerary,
      };
    });

    setIsSaved(false);
    toast.success("Activity duplicated", { icon: "📋" });
  };

  // Add Day
  const addDay = (customTitle) => {
    let newDayIndex = 0;
    setTrip((prevTrip) => {
      const newDayNum = prevTrip.itinerary.length + 1;
      newDayIndex = newDayNum - 1;
      const newDay = {
        day: newDayNum,
        title: customTitle || `Day ${newDayNum} — Exploration in ${prevTrip.destination || "Destination"}`,
        date: `Day ${newDayNum}`,
        plan: [],
      };

      return {
        ...prevTrip,
        duration: `${newDayNum} Days`,
        itinerary: [...prevTrip.itinerary, newDay],
      };
    });

    setActiveDayIndex(newDayIndex);
    setIsSaved(false);
    toast.success(`Day ${newDayIndex + 1} added!`, { icon: "➕" });
  };

  // Remove Day
  const removeDay = (dayIndex) => {
    if (trip.itinerary.length <= 1) {
      toast.error("Trip must have at least 1 day.");
      return;
    }

    setTrip((prevTrip) => {
      const filtered = prevTrip.itinerary
        .filter((_, idx) => idx !== dayIndex)
        .map((day, idx) => ({
          ...day,
          day: idx + 1,
          date: `Day ${idx + 1}`,
        }));

      return {
        ...prevTrip,
        duration: `${filtered.length} Days`,
        itinerary: filtered,
      };
    });

    setActiveDayIndex((prev) => Math.max(0, Math.min(prev, trip.itinerary.length - 2)));
    setIsSaved(false);
    toast.success(`Day ${dayIndex + 1} removed`, { icon: "🗑️" });
  };

  // Update Trip Meta
  const updateTripMeta = (field, value) => {
    setTrip((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsSaved(false);
  };

  // Live Budget Engine
  const budgetStats = useMemo(() => {
    return calculateTripBudgetAnalysis(trip, trip?.staySegments, trip?.itinerary);
  }, [trip]);

  // Validation Engine with Travel Buffers & Overlap Conflict Tracking
  const validationStats = useMemo(() => {
    let totalActivities = 0;
    const scheduleConflicts = [];
    const budgetConflicts = [];
    const warnings = [];
    let totalTravelMinutes = 0;

    if (trip?.itinerary) {
      trip.itinerary.forEach((day, dIdx) => {
        const plan = day.plan || [];
        totalActivities += plan.length;

        let prevEndMinutes = null;
        let prevItemTitle = null;
        let dayDurationSum = 0;

        plan.forEach((item) => {
          const duration = item.durationMinutes || 90;
          dayDurationSum += duration;

          const cat = (item.category || "").toLowerCase();
          const isTransport =
            cat.includes("train") ||
            cat.includes("flight") ||
            cat.includes("bus") ||
            cat.includes("transport") ||
            Boolean(item.trainNumber);

          if (isTransport) {
            totalTravelMinutes += duration;
          }

          const startMin = timeToMinutes(item.startTime);
          const endMin =
            timeToMinutes(item.endTime) ||
            (startMin !== null ? startMin + duration : null);

          // Rule 1: Backward time (Start time is after or equal to End time)
          if (startMin !== null && endMin !== null && startMin >= endMin) {
            scheduleConflicts.push({
              day: dIdx + 1,
              dayIndex: dIdx,
              itemId: item.id,
              itemTitle: item.name || item.activity,
              type: "invalid_time",
              message: `Invalid timing for "${item.name || item.activity}": Start (${item.startTime}) must be earlier than End (${item.endTime}).`,
            });
          }

          // Rule 2: Intra-day Overlap with preceding activity
          if (
            startMin !== null &&
            prevEndMinutes !== null &&
            startMin < prevEndMinutes
          ) {
            const overlapMins = prevEndMinutes - startMin;
            scheduleConflicts.push({
              day: dIdx + 1,
              dayIndex: dIdx,
              itemId: item.id,
              itemTitle: item.name || item.activity,
              type: "overlap",
              message: `Timing overlap: "${item.name || item.activity}" (starts at ${item.startTime}) overlaps with previous activity "${prevItemTitle}" (ends at ${minutesToTimeStr(prevEndMinutes)}) by ${overlapMins} mins.`,
            });
          }

          if (endMin !== null) {
            prevEndMinutes = endMin;
            prevItemTitle = item.name || item.activity;
          }
        });

        // Day overpacking check (>14 hours)
        if (dayDurationSum > 840) {
          warnings.push({
            day: dIdx + 1,
            dayIndex: dIdx,
            type: "overpacked",
            message: `Day ${dIdx + 1} schedule is tightly packed (${Math.round(dayDurationSum / 60)} hrs total).`,
          });
        }
      });
    }

    const travelHours = Math.floor(totalTravelMinutes / 60);
    const travelMins = totalTravelMinutes % 60;
    const formattedTravelTime = `${travelHours}h ${travelMins}m`;

    if (budgetStats.isOverBudget) {
      budgetConflicts.push({
        day: "Budget",
        type: "overbudget",
        message: budgetStats.isCampus
          ? `Campus Trip exceeds total group budget of ₹${budgetStats.totalBudget.toLocaleString("en-IN")} by ₹${budgetStats.overAmount.toLocaleString("en-IN")}.`
          : `Trip exceeds your budget of ₹${budgetStats.totalBudget.toLocaleString("en-IN")} by ₹${budgetStats.overAmount.toLocaleString("en-IN")}.`,
      });
    }

    const conflicts = [...scheduleConflicts, ...budgetConflicts];
    const scheduleConflictsCount = scheduleConflicts.length;
    const conflictsCount = conflicts.length;
    const isFeasible = scheduleConflictsCount === 0;

    return {
      totalActivities,
      scheduleConflicts,
      scheduleConflictsCount,
      budgetConflicts,
      conflictsCount,
      conflicts,
      warnings,
      totalTravelMinutes,
      formattedTravelTime,
      isFeasible,
      isBudgetFeasible: !budgetStats.isOverBudget,
    };
  }, [trip, budgetStats]);

  // Auto-resolve / Cascade timings to eliminate any schedule overlaps
  const autoFixScheduleOverlaps = useCallback((targetDayIdx = null) => {
    setTrip((prevTrip) => {
      if (!prevTrip?.itinerary) return prevTrip;
      let totalAdjusted = 0;

      const newItinerary = prevTrip.itinerary.map((day, dIdx) => {
        if (targetDayIdx !== null && dIdx !== targetDayIdx) return day;
        const plan = [...(day.plan || [])];
        if (plan.length <= 1) return day;

        let currentTimelineMin = 9 * 60 + 30; // Default starts at 09:30 AM
        const adjustedPlan = plan.map((item, pIdx) => {
          const isTransport =
            (item.category || "").toLowerCase().includes("train") ||
            (item.category || "").toLowerCase().includes("flight") ||
            (item.category || "").toLowerCase().includes("bus") ||
            Boolean(item.trainNumber);

          let startMin = timeToMinutes(item.startTime);
          let endMin = timeToMinutes(item.endTime);
          let durationMins =
            startMin !== null && endMin !== null && endMin > startMin
              ? endMin - startMin
              : item.durationMinutes || 90;

          if (pIdx === 0) {
            // First item of the day
            if (startMin === null || isNaN(startMin)) {
              startMin = currentTimelineMin;
            }
            endMin = startMin + durationMins;
            currentTimelineMin = endMin + 20; // 20m buffer
          } else {
            // Non-first item: ensure it starts after the previous activity ends + travel buffer
            if (isTransport && item.departure) {
              const depMin = timeToMinutes(item.departure);
              if (depMin !== null) startMin = depMin;
              endMin = startMin + durationMins;
              currentTimelineMin = endMin + 20;
            } else {
              // If there's an overlap or startMin < currentTimelineMin, shift it forward!
              if (startMin === null || startMin < currentTimelineMin) {
                totalAdjusted++;
                startMin = currentTimelineMin;
                endMin = startMin + durationMins;
              }
              currentTimelineMin = endMin + 20; // 20m buffer for next activity
            }
          }

          const newStartTime = minutesToTimeStr(startMin);
          const newEndTime = minutesToTimeStr(endMin);

          return {
            ...item,
            startTime: newStartTime,
            endTime: newEndTime,
            time: `${newStartTime} - ${newEndTime}`,
            durationMinutes: durationMins,
            duration: `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`,
          };
        });

        return { ...day, plan: adjustedPlan };
      });

      if (totalAdjusted > 0) {
        toast.success(
          `Automatically resolved ${totalAdjusted} schedule timing overlap(s)!`,
          { icon: "⚡" }
        );
      } else {
        toast.success(
          "Schedule timings are fully aligned without overlaps!",
          { icon: "✓" }
        );
      }

      setIsSaved(false);
      return { ...prevTrip, itinerary: newItinerary };
    });
  }, [setTrip, setIsSaved]);

  // Bus Transport Requirements & Preferences
  const busRequirements = useMemo(() => {
    return detectBusRequirements(trip);
  }, [trip]);

  const saveBusPreferences = useCallback((updatedReqs, campusPlan, localTransportPref) => {
    setTrip((prevTrip) => {
      if (!prevTrip) return prevTrip;
      return {
        ...prevTrip,
        busRequirements: updatedReqs,
        ...(campusPlan ? { campusTransportPlan: campusPlan } : {}),
        ...(localTransportPref !== undefined ? { localTransportPreference: localTransportPref } : {}),
      };
    });
    setIsSaved(false);
  }, [setTrip]);

  const saveCampusTransportPlan = useCallback((campusPlan) => {
    setTrip((prevTrip) => {
      if (!prevTrip) return prevTrip;
      return {
        ...prevTrip,
        campusTransportPlan: campusPlan,
      };
    });
    setIsSaved(false);
  }, [setTrip]);

  // Save Itinerary
  const saveItinerary = async () => {
    try {
      localStorage.setItem("currentTrip", JSON.stringify(trip));
      localStorage.setItem("transix_builder_trip", JSON.stringify(trip));

      const token = localStorage.getItem("token");
      if (token && trip._id && !trip._id.startsWith("trip-sample")) {
        try {
          await updateTrip(
            trip._id,
            {
              itinerary: trip.itinerary,
              travelLegs: trip.travelLegs,
              staySegments: trip.staySegments,
              busRequirements: trip.busRequirements || busRequirements,
              campusTransportPlan: trip.campusTransportPlan,
              localTransportPreference: trip.localTransportPreference,
              budget: trip.budget,
              travelers: trip.travelers,
            },
            token
          );
        } catch (apiErr) {
          console.warn("Backend sync fallback to local storage:", apiErr.message);
        }
      }

      setIsSaved(true);
      toast.success("Itinerary saved successfully!", { icon: "💾" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save itinerary.");
    }
  };

  // Reset to default sample
  const resetToSample = () => {
    const fresh = generateDefaultItinerary(trip?.source || "Mumbai", trip?.destination || "Destination", 5);
    setTrip(fresh);
    setActiveDayIndex(0);
    setIsSaved(true);
    toast.success(`Reset Itinerary for ${trip?.destination || "Trip"}`, { icon: "🔄" });
  };

  // Select Hotel for a Stay Segment
  const selectHotelForSegment = useCallback((segmentId, hotelData) => {
    setTrip((prevTrip) => {
      if (!prevTrip || !prevTrip.staySegments) return prevTrip;
      const newSegments = [...prevTrip.staySegments];
      
      // Match by id or location or numeric index
      let idx = newSegments.findIndex(s => (s.id === segmentId) || (s.location === segmentId));
      if (idx === -1 && typeof segmentId === "number" && segmentId >= 0 && segmentId < newSegments.length) {
        idx = segmentId;
      }
      if (idx !== -1) {
        const dummySeg = { ...newSegments[idx], selectedHotel: hotelData };
        const stayPricing = calculateStayAccommodation(dummySeg, prevTrip);
        let updatedHotel = {
          ...hotelData,
          price: stayPricing.groupCost,
          groupPrice: stayPricing.groupCost,
          perStudentPrice: stayPricing.perStudentCost,
          rooms: stayPricing.rooms,
          nightlyPrice: stayPricing.nightlyRate,
          isEstimatedPrice: stayPricing.isEstimated,
        };
        newSegments[idx] = { ...newSegments[idx], selectedHotel: updatedHotel };
      }
      return { ...prevTrip, staySegments: newSegments };
    });
  }, [setTrip]);

  // Select Train for a specific travel journey and update canonical trip itinerary
  const selectTrainForTrip = useCallback(async (train, routeContext = {}) => {
    if (!train || !train.trainNumber) return { success: false, error: "Invalid train data" };
    if (!trip) return { success: false, error: "No active trip found" };

    // 1. Run the deterministic train journey scheduler
    const scheduleResult = scheduleTrainJourneyIntoTrip(trip, train, routeContext);
    if (!scheduleResult.success) {
      return { success: false, error: scheduleResult.error || "Failed to schedule train journey." };
    }

    const proposedTrip = scheduleResult.trip;

    // 2. Run the schedule validator
    const validationResult = validateTripSchedule(proposedTrip);
    if (!validationResult.valid) {
      const errorMsg = validationResult.errors.join(". ");
      console.warn("Schedule validation failed:", errorMsg);
      return {
        success: false,
        error: `Schedule validation failed: ${errorMsg}`,
      };
    }

    // 3. Persist to backend MongoDB if this is an existing database trip
    const token = localStorage.getItem("token");
    const isBackendTrip = Boolean(token && proposedTrip._id && !String(proposedTrip._id).startsWith("trip-"));

    if (isBackendTrip) {
      try {
        await updateTrip(
          proposedTrip._id,
          {
            itinerary: proposedTrip.itinerary,
            travelLegs: proposedTrip.travelLegs,
            staySegments: proposedTrip.staySegments,
          },
          token
        );
      } catch (err) {
        console.error("Failed to persist train to backend Trip:", err);
        const errMsg = err?.response?.data?.message || err?.message || "Failed to save train to server.";
        return { success: false, error: errMsg };
      }
    }

    // 4. Update canonical state in TripBuilderContext and localStorage
    setTrip(proposedTrip);
    setIsSaved(true);

    return {
      success: true,
      actionType: "updated",
      adaptationSummary: scheduleResult.adaptationSummary,
    };
  }, [trip, setTrip]);

  // Preview transport changes (supporting Train or Flight independently) without mutating canonical state
  const previewTransportChanges = useCallback(({ outboundTransport, returnTransport, outboundTrain, returnTrain, outboundFlight, returnFlight, routeContext = {} }) => {
    if (!trip) return { success: false, error: "No active trip found" };
    return buildProposedTransportAdaptation(trip, {
      outboundTransport: outboundTransport || outboundFlight || outboundTrain,
      returnTransport: returnTransport || returnFlight || returnTrain,
      routeContext,
    });
  }, [trip]);

  // Backward-compatible alias for existing train callers
  const previewTrainChanges = useCallback(({ outboundTrain, returnTrain, routeContext = {} }) => {
    return previewTransportChanges({ outboundTrain, returnTrain, routeContext });
  }, [previewTransportChanges]);

  // Apply already-reviewed and user-approved transport adaptation (Train or Flight)
  const applyApprovedTransportChanges = useCallback(async (proposedTrip, adaptationSummary = null) => {
    if (!proposedTrip || !Array.isArray(proposedTrip.itinerary)) {
      return { success: false, error: "Invalid proposed trip data" };
    }

    // Zero-conflict invariant: verify proposed itinerary is strictly conflict-free before persistence
    const preConflicts = detectConflicts(proposedTrip);
    if (preConflicts && preConflicts.length > 0) {
      return {
        success: false,
        error: `Cannot apply changes: itinerary has ${preConflicts.length} schedule conflict(s).`,
      };
    }

    // Persist to backend MongoDB if this is an existing database trip
    const token = localStorage.getItem("token");
    const isBackendTrip = Boolean(token && proposedTrip._id && !String(proposedTrip._id).startsWith("trip-"));

    if (isBackendTrip) {
      try {
        await updateTrip(
          proposedTrip._id,
          {
            itinerary: proposedTrip.itinerary,
            travelLegs: proposedTrip.travelLegs,
            staySegments: proposedTrip.staySegments,
            transport: proposedTrip.transport,
          },
          token
        );
      } catch (err) {
        console.error("Failed to persist approved transport changes to server:", err);
        const errMsg = err?.response?.data?.message || err?.message || "Failed to save transport to server.";
        return { success: false, error: errMsg };
      }
    }

    // Update canonical state in TripBuilderContext and localStorage
    setTrip(proposedTrip);
    setIsSaved(true);

    return {
      success: true,
      actionType: "updated",
      adaptationSummary,
    };
  }, [setTrip]);

  const applyApprovedTrainChanges = applyApprovedTransportChanges;

  // Dynamic scheduling conflict suggestions for Detailed Itinerary
  const schedulingConflicts = useMemo(() => {
    if (!trip || !Array.isArray(trip.itinerary)) return [];
    try {
      const res = generateConflictSuggestions(trip);
      return res.enrichedConflicts || [];
    } catch (e) {
      console.warn("Error computing conflict suggestions:", e);
      return [];
    }
  }, [trip]);

  // Apply safe conflict resolution suggestion
  const applySuggestion = useCallback(async (action) => {
    if (!action || !trip) return;
    setTrip((prevTrip) => {
      if (!prevTrip || !Array.isArray(prevTrip.itinerary)) return prevTrip;
      const newItinerary = prevTrip.itinerary.map(d => ({ ...d, plan: [...(d.plan || [])] }));

      const fromDayIdx = (action.fromDay || action.day) - 1;
      const toDayIdx = (action.toDay || action.day) - 1;
      if (fromDayIdx < 0 || fromDayIdx >= newItinerary.length || toDayIdx < 0 || toDayIdx >= newItinerary.length) {
        return prevTrip;
      }

      const fromPlan = newItinerary[fromDayIdx].plan;
      const itemIdx = fromPlan.findIndex(i => i.id === action.itemId);
      if (itemIdx === -1) return prevTrip;

      const [movedItem] = fromPlan.splice(itemIdx, 1);
      movedItem.startTime = action.startTime;
      movedItem.endTime = action.endTime;
      movedItem.time = `${action.startTime} - ${action.endTime}`;
      const dur = (timeToMinutes(action.endTime) - timeToMinutes(action.startTime)) || movedItem.durationMinutes || 90;
      movedItem.durationMinutes = dur;

      newItinerary[toDayIdx].plan.push(movedItem);
      newItinerary[toDayIdx].plan.sort((a, b) => {
        const aStart = timeToMinutes(a.startTime || (a.time ? String(a.time).split("-")[0] : "00:00")) || 0;
        const bStart = timeToMinutes(b.startTime || (b.time ? String(b.time).split("-")[0] : "00:00")) || 0;
        return aStart - bStart;
      });

      const updated = {
        ...prevTrip,
        itinerary: newItinerary,
      };

      const token = localStorage.getItem("token");
      if (token && updated._id && !String(updated._id).startsWith("trip-")) {
        updateTrip(updated._id, { itinerary: updated.itinerary }, token).catch(e => console.warn("Background update error:", e));
      }

      toast.success(`Rescheduled "${movedItem.name || movedItem.activity}"`, { icon: "✅" });
      return updated;
    });
  }, [trip, setTrip]);

  // Map Modal State
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const openMapModal = useCallback(() => setIsMapModalOpen(true), []);
  const closeMapModal = useCallback(() => setIsMapModalOpen(false), []);

  return (
    <TripBuilderContext.Provider
      value={{
        trip,
        setTrip,
        activeDayIndex,
        setActiveDayIndex,
        draggedItem,
        setDraggedItem,
        dragSource,
        setDragSource,
        searchTerm,
        setSearchTerm,
        selectedCategory,
        setSelectedCategory,
        isFinalizeModalOpen,
        setIsFinalizeModalOpen,
        isMapModalOpen,
        setIsMapModalOpen,
        openMapModal,
        closeMapModal,
        isSaved,
        pendingAlternatives,
        setPendingAlternatives,
        applyAlternative,
        budgetStats,
        validationStats,
        destinationInventory,
        isLoadingInventory,
        addItemToDay,
        removeItemFromDay,
        updateItemTime,
        reorderInDay,
        moveBetweenDays,
        duplicateItem,
        addDay,
        removeDay,
        updateTripMeta,
        saveItinerary,
        resetToSample,
        initializeTrip,
        selectHotelForSegment,
        selectTrainForTrip,
        previewTrainChanges,
        previewTransportChanges,
        applyApprovedTrainChanges,
        applyApprovedTransportChanges,
        schedulingConflicts,
        applySuggestion,
        busRequirements,
        saveBusPreferences,
        saveCampusTransportPlan,
        autoFixScheduleOverlaps,
      }}
    >
      {children}
    </TripBuilderContext.Provider>
  );
}

// Utility to inspect if canonical trip already has a selected train for a given journey direction
export function findSelectedTrainInItinerary(trip, routeContext = {}) {
  if (!trip || !Array.isArray(trip.itinerary)) return null;

  const discovered = findExistingTrainRecord(trip, routeContext.direction || "outbound", routeContext);
  if (discovered) return discovered;

  const {
    direction = "outbound",
    source = trip.source || "Mumbai",
    destination = trip.destination || "Destination",
    dayIndex = null,
  } = routeContext;

  const norm = (str) => (str || "").toLowerCase().trim();
  const tripSrc = norm(trip.source || source || "mumbai");
  const tripDst = norm(trip.destination || destination || "destination");
  const targetDir = String(direction).toLowerCase();
  const totalDays = trip.itinerary.length;

  for (let d = 0; d < totalDays; d++) {
    if (dayIndex !== null && d !== dayIndex) continue;
    const plan = trip.itinerary[d]?.plan || [];
    for (const item of plan) {
      if (!item || !item.trainNumber) continue;

      if (item.journeyDirection) {
        if (item.journeyDirection === targetDir) return item;
        continue;
      }

      const act = norm(item.activity || item.name || "");
      const notes = norm(item.notes || "");
      const rSrc = norm(item.routeSource || item.source || item.from?.name || item.from?.code || "");
      const rDst = norm(item.routeDestination || item.destination || item.to?.name || item.to?.code || "");

      if (targetDir === "return") {
        if (act.includes("return") || act.includes("farewell") || act.includes("back to") || notes.includes("return journey")) return item;
        if (rSrc.includes(tripDst) && rDst.includes(tripSrc)) return item;
        if (d >= totalDays - 1 && (rDst.includes(tripSrc) || rSrc.includes(tripDst))) return item;
      } else {
        // Outbound
        if (act.includes("return") || act.includes("farewell") || act.includes("back to") || notes.includes("return journey")) continue;
        if (rSrc.includes(tripSrc) && rDst.includes(tripDst)) return item;
        if (d === 0 || d === 1) return item;
      }
    }
  }

  // Also check trip.travelLegs if present
  if (Array.isArray(trip.travelLegs)) {
    const leg = trip.travelLegs.find(l => {
      if (!l.trainNumber) return false;
      if (l.journeyDirection) return l.journeyDirection === targetDir;
      if (targetDir === "return") {
        return norm(l.to || l.destination).includes(tripSrc) || norm(l.from || l.source).includes(tripDst);
      } else {
        return norm(l.from || l.source).includes(tripSrc) || norm(l.to || l.destination).includes(tripDst);
      }
    });
    if (leg) return leg;
  }

  return null;
}

// Utility to inspect if canonical trip already has a selected flight for a given journey direction
export function findSelectedFlightInItinerary(trip, routeContext = {}) {
  if (!trip || !Array.isArray(trip.itinerary)) return null;
  const discovered = findExistingTransportRecord(trip, routeContext.direction || "outbound", routeContext);
  if (discovered && (discovered.mode === "flight" || discovered.flightNumber)) {
    return discovered;
  }
  return null;
}

// Unified utility to inspect existing transport (train or flight) for a given journey direction
export function findSelectedTransportInItinerary(trip, routeContext = {}) {
  if (!trip || !Array.isArray(trip.itinerary)) return null;
  return findExistingTransportRecord(trip, routeContext.direction || "outbound", routeContext);
}
