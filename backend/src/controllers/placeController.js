const asyncHandler = require("../middleware/asyncHandler");
const {
  searchHotels,
  searchPlaces,
  getPhotoUrl,
  formatPriceOrLevel,
} = require("../services/placesService");

const getHotels = asyncHandler(async (req, res) => {
  const { destination } = req.query;

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

module.exports = {
  getHotels,
  getPlaces,
};
