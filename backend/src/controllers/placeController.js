const asyncHandler = require("../middleware/asyncHandler");
const {
  searchHotels,
  searchPlaces,
  getPhotoUrl,
  formatPriceOrLevel,
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
    success: true,
    url: url || "https://picsum.photos/800/500",
  });
});

module.exports = {
  getHotels,
  getPlaces,
  getPlaceImage,
};
