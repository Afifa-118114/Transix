const GuideProfile = require("../models/GuideProfile");
const Location = require("../models/Location");

// Comprehensive mapping of well-known Indian cities, tourist destinations, and regions to Indian States
const KNOWN_DESTINATION_STATE_MAP = {
  // Kerala
  kochi: "Kerala",
  cochin: "Kerala",
  munnar: "Kerala",
  alleppey: "Kerala",
  alappuzha: "Kerala",
  thekkady: "Kerala",
  wayanad: "Kerala",
  trivandrum: "Kerala",
  thiruvananthapuram: "Kerala",
  kovalam: "Kerala",
  varkala: "Kerala",
  thrissur: "Kerala",
  kozhikode: "Kerala",
  calicut: "Kerala",
  kumarakom: "Kerala",
  kerala: "Kerala",

  // Maharashtra
  mumbai: "Maharashtra",
  bombay: "Maharashtra",
  pune: "Maharashtra",
  lonavala: "Maharashtra",
  khandala: "Maharashtra",
  mahabaleshwar: "Maharashtra",
  panchgani: "Maharashtra",
  nashik: "Maharashtra",
  shirdi: "Maharashtra",
  aurangabad: "Maharashtra",
  "chhatrapati sambhajinagar": "Maharashtra",
  nagpur: "Maharashtra",
  kolhapur: "Maharashtra",
  alibaug: "Maharashtra",
  ratnagiri: "Maharashtra",
  sindhudurg: "Maharashtra",
  maharashtra: "Maharashtra",

  // Goa
  goa: "Goa",
  panjim: "Goa",
  panaji: "Goa",
  margao: "Goa",
  calangute: "Goa",
  baga: "Goa",
  anjuna: "Goa",
  palolem: "Goa",
  vasco: "Goa",
  candolim: "Goa",

  // Karnataka
  bengaluru: "Karnataka",
  bangalore: "Karnataka",
  mysuru: "Karnataka",
  mysore: "Karnataka",
  coorg: "Karnataka",
  kodagu: "Karnataka",
  madikeri: "Karnataka",
  hampi: "Karnataka",
  gokarna: "Karnataka",
  chikmagalur: "Karnataka",
  chikkamagaluru: "Karnataka",
  udupi: "Karnataka",
  mangaluru: "Karnataka",
  mangalore: "Karnataka",
  badami: "Karnataka",
  dandeli: "Karnataka",
  karnataka: "Karnataka",

  // Tamil Nadu
  chennai: "Tamil Nadu",
  madras: "Tamil Nadu",
  madurai: "Tamil Nadu",
  ooty: "Tamil Nadu",
  udhagamandalam: "Tamil Nadu",
  kodaikanal: "Tamil Nadu",
  coimbatore: "Tamil Nadu",
  mahabalipuram: "Tamil Nadu",
  mamallapuram: "Tamil Nadu",
  kanchipuram: "Tamil Nadu",
  rameswaram: "Tamil Nadu",
  thanjavur: "Tamil Nadu",
  tanjore: "Tamil Nadu",
  kanyakumari: "Tamil Nadu",
  coonoor: "Tamil Nadu",
  "tamil nadu": "Tamil Nadu",

  // Rajasthan
  jaipur: "Rajasthan",
  udaipur: "Rajasthan",
  jodhpur: "Rajasthan",
  jaisalmer: "Rajasthan",
  pushkar: "Rajasthan",
  ajmer: "Rajasthan",
  bikaner: "Rajasthan",
  "mount abu": "Rajasthan",
  ranthambore: "Rajasthan",
  chittorgarh: "Rajasthan",
  shekhawati: "Rajasthan",
  rajasthan: "Rajasthan",

  // Gujarat
  ahmedabad: "Gujarat",
  gandhinagar: "Gujarat",
  vadodara: "Gujarat",
  surat: "Gujarat",
  kutch: "Gujarat",
  bhuj: "Gujarat",
  rann: "Gujarat",
  gir: "Gujarat",
  somnath: "Gujarat",
  dwarka: "Gujarat",
  gujarat: "Gujarat",

  // Himachal Pradesh
  shimla: "Himachal Pradesh",
  manali: "Himachal Pradesh",
  dharamshala: "Himachal Pradesh",
  mcleodganj: "Himachal Pradesh",
  kullu: "Himachal Pradesh",
  spiti: "Himachal Pradesh",
  kaza: "Himachal Pradesh",
  kasol: "Himachal Pradesh",
  dalhousie: "Himachal Pradesh",
  jibhi: "Himachal Pradesh",
  "himachal pradesh": "Himachal Pradesh",
  himachal: "Himachal Pradesh",

  // Uttarakhand
  rishikesh: "Uttarakhand",
  haridwar: "Uttarakhand",
  dehradun: "Uttarakhand",
  mussoorie: "Uttarakhand",
  nainital: "Uttarakhand",
  jimcorbett: "Uttarakhand",
  corbett: "Uttarakhand",
  kedarnath: "Uttarakhand",
  badrinath: "Uttarakhand",
  auli: "Uttarakhand",
  uttarakhand: "Uttarakhand",

  // West Bengal
  kolkata: "West Bengal",
  calcutta: "West Bengal",
  darjeeling: "West Bengal",
  kalimpong: "West Bengal",
  sundarbans: "West Bengal",
  digha: "West Bengal",
  shantiniketan: "West Bengal",
  "west bengal": "West Bengal",

  // Uttar Pradesh
  agra: "Uttar Pradesh",
  varanasi: "Uttar Pradesh",
  kashi: "Uttar Pradesh",
  banaras: "Uttar Pradesh",
  lucknow: "Uttar Pradesh",
  prayagraj: "Uttar Pradesh",
  allahabad: "Uttar Pradesh",
  mathura: "Uttar Pradesh",
  vrindavan: "Uttar Pradesh",
  ayodhya: "Uttar Pradesh",
  "uttar pradesh": "Uttar Pradesh",

  // Delhi
  delhi: "Delhi",
  "new delhi": "Delhi",

  // Madhya Pradesh
  bhopal: "Madhya Pradesh",
  indore: "Madhya Pradesh",
  gwalior: "Madhya Pradesh",
  khajuraho: "Madhya Pradesh",
  ujjain: "Madhya Pradesh",
  jabalpur: "Madhya Pradesh",
  kanha: "Madhya Pradesh",
  bandhavgarh: "Madhya Pradesh",
  "madhya pradesh": "Madhya Pradesh",

  // Ladakh / Jammu & Kashmir
  leh: "Ladakh",
  ladakh: "Ladakh",
  pangong: "Ladakh",
  nubra: "Ladakh",
  srinagar: "Jammu & Kashmir",
  gulmarg: "Jammu & Kashmir",
  pahalgam: "Jammu & Kashmir",
  sonamarg: "Jammu & Kashmir",
  jammu: "Jammu & Kashmir",
  "jammu & kashmir": "Jammu & Kashmir",

  // Others
  guwahati: "Assam",
  kaziranga: "Assam",
  assam: "Assam",
  gangtok: "Sikkim",
  sikkim: "Sikkim",
  shillong: "Meghalaya",
  cherrapunji: "Meghalaya",
  meghalaya: "Meghalaya",
  hyderabad: "Telangana",
  telangana: "Telangana",
  bhubaneswar: "Odisha",
  puri: "Odisha",
  konark: "Odisha",
  odisha: "Odisha",
  amritsar: "Punjab",
  punjab: "Punjab",
  visakhapatnam: "Andhra Pradesh",
  tirupati: "Andhra Pradesh",
  "andhra pradesh": "Andhra Pradesh",
};

// Official list of Indian States & Union Territories
const OFFICIAL_INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

// Normalized map of state aliases and variations to canonical Indian state names
const CANONICAL_STATES_MAP = {};
OFFICIAL_INDIAN_STATES.forEach((st) => {
  const norm = st.toLowerCase().trim();
  CANONICAL_STATES_MAP[norm] = st;
  CANONICAL_STATES_MAP[norm.replace(/&/g, "and").trim()] = st;
  CANONICAL_STATES_MAP[norm.replace(/\sand\s/g, " & ").trim()] = st;
});
CANONICAL_STATES_MAP["orissa"] = "Odisha";
CANONICAL_STATES_MAP["jammu and kashmir"] = "Jammu & Kashmir";
CANONICAL_STATES_MAP["j&k"] = "Jammu & Kashmir";
CANONICAL_STATES_MAP["kashmir"] = "Jammu & Kashmir";
CANONICAL_STATES_MAP["hp"] = "Himachal Pradesh";
CANONICAL_STATES_MAP["up"] = "Uttar Pradesh";
CANONICAL_STATES_MAP["mp"] = "Madhya Pradesh";
CANONICAL_STATES_MAP["tn"] = "Tamil Nadu";
CANONICAL_STATES_MAP["wb"] = "West Bengal";
CANONICAL_STATES_MAP["ap"] = "Andhra Pradesh";
CANONICAL_STATES_MAP["uk"] = "Uttarakhand";
CANONICAL_STATES_MAP["uttaranchal"] = "Uttarakhand";

/**
 * Reusable helper: Resolve any raw location text (city, town, hub, or state) into canonical Indian State
 * @param {string} rawText - Input location text (e.g. "Manali", "Munnar", "Himachal Pradesh", "Kochi, Kerala")
 * @returns {Promise<string|null>} Canonical State name (e.g. "Himachal Pradesh") or null
 */
async function resolveLocationToState(rawText) {
  if (!rawText || typeof rawText !== "string") return null;

  // 1. Sanitize & trim
  const clean = rawText
    .replace(/,\s*(india|in)$/i, "")
    .replace(/[\(\)]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return null;
  const lower = clean.toLowerCase();

  // 2. Check if already an exact canonical Indian State name
  if (CANONICAL_STATES_MAP[lower]) {
    return CANONICAL_STATES_MAP[lower];
  }

  // 3. If comma-separated (e.g. "Manali, Himachal Pradesh" or "Munnar, Kerala"), check parts
  if (clean.includes(",")) {
    const parts = clean.split(",").map((p) => p.trim());
    for (let i = parts.length - 1; i >= 0; i--) {
      const partState = await resolveLocationToState(parts[i]);
      if (partState) return partState;
    }
  }

  // 4. Exact match against comprehensive tourist destination dictionary
  if (KNOWN_DESTINATION_STATE_MAP[lower]) {
    return KNOWN_DESTINATION_STATE_MAP[lower];
  }

  // 5. Tokenized / word boundary substring matching against known dictionary
  // E.g. "old manali", "naggar to manali", "pillar rocks kodaikanal"
  for (const [key, state] of Object.entries(KNOWN_DESTINATION_STATE_MAP)) {
    if (key.length >= 4) {
      const regex = new RegExp(`\\b${key}\\b`, "i");
      if (regex.test(lower)) {
        return state;
      }
    }
  }

  // 6. Database lookup against Location model in MongoDB
  try {
    const loc = await Location.findOne({
      $or: [
        { city: new RegExp(`^${clean.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}$`, "i") },
        { state: new RegExp(`^${clean.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}$`, "i") },
      ],
    }).lean();

    if (loc?.state) {
      const normDbState = loc.state.toLowerCase().trim();
      return CANONICAL_STATES_MAP[normDbState] || loc.state.trim();
    }
  } catch (e) {
    // Non-fatal if Location collection is unavailable
  }

  return null;
}

/**
 * Normalize and extract all destination states from a trip structure
 * Uses structured location data first, then resolves cities to states.
 * @param {Object|string|Array} tripOrInput - Trip document, location string, or array
 * @returns {Promise<{
 *   tripStates: string[],
 *   destinationName: string,
 *   routeDisplayText: string,
 *   resolvedLocations: Record<string, string>
 * }>}
 */
async function resolveTripLocationsToStates(tripOrInput) {
  const detectedStates = new Set();
  const resolvedLocations = {};
  let primaryDestination = "";

  // Handle direct string input (e.g. "Manali" or "Himachal Pradesh")
  if (typeof tripOrInput === "string") {
    primaryDestination = tripOrInput.trim();
    const st = await resolveLocationToState(primaryDestination);
    if (st) {
      detectedStates.add(st);
      resolvedLocations[primaryDestination] = st;
    }
    const statesArr = Array.from(detectedStates);
    return formatResolutionResult(statesArr, primaryDestination, resolvedLocations);
  }

  // Handle direct array input (e.g. ["Manali", "Kochi"])
  if (Array.isArray(tripOrInput)) {
    for (const loc of tripOrInput) {
      if (typeof loc === "string") {
        if (!primaryDestination) primaryDestination = loc.trim();
        const st = await resolveLocationToState(loc);
        if (st) {
          detectedStates.add(st);
          resolvedLocations[loc.trim()] = st;
        }
      }
    }
    const statesArr = Array.from(detectedStates);
    return formatResolutionResult(statesArr, primaryDestination, resolvedLocations);
  }

  const trip = tripOrInput || {};

  // Track raw destinations for route display
  primaryDestination = (trip.destination || "").trim();

  // Helper to resolve and record any location candidate
  const processCandidate = async (locText) => {
    if (!locText || typeof locText !== "string") return;
    const clean = locText.trim();
    if (!clean) return;

    const st = await resolveLocationToState(clean);
    if (st) {
      detectedStates.add(st);
      resolvedLocations[clean] = st;
    }
  };

  // 1. Structured location information from Trip itinerary & segments (Priority 1)
  // Check stay segments structured state/city data
  if (Array.isArray(trip.staySegments)) {
    for (const stay of trip.staySegments) {
      if (stay.state) await processCandidate(stay.state);
      if (stay.province) await processCandidate(stay.province);
      if (stay.city) await processCandidate(stay.city);
      if (stay.location) await processCandidate(stay.location);
    }
  }

  // Check travel legs structured originState / destinationState
  if (Array.isArray(trip.travelLegs)) {
    for (const leg of trip.travelLegs) {
      if (leg.destinationState) await processCandidate(leg.destinationState);
      if (leg.to) await processCandidate(leg.to);
      if (leg.originState) await processCandidate(leg.originState);
      if (leg.from) await processCandidate(leg.from);
    }
  }

  // Check day-by-day structured itinerary destinations & activity locations
  if (Array.isArray(trip.itinerary)) {
    for (const day of trip.itinerary) {
      if (day.destination) await processCandidate(day.destination);
      if (day.state) await processCandidate(day.state);
      if (day.locationDetails?.state) await processCandidate(day.locationDetails.state);
      if (day.locationDetails?.city) await processCandidate(day.locationDetails.city);

      if (Array.isArray(day.plan)) {
        for (const item of day.plan) {
          if (item.state) await processCandidate(item.state);
          if (item.locationDetails?.state) await processCandidate(item.locationDetails.state);
          if (item.place) await processCandidate(item.place);
          if (item.placeName) await processCandidate(item.placeName);
          if (item.location) await processCandidate(item.location);
        }
      }
    }
  }

  // 2. Explicit states / tripStates / route arrays on trip object
  const explicitCandidates = [
    ...(Array.isArray(trip.states) ? trip.states : []),
    ...(Array.isArray(trip.tripStates) ? trip.tripStates : []),
    ...(Array.isArray(trip.route) ? trip.route : []),
    ...(Array.isArray(trip.destinations) ? trip.destinations : []),
  ];
  for (const c of explicitCandidates) {
    await processCandidate(c);
  }

  // 3. Primary Destination field (Priority 2)
  if (trip.destination) {
    await processCandidate(trip.destination);
  }

  // 4. Source field (Priority 3 - checked if nothing else resolved)
  if (detectedStates.size === 0 && trip.source) {
    await processCandidate(trip.source);
  }

  const statesArr = Array.from(detectedStates);
  return formatResolutionResult(statesArr, primaryDestination, resolvedLocations);
}

/**
 * Format the resolution result and route display text matching Requirement 15
 */
function formatResolutionResult(statesArr, primaryDestination, resolvedLocations) {
  let routeDisplayText = "";
  const destClean = (primaryDestination || "").trim();
  const destLower = destClean.toLowerCase();

  if (statesArr.length === 0) {
    routeDisplayText = destClean
      ? `Geographically matched based on trip route: ${destClean}`
      : "No geographical route states resolved";
  } else if (statesArr.length === 1) {
    const singleState = statesArr[0];
    const isAlreadyState = CANONICAL_STATES_MAP[destLower] === singleState;

    if (destClean && !isAlreadyState) {
      // Example: "Geographically matched based on trip route: Manali → Himachal Pradesh"
      routeDisplayText = `Geographically matched based on trip route: ${destClean} → ${singleState}`;
    } else {
      // Destination was already the state
      routeDisplayText = `Geographically matched based on trip route: ${singleState}`;
    }
  } else {
    // Multiple destinations/states
    // Example: "Geographically matched based on trip route states: Himachal Pradesh, Kerala"
    routeDisplayText = `Geographically matched based on trip route states: ${statesArr.join(", ")}`;
  }

  return {
    tripStates: statesArr,
    destinationName: destClean,
    routeDisplayText,
    resolvedLocations,
  };
}

/**
 * Extract relevant Indian states from a Trip document (convenience wrapper)
 */
async function extractTripStates(trip) {
  const result = await resolveTripLocationsToStates(trip);
  return result.tripStates;
}

/**
 * Match and rank guides for a trip requirement
 * @param {Object} trip - The Trip document or location object
 * @param {Object} customRequirement - Traveler's requirement (gender, languages, count, etc.)
 * @returns {Array} List of 4 to 10 matched guide profiles with scores (sensitive docs excluded)
 */
async function matchGuidesForTrip(trip, customRequirement = null) {
  const requirement = customRequirement || trip?.guideRequirement || {};
  const { tripStates, destinationName, routeDisplayText, resolvedLocations } =
    await resolveTripLocationsToStates(trip);

  const travelers = Number(trip?.travelers) || 1;
  const isCampus = trip?.tripCategory === "CAMPUS" || travelers >= 20;

  // If no geographic states could be resolved, return 0 matches (never fabricate geographically irrelevant guides)
  if (tripStates.length === 0) {
    return {
      tripStates: [],
      destinationName,
      routeDisplayText: destinationName
        ? `Geographically matched based on trip route: ${destinationName}`
        : "No geographical route states resolved",
      resolvedLocations,
      matchedGuides: [],
      totalMatches: 0,
    };
  }

  // Primary Query: Guides whose geographical states overlap with the trip states
  const query = {
    verificationStatus: "approved",
    "geographicalKnowledge.states": { $in: tripStates },
  };

  // Strict projection: NEVER expose sensitive identity documents (Aadhaar, License, Passport)
  const candidateGuides = await GuideProfile.find(query)
    .select("-documents")
    .lean();

  // If no candidates matched the exact states, fall back to region or primaryRegion check
  let pool = candidateGuides;
  if (pool.length === 0 && tripStates.length > 0) {
    // Try primaryRegion matching
    pool = await GuideProfile.find({
      verificationStatus: "approved",
      $or: [
        { primaryRegion: { $in: tripStates } },
        { "geographicalKnowledge.states": { $in: tripStates } },
      ],
    })
      .select("-documents")
      .lean();
  }

  // If still empty (e.g. unknown state / no matches), return empty array rather than inventing false matches
  if (pool.length === 0) {
    return {
      tripStates,
      destinationName,
      routeDisplayText,
      resolvedLocations,
      matchedGuides: [],
      totalMatches: 0,
    };
  }

  const preferredLanguages = (requirement.preferredLanguages || []).map((l) =>
    l.toLowerCase().trim()
  );
  const genderPref = (requirement.genderPreference || "Either").toLowerCase();

  // Multi-factor scoring function
  const scoredGuides = pool.map((guide) => {
    let score = 0;
    const guideStates = guide.geographicalKnowledge?.states || [];

    // 1. Geographical Overlap (HIGHEST PRIORITY: up to 1000 points)
    const matchedStateList = guideStates.filter((s) => tripStates.includes(s));
    const overlapCount = matchedStateList.length;
    score += overlapCount * 250;

    // Full coverage bonus if guide covers all trip states
    if (tripStates.length > 0 && overlapCount === tripStates.length) {
      score += 300;
    }

    // Primary region match bonus
    if (tripStates.includes(guide.primaryRegion)) {
      score += 150;
    }

    // 2. Verification status (Approved gives standard baseline)
    if (guide.verificationStatus === "approved") {
      score += 100;
    }

    // 3. Gender preference compatibility
    const bioText = (guide.bio || "").toLowerCase();
    const isFemale =
      /\b(she|her|woman|female)\b/.test(bioText) ||
      /\b(anjali|fathima|geetha|aswathy|deepa|sneha|farah|ritika|meenal|nikita|marissa|tanya|lakshmi|shruti|chandana|pooja|meenakshi|divya|nandhini|priya|kavita|shreya|hetal|bhavna|zainab|tashi|nisha|preeti|ananya|sreeja|neha|shalini|ayesha|sunita|mitali|sangeeta|nusrat|sasmita|harini|daphisha)\b/.test(
        guide.fullName.toLowerCase()
      );

    if (genderPref === "female") {
      if (isFemale) score += 300;
      else score -= 150;
    } else if (genderPref === "male") {
      if (!isFemale) score += 300;
      else score -= 150;
    } else {
      // Either: neutral
      score += 50;
    }

    // 4. Language compatibility
    if (preferredLanguages.length > 0) {
      const guideLanguages = (guide.languages || [])
        .concat(guide.customLanguages || [])
        .map((l) => l.toLowerCase().trim());

      const langOverlap = guideLanguages.filter((l) =>
        preferredLanguages.includes(l)
      );
      score += langOverlap.length * 75;
    }

    // 5. Group size compatibility
    const grpSize = guide.preferredGroupSize || "";
    if (isCampus) {
      if (grpSize === "Campus Trips") score += 150;
      else if (grpSize === "20+ people") score += 120;
      else if (grpSize === "11–20 people") score += 60;
    } else {
      if (travelers <= 5 && grpSize === "1–5 people") score += 100;
      else if (travelers <= 10 && (grpSize === "6–10 people" || grpSize === "1–5 people")) score += 100;
      else if (travelers <= 20 && grpSize === "11–20 people") score += 100;
      else if (travelers > 20 && (grpSize === "20+ people" || grpSize === "Campus Trips")) score += 100;
    }

    // 6. Availability priority
    if (guide.availability === "Full-time") score += 80;
    else if (guide.availability === "Part-time") score += 50;
    else if (guide.availability === "Weekends") score += 40;
    else score += 20;

    // 7. Guiding experience duration
    const exp = guide.guidingExperience || "";
    if (exp.includes("10+ years")) score += 90;
    else if (exp.includes("6–10 years")) score += 70;
    else if (exp.includes("3–5 years")) score += 50;
    else if (exp.includes("1–2 years")) score += 30;
    else score += 10;

    return {
      ...guide,
      matchedStates: matchedStateList,
      coverageCount: overlapCount,
      matchScore: score,
    };
  });

  // Sort descending by matchScore, with geographic coverage as the dominant tiebreaker
  scoredGuides.sort((a, b) => {
    if (b.coverageCount !== a.coverageCount) {
      return b.coverageCount - a.coverageCount;
    }
    return b.matchScore - a.matchScore;
  });

  // Rule: Return at most 10 matched guides. Target 4–5+ suitable matches when available.
  // Never fabricate unsuitable matches.
  const finalMatches = scoredGuides.slice(0, 10);

  return {
    tripStates,
    destinationName,
    routeDisplayText,
    resolvedLocations,
    matchedGuides: finalMatches,
    totalMatches: finalMatches.length,
  };
}

module.exports = {
  OFFICIAL_INDIAN_STATES,
  KNOWN_DESTINATION_STATE_MAP,
  resolveLocationToState,
  resolveTripLocationsToStates,
  extractTripStates,
  matchGuidesForTrip,
};

