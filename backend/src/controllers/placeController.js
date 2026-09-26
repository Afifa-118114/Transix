const asyncHandler = require("../middleware/asyncHandler");
const {
  searchHotels,
  searchPlaces,
  getPhotoUrl,
  formatPriceOrLevel,
  searchAttractionPhoto,
} = require("../services/placesService");

const { matchGoogleHotelToNuitee, getNuiteeRates } = require("../services/nuiteeService");

// Helper to process promises with a concurrency limit
const asyncQueue = async (tasks, concurrency) => {
  const results = new Array(tasks.length);
  let index = 0;
  
  const worker = async () => {
    while (index < tasks.length) {
      const i = index++;
      try {
        const value = await tasks[i]();
        results[i] = { status: "fulfilled", value };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  };
  
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
};

const getHotels = asyncHandler(async (req, res) => {
  const { destination, checkin, checkout, travelers } = req.query;

  if (!destination) {
    return res.status(400).json({
      success: false,
      message: "Destination is required",
    });
  }

  const places = await searchHotels(destination);

  const hotels = places.map((place) => ({
    id: place.id,
    name: place.displayName?.text || "Hotel",
    address: place.formattedAddress || `${destination}, India`,
    rating: place.rating || null,
    reviews: place.userRatingCount || null,
    mapsUrl: place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.displayName?.text + " " + destination)}`,
    website: place.websiteUri || null,
    phone: place.nationalPhoneNumber || null,
    coordinates: place.location ? { lat: place.location.latitude, lng: place.location.longitude } : null,
    image: place.photos?.length ? getPhotoUrl(place.photos[0].name, 600) : null,
    photos:
      place.photos?.slice(0, 6).map((photo) => ({
        url: getPhotoUrl(photo.name, 800),
      })) || [],
    price: formatPriceOrLevel(place), // null if unavailable from Google Places
    priceLevel: place.priceLevel || null,
    openingHours: place.regularOpeningHours?.weekdayDescriptions || null,
    openNow: place.currentOpeningHours?.openNow ?? null,
    businessStatus: place.businessStatus || "OPERATIONAL",
  }));

  // Match Google hotels to Nuitee with bounded concurrency
  const matchTasks = hotels.map((h) => () => 
    h.coordinates 
      ? matchGoogleHotelToNuitee(h.name, h.coordinates.lat, h.coordinates.lng) 
      : Promise.resolve({ matched: false, reason: "no_coordinates" })
  );
  
  const nuiteeMatches = await asyncQueue(matchTasks, 2);

  // Track uniquely matched hotels to prevent duplicates
  const matchedNuiteeIds = new Set();
  const validHotelIdsToFetch = [];

  hotels.forEach((h, index) => {
    const matchResult = nuiteeMatches[index];
    if (matchResult.status === "fulfilled" && matchResult.value.matched) {
      const nuiteeId = matchResult.value.hotelId;
      if (!matchedNuiteeIds.has(nuiteeId)) {
        matchedNuiteeIds.add(nuiteeId);
        validHotelIdsToFetch.push(nuiteeId);
        h._tempNuiteeId = nuiteeId;
      } else {
        // Already mapped to another Google Place (duplicate)
        h._tempNuiteeId = null;
      }
    } else {
      h._tempNuiteeId = null;
    }
  });

  // Fetch rates from Nuitee if dates provided
  let nuiteeRatesMap = {};
  if (checkin && checkout && validHotelIdsToFetch.length > 0) {
    try {
      const formattedCheckin = new Date(checkin).toISOString().split('T')[0];
      const formattedCheckout = new Date(checkout).toISOString().split('T')[0];
      console.log(`[DEBUG] Nuitee Request Dates: checkin=${formattedCheckin}, checkout=${formattedCheckout}`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      nuiteeRatesMap = await getNuiteeRates(validHotelIdsToFetch, formattedCheckin, formattedCheckout, travelers);
      console.log(`[DEBUG] Nuitee Rates Response Keys:`, Object.keys(nuiteeRatesMap));
    } catch (err) {
      console.log("[DEBUG] Invalid date format for Nuitee:", err.message);
    }
  }

  // Merge Nuitee rates back into the hotel objects
  hotels.forEach((h) => {
    if (h._tempNuiteeId && nuiteeRatesMap[h._tempNuiteeId]) {
      h.nuitee = nuiteeRatesMap[h._tempNuiteeId];
    } else {
      h.nuitee = { livePriceAvailable: false };
    }
    delete h._tempNuiteeId;
  });

  res.json({
    success: true,
    count: hotels.length,
    hotels,
  });
});

const getPlaces = asyncHandler(async (req, res) => {
  const { destination, category } = req.query;

  if (!destination || !category) {
    return res.status(400).json({
      success: false,
      message: "Destination and category are required",
    });
  }

  const places = await searchPlaces(destination, category);

  const data = places.map((place) => ({
    id: place.id,
    name: place.displayName?.text || "Attraction",
    address: place.formattedAddress || `${destination}, India`,
    rating: place.rating || null,
    reviews: place.userRatingCount || null,
    mapsUrl: place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.displayName?.text + " " + destination)}`,
    website: place.websiteUri || null,
    phone: place.nationalPhoneNumber || null,
    coordinates: place.location ? { lat: place.location.latitude, lng: place.location.longitude } : null,
    image: place.photos?.length ? getPhotoUrl(place.photos[0].name, 600) : null,
    photos:
      place.photos?.slice(0, 6).map((photo) => ({
        url: getPhotoUrl(photo.name, 800),
      })) || [],
    price: formatPriceOrLevel(place),
    priceLevel: place.priceLevel || null,
    openingHours: place.regularOpeningHours?.weekdayDescriptions || null,
    openNow: place.currentOpeningHours?.openNow ?? null,
    businessStatus: place.businessStatus || "OPERATIONAL",
  }));

  res.json({
    success: true,
    count: data.length,
    places: data,
  });
});

const { getPlaceImage: fetchImage } = require("../services/imageService");

// In-memory cache for attraction photos to avoid repeated Google Places API calls
const attractionPhotoCache = new Map();

const getAttractionPhoto = asyncHandler(async (req, res) => {
  const { place, destination, city } = req.query;

  if (!place || typeof place !== "string" || !place.trim()) {
    return res.status(400).json({
      success: false,
      message: "Place query parameter is required",
    });
  }

  const cleanPlace = place.trim();
  const cacheKey = `${cleanPlace.toLowerCase()}|${(city || destination || "").trim().toLowerCase()}`;

  // 1. Check in-memory server cache
  if (attractionPhotoCache.has(cacheKey)) {
    const cached = attractionPhotoCache.get(cacheKey);
    return res.json({
      success: Boolean(cached?.photoUrl),
      data: cached,
      fromCache: true,
    });
  }

  // 2. Query Google Places API (New) for verified attraction photo
  const result = await searchAttractionPhoto(cleanPlace, destination, city);

  // 3. Cache positive result or negative sentinel to prevent repeated failures
  attractionPhotoCache.set(cacheKey, result || { photoUrl: null });

  res.json({
    success: Boolean(result?.photoUrl),
    data: result,
  });
});

const getPlaceImage = asyncHandler(async (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({
      success: false,
      message: "Query is required",
    });
  }

  const url = await fetchImage(query);
  res.json({
    success: Boolean(url),
    url: url || null,
  });
});

// In-memory cache for server-side geocoding
const axios = require("axios");
const serverGeoCache = new Map();
let lastNominatimRequestTime = 0;

const geocodePlace = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== "string") {
    return res.status(400).json({
      success: false,
      message: "Query parameter 'q' is required",
    });
  }

  const cleanQuery = q.trim().toLowerCase();

  // 1. Check in-memory cache (positive or negative)
  if (serverGeoCache.has(cleanQuery)) {
    const cached = serverGeoCache.get(cleanQuery);
    return res.json({
      success: Boolean(cached),
      coordinates: cached,
      fromCache: true,
    });
  }

  // Helper to query Photon (Komoot OSM keyless geocoder)
  const tryPhoton = async (searchQuery) => {
    try {
      const pRes = await axios.get("https://photon.komoot.io/api/", {
        params: { q: searchQuery, limit: 1 },
        timeout: 5000,
      });
      if (pRes.data && Array.isArray(pRes.data.features) && pRes.data.features.length > 0) {
        const feat = pRes.data.features[0];
        if (feat.geometry && Array.isArray(feat.geometry.coordinates)) {
          // Photon returns [lon, lat]
          const [lon, lat] = feat.geometry.coordinates;
          return [lat, lon];
        }
      }
    } catch (pErr) {
      console.warn(`[Photon Geocode] Fallback error for '${searchQuery}':`, pErr.message);
    }
    return null;
  };

  // 2. Try Nominatim with rate-limit compliance
  let resolvedCoords = null;
  const now = Date.now();
  const timeSinceLast = now - lastNominatimRequestTime;
  if (timeSinceLast < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - timeSinceLast));
  }
  lastNominatimRequestTime = Date.now();

  try {
    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        format: "json",
        q: q.trim(),
        limit: 1,
      },
      headers: {
        "User-Agent": "TransixTravelApp/1.0 (contact@transix.com)",
        "Accept-Language": "en",
      },
      timeout: 5000,
    });

    if (Array.isArray(response.data) && response.data.length > 0) {
      resolvedCoords = [parseFloat(response.data[0].lat), parseFloat(response.data[0].lon)];
    }
  } catch (err) {
    console.warn(`[Nominatim Geocode] Error '${q}':`, err.message);
  }

  // 3. Fallback to Photon if Nominatim was rate-limited, blocked, or found nothing
  if (!resolvedCoords) {
    resolvedCoords = await tryPhoton(q.trim());
  }

  // 4. Cache result (positive or negative)
  serverGeoCache.set(cleanQuery, resolvedCoords);

  if (resolvedCoords) {
    return res.json({
      success: true,
      coordinates: resolvedCoords,
    });
  } else {
    return res.json({
      success: false,
      coordinates: null,
      message: "Location not found",
    });
  }
});

module.exports = {
  getHotels,
  getPlaces,
  getPlaceImage,
  getAttractionPhoto,
  geocodePlace,
};
