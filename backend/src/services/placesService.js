const axios = require("axios");

const BASE_URL = "https://places.googleapis.com/v1/places:searchText";

const headers = {
  "Content-Type": "application/json",
  "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
  "X-Goog-FieldMask":
    "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.priceRange,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri,places.photos,places.regularOpeningHours,places.currentOpeningHours,places.businessStatus",
};

const searchHotels = async (destination) => {
  try {
    const response = await axios.post(
      BASE_URL,
      {
        textQuery: `Best hotels and resorts in ${destination}`,
      },
      {
        headers,
      },
    );

    return response.data.places || [];
  } catch (err) {
    console.error("Google Places searchHotels error:", err.message);
    return [];
  }
};

const searchPlaces = async (destination, category) => {
  try {
    const response = await axios.post(
      BASE_URL,
      {
        textQuery: `${category} in ${destination}`,
      },
      {
        headers,
      },
    );

    return response.data.places || [];
  } catch (err) {
    console.error("Google Places searchPlaces error:", err.message);
    return [];
  }
};

const searchNearestRailwayStation = async (destination) => {
  try {
    const response = await axios.post(
      BASE_URL,
      {
        textQuery: `Nearest railway station to ${destination}`,
      },
      {
        headers,
      },
    );

    return response.data.places || [];
  } catch (err) {
    console.error("Google Places searchNearestRailwayStation error:", err.message);
    return [];
  }
};

const getPhotoUrl = (photoName, maxWidth = 800) => {
  if (!photoName) return null;

  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
};

const formatPriceOrLevel = (place) => {
  if (place.priceRange?.startPrice?.units) {
    const start = Number(place.priceRange.startPrice.units).toLocaleString();
    if (place.priceRange.endPrice?.units) {
      const end = Number(place.priceRange.endPrice.units).toLocaleString();
      return `₹${start} - ₹${end}`;
    }
    return `From ₹${start}`;
  }

  if (place.priceLevel) {
    switch (place.priceLevel) {
      case "PRICE_LEVEL_FREE":
        return "Free";
      case "PRICE_LEVEL_INEXPENSIVE":
        return "Budget (₹)";
      case "PRICE_LEVEL_MODERATE":
        return "Moderate (₹₹)";
      case "PRICE_LEVEL_EXPENSIVE":
        return "Upscale (₹₹₹)";
      case "PRICE_LEVEL_VERY_EXPENSIVE":
        return "Luxury (₹₹₹₹)";
      default:
        return null;
    }
  }

  // Real data: If no price is returned by Google Places, return null (do not invent fake prices)
  return null;
};

module.exports = {
  searchHotels,
  searchPlaces,
  getPhotoUrl,
  formatPriceOrLevel,
  searchNearestRailwayStation,
};
