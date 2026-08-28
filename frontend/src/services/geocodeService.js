// geocodeService.js - Dynamic Geocoding and Caching for Indian Cities and Itinerary Stops

// Instant coordinate lookup dictionary for popular Indian travel hubs and destinations
const STATIC_COORDINATES = {
  // Gateways / Metros
  mumbai: [19.076, 72.8777],
  bombay: [19.076, 72.8777],
  delhi: [28.6139, 77.209],
  "new delhi": [28.6139, 77.209],
  bengaluru: [12.9716, 77.5946],
  bangalore: [12.9716, 77.5946],
  chennai: [13.0827, 80.2707],
  madras: [13.0827, 80.2707],
  kolkata: [22.5726, 88.3639],
  calcutta: [22.5726, 88.3639],
  hyderabad: [17.385, 78.4867],
  ahmedabad: [23.0225, 72.5714],
  pune: [18.5204, 73.8567],

  // Popular Holiday & Tourist Destinations
  kanyakumari: [8.0883, 77.5385],
  capecomorin: [8.0883, 77.5385],
  jaipur: [26.9124, 75.7873],
  goa: [15.2993, 74.124],
  panaji: [15.4909, 73.8278],
  kochi: [9.9312, 76.2673],
  cochin: [9.9312, 76.2673],
  alleppey: [9.4981, 76.3388],
  alappuzha: [9.4981, 76.3388],
  munnar: [10.0889, 77.0595],
  thekkady: [9.6031, 77.1615],
  wayanad: [11.6854, 76.132],
  varkala: [8.7379, 76.7163],
  trivandrum: [8.5241, 76.9366],
  thiruvananthapuram: [8.5241, 76.9366],
  manali: [32.2432, 77.1892],
  shimla: [31.1048, 77.1734],
  dharamshala: [32.219, 76.3234],
  rishikesh: [30.0869, 78.2676],
  haridwar: [29.9457, 78.1642],
  varanasi: [25.3176, 82.9739],
  banaras: [25.3176, 82.9739],
  agra: [27.1767, 78.0081],
  udaipur: [24.5854, 73.7125],
  jodhpur: [26.2389, 73.0243],
  jaisalmer: [26.9157, 70.9083],
  amritsar: [31.634, 74.8723],
  ooty: [11.4102, 76.695],
  kodaikanal: [10.2381, 77.4892],
  mysore: [12.2958, 76.6394],
  mysuru: [12.2958, 76.6394],
  hampi: [15.335, 76.46],
  madurai: [9.9252, 78.1198],
  rameshwaram: [9.2876, 79.3129],
  coorg: [12.3375, 75.8069],
  darjeeling: [27.041, 88.2663],
  gangtok: [27.3389, 88.6065],
  puri: [19.8135, 85.8312],
  shillong: [25.5788, 91.8933],
  guwahati: [26.1445, 91.7362],
  leh: [34.1526, 77.5771],
  ladakh: [34.1526, 77.5771],
  srinagar: [34.0837, 74.7973],
};

// In-memory cache for dynamic geocoding responses
const geoCache = new Map();

/**
 * Resolves place name to [latitude, longitude] coordinates.
 * Uses instantaneous dictionary lookup first, falls back to OpenStreetMap Nominatim with caching.
 */
export async function getPlaceCoordinates(placeName, contextDestination = "") {
  if (!placeName || typeof placeName !== "string") return null;

  const cleanName = placeName.trim().toLowerCase();

  // 1. Direct dictionary match
  if (STATIC_COORDINATES[cleanName]) {
    return STATIC_COORDINATES[cleanName];
  }

  // 2. Partial dictionary match (e.g. "Kanyakumari Beach" -> "kanyakumari")
  for (const [cityKey, coords] of Object.entries(STATIC_COORDINATES)) {
    if (cleanName.includes(cityKey) || cityKey.includes(cleanName)) {
      return coords;
    }
  }

  // 3. Cache lookup
  const cacheKey = `${cleanName}-${contextDestination.toLowerCase()}`;
  if (geoCache.has(cacheKey)) {
    return geoCache.get(cacheKey);
  }

  // 4. Fallback to OpenStreetMap Nominatim
  try {
    const query = contextDestination ? `${placeName}, ${contextDestination}, India` : `${placeName}, India`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;

    const res = await fetch(url, {
      headers: {
        "Accept-Language": "en",
        "User-Agent": "TransixTravelApp/1.0",
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        geoCache.set(cacheKey, coords);
        return coords;
      }
    }
  } catch (err) {
    console.warn("Geocoding lookup fallback error:", err);
  }

  // 5. Fallback to context destination coordinates if available
  if (contextDestination) {
    const cleanDest = contextDestination.trim().toLowerCase();
    if (STATIC_COORDINATES[cleanDest]) {
      return STATIC_COORDINATES[cleanDest];
    }
  }

  return null;
}
