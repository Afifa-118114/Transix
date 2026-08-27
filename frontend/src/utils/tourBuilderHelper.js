import toast from "react-hot-toast";

// Parse price safely
export const parsePrice = (priceVal) => {
  if (typeof priceVal === "number") return priceVal;
  if (!priceVal) return 0;
  const cleaned = String(priceVal).replace(/[^0-9.]/g, "");
  return parseFloat(cleaned) || 0;
};

// Add an item directly to the current trip in localStorage
export const addItemToTourBuilder = (item, dayIndex = 0, navigate = null) => {
  try {
    let currentTrip = null;
    const saved = localStorage.getItem("currentTrip") || localStorage.getItem("transix_builder_trip");
    if (saved) {
      try {
        currentTrip = JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing saved trip in tourBuilderHelper:", e);
      }
    }

    if (!currentTrip || typeof currentTrip !== "object") {
      currentTrip = {
        _id: `trip-${Date.now()}`,
        source: item.source || "Mumbai",
        destination: item.destination || "Destination",
        duration: "5 Days",
        travelers: 2,
        budget: 50000,
        currency: "INR",
        itinerary: [],
      };
    }

    // Ensure itinerary has at least 1 day
    if (!Array.isArray(currentTrip.itinerary) || currentTrip.itinerary.length === 0) {
      currentTrip.itinerary = [
        {
          day: 1,
          title: `Day 1 — Arrival & Exploration in ${currentTrip.destination || "City"}`,
          date: "Day 1",
          plan: [],
        },
      ];
    }

    const safeDayIdx = Math.max(0, Math.min(dayIndex, currentTrip.itinerary.length - 1));
    const targetDay = currentTrip.itinerary[safeDayIdx] || {
      day: 1,
      title: "Day 1",
      date: "Day 1",
      plan: [],
    };

    const newItem = {
      id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      trainNumber: item.trainNumber,
      trainName: item.trainName,
      type: item.type,
      runningDays: item.runningDays,
      departure: item.departure,
      arrival: item.arrival,
      source: item.source,
      destination: item.destination,
      stops: item.stops !== undefined ? item.stops : item.totalStops,
      totalStops: item.totalStops !== undefined ? item.totalStops : item.stops,
      route: item.route,
      fares: item.fares,
      name: item.name || item.title || item.trainName || item.activity || "Selected Place",
      activity: item.activity || item.name || item.title || item.trainName || "Selected Place",
      place: item.place || item.location || item.address || item.city || currentTrip.destination || "Destination",
      location: item.location || item.address || item.place || currentTrip.destination || "Destination",
      category: item.category || "activity",
      categoryLabel: item.categoryLabel || "Activities",
      icon: item.icon || "✨",
      price: parsePrice(item.price || item.estimatedCost || item.fare || 500),
      displayPrice: item.displayPrice || `₹${parsePrice(item.price || item.estimatedCost || item.fare || 500).toLocaleString()}`,
      duration: item.duration || "2 hours",
      durationMinutes: item.durationMinutes || 120,
      rating: item.rating || 4.8,
      dnaMatch: item.dnaMatch || 94,
      image: item.image || item.heroImage || "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=600",
      notes: item.notes || item.description || (item.departure && item.arrival ? `Departs ${item.departure} • Arrives ${item.arrival} (${item.duration || ""})` : "Added from discovery"),
      time: item.time || (item.departure && item.arrival ? `${item.departure} - ${item.arrival}` : "10:00 AM - 12:00 PM"),
    };

    const updatedPlan = [...(targetDay.plan || []), newItem];
    const updatedItinerary = [...currentTrip.itinerary];
    updatedItinerary[safeDayIdx] = {
      ...targetDay,
      plan: updatedPlan,
    };

    const updatedTrip = {
      ...currentTrip,
      itinerary: updatedItinerary,
    };

    localStorage.setItem("currentTrip", JSON.stringify(updatedTrip));
    localStorage.removeItem("transix_builder_trip");
    window.dispatchEvent(new CustomEvent("transix_trip_updated", { detail: updatedTrip }));

    toast.success(
      `Added "${newItem.name}" to Day ${safeDayIdx + 1}!`,
      {
        icon: item.icon || "✨",
        duration: 3500,
      }
    );

    if (navigate) {
      navigate("/builder");
    }

    return true;
  } catch (err) {
    console.error("Error adding to Tour Builder:", err);
    toast.error("Could not add item to trip.");
    return false;
  }
};
