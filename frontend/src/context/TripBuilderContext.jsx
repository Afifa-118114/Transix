import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { getDestinationInventory } from "../services/inventoryService";
import { detectConflicts, findEarliestValidSlot } from "../utils/schedulingEngine";
import { generateSmartAlternatives } from "../utils/alternativeEngine";
import { normalizeTrip, getDuration, timeToMinutes, minutesToTimeStr, parsePrice } from "../utils/formatTrip";
import { normalizeInventoryItem } from "../utils/normalizeInventoryItem";
import { updateTrip } from "../api/tripApi";

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

  // Validate before commit (replaces proposeTripUpdate)
  const validateAndApplyUpdate = (prevTrip, proposedTrip, item, targetDayNum) => {
    console.log("[CASCADE DEBUG] validateAndApplyUpdate started");
    console.log("[CASCADE DEBUG] item:", item);
    
    const conflicts = detectConflicts(proposedTrip);
    console.log("[CASCADE DEBUG] detectConflicts returned:", conflicts);
    
    const itemIdsToCheck = item ? [item.id] : [];
    console.log("[CASCADE DEBUG] itemIdsToCheck:", itemIdsToCheck);
    
    if (conflicts.length > 0 && item) {
      const relevantConflicts = conflicts.filter(c => 
         itemIdsToCheck.includes(c.itemId) || itemIdsToCheck.includes(c.conflictingItemId)
      );
      console.log("[CASCADE DEBUG] relevantConflicts:", relevantConflicts);

      if (relevantConflicts.length > 0) {
         console.log("[CASCADE DEBUG] REJECTING DROP. Generating alternatives...");
         const alternatives = generateSmartAlternatives(prevTrip, item, targetDayNum);
         console.log("[CASCADE DEBUG] generated alternatives:", alternatives);
         setPendingAlternatives({ item, targetDay: targetDayNum, alternatives, conflicts: relevantConflicts });
         toast.error("Schedule Conflict Detected", { icon: "❌" });
         return false; // Rejected
      }
    }
    
    console.log("[CASCADE DEBUG] ACCEPTING DROP.");
    setTrip(proposedTrip);
    setIsSaved(false);
    return true; // Accepted
  };

  const applyAlternative = (alternative) => {
    if (alternative && alternative.candidateTrip) {
       // Re-validate the candidate trip in case state shifted
       const conflicts = detectConflicts(alternative.candidateTrip);
       if (conflicts.length > 0) {
           toast.error("This suggestion is no longer valid due to a schedule conflict.", { icon: "❌" });
           return;
       }
       
       setTrip(alternative.candidateTrip);
       setPendingAlternatives(null);
       setIsSaved(false);
       toast.success("Schedule adjusted successfully!");
    }
  };

  // Add Item to a Day
  const addItemToDay = (dayIndex, item, targetIndex = null) => {
    const prevTrip = trip;
    if (!prevTrip) return;

    let normalizedItem;
    try {
      normalizedItem = normalizeInventoryItem(item);
    } catch (err) {
      toast.error("Invalid item. Cannot schedule.");
      return;
    }

    const newItinerary = [...prevTrip.itinerary];
    const targetDay = newItinerary[dayIndex] || newItinerary[0];
    if (!targetDay) return;
    
    const currentPlan = [...(targetDay.plan || [])];

    let intendedStartTime = normalizedItem.startTime;
    let intendedEndTime = normalizedItem.endTime;
    let duration = normalizedItem.durationMinutes || 90;

    if (!intendedStartTime) {
       if (targetIndex !== null && targetIndex > 0 && currentPlan[targetIndex - 1]) {
           const prevItem = currentPlan[targetIndex - 1];
           let prevEndMin = timeToMinutes(prevItem.endTime);
           if (prevEndMin === null) prevEndMin = (timeToMinutes(prevItem.startTime) || 9 * 60) + (prevItem.durationMinutes || 90);
           const startMin = prevEndMin + 30; // 30 min buffer
           intendedStartTime = minutesToTimeStr(startMin);
           intendedEndTime = minutesToTimeStr(startMin + duration);
       } else if (targetIndex === 0 || currentPlan.length === 0) {
           const startMin = 9 * 60 + 30; // 9:30 AM
           intendedStartTime = minutesToTimeStr(startMin);
           intendedEndTime = minutesToTimeStr(startMin + duration);
       } else {
           const lastItem = currentPlan[currentPlan.length - 1];
           let lastEndMin = lastItem ? timeToMinutes(lastItem.endTime) : null;
           if (lastItem && lastEndMin === null) lastEndMin = (timeToMinutes(lastItem.startTime) || 9 * 60) + (lastItem.durationMinutes || 90);
           const startMin = lastEndMin !== null ? lastEndMin + 30 : 9 * 60 + 30;
           intendedStartTime = minutesToTimeStr(startMin);
           intendedEndTime = minutesToTimeStr(startMin + duration);
       }
    }

    const newItem = {
      ...normalizedItem,
      startTime: intendedStartTime,
      endTime: intendedEndTime,
      time: `${intendedStartTime} - ${intendedEndTime}`,
      durationMinutes: duration,
    };

    let insertIdx = currentPlan.length;
    if (targetIndex !== null && targetIndex >= 0 && targetIndex <= currentPlan.length) {
      insertIdx = targetIndex;
    } else {
      const newItemStartMin = timeToMinutes(newItem.startTime);
      const nextItemIdx = currentPlan.findIndex(p => timeToMinutes(p.startTime) > newItemStartMin);
      if (nextItemIdx !== -1) insertIdx = nextItemIdx;
    }

    currentPlan.splice(insertIdx, 0, newItem);
    newItinerary[dayIndex] = { ...targetDay, plan: currentPlan };

    const proposedTrip = { ...prevTrip, itinerary: newItinerary };

    if (validateAndApplyUpdate(prevTrip, proposedTrip, newItem, dayIndex + 1)) {
       toast.success(`Added "${newItem.name}" to Day ${dayIndex + 1}!`, {
         icon: newItem.icon || "✨",
       });
    }
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
    const prevTrip = trip;
    if (!prevTrip) return false;

    const newItinerary = [...prevTrip.itinerary];
    const targetDay = newItinerary[dayIndex];
    if (!targetDay) return false;
    
    let updatedItem = null;
    const updatedPlan = targetDay.plan.map((item) => {
      if (item.id === itemId) {
        const formattedStart = minutesToTimeStr(startMin);
        const formattedEnd = minutesToTimeStr(endMin);
        updatedItem = {
          ...item,
          startTime: formattedStart,
          endTime: formattedEnd,
          time: `${formattedStart} - ${formattedEnd}`,
          duration: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
          durationMinutes,
          travelBuffer,
        };
        return updatedItem;
      }
      return item;
    });

    newItinerary[dayIndex] = { ...targetDay, plan: updatedPlan };
    const proposedTrip = { ...prevTrip, itinerary: newItinerary };

    if (validateAndApplyUpdate(prevTrip, proposedTrip, updatedItem, dayIndex + 1)) {
      toast.success("Timing updated successfully!", { icon: "⏰" });
      return true;
    }
    return false;
  };

  // Reorder Items within the same Day
  const reorderInDay = (dayIndex, sourceIndex, targetIndex) => {
    if (sourceIndex === targetIndex) return;

    const prevTrip = trip;
    if (!prevTrip) return;

    const newItinerary = [...prevTrip.itinerary];
    const targetDay = newItinerary[dayIndex];
    if (!targetDay) return;

    const plan = [...targetDay.plan];
    const [movedItem] = plan.splice(sourceIndex, 1);
    plan.splice(targetIndex, 0, movedItem);

    newItinerary[dayIndex] = { ...targetDay, plan };
    const proposedTrip = { ...prevTrip, itinerary: newItinerary };

    if (validateAndApplyUpdate(prevTrip, proposedTrip, movedItem, dayIndex + 1)) {
      toast.success("Sequence updated", { icon: "🔄" });
    }
  };

  // Move Item from one Day to another Day
  const moveBetweenDays = (sourceDayIndex, targetDayIndex, sourceIndex, targetIndex = null) => {
    const prevTrip = trip;
    if (!prevTrip) return;

    const newItinerary = [...prevTrip.itinerary];
    const sourceDay = newItinerary[sourceDayIndex];
    const targetDay = newItinerary[targetDayIndex];
    if (!sourceDay || !targetDay) return;

    const sourcePlan = [...sourceDay.plan];
    const targetPlan = [...targetDay.plan];

    const [movedItem] = sourcePlan.splice(sourceIndex, 1);

    if (targetIndex !== null && targetIndex >= 0 && targetIndex <= targetPlan.length) {
      targetPlan.splice(targetIndex, 0, movedItem);
    } else {
      targetPlan.push(movedItem);
    }

    newItinerary[sourceDayIndex] = { ...sourceDay, plan: sourcePlan };
    newItinerary[targetDayIndex] = { ...targetDay, plan: targetPlan };

    const proposedTrip = { ...prevTrip, itinerary: newItinerary };

    if (validateAndApplyUpdate(prevTrip, proposedTrip, movedItem, targetDayIndex + 1)) {
      toast.success(`Moved to Day ${targetDayIndex + 1}`, { icon: "✨" });
    }
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
    let totalSpent = 0;
    const breakdown = {
      Transport: 0,
      Hotels: 0,
      Activities: 0,
      Food: 0,
      "Local Transport": 0,
      Shopping: 0,
      Experiences: 0,
    };

    if (trip?.itinerary) {
      trip.itinerary.forEach((day) => {
        (day.plan || []).forEach((item) => {
          const price = parsePrice(item.price || item.estimatedCost || item.fare || 0);
          totalSpent += price;

          const cat = (item.category || "").toLowerCase();
          if (cat.includes("train") || cat.includes("flight") || cat.includes("bus")) {
            breakdown.Transport += price;
          } else if (cat.includes("hotel") || cat.includes("stay")) {
            breakdown.Hotels += price;
          } else if (cat.includes("activity") || cat.includes("sightseeing")) {
            breakdown.Activities += price;
          } else if (cat.includes("food") || cat.includes("dining") || cat.includes("cafe")) {
            breakdown.Food += price;
          } else if (cat.includes("transport") || cat.includes("taxi") || cat.includes("cab")) {
            breakdown["Local Transport"] += price;
          } else if (cat.includes("shopping")) {
            breakdown.Shopping += price;
          } else if (cat.includes("experience")) {
            breakdown.Experiences += price;
          } else {
            breakdown.Activities += price;
          }
        });
      });
    }

    const totalBudget = Number(trip?.budget) || 60000;
    const remaining = totalBudget - totalSpent;
    const isOverBudget = remaining < 0;
    const overAmount = Math.abs(remaining);
    const spentPercentage = Math.min(100, Math.round((totalSpent / totalBudget) * 100));

    return {
      totalBudget,
      totalSpent,
      remaining,
      isOverBudget,
      overAmount,
      spentPercentage,
      breakdown,
    };
  }, [trip]);

  // Validation Engine with Travel Buffers & Conflict Tracking
  const validationStats = useMemo(() => {
    let totalActivities = 0;
    let conflictsCount = 0;
    const conflicts = [];
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
          if (cat.includes("train") || cat.includes("flight") || cat.includes("bus") || cat.includes("transport")) {
            totalTravelMinutes += duration;
          }

          const startMin = timeToMinutes(item.startTime);
          const endMin = timeToMinutes(item.endTime) || (startMin !== null ? startMin + duration : null);

          // Rule 1: Backward time
          if (startMin !== null && endMin !== null && startMin >= endMin) {
            conflictsCount++;
            conflicts.push({
              day: dIdx + 1,
              itemId: item.id,
              itemTitle: item.name || item.activity,
              type: "invalid_time",
              message: `Invalid timing for "${item.name || item.activity}": Start (${item.startTime}) must be earlier than End (${item.endTime}).`,
            });
          }

          // Rule 2: Overlap with previous item
          if (startMin !== null && prevEndMinutes !== null && startMin < prevEndMinutes) {
            conflictsCount++;
            conflicts.push({
              day: dIdx + 1,
              itemId: item.id,
              itemTitle: item.name || item.activity,
              type: "overlap",
              message: `Schedule overlap on Day ${dIdx + 1}: "${item.name || item.activity}" starts at ${item.startTime} before "${prevItemTitle}" ends (${minutesToTimeStr(prevEndMinutes)}).`,
            });
          }

          // Rule 3: Insufficient Travel Buffer check
          if (startMin !== null && prevEndMinutes !== null && startMin >= prevEndMinutes && startMin - prevEndMinutes < 15) {
            conflicts.push({
              day: dIdx + 1,
              itemId: item.id,
              itemTitle: item.name || item.activity,
              type: "buffer_warning",
              message: `Tight transition (${startMin - prevEndMinutes}m buffer) between "${prevItemTitle}" and "${item.name || item.activity}".`,
            });
          }

          if (endMin !== null) {
            prevEndMinutes = endMin;
            prevItemTitle = item.name || item.activity;
          }
        });

        // Day overpacking check (>14 hours)
        if (dayDurationSum > 840) {
          conflictsCount++;
          conflicts.push({
            day: dIdx + 1,
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
      conflictsCount++;
      conflicts.push({
        day: "Budget",
        type: "overbudget",
        message: `Trip exceeds your budget of ₹${budgetStats.totalBudget.toLocaleString("en-IN")} by ₹${budgetStats.overAmount.toLocaleString("en-IN")}.`,
      });
    }

    const isFeasible = conflictsCount === 0 && !budgetStats.isOverBudget;

    return {
      totalActivities,
      conflictsCount,
      conflicts,
      totalTravelMinutes,
      formattedTravelTime,
      isFeasible,
    };
  }, [trip, budgetStats]);

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
      }}
    >
      {children}
    </TripBuilderContext.Provider>
  );
}
