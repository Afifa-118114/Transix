import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { getDestinationInventory } from "../services/inventoryService";
import { normalizeTrip, timeToMinutes, minutesToTimeStr, parsePrice } from "../utils/formatTrip";

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

  // Add Item to a Day
  const addItemToDay = (dayIndex, item, targetIndex = null) => {
    setTrip((prevTrip) => {
      const newItinerary = [...prevTrip.itinerary];
      const targetDay = newItinerary[dayIndex] || newItinerary[0] || {
        day: 1,
        title: "Day 1",
        date: "Day 1",
        plan: [],
      };
      const currentPlan = [...(targetDay.plan || [])];

      const durationMinutes = item.durationMinutes || 90;
      const { startTime, endTime } = calculateSuggestedStartTime(currentPlan, durationMinutes);

      const newItem = {
        ...item,
        id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        startTime,
        endTime,
        time: `${startTime} - ${endTime}`,
        duration: item.duration || `${Math.round(durationMinutes / 60)} hours`,
        durationMinutes,
        price: parsePrice(item.price || item.estimatedCost || item.fare),
        displayPrice: item.displayPrice || (item.price || item.fare ? `₹${parsePrice(item.price || item.fare).toLocaleString()}` : null),
        dnaMatch: item.dnaMatch || 94,
        rating: item.rating || 4.8,
      };

      if (targetIndex !== null && targetIndex >= 0 && targetIndex <= currentPlan.length) {
        currentPlan.splice(targetIndex, 0, newItem);
      } else {
        currentPlan.push(newItem);
      }

      newItinerary[dayIndex] = {
        ...targetDay,
        plan: currentPlan,
      };

      return {
        ...prevTrip,
        itinerary: newItinerary,
      };
    });

    setIsSaved(false);
    toast.success(`Added "${item.name || item.activity || "Item"}" to Day ${dayIndex + 1}!`, {
      icon: item.icon || "✨",
    });
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

  // Reorder Items within the same Day
  const reorderInDay = (dayIndex, sourceIndex, targetIndex) => {
    if (sourceIndex === targetIndex) return;

    setTrip((prevTrip) => {
      const newItinerary = [...prevTrip.itinerary];
      const targetDay = newItinerary[dayIndex];
      if (!targetDay) return prevTrip;

      const plan = [...targetDay.plan];
      const [movedItem] = plan.splice(sourceIndex, 1);
      plan.splice(targetIndex, 0, movedItem);

      newItinerary[dayIndex] = {
        ...targetDay,
        plan,
      };

      return {
        ...prevTrip,
        itinerary: newItinerary,
      };
    });

    setIsSaved(false);
    toast.success("Sequence updated", { icon: "🔄" });
  };

  // Move Item from one Day to another Day
  const moveBetweenDays = (sourceDayIndex, targetDayIndex, sourceIndex, targetIndex = null) => {
    setTrip((prevTrip) => {
      const newItinerary = [...prevTrip.itinerary];
      const sourceDay = newItinerary[sourceDayIndex];
      const targetDay = newItinerary[targetDayIndex];
      if (!sourceDay || !targetDay) return prevTrip;

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

      return {
        ...prevTrip,
        itinerary: newItinerary,
      };
    });

    setIsSaved(false);
    toast.success(`Moved to Day ${targetDayIndex + 1}`, { icon: "✨" });
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
    const isFeasible = conflictsCount === 0;

    return {
      totalActivities,
      conflictsCount,
      conflicts,
      totalTravelMinutes,
      formattedTravelTime,
      isFeasible,
    };
  }, [trip]);

  // Save Itinerary
  const saveItinerary = async () => {
    try {
      localStorage.setItem("currentTrip", JSON.stringify(trip));
      localStorage.setItem("transix_builder_trip", JSON.stringify(trip));

      const token = localStorage.getItem("token");
      if (token && trip._id && !trip._id.startsWith("trip-sample")) {
        try {
          await axios.put(
            `http://localhost:5000/api/trips/${trip._id}`,
            {
              itinerary: trip.itinerary,
              budget: trip.budget,
              travelers: trip.travelers,
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
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
