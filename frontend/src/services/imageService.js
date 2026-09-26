import { getPlaceImage as fetchPlaceImageApi, getAttractionPhoto } from "../api/placeApi";
import { classifyActivity } from "../utils/activityClassifier";
import attractionPlaceholderImg from "../assets/activities/attraction.svg";

// Client-side in-memory cache for resolved activity images
const clientImageCache = new Map();

const STORAGE_PREFIX = "transix_activity_img_v1_";

function safeStorageGet(key) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
  } catch (_) {}
}

/**
 * Resolves a reliable, relevant image for any itinerary activity.
 * 1. Categorizes generic activities (breakfast, lunch, trains, flights, hotels, shopping, walks)
 *    and immediately returns curated local assets with zero network delay.
 * 2. Identifies specific attractions (museums, zoos, ISRO, tea gardens, waterfalls, forts)
 *    and queries Google Places API (New) for verified photographs with attribution.
 * 3. Never uses random images or Picsum.
 * 4. Never assigns the trip hero image to activities.
 */
export async function resolveActivityImage(activity, destination = "", dayTitle = "") {
  if (!activity) {
    return { url: attractionPlaceholderImg, isLocal: true, attribution: null };
  }

  // 1. Classification
  const classification = classifyActivity(activity, destination, dayTitle);

  // If generic, return the curated local asset directly
  if (classification.isGeneric && classification.asset) {
    return {
      url: classification.asset,
      isLocal: true,
      category: classification.category,
      attribution: null,
    };
  }

  // 2. Pre-existing specific activity image (e.g. from hotel selection)
  // Ensure it's not an inherited hero image or random Picsum
  if (activity.image && typeof activity.image === "string" && !activity.image.includes("picsum.photos")) {
    return {
      url: activity.image,
      isLocal: false,
      attribution: activity.photoAttribution || null,
    };
  }

  // 3. Specific place: check client cache
  const placeName = classification.placeName || activity.place || activity.location || activity.name || "";
  const cityContext = classification.cityContext || destination || "";
  const cacheKey = `${placeName.trim().toLowerCase()}|${cityContext.trim().toLowerCase()}`;

  // Check in-memory cache
  if (clientImageCache.has(cacheKey)) {
    return clientImageCache.get(cacheKey);
  }

  // Check localStorage cache
  const stored = safeStorageGet(cacheKey);
  if (stored && stored.url) {
    clientImageCache.set(cacheKey, stored);
    return stored;
  }

  // 4. Query Google Places API (New) for verified attraction photo
  try {
    const attractionResult = await getAttractionPhoto(placeName, destination, cityContext);

    if (attractionResult && attractionResult.photoUrl) {
      const resolved = {
        url: attractionResult.photoUrl,
        isLocal: false,
        attribution: attractionResult.attribution || null,
        placeName: attractionResult.matchedName || placeName,
      };

      clientImageCache.set(cacheKey, resolved);
      safeStorageSet(cacheKey, resolved);
      return resolved;
    }
  } catch (err) {
    console.warn(`[imageService] Google Places lookup failed for '${placeName}':`, err.message);
  }

  // 5. Secondary fallback: Pexels place lookup (no Picsum)
  try {
    const pexelsUrl = await fetchPlaceImageApi(`${placeName} ${cityContext}`);
    if (pexelsUrl && !pexelsUrl.includes("picsum.photos")) {
      const resolved = {
        url: pexelsUrl,
        isLocal: false,
        attribution: null,
      };
      clientImageCache.set(cacheKey, resolved);
      safeStorageSet(cacheKey, resolved);
      return resolved;
    }
  } catch (pErr) {
    console.warn(`[imageService] Pexels fallback failed for '${placeName}':`, pErr.message);
  }

  // 6. Final safe fallback: Neutral curated attraction placeholder (never random ocean/sea)
  const fallback = {
    url: classification.fallbackAsset || attractionPlaceholderImg,
    isLocal: true,
    attribution: null,
  };
  clientImageCache.set(cacheKey, fallback);
  safeStorageSet(cacheKey, fallback);
  return fallback;
}

/**
 * Legacy helper for discovery cards (returns URL string directly without random Picsum)
 */
export async function getPlaceImage(place) {
  if (!place || typeof place !== "string") {
    return attractionPlaceholderImg;
  }

  try {
    const imageUrl = await fetchPlaceImageApi(place);
    if (imageUrl && !imageUrl.includes("picsum.photos")) {
      return imageUrl;
    }
    return attractionPlaceholderImg;
  } catch (err) {
    console.error("Failed to fetch image via API:", err.message);
    return attractionPlaceholderImg;
  }
}
