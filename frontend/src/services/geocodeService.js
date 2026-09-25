// geocodeService.js - Dynamic Geocoding and Caching for Indian Cities and Itinerary Stops

// Instant coordinate lookup dictionary for popular Indian travel hubs, attractions, and destinations
const STATIC_COORDINATES = {
  // Gateways / Metros
  mumbai: [19.076, 72.8777],
  bombay: [19.076, 72.8777],
  maharashtra: [19.7515, 75.7139],
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

  // Mumbai / Maharashtra Railway Hubs
  kalyan: [19.2437, 73.1355],
  "kalyan junction": [19.2437, 73.1355],
  "kalyan railway station": [19.2437, 73.1355],
  "kalyan station": [19.2437, 73.1355],
  "kalyan station concourse": [19.2437, 73.1355],
  thane: [19.186, 72.9759],
  "thane railway station": [19.186, 72.9759],
  dadar: [19.0178, 72.8478],
  "dadar railway station": [19.0178, 72.8478],
  csmt: [18.9401, 72.8354],
  cst: [18.9401, 72.8354],
  "chhatrapati shivaji maharaj terminus": [18.9401, 72.8354],
  "mumbai central": [18.9696, 72.8193],
  bandra: [19.0544, 72.8402],
  "bandra terminus": [19.0628, 72.8406],
  borivali: [19.2291, 72.8573],
  kurla: [19.0657, 72.8794],
  ltt: [19.0689, 72.8898],
  "lokmanya tilak terminus": [19.0689, 72.8898],
  panvel: [18.9894, 73.1175],
  "pune junction": [18.5284, 73.8744],
  lonavala: [18.7546, 73.4062],
  khandala: [18.7614, 73.3752],
  alibaug: [18.6414, 72.8722],
  matheran: [18.9868, 73.268],
  mahabaleshwar: [17.9307, 73.6477],

  // Popular Holiday & Tourist Destinations
  kerala: [10.8505, 76.2711],
  kanyakumari: [8.0883, 77.5385],
  capecomorin: [8.0883, 77.5385],
  jaipur: [26.9124, 75.7873],
  rajasthan: [27.0238, 74.2179],
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

  // Kerala Key Attractions & Landmarks
  "fort kochi": [9.9656, 76.2421],
  "jew town": [9.9575, 76.2597],
  "chinese fishing nets": [9.9678, 76.2415],
  "mattancherry palace": [9.9583, 76.2592],
  "paradesi synagogue": [9.9573, 76.2595],
  "vasco da gama square": [9.9672, 76.2418],
  "princess street": [9.9664, 76.2435],
  "cheeyappara falls": [10.0211, 76.8833],
  "valara waterfalls": [10.0152, 76.8624],
  eravikulam: [10.2014, 77.0558],
  "eravikulam national park": [10.2014, 77.0558],
  "tata tea museum": [10.0889, 77.0595],
  "tea museum, munnar": [10.0889, 77.0595],
  mattupetty: [10.1064, 77.1249],
  "mattupetty dam": [10.1064, 77.1249],
  "eco point": [10.1445, 77.1654],
  "top station": [10.1251, 77.2435],
  kolukkumalai: [10.0769, 77.1947],
  "marari beach": [9.6011, 76.2975],
  "vembanad lake": [9.6175, 76.4301],
  kuttanad: [9.45, 76.45],
  "kuttanad canals": [9.45, 76.45],
  champakkulam: [9.4124, 76.4428],
  periyar: [9.4679, 77.1435],
  "periyar national park": [9.4679, 77.1435],
  kumarakom: [9.6175, 76.4301],
  "munnar valley": [10.0889, 77.0595],
  "idukki pass": [9.8496, 76.9723],
  "kottayam foothills": [9.5916, 76.5222],

  // Key Transport Hubs & Airports
  "kochi international airport": [10.1556, 76.4019],
  "cochin international airport": [10.1556, 76.4019],
  "cok airport": [10.1556, 76.4019],
  "ernakulam junction": [9.9678, 76.2905],
  "ernakulam town": [9.9926, 76.2877],
  "trivandrum international airport": [8.4821, 76.92],
  "delhi airport": [28.5562, 77.1],
  "indira gandhi international airport": [28.5562, 77.1],
  "mumbai airport": [19.0896, 72.8656],
  "chhatrapati shivaji maharaj international airport": [19.0896, 72.8656],
  "bengaluru airport": [13.1986, 77.7066],
  "kempegowda international airport": [13.1986, 77.7066],
  "jaipur airport": [26.8289, 75.8056],

  // Rajasthan Key Landmarks
  "amber fort": [26.9855, 75.8513],
  "amer fort": [26.9855, 75.8513],
  "hawa mahal": [26.9239, 75.8267],
  "city palace jaipur": [26.9258, 75.8236],
  "jantar mantar jaipur": [26.9247, 75.8245],
  "jal mahal": [26.9656, 75.8458],
  "mehrangarh fort": [26.298, 73.0189],
  "jaswant thada": [26.3032, 73.0182],
  "umaid bhawan palace": [26.2808, 73.0475],
  "lake pichola": [24.5714, 73.6781],
  "city palace udaipur": [24.5764, 73.6835],
  "jag mandir": [24.5683, 73.6756],
  "sam sand dunes": [26.8306, 70.5053],
  "jaisalmer fort": [26.9128, 70.9127],

  // Northern & Famous Landmarks
  "taj mahal": [27.1751, 78.0421],
  "agra fort": [27.1795, 78.0211],
  "fatehpur sikri": [27.0945, 77.6679],
  "red fort": [28.6562, 77.241],
  "qutub minar": [28.5245, 77.1855],
  "india gate": [28.6129, 77.2295],
  "lotus temple": [28.5535, 77.2588],
  "golden temple": [31.62, 74.8765],
  "solang valley": [32.3166, 77.1578],
  "rohtang pass": [32.3716, 77.2466],
  "pangong lake": [33.7595, 78.6674],
  "gateway of india": [18.922, 72.8347],
  "marine drive": [18.9432, 72.823],
  "mysore palace": [12.3052, 76.6552],
  "chamundi hill": [12.274, 76.671],
  "meenakshi temple": [9.9195, 78.1193],
};

// In-memory cache for dynamic geocoding responses
const geoCache = new Map();
const failedGeocodeCache = new Set();

// Initialize caches from localStorage if available
function initLocalStorageCache() {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const raw = localStorage.getItem("transix_geocode_cache");
    if (raw) {
      const parsed = JSON.parse(raw);
      for (const [k, v] of Object.entries(parsed)) {
        if (Array.isArray(v) && v.length === 2) {
          geoCache.set(k, v);
        }
      }
    }

    const rawFailed = localStorage.getItem("transix_failed_geocode_cache");
    if (rawFailed) {
      const parsedFailed = JSON.parse(rawFailed);
      if (Array.isArray(parsedFailed)) {
        parsedFailed.forEach((k) => failedGeocodeCache.add(k));
      }
    }
  } catch (_) {}
}

function persistToLocalStorage(key, coords) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const raw = localStorage.getItem("transix_geocode_cache");
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[key] = coords;
    localStorage.setItem("transix_geocode_cache", JSON.stringify(parsed));
  } catch (_) {}
}

function recordFailedLookup(key) {
  failedGeocodeCache.add(key);
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const raw = localStorage.getItem("transix_failed_geocode_cache");
    const list = raw ? JSON.parse(raw) : [];
    if (!list.includes(key)) {
      list.push(key);
      localStorage.setItem("transix_failed_geocode_cache", JSON.stringify(list));
    }
  } catch (_) {}
}

initLocalStorageCache();

/**
 * Normalizes descriptive itinerary text into clean geographic search queries.
 * Example:
 * "Kalyan Station Concourse, Arrival in Mumbai & Trip Conclusion, India"
 * -> "Kalyan Railway Station, Maharashtra, India"
 */
export function normalizeLocationQuery(placeName, contextDestination = "") {
  if (!placeName || typeof placeName !== "string") return "";

  let str = placeName.trim();

  // 1. If comma separated, check if second part is a narrative title and discard narrative
  if (str.includes(",")) {
    const parts = str.split(",").map((s) => s.trim());
    if (
      parts.length > 1 &&
      /(arrival|departure|conclusion|journey|scenic|transfer|tour|exploration|overnight)/i.test(
        parts[1]
      )
    ) {
      str = parts[0];
    }
  }

  // 2. Strip parenthetical content (e.g. "(Nilgiri Tahr habitat)")
  str = str.replace(/\([^)]*\)/g, "").trim();

  // 3. Strip leading narrative action verbs
  str = str
    .replace(
      /^(arrival at|arrival in|departure from|transfer to|transfer toward|check-in at|check-out from|drive to|stop by|visit to|visit|explore|walking tour of|sunset at|morning|evening|afternoon)\s+/i,
      ""
    )
    .trim();

  // 4. Strip trailing activity clauses after & or and
  if (
    /(\&|and)\s+(curated|meet|taste|tasting|safari|photography|dance|shopping|relax|dinner|lunch|breakfast|tea walk)/i.test(
      str
    )
  ) {
    str = str.split(
      /(\&|and)\s+(curated|meet|taste|tasting|safari|photography|dance|shopping|relax|dinner|lunch|breakfast|tea walk)/i
    )[0].trim();
  }

  // 5. Strip "en route ..." or trailing notes
  str = str.replace(/\s+en route.*$/i, "").trim();

  // 6. Normalize railway stations and concourses
  str = str.replace(/\s+station\s+concourse/i, " Railway Station");
  str = str.replace(/\s+concourse/i, "");
  if (
    /\bstation\b/i.test(str) &&
    !/\brailway station\b/i.test(str) &&
    !/\bpolice station\b/i.test(str) &&
    !/\bhill station\b/i.test(str) &&
    !/\bpower station\b/i.test(str)
  ) {
    str = str.replace(/\bstation\b/i, "Railway Station");
  }

  // Strip trailing punctuation
  str = str.replace(/[.,;:]+$/, "").trim();

  // 7. Clean context destination (ensure it is NOT a full day title)
  let cleanContext = (contextDestination || "").trim();
  if (
    /(arrival|departure|conclusion|journey|scenic|transfer|tour|exploration|day\s+\d)/i.test(
      cleanContext
    )
  ) {
    // Extract known city from context if present
    const cityMatch = cleanContext.match(
      /\b(mumbai|delhi|kochi|munnar|alleppey|jaipur|jodhpur|udaipur|goa|bangalore|bengaluru|chennai|hyderabad|pune|agra|varanasi|kerala|rajasthan)\b/i
    );
    cleanContext = cityMatch ? cityMatch[1] : "";
  }

  // If place includes Kalyan, anchor to Maharashtra
  if (/kalyan/i.test(str) && !cleanContext) {
    cleanContext = "Maharashtra";
  }

  // Build final query
  if (cleanContext && !str.toLowerCase().includes(cleanContext.toLowerCase())) {
    return `${str}, ${cleanContext}, India`;
  }

  return `${str}, India`;
}

/**
 * Extracts pure place entity name from raw place string.
 */
function extractPlaceEntity(raw) {
  if (!raw || typeof raw !== "string") return "";
  let str = raw.trim();

  // If comma separated, check if second part is a narrative title and discard narrative
  if (str.includes(",")) {
    const parts = str.split(",").map((s) => s.trim());
    if (
      parts.length > 1 &&
      /(arrival|departure|conclusion|journey|scenic|transfer|tour|exploration|overnight|trip)/i.test(
        parts[1]
      )
    ) {
      str = parts[0];
    }
  }

  // Strip parentheticals
  str = str.replace(/\([^)]*\)/g, "").trim();

  // Strip leading narrative action verbs
  str = str
    .replace(
      /^(arrival at|arrival in|departure from|transfer to|transfer toward|check-in at|check-out from|drive to|stop by|visit to|visit|explore|walking tour of|sunset at|morning|evening|afternoon)\s+/i,
      ""
    )
    .trim();

  // Normalize station concourses
  str = str.replace(/\s+station\s+concourse/i, " Railway Station");
  str = str.replace(/\s+concourse/i, "");
  if (
    /\bstation\b/i.test(str) &&
    !/\brailway station\b/i.test(str) &&
    !/\bpolice station\b/i.test(str) &&
    !/\bhill station\b/i.test(str)
  ) {
    str = str.replace(/\bstation\b/i, "Railway Station");
  }

  // Strip trailing punctuation
  str = str.replace(/[.,;:]+$/, "").trim();
  return str.toLowerCase();
}

/**
 * Resolves place name to [latitude, longitude] coordinates.
 * Order of precedence:
 * 1. Clean place entity extraction
 * 2. STATIC_COORDINATES dictionary match (longest key first)
 * 3. In-memory / localStorage cache
 * 4. Negative lookup cache check (prevents repeating failed lookups)
 * 5. Server-side geocode proxy (/api/places/geocode) with rate-limiting and Photon fallback
 * Never makes direct client-side fetch to Nominatim, preventing browser CORS errors.
 */
export async function getPlaceCoordinates(placeName, contextDestination = "") {
  if (!placeName || typeof placeName !== "string") return null;

  // Extract clean place entity first (prevents narrative words like "arrival in Mumbai" matching Mumbai)
  const cleanEntity = extractPlaceEntity(placeName);
  if (!cleanEntity) return null;

  // 1. Direct dictionary match on clean entity
  if (STATIC_COORDINATES[cleanEntity]) {
    return STATIC_COORDINATES[cleanEntity];
  }

  // 2. Partial dictionary match on clean entity (prioritize longest, most specific key first)
  const sortedKeys = Object.keys(STATIC_COORDINATES).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (cleanEntity === key || cleanEntity.includes(key)) {
      return STATIC_COORDINATES[key];
    }
  }

  // 3. Normalize query to full geographic query
  const normalizedQuery = normalizeLocationQuery(placeName, contextDestination);
  if (!normalizedQuery) return null;

  const cleanNorm = normalizedQuery.trim().toLowerCase();

  // Check normalized query against static dictionary
  for (const key of sortedKeys) {
    if (cleanNorm.includes(key)) {
      return STATIC_COORDINATES[key];
    }
  }

  // 4. In-memory / localStorage cache lookup
  const cacheKey = `${cleanNorm}`;
  if (geoCache.has(cacheKey)) {
    return geoCache.get(cacheKey);
  }

  // 5. Check if previously failed (avoid repeating failed lookups)
  if (failedGeocodeCache.has(cacheKey)) {
    return null;
  }

  // 6. Query through backend geocoding proxy to avoid CORS and respect rate limits
  try {
    const rawApi = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const apiBase = rawApi.replace(/\/api$/, "");
    const geocodeUrl = `${apiBase}/api/places/geocode?q=${encodeURIComponent(normalizedQuery)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(geocodeUrl, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.coordinates) && data.coordinates.length === 2) {
        geoCache.set(cacheKey, data.coordinates);
        persistToLocalStorage(cacheKey, data.coordinates);
        return data.coordinates;
      }
    }

    // Cache failed lookup so we don't repeatedly hammer the server
    recordFailedLookup(cacheKey);
  } catch (err) {
    // Backend offline or timeout; record failure and return null without crashing
    recordFailedLookup(cacheKey);
  }

  // 7. Fallback to clean context destination coordinates if available
  if (contextDestination) {
    const cleanDest = contextDestination.trim().toLowerCase();
    for (const [cityKey, coords] of Object.entries(STATIC_COORDINATES)) {
      if (cleanDest.includes(cityKey)) {
        return coords;
      }
    }
  }

  return null;
}
