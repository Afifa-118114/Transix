const Vendor = require("../models/Vendor");
const { resolveCityToState } = require("./locationService");

/**
 * Mapping table from Campus Transport Plan vehicleType / comfort to Vendor Master fleet categories.
 */
const CATEGORY_COMPATIBILITY = {
  "luxury coach": ["LUXURY_AC_COACH", "LARGE_COACH", "COMFORT_AC_BUS"],
  "ac coach": ["STANDARD_AC_BUS", "COMFORT_AC_BUS", "LARGE_COACH", "LUXURY_AC_COACH"],
  "standard coach": ["STANDARD_NON_AC_BUS", "STANDARD_AC_BUS", "COMFORT_AC_BUS"],
  "traveller": ["TEMPO_TRAVELLER", "MINI_BUS"],
  "tempo traveller": ["TEMPO_TRAVELLER", "MINI_BUS"],
  "coach": ["STANDARD_AC_BUS", "COMFORT_AC_BUS", "LARGE_COACH", "LUXURY_AC_COACH", "STANDARD_NON_AC_BUS"],
  "bus": ["STANDARD_AC_BUS", "COMFORT_AC_BUS", "LARGE_COACH", "LUXURY_AC_COACH", "STANDARD_NON_AC_BUS"],
  "mini bus": ["MINI_BUS", "TEMPO_TRAVELLER"],
};

/**
 * Deterministically match connected vendors for a Campus Group Fleet requirement.
 *
 * @param {Object} params
 * @param {string} params.originCity
 * @param {string} params.destinationCity
 * @param {string} [params.originStateHint]
 * @param {string} [params.destinationStateHint]
 * @param {Object} params.fleetRequirement - Finalized campus transport plan requirement
 * @returns {Promise<{
 *   success: boolean,
 *   route: {
 *     originCity: string,
 *     destinationCity: string,
 *     originState: string,
 *     destinationState: string,
 *   },
 *   fleetRequirement: Object,
 *   summary: {
 *     totalGeographicMatches: number,
 *     suitableMatchesCount: number,
 *     partialMatchesCount: number,
 *     rejectedCount: number,
 *   },
 *   matchedVendors: Array,
 *   partiallyMatchedVendors: Array,
 *   rejectedVendors: Array,
 *   error?: string
 * }>}
 */
async function findMatchingFleetVendors({
  originCity,
  destinationCity,
  originStateHint = null,
  destinationStateHint = null,
  fleetRequirement = {},
}) {
  // 1. Resolve Origin City/State -> Canonical Origin State
  const originResolution = await resolveCityToState(originCity, originStateHint);
  if (!originResolution.resolved) {
    return {
      success: false,
      error: originResolution.ambiguous
        ? `Ambiguous origin: ${originResolution.message}`
        : `Origin '${originCity}' could not be resolved from the location database.`,
      resolutionDetails: { origin: originResolution },
      route: {
        originCity,
        destinationCity,
        originState: "Resolving state...",
        destinationState: "Resolving state...",
      },
      totalConnectedVendors: 100,
      matchedCount: 0,
      matchedVendors: [],
      partiallyMatchedVendors: [],
      rejectedVendors: [],
    };
  }

  // 2. Resolve Destination City/State -> Canonical Destination State
  const destResolution = await resolveCityToState(destinationCity, destinationStateHint);
  if (!destResolution.resolved) {
    return {
      success: false,
      error: destResolution.ambiguous
        ? `Ambiguous destination: ${destResolution.message}`
        : `Destination '${destinationCity}' could not be resolved from the location database.`,
      resolutionDetails: { origin: originResolution, destination: destResolution },
      route: {
        originCity: originResolution.isStateInput ? originResolution.state : (originResolution.city || originCity),
        destinationCity,
        originState: originResolution.state,
        destinationState: "Resolving state...",
      },
      totalConnectedVendors: 100,
      matchedCount: 0,
      matchedVendors: [],
      partiallyMatchedVendors: [],
      rejectedVendors: [],
    };
  }

  const originState = originResolution.state;
  const destinationState = destResolution.state;

  // 3. Find connected vendors serving BOTH states in existing 'vendors' collection
  const geographicVendors = await Vendor.find({
    status: "CONNECTED",
    serviceStates: { $all: [originState, destinationState] },
  }).lean();

  const reqVehicleType = (fleetRequirement.vehicleType || "Coach").toLowerCase();
  const reqComfort = (fleetRequirement.comfort || "AC").toLowerCase();
  const reqCapacity = Number(fleetRequirement.capacityPerVehicle) || 25;
  const reqVehicles = Number(fleetRequirement.vehiclesRequired) || 1;

  // Compatible fleet categories
  const compatibleCategories =
    CATEGORY_COMPATIBILITY[reqVehicleType] ||
    CATEGORY_COMPATIBILITY["coach"];

  const matchedVendors = [];
  const partiallyMatchedVendors = [];
  const rejectedVendors = [];

  for (const vendor of geographicVendors) {
    const reasons = [];
    const caveats = [];

    // Evaluate capabilities
    const caps = vendor.capabilities || {};
    const hasIntercity = Boolean(caps.intercity);
    const hasMultiDay = Boolean(caps.multiDay);
    const hasGroupTransport = Boolean(caps.groupTransport);
    const hasDriverIncluded = Boolean(caps.driverIncluded);

    if (!hasIntercity) reasons.push("Vendor does not support intercity group routes");
    if (!hasMultiDay) reasons.push("Vendor does not support multi-day tours");
    if (!hasGroupTransport) reasons.push("Vendor does not support group transport operations");
    if (!hasDriverIncluded) reasons.push("Professional driver not included");

    // Evaluate fleet
    const fleetList = Array.isArray(vendor.fleet) ? vendor.fleet : [];
    
    // Find fleet items matching category
    const categoryMatches = fleetList.filter((f) =>
      compatibleCategories.includes(f.category)
    );

    // Find fleet items with sufficient capacity (>= required coach capacity)
    const capacityMatches = fleetList.filter((f) => f.capacity >= reqCapacity);

    // Check AC requirement if comfort asks for AC/Luxury
    const requiresAc = reqComfort.includes("ac") || reqComfort.includes("luxury");
    const acMatches = requiresAc
      ? fleetList.filter((f) => f.ac === true)
      : fleetList;

    // Ideal fleet items matching category, capacity, and AC requirement
    const idealFleetMatches = fleetList.filter(
      (f) =>
        compatibleCategories.includes(f.category) &&
        f.capacity >= reqCapacity &&
        (!requiresAc || f.ac === true)
    );

    if (idealFleetMatches.length === 0) {
      if (categoryMatches.length === 0) {
        reasons.push(`No ${fleetRequirement.vehicleType || "requested"} category in fleet inventory`);
      } else if (capacityMatches.length === 0) {
        const maxCapacity = Math.max(...fleetList.map((f) => f.capacity || 0), 0);
        reasons.push(`Fleet capacity insufficient (max ${maxCapacity} seats vs ${reqCapacity} required)`);
      } else if (requiresAc && acMatches.length === 0) {
        reasons.push("No air-conditioned vehicles in fleet inventory");
      }
    }

    const coverageDetails = {
      servesOrigin: vendor.serviceStates.includes(originState),
      servesDestination: vendor.serviceStates.includes(destinationState),
      originState,
      destinationState,
      totalStatesServed: vendor.serviceStates.length,
    };

    const vendorCardData = {
      _id: vendor._id,
      name: vendor.name,
      status: vendor.status,
      source: vendor.source,
      serviceStates: vendor.serviceStates,
      capabilities: vendor.capabilities,
      fleet: vendor.fleet,
      coverage: coverageDetails,
      matchingFleet: idealFleetMatches.length > 0 ? idealFleetMatches : categoryMatches,
    };

    if (reasons.length === 0) {
      // FULLY MATCHED / SUITABLE
      matchedVendors.push({
        ...vendorCardData,
        matchLevel: "SUITABLE",
        reasons: [],
      });
    } else if (reasons.length <= 1 && categoryMatches.length > 0 && acMatches.length > 0) {
      // PARTIALLY MATCHED
      partiallyMatchedVendors.push({
        ...vendorCardData,
        matchLevel: "PARTIAL",
        caveats: reasons,
      });
    } else {
      // REJECTED
      rejectedVendors.push({
        ...vendorCardData,
        matchLevel: "REJECTED",
        reasons,
      });
    }
  }

  return {
    success: true,
    route: {
      originCity: originResolution.isStateInput ? originResolution.state : (originResolution.city || originCity),
      destinationCity: destResolution.isStateInput ? destResolution.state : (destResolution.city || destinationCity),
      originState,
      destinationState,
    },
    fleetRequirement: {
      ...fleetRequirement,
      originState,
      destinationState,
    },
    totalConnectedVendors: 100,
    matchedCount: matchedVendors.length,
    summary: {
      totalGeographicMatches: geographicVendors.length,
      suitableMatchesCount: matchedVendors.length,
      partialMatchesCount: partiallyMatchedVendors.length,
      rejectedCount: rejectedVendors.length,
    },
    matchedVendors,
    partiallyMatchedVendors,
    rejectedVendors,
  };
}

module.exports = {
  findMatchingFleetVendors,
  CATEGORY_COMPATIBILITY,
};
