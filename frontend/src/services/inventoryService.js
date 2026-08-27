import { getHotels, getPlaces } from "../api/placeApi";
import { searchTrains } from "./trainService";
import generateTransportData from "../utils/transportGenerator";

// In-memory destination inventory cache to avoid redundant API requests
const inventoryCache = new Map();

/**
 * Normalizes price values into a numeric amount and clean display string
 */
export const normalizePrice = (rawPrice, priceLevel) => {
  if (typeof rawPrice === "number") {
    return {
      amount: rawPrice,
      display: `₹${rawPrice.toLocaleString()}`,
      isReal: true,
    };
  }

  if (typeof rawPrice === "string" && rawPrice.trim()) {
    const cleaned = rawPrice.replace(/[^0-9.]/g, "");
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed) && parsed > 0) {
      return {
        amount: parsed,
        display: rawPrice.startsWith("₹") ? rawPrice : `₹${parsed.toLocaleString()}`,
        isReal: true,
      };
    }
    // E.g. "Free" or "Budget (₹)"
    return {
      amount: 0,
      display: rawPrice,
      isReal: false,
    };
  }

  if (priceLevel) {
    return {
      amount: null,
      display: priceLevel,
      isReal: false,
    };
  }

  return {
    amount: null,
    display: "Price unavailable",
    isReal: false,
  };
};

/**
 * Fetches and normalizes destination inventory for Home and Builder
 */
export async function getDestinationInventory(destination = "Kerala", trip = null, token = null) {
  const destKey = (destination || "Kerala").trim().toLowerCase();

  if (inventoryCache.has(destKey)) {
    return inventoryCache.get(destKey);
  }

  const authToken = token || localStorage.getItem("token");

  try {
    // 1. Fetch real hotels
    let rawHotels = [];
    try {
      rawHotels = await getHotels(destination, authToken);
    } catch (e) {
      console.warn("Could not fetch real hotels from API:", e.message);
    }

    // 2. Fetch real attractions / sightseeing
    let rawAttractions = [];
    try {
      rawAttractions = await getPlaces(destination, "Tourist attractions", authToken);
    } catch (e) {
      console.warn("Could not fetch real attractions from API:", e.message);
    }

    // 3. Fetch real restaurants / dining
    let rawRestaurants = [];
    try {
      rawRestaurants = await getPlaces(destination, "Restaurants", authToken);
    } catch (e) {
      console.warn("Could not fetch real restaurants from API:", e.message);
    }

    // 4. Generate Transit for trip route
    const currentTripObj = trip || {
      source: "Mumbai",
      destination: destination,
      travelMode: "Train",
    };

    const trainOptions = generateTransportData({ ...currentTripObj, travelMode: "Train" });
    const flightOptions = generateTransportData({ ...currentTripObj, travelMode: "Flight" });
    const busOptions = generateTransportData({ ...currentTripObj, travelMode: "Bus" });
    const cabOptions = generateTransportData({ ...currentTripObj, travelMode: "Car" });

    // Normalize Hotels
    const hotels = (Array.isArray(rawHotels) ? rawHotels : []).map((h) => {
      const priceInfo = normalizePrice(h.price, h.priceLevel);
      return {
        id: h.id || `hotel-${h.name.replace(/\s+/g, "-").toLowerCase()}`,
        name: h.name,
        category: "hotel",
        categoryLabel: "Hotels",
        icon: "🏨",
        location: h.address || destination,
        city: destination,
        rating: h.rating || null,
        reviews: h.reviews || null,
        price: priceInfo.amount,
        displayPrice: priceInfo.display,
        priceLevel: h.priceLevel || null,
        duration: "Overnight Stay",
        durationMinutes: 720,
        dnaMatch: h.rating ? Math.round(h.rating * 20) : 90,
        image: h.image || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600",
        photos: h.photos || (h.image ? [{ url: h.image }] : []),
        website: h.website || null,
        phone: h.phone || null,
        mapsUrl: h.mapsUrl || `https://maps.google.com/?q=${encodeURIComponent(h.name + " " + destination)}`,
        coordinates: h.coordinates || null,
        openingHours: h.openingHours || null,
        businessStatus: h.businessStatus || "OPERATIONAL",
        notes: h.address ? `Located at ${h.address}` : "Premium accommodation near destination center.",
        defaultTime: "14:00 - 11:00 AM",
      };
    });

    // Normalize Activities
    const activities = (Array.isArray(rawAttractions) ? rawAttractions : []).map((a, idx) => {
      const priceInfo = normalizePrice(a.price, a.priceLevel);
      return {
        id: a.id || `act-${idx}`,
        name: a.name,
        activity: a.name,
        category: "activity",
        categoryLabel: "Activities",
        icon: "🎟️",
        location: a.address || destination,
        city: destination,
        rating: a.rating || 4.7,
        reviews: a.reviews || 150,
        price: priceInfo.amount || 500,
        displayPrice: priceInfo.display,
        duration: "2 hours",
        durationMinutes: 120,
        dnaMatch: a.rating ? Math.round(a.rating * 20) : 92,
        image: a.image || `https://picsum.photos/600/400?random=${idx + 10}`,
        photos: a.photos || (a.image ? [{ url: a.image }] : []),
        website: a.website || null,
        phone: a.phone || null,
        mapsUrl: a.mapsUrl || `https://maps.google.com/?q=${encodeURIComponent(a.name + " " + destination)}`,
        coordinates: a.coordinates || null,
        openingHours: a.openingHours || null,
        notes: a.address ? `Located at ${a.address}` : "Top-rated local attraction.",
        defaultTime: "10:00 AM - 12:00 PM",
      };
    });

    // Normalize Food / Dining
    const food = (Array.isArray(rawRestaurants) ? rawRestaurants : []).map((f, idx) => {
      const priceInfo = normalizePrice(f.price, f.priceLevel);
      return {
        id: f.id || `food-${idx}`,
        name: f.name,
        activity: `Dine at ${f.name}`,
        category: "food",
        categoryLabel: "Food & Dining",
        icon: "🍴",
        location: f.address || destination,
        city: destination,
        rating: f.rating || 4.6,
        reviews: f.reviews || 200,
        price: priceInfo.amount || 600,
        displayPrice: priceInfo.display,
        duration: "1.5 hours",
        durationMinutes: 90,
        dnaMatch: f.rating ? Math.round(f.rating * 20) : 94,
        image: f.image || `https://picsum.photos/600/400?random=${idx + 30}`,
        photos: f.photos || (f.image ? [{ url: f.image }] : []),
        website: f.website || null,
        phone: f.phone || null,
        mapsUrl: f.mapsUrl || `https://maps.google.com/?q=${encodeURIComponent(f.name + " " + destination)}`,
        coordinates: f.coordinates || null,
        openingHours: f.openingHours || null,
        notes: f.address ? `Restaurant at ${f.address}` : "Authentic regional culinary experience.",
        defaultTime: "13:00 - 14:30 PM",
      };
    });

    // 4. Load real trains from backend / Kaggle dataset
    let rawTrains = [];
    try {
      const trainData = await searchTrains(currentTripObj.source, destination);
      rawTrains = trainData?.trains || (Array.isArray(trainData) ? trainData : []);
    } catch (e) {
      console.warn("Could not fetch real trains for inventory:", e.message);
    }

    // Normalize Trains strictly from real dataset API
    const trains = (Array.isArray(rawTrains) ? rawTrains : []).map((t) => {
      const fareAmount = t.price || t.fare || null;
      const fromDisplay = t.from?.name || t.from?.code || t.source || currentTripObj.source;
      const toDisplay = t.to?.name || t.to?.code || t.destination || destination;
      return {
        id: `train-${t.trainNumber}`,
        trainNumber: t.trainNumber,
        trainName: t.trainName,
        type: t.type || "Express",
        name: `${t.trainName} (#${t.trainNumber})`,
        activity: `Train Journey: ${fromDisplay} → ${toDisplay}`,
        category: "train",
        categoryLabel: "Trains",
        icon: "🚆",
        source: fromDisplay,
        destination: toDisplay,
        location: `${fromDisplay} → ${toDisplay}`,
        departure: t.departure,
        arrival: t.arrival,
        price: fareAmount,
        displayPrice: fareAmount ? `₹${fareAmount.toLocaleString()}` : "Fare on IRCTC",
        rating: 4.8,
        reviews: 1200,
        duration: t.duration || "Direct",
        durationMinutes: t.durationMinutes || 0,
        dnaMatch: 95,
        image: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=600",
        notes: `Departure: ${t.departure} • Arrival: ${t.arrival} (${t.duration})`,
        defaultTime: `${t.departure} - ${t.arrival}`,
        stops: t.stops !== undefined ? t.stops : t.totalStops !== undefined ? t.totalStops : 0,
        route: t.route,
        fares: t.fares,
        runningDays: t.runningDays,
      };
    });

    // Normalize Flights
    const flights = flightOptions.map((f) => {
      const priceInfo = normalizePrice(f.price);
      return {
        id: `flight-${f.id || f.name}`,
        name: `${f.name} (${f.operator})`,
        activity: `Flight Journey: ${currentTripObj.source} → ${destination}`,
        category: "flight",
        categoryLabel: "Flights",
        icon: "✈️",
        location: `${currentTripObj.source} Airport → ${destination}`,
        price: priceInfo.amount || 5200,
        displayPrice: priceInfo.display,
        rating: f.rating || 4.8,
        reviews: f.reviews || 1500,
        duration: f.duration || "2h 15m",
        durationMinutes: 135,
        dnaMatch: 92,
        image: f.image,
        notes: `Departure: ${f.departure} • Arrival: ${f.arrival}`,
        defaultTime: `${f.departure} - ${f.arrival}`,
      };
    });

    // Normalize Bus
    const buses = busOptions.map((b) => {
      const priceInfo = normalizePrice(b.price);
      return {
        id: `bus-${b.id || b.name}`,
        name: `${b.name} (${b.operator})`,
        activity: `Bus Journey: ${currentTripObj.source} → ${destination}`,
        category: "bus",
        categoryLabel: "Bus",
        icon: "🚌",
        location: `${currentTripObj.source} Terminal → ${destination}`,
        price: priceInfo.amount || 1100,
        displayPrice: priceInfo.display,
        rating: b.rating || 4.5,
        reviews: b.reviews || 800,
        duration: b.duration || "8h 00m",
        durationMinutes: 480,
        dnaMatch: 88,
        image: b.image,
        notes: `Departure: ${b.departure} • Arrival: ${b.arrival}`,
        defaultTime: `${b.departure} - ${b.arrival}`,
      };
    });

    // Local Transport Cabs
    const transport = cabOptions.map((c) => {
      const priceInfo = normalizePrice(c.price);
      return {
        id: `cab-${c.id || c.name}`,
        name: `${c.name} (${c.operator})`,
        activity: `Private Cab Tour: ${destination}`,
        category: "transport",
        categoryLabel: "Local Transport",
        icon: "🚗",
        location: `${destination} City Sightseeing`,
        price: priceInfo.amount || 3500,
        displayPrice: priceInfo.display,
        rating: c.rating || 4.8,
        reviews: c.reviews || 500,
        duration: c.duration || "6 hours",
        durationMinutes: 360,
        dnaMatch: 95,
        image: c.image,
        notes: "Flexible air-conditioned private vehicle with driver-guide.",
        defaultTime: "09:00 AM - 15:00 PM",
      };
    });

    // Curated Experiences
    const experiences = [
      {
        id: `exp-wellness-${destination.toLowerCase()}`,
        name: `Ayurvedic & Wellness Therapy in ${destination}`,
        activity: "Rejuvenation Spa & Herbal Session",
        category: "experience",
        categoryLabel: "Experiences",
        icon: "🌿",
        location: `${destination} Wellness Zone`,
        price: 2800,
        displayPrice: "₹2,800",
        rating: 4.9,
        reviews: 420,
        duration: "2 hours",
        durationMinutes: 120,
        dnaMatch: 97,
        image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600",
        notes: "Authentic therapeutic wellness session.",
        defaultTime: "16:00 - 18:00 PM",
      },
      {
        id: `exp-nature-${destination.toLowerCase()}`,
        name: `Scenic Nature & Sunset Safari in ${destination}`,
        activity: "Guided Eco Safari & Sunset View",
        category: "experience",
        categoryLabel: "Experiences",
        icon: "🌿",
        location: `${destination} Forest Sanctuary`,
        price: 1800,
        displayPrice: "₹1,800",
        rating: 4.8,
        reviews: 630,
        duration: "3 hours",
        durationMinutes: 180,
        dnaMatch: 96,
        image: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600",
        notes: "Guided naturalist walk with panoramic photography stops.",
        defaultTime: "15:30 - 18:30 PM",
      },
    ];

    // Curated Shopping
    const shopping = [
      {
        id: `shop-handicraft-${destination.toLowerCase()}`,
        name: `${destination} Handlooms & Artisan Crafts`,
        activity: `Artisan Market Visit in ${destination}`,
        category: "shopping",
        categoryLabel: "Shopping",
        icon: "🛍️",
        location: `${destination} Central Bazaar`,
        price: 1200,
        displayPrice: "₹1,200",
        rating: 4.6,
        reviews: 280,
        duration: "1.5 hours",
        durationMinutes: 90,
        dnaMatch: 88,
        image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600",
        notes: "Direct procurement of regional textiles and handicrafts.",
        defaultTime: "17:00 - 18:30 PM",
      },
    ];

    const result = {
      hotels,
      activities,
      food,
      trains,
      flights,
      buses,
      transport,
      experiences,
      shopping,
      all: [
        ...hotels,
        ...activities,
        ...food,
        ...trains,
        ...flights,
        ...buses,
        ...transport,
        ...experiences,
        ...shopping,
      ],
    };

    inventoryCache.set(destKey, result);
    return result;
  } catch (err) {
    console.error("Failed to generate destination inventory:", err);
    return {
      hotels: [],
      activities: [],
      food: [],
      trains: [],
      flights: [],
      buses: [],
      transport: [],
      experiences: [],
      shopping: [],
      all: [],
    };
  }
}

/**
 * Clear cached inventory if user forces refresh
 */
export function clearInventoryCache() {
  inventoryCache.clear();
}
