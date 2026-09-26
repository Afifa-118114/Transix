const Location = require("../models/Location");

/**
 * Deterministically resolve a city or state input to its canonical state using MongoDB locations collection.
 * Supports:
 * 1. City input (e.g. "Mumbai", "Dehradun") -> queries locations.city -> returns canonical state.
 * 2. State input (e.g. "Kerala", "Uttarakhand") -> recognizes canonical locations.state directly.
 * 3. Handles city ambiguity (e.g., Aurangabad in Maharashtra vs Bihar) requiring stateHint.
 *
 * @param {string} input - City name or state name to resolve.
 * @param {string} [stateHint] - Optional state context/hint.
 * @returns {Promise<{
 *   resolved: boolean,
 *   city?: string,
 *   state?: string,
 *   latitude?: number,
 *   longitude?: number,
 *   country?: string,
 *   iso2?: string,
 *   isStateInput?: boolean,
 *   ambiguous?: boolean,
 *   candidateStates?: string[],
 *   notFound?: boolean,
 *   message?: string
 * }>}
 */
async function resolveCityToState(input, stateHint = null) {
  if (!input || typeof input !== "string" || !input.trim()) {
    return {
      resolved: false,
      notFound: true,
      message: "Location input is empty or invalid",
    };
  }

  const cleanInput = input.trim();
  const cleanHint = stateHint && typeof stateHint === "string" ? stateHint.trim() : null;

  // 1. If state hint is provided, query with exact city + state pair
  if (cleanHint) {
    const matched = await Location.findOne({
      city: new RegExp(`^${escapeRegex(cleanInput)}$`, "i"),
      $or: [
        { state: new RegExp(`^${escapeRegex(cleanHint)}$`, "i") },
        { formerState: new RegExp(`^${escapeRegex(cleanHint)}$`, "i") },
      ],
    });

    if (matched) {
      return {
        resolved: true,
        city: matched.city,
        state: matched.state,
        latitude: matched.latitude,
        longitude: matched.longitude,
        country: matched.country,
        iso2: matched.iso2,
        isStateInput: false,
      };
    }
  }

  // 2. Query locations matching city name
  const cityMatches = await Location.find({
    city: new RegExp(`^${escapeRegex(cleanInput)}$`, "i"),
  });

  if (cityMatches && cityMatches.length === 1) {
    const loc = cityMatches[0];
    return {
      resolved: true,
      city: loc.city,
      state: loc.state,
      latitude: loc.latitude,
      longitude: loc.longitude,
      country: loc.country,
      iso2: loc.iso2,
      isStateInput: false,
    };
  }

  if (cityMatches && cityMatches.length > 1) {
    const distinctStates = Array.from(new Set(cityMatches.map((m) => m.state)));
    return {
      resolved: false,
      ambiguous: true,
      candidateStates: distinctStates,
      message: `City '${cleanInput}' exists in multiple states (${distinctStates.join(", ")}). State context is required to resolve unambiguously.`,
    };
  }

  // 3. If no city matched, check if input is directly a canonical state in the locations collection
  const stateMatch = await Location.findOne({
    $or: [
      { state: new RegExp(`^${escapeRegex(cleanInput)}$`, "i") },
      { formerState: new RegExp(`^${escapeRegex(cleanInput)}$`, "i") },
    ],
  });

  if (stateMatch) {
    return {
      resolved: true,
      city: stateMatch.state,
      state: stateMatch.state,
      country: stateMatch.country,
      iso2: stateMatch.iso2,
      isStateInput: true,
    };
  }

  // 4. Try relaxed city search (prefix match)
  const partialCityMatch = await Location.findOne({
    city: new RegExp(`^${escapeRegex(cleanInput)}`, "i"),
  });

  if (partialCityMatch) {
    return {
      resolved: true,
      city: partialCityMatch.city,
      state: partialCityMatch.state,
      latitude: partialCityMatch.latitude,
      longitude: partialCityMatch.longitude,
      country: partialCityMatch.country,
      iso2: partialCityMatch.iso2,
      isStateInput: false,
    };
  }

  // 5. Try relaxed state search (prefix match)
  const partialStateMatch = await Location.findOne({
    $or: [
      { state: new RegExp(`^${escapeRegex(cleanInput)}`, "i") },
      { formerState: new RegExp(`^${escapeRegex(cleanInput)}`, "i") },
    ],
  });

  if (partialStateMatch) {
    return {
      resolved: true,
      city: partialStateMatch.state,
      state: partialStateMatch.state,
      country: partialStateMatch.country,
      iso2: partialStateMatch.iso2,
      isStateInput: true,
    };
  }

  return {
    resolved: false,
    notFound: true,
    message: `Location '${cleanInput}' could not be resolved from the location database (neither city nor canonical state).`,
  };
}

function escapeRegex(string) {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}

module.exports = {
  resolveCityToState,
};
