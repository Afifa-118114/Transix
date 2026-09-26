const axios = require("axios");

const BASE_URL = "https://places.googleapis.com/v1/places:searchText";

const getHeaders = () => ({
  "Content-Type": "application/json",
  "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
  "X-Goog-FieldMask":
    "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.priceRange,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri,places.photos,places.regularOpeningHours,places.currentOpeningHours,places.businessStatus",
});

const searchHotels = async (destination) => {
  try {
    const response = await axios.post(
      BASE_URL,
      {
        textQuery: `Best hotels and resorts in ${destination}`,
        pageSize: 15,
      },
      {
        headers: getHeaders(),
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
        headers: getHeaders(),
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
        headers: getHeaders(),
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

const searchAttractionPhoto = async (placeName, destination, cityContext) => {
  if (!placeName || typeof placeName !== "string" || !process.env.GOOGLE_PLACES_API_KEY) {
    return null;
  }

  const cleanPlace = placeName.trim();
  const context = (cityContext || destination || "").trim();
  const textQuery = context ? `${cleanPlace}, ${context}, India` : `${cleanPlace}, India`;

  try {
    const response = await axios.post(
      BASE_URL,
      {
        textQuery,
        pageSize: 3,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.photos,places.types",
        },
        timeout: 6000,
      }
    );

    const places = response.data?.places || [];
    if (!places || places.length === 0) return null;

    // Filter stop words to find significant query tokens
    const stopWords = new Set(["the", "and", "visit", "explore", "tour", "near", "india", "at", "in", "to", "of"]);
    const queryTokens = cleanPlace
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

    let bestPlace = null;
    for (const p of places) {
      if (!p.photos || p.photos.length === 0) continue;
      const pName = (p.displayName?.text || "").toLowerCase();
      const pAddr = (p.formattedAddress || "").toLowerCase();

      // Check if at least one meaningful token is present in the place name or address
      const matchedToken = queryTokens.some((t) => pName.includes(t) || pAddr.includes(t));
      if (matchedToken) {
        bestPlace = p;
        break;
      }
    }

    // Fallback to first place if it has photos and query was specific
    if (!bestPlace && places[0]?.photos?.length > 0) {
      bestPlace = places[0];
    }

    if (!bestPlace || !bestPlace.photos || bestPlace.photos.length === 0) {
      return null;
    }

    const firstPhoto = bestPlace.photos[0];
    const photoUrl = getPhotoUrl(firstPhoto.name, 800);
    const attribution = firstPhoto.authorAttributions?.[0]
      ? {
          author: firstPhoto.authorAttributions[0].displayName || "Google Contributor",
          uri: firstPhoto.authorAttributions[0].uri || null,
        }
      : null;

    return {
      photoUrl,
      attribution,
      placeId: bestPlace.id,
      matchedName: bestPlace.displayName?.text || cleanPlace,
      formattedAddress: bestPlace.formattedAddress || null,
    };
  } catch (err) {
    console.error(`[placesService] searchAttractionPhoto error for '${placeName}':`, err.message);
    return null;
  }
};

module.exports = {
  searchHotels,
  searchPlaces,
  getPhotoUrl,
  formatPriceOrLevel,
  searchNearestRailwayStation,
  searchAttractionPhoto,
};
