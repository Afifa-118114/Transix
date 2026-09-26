const axios = require("axios");

const BASE_URL = "https://places.googleapis.com/v1/places:searchText";

const getHeaders = () => ({
  "Content-Type": "application/json",
  "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
  "X-Goog-FieldMask":
    "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.priceRange,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri,places.photos,places.regularOpeningHours,places.currentOpeningHours,places.businessStatus",
});

// In-memory cache for destination bounding boxes (avoids repeated Nominatim calls)
const geoBoundsCache = new Map();

/**
 * Geocode a destination via Nominatim and return its bounding box.
 * Returns { low: {latitude, longitude}, high: {latitude, longitude} } or null.
 */
async function getDestinationBounds(destination) {
  const key = destination.toLowerCase().trim();
  if (geoBoundsCache.has(key)) return geoBoundsCache.get(key);

  try {
    const query = destination.toLowerCase().includes("india")
      ? destination
      : `${destination}, India`;

    const res = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: { q: query, format: "json", limit: 1 },
      headers: { "User-Agent": "TransixTravelApp/1.0 (contact@transix.com)" },
      timeout: 5000,
    });

    if (!res.data || res.data.length === 0) {
      geoBoundsCache.set(key, null);
      return null;
    }

    const result = res.data[0];
    // Nominatim returns boundingbox as [south, north, west, east]
    const bb = result.boundingbox;
    if (!bb || bb.length < 4) {
      geoBoundsCache.set(key, null);
      return null;
    }

    const south = parseFloat(bb[0]);
    const north = parseFloat(bb[1]);
    const west  = parseFloat(bb[2]);
    const east  = parseFloat(bb[3]);

    // Add a small padding (0.5 degrees ≈ ~55 km) so border hotels are included
    const PAD = 0.5;
    const bounds = {
      low:  { latitude: south - PAD, longitude: west - PAD },
      high: { latitude: north + PAD, longitude: east + PAD },
    };

    geoBoundsCache.set(key, bounds);
    return bounds;
  } catch (err) {
    console.warn("[placesService] getDestinationBounds failed:", err.message);
    geoBoundsCache.set(key, null);
    return null;
  }
}

/**
 * Build destination keyword tokens for post-fetch address filtering.
 * e.g. "Kerala" → ["kerala"]
 *      "Munnar, Kerala" → ["munnar", "kerala"]
 */
function getDestinationKeywords(destination) {
  return destination
    .toLowerCase()
    .replace(/,/g, " ")
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length > 2 && !["india", "the", "and"].includes(t));
}

/**
 * Returns true if the place's formattedAddress mentions at least one
 * keyword from the destination (safety net against wrong-region results).
 */
function isAddressInDestination(formattedAddress, destinationKeywords) {
  if (!formattedAddress || destinationKeywords.length === 0) return true; // can't validate, allow
  const addr = formattedAddress.toLowerCase();
  return destinationKeywords.some(kw => addr.includes(kw));
}

const searchHotels = async (destination) => {
  try {
    const anchoredDestination = destination.toLowerCase().includes("india")
      ? destination
      : `${destination}, India`;

    // Step 1: Get the geographic bounding box for the destination
    const bounds = await getDestinationBounds(destination);

    const requestBody = {
      textQuery: `Hotels in ${anchoredDestination}`,
      pageSize: 20, // Fetch more, then filter — ensures enough after address filtering
    };

    // Step 2: If we have bounds, add locationRestriction to force Google Places
    // to ONLY return results physically inside the destination's bounding box.
    // This prevents "Rambagh Palace, Jaipur" from appearing in a Kerala search.
    if (bounds) {
      requestBody.locationRestriction = { rectangle: bounds };
      console.log(`[placesService] Hotel search for "${destination}" with locationRestriction:`, JSON.stringify(bounds));
    } else {
      console.warn(`[placesService] No bounds found for "${destination}", searching without restriction.`);
    }

    const response = await axios.post(BASE_URL, requestBody, {
      headers: getHeaders(),
    });

    const places = response.data.places || [];

    // Step 3: Post-fetch address filter — reject any result that doesn't
    // mention the destination at all in its address (final safety net).
    const keywords = getDestinationKeywords(destination);
    const filtered = places.filter(p =>
      isAddressInDestination(p.formattedAddress, keywords)
    );

    console.log(`[placesService] Hotels for "${destination}": ${places.length} raw → ${filtered.length} after address filter`);

    // Return up to 10 validated results
    return filtered.slice(0, 10);
  } catch (err) {
    console.error("Google Places searchHotels error:", err.message);
    return [];
  }
};

const searchPlaces = async (destination, category) => {
  try {
    const anchoredDestination = destination.toLowerCase().includes("india")
      ? destination
      : `${destination}, India`;

    const bounds = await getDestinationBounds(destination);

    const requestBody = {
      textQuery: `${category} in ${anchoredDestination}`,
      pageSize: 15,
    };

    if (bounds) {
      requestBody.locationRestriction = { rectangle: bounds };
    }

    const response = await axios.post(BASE_URL, requestBody, {
      headers: getHeaders(),
    });

    const places = response.data.places || [];
    const keywords = getDestinationKeywords(destination);
    const filtered = places.filter(p =>
      isAddressInDestination(p.formattedAddress, keywords)
    );

    return filtered;
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
