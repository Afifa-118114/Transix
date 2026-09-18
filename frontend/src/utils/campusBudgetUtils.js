/**
 * Canonical calculation utilities for Campus & Personal Trip accommodation and budgets.
 * Ensures consistent derivation of:
 * - Group accommodation cost
 * - Per-student accommodation cost
 * - Total group budget
 * - Budget per student
 * - Remaining budgets and inclusion/exclusion awareness
 */

/**
 * Computes estimated institutional group room rate for Campus trips
 * based on retail base rate and bulk institutional booking size.
 *
 * @param {number} baseRate - Baseline retail nightly rate for 1 room
 * @param {number} requiredRooms - Number of rooms needed
 * @returns {number} Estimated institutional group room rate per night
 */
export function calculateCampusGroupRoomRate(baseRate, requiredRooms = 1) {
  if (!baseRate || baseRate <= 0) return 1800;

  // If already identified as bulk/group rate (<= 2500), preserve it
  if (baseRate <= 2500) {
    return Math.max(1200, Math.round(baseRate));
  }

  // Institutional volume discount tiers for bulk educational bookings
  let discount = 0.25; // Base 25% educational group concession
  if (requiredRooms >= 50) {
    discount = 0.50; // 50% institutional bulk concession for large groups (50+ rooms)
  } else if (requiredRooms >= 20) {
    discount = 0.40; // 40% bulk concession (20-49 rooms)
  } else if (requiredRooms >= 10) {
    discount = 0.30; // 30% group concession (10-19 rooms)
  }

  let discountedRate = Math.round(baseRate * (1 - discount));

  // Institutional group tier normalization:
  // Educational tour packages negotiate standardized institutional group room blocks,
  // typically capped at ₹2,500/room/night for standard/twin sharing (approx ₹1,250/student/night).
  if (discountedRate > 2500) {
    discountedRate = 2500;
  }
  if (discountedRate < 1200) {
    discountedRate = Math.min(baseRate, 1200);
  }

  return discountedRate;
}

/**
 * Calculates accommodation pricing for a single stay segment
 * @param {Object} segment - The stay segment object
 * @param {Object} trip - The trip object containing tripCategory and campusConfig
 * @returns {Object} Structured accommodation pricing details
 */
export function calculateStayAccommodation(segment, trip) {
  if (!segment) {
    return {
      hasHotel: false,
      nightlyRate: 0,
      nights: 1,
      rooms: 1,
      groupCost: 0,
      perStudentCost: 0,
      isCampus: false,
      isEstimated: true,
      included: true,
    };
  }

  const isCampus = trip?.tripCategory === "CAMPUS";
  const nights = Math.max(1, parseInt(segment.nights || 1, 10));

  if (!segment.selectedHotel) {
    const expectedStudents = isCampus
      ? parseInt(trip?.campusConfig?.expectedParticipants, 10) || parseInt(trip?.travelers, 10) || 1
      : 1;
    const studentsPerRoom = isCampus
      ? parseInt(trip?.campusConfig?.studentsPerRoom, 10) || 2
      : 2;
    const requiredRooms = isCampus
      ? Math.max(1, Math.ceil(expectedStudents / studentsPerRoom))
      : 1;

    return {
      hasHotel: false,
      hotelName: null,
      hotelImage: null,
      nightlyRate: 0,
      nights,
      rooms: requiredRooms,
      studentsPerRoom,
      expectedStudents,
      groupCost: 0,
      perStudentCost: 0,
      isCampus,
      isEstimated: true,
      included: isCampus ? trip?.campusConfig?.inclusions?.accommodation !== false : true,
    };
  }

  const hotel = segment.selectedHotel;

  if (isCampus) {
    const expectedStudents =
      parseInt(trip?.campusConfig?.expectedParticipants, 10) ||
      parseInt(trip?.travelers, 10) ||
      1;
    const studentsPerRoom =
      parseInt(trip?.campusConfig?.studentsPerRoom, 10) || 2;
    const requiredRooms = Math.max(1, Math.ceil(expectedStudents / studentsPerRoom));

    // Determine baseline nightly rate for 1 room
    let baseNightlyRate = 0;
    let isExplicitGroupPrice = false;
    if (hotel.groupPrice && Number(hotel.groupPrice) > 0) {
      baseNightlyRate = Math.round(Number(hotel.groupPrice) / (requiredRooms * nights));
      isExplicitGroupPrice = true;
    } else if (hotel.nightlyPrice && Number(hotel.nightlyPrice) > 0) {
      baseNightlyRate = Number(hotel.nightlyPrice);
    } else if (hotel.nuitee?.nightlyPrice && Number(hotel.nuitee.nightlyPrice) > 0) {
      baseNightlyRate = Number(hotel.nuitee.nightlyPrice);
    } else if (hotel.pricePerNight && Number(hotel.pricePerNight) > 0) {
      baseNightlyRate = Number(hotel.pricePerNight);
    } else if (hotel.price && Number(hotel.price) > 0) {
      const rawPrice = Number(hotel.price);
      // Check if price was already scaled to group size
      if (hotel.rooms && Number(hotel.rooms) > 1) {
        baseNightlyRate = Math.round(rawPrice / (Number(hotel.rooms) * nights));
        isExplicitGroupPrice = true;
      } else if (rawPrice > 50000 && rawPrice >= requiredRooms * 1000 * nights * 0.5) {
        // Likely already a group cost
        baseNightlyRate = Math.round(rawPrice / (requiredRooms * nights));
        isExplicitGroupPrice = true;
      } else {
        // Single room price for nights
        baseNightlyRate = Math.round(rawPrice / nights);
      }
    }

    // Realistic fallback if rate is still missing or unreasonably low (< 1000)
    if (!baseNightlyRate || isNaN(baseNightlyRate) || baseNightlyRate < 1000) {
      const nameStr = hotel.name || "";
      const locStr = segment.location || "";
      const seed = (nameStr + locStr).length || 10;
      baseNightlyRate = 3500 + (seed % 10) * 500;
    }

    // Apply Campus educational group discount & bulk pricing logic
    const groupNightlyRate = (isExplicitGroupPrice && baseNightlyRate <= 2500)
      ? baseNightlyRate
      : calculateCampusGroupRoomRate(baseNightlyRate, requiredRooms);

    const groupCost = requiredRooms * groupNightlyRate * nights;
    const perStudentCost = Math.round(groupCost / expectedStudents);

    return {
      hasHotel: true,
      hotelName: hotel.name,
      hotelImage: hotel.image || hotel.photos?.[0]?.url,
      nightlyRate: groupNightlyRate,
      baseNightlyRate,
      nights,
      rooms: requiredRooms,
      studentsPerRoom,
      expectedStudents,
      groupCost,
      perStudentCost,
      isCampus: true,
      isEstimated: true, // Always labeled as estimated planning cost
      included: trip?.campusConfig?.inclusions?.accommodation !== false,
    };
  } else {
    // PERSONAL TRIP: preserve existing 1-room / personal semantics
    const travelers = parseInt(trip?.travelers, 10) || 1;
    const personalRooms = Math.max(1, Math.ceil(travelers / 2));

    let nightlyRate = 0;
    if (hotel.nightlyPrice && Number(hotel.nightlyPrice) > 0) {
      nightlyRate = Number(hotel.nightlyPrice);
    } else if (hotel.price && Number(hotel.price) > 0) {
      nightlyRate = Math.round(Number(hotel.price) / nights);
    } else {
      const nameStr = hotel.name || "";
      const locStr = segment.location || "";
      const seed = (nameStr + locStr).length || 10;
      nightlyRate = 3500 + (seed % 10) * 500;
    }

    const totalCost = hotel.price ? Number(hotel.price) : (nightlyRate * nights);

    return {
      hasHotel: true,
      hotelName: hotel.name,
      hotelImage: hotel.image || hotel.photos?.[0]?.url,
      nightlyRate,
      nights,
      rooms: personalRooms,
      groupCost: totalCost,
      perStudentCost: totalCost,
      isCampus: false,
      isEstimated: hotel.isEstimatedPrice !== false,
      included: true,
    };
  }
}

/**
 * Calculates total accommodation summary across all stay segments
 * @param {Array} staySegments - Array of stay segments
 * @param {Object} trip - The trip object
 * @returns {Object} Aggregated accommodation metrics
 */
export function calculateAccommodationSummary(staySegments = [], trip) {
  const isCampus = trip?.tripCategory === "CAMPUS";
  const expectedStudents = isCampus
    ? parseInt(trip?.campusConfig?.expectedParticipants, 10) || parseInt(trip?.travelers, 10) || 1
    : 1;

  let totalGroupAccommodation = 0;
  let selectedCount = 0;

  const items = (staySegments || []).map((segment, index) => {
    const pricing = calculateStayAccommodation(segment, trip);
    if (pricing.hasHotel) {
      selectedCount++;
      totalGroupAccommodation += pricing.groupCost;
    }
    return {
      index,
      id: segment.id || `stay-${index}`,
      location: segment.location,
      nights: pricing.nights,
      pricing,
    };
  });

  const totalPerStudentAccommodation = Math.round(totalGroupAccommodation / expectedStudents);

  return {
    items,
    selectedCount,
    totalSegments: staySegments.length,
    allSelected: staySegments.length > 0 && selectedCount === staySegments.length,
    totalGroupAccommodation,
    totalSelectedPrice: totalGroupAccommodation,
    totalPerStudentAccommodation,
    isCampus,
    expectedStudents,
  };
}

/**
 * Resolves the actual trip duration in days for a trip.
 * Derives duration authoritatively from:
 * 1. Inclusive start and end dates (Math.round((end - start) / 1 day) + 1)
 * 2. Itinerary array length
 * 3. Stored duration string/number
 * 
 * @param {Object} trip - The trip object
 * @returns {number} Duration in days
 */
export function getTripDurationDays(trip) {
  if (!trip) return 10;
  // 1. Inclusive date range
  if (trip.startDate && trip.endDate) {
    const startStr = String(trip.startDate);
    const endStr = String(trip.endDate);
    const start = new Date(startStr + (startStr.includes('T') ? '' : 'T00:00:00Z'));
    const end = new Date(endStr + (endStr.includes('T') ? '' : 'T00:00:00Z'));
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (days > 0) return days;
    }
  }
  // 2. Itinerary length
  if (Array.isArray(trip.itinerary) && trip.itinerary.length > 0) {
    return trip.itinerary.length;
  }
  if (Array.isArray(trip.days) && trip.days.length > 0) {
    return trip.days.length;
  }
  // 3. Stored duration
  if (trip.duration) {
    if (typeof trip.duration === "number" && trip.duration > 0) return trip.duration;
    const match = String(trip.duration).match(/(\d+)/);
    if (match) {
      const days = parseInt(match[1], 10);
      if (days > 0) return days;
    }
  }
  return trip?.tripCategory === "CAMPUS" ? 10 : 5;
}

/**
 * Resolves the canonical accommodation budget configuration for a trip.
 * For Campus Educational Trips, accommodation has a separate derived allocation:
 * accommodationBudgetPerStudent = MIN(overallBudgetPerStudent, tripDurationDays * 1000, 10000)
 * accommodationGroupBudget = accommodationBudgetPerStudent * expectedStudents
 * 
 * For Personal Trips, this returns the total trip budget.
 *
 * @param {Object} trip - The trip object
 * @returns {Object} Canonical accommodation budget parameters
 */
export function getCampusAccommodationBudget(trip) {
  const isCampus = trip?.tripCategory === "CAMPUS";
  if (!isCampus) {
    const totalBudget = Number(trip?.budget) || 60000;
    return {
      isCampus: false,
      expectedStudents: 1,
      tripDurationDays: getTripDurationDays(trip),
      accommodationBudgetPerStudent: totalBudget,
      accommodationAllocationPerStudent: totalBudget,
      accommodationBudgetGroup: totalBudget,
      accommodationAllocationGroup: totalBudget,
      overallBudgetPerStudent: totalBudget,
      overallGroupBudget: totalBudget,
    };
  }

  const expectedStudents =
    parseInt(trip?.campusConfig?.expectedParticipants, 10) ||
    parseInt(trip?.travelers, 10) ||
    1;

  const overallBudgetPerStudent =
    parseFloat(trip?.campusConfig?.budgetPerStudent) ||
    parseFloat(trip?.budget) ||
    0;
  const overallGroupBudget = overallBudgetPerStudent * expectedStudents;

  const tripDurationDays = getTripDurationDays(trip);

  // Canonical Accommodation Allocation Rule:
  // MIN(Overall Trip Budget Per Student, Trip Duration In Days * ₹1,000, ₹10,000)
  const accommodationBudgetPerStudent = Math.min(
    overallBudgetPerStudent > 0 ? overallBudgetPerStudent : 10000,
    tripDurationDays * 1000,
    10000
  );

  const accommodationBudgetGroup = accommodationBudgetPerStudent * expectedStudents;

  return {
    isCampus: true,
    expectedStudents,
    tripDurationDays,
    accommodationBudgetPerStudent,
    accommodationAllocationPerStudent: accommodationBudgetPerStudent,
    accommodationBudgetGroup,
    accommodationAllocationGroup: accommodationBudgetGroup,
    overallBudgetPerStudent,
    overallGroupBudget,
  };
}

/**
 * Calculates canonical budget impact analysis STRICTLY for the Accommodation / Stay Plan page.
 * This is completely isolated from food, meals, educational visits, transport, or overall itinerary costs.
 * If 0 hotels are selected, estimated accommodation cost is guaranteed to be ₹0 group and ₹0 / student.
 *
 * @param {Object} trip - The trip object
 * @param {Array} staySegments - The current draft stay segments
 * @returns {Object} Pure accommodation budget analysis
 */
export function calculateAccommodationBudgetAnalysis(trip, staySegments = []) {
  const budgetConfig = getCampusAccommodationBudget(trip);
  const accommodationSummary = calculateAccommodationSummary(staySegments, trip);

  const estimatedAccommodationGroup = accommodationSummary.totalGroupAccommodation;
  const estimatedAccommodationPerStudent = accommodationSummary.totalPerStudentAccommodation;

  if (budgetConfig.isCampus) {
    const overallBudgetPerStudent = budgetConfig.overallBudgetPerStudent;
    const overallGroupBudget = budgetConfig.overallGroupBudget;

    // User-facing metrics based on OVERALL trip budget
    const remainingOverallGroupBudget = overallGroupBudget - estimatedAccommodationGroup;
    const remainingOverallPerStudentBudget = overallBudgetPerStudent - estimatedAccommodationPerStudent;

    // Internal accommodation planning limit (never exposed directly in UI)
    const internalAccommodationLimitPerStudent = budgetConfig.accommodationBudgetPerStudent;
    const internalAccommodationLimitGroup = budgetConfig.accommodationBudgetGroup;

    const isExcluded = trip?.campusConfig?.inclusions?.accommodation === false;

    // Validation conditions
    const exceedsInternalLimit = !isExcluded && (estimatedAccommodationGroup > internalAccommodationLimitGroup);
    const exceedsOverallBudget = !isExcluded && (estimatedAccommodationGroup > overallGroupBudget);

    const overOverallAmountGroup = Math.max(0, -remainingOverallGroupBudget);
    const overOverallAmountPerStudent = Math.max(0, -remainingOverallPerStudentBudget);

    const overInternalLimitGroup = Math.max(0, estimatedAccommodationGroup - internalAccommodationLimitGroup);
    const overInternalLimitPerStudent = Math.max(0, estimatedAccommodationPerStudent - internalAccommodationLimitPerStudent);

    return {
      isCampus: true,
      expectedStudents: budgetConfig.expectedStudents,
      tripDurationDays: budgetConfig.tripDurationDays,

      // User-facing display fields (OVERALL TRIP BUDGET)
      overallTripBudgetPerStudent: overallBudgetPerStudent,
      overallTripBudgetGroup: overallGroupBudget,
      overallBudgetPerStudent,
      overallGroupBudget,
      estimatedAccommodationPerStudent,
      estimatedAccommodationGroup,
      remainingOverallPerStudentBudget,
      remainingOverallGroupBudget,

      // Internal limits (kept in object for validator/logic, never shown in UI)
      internalAccommodationLimitPerStudent,
      internalAccommodationLimitGroup,

      // Validation flags
      isOverBudget: exceedsInternalLimit || exceedsOverallBudget,
      exceedsInternalLimit,
      exceedsOverallBudget,
      overOverallAmountPerStudent,
      overOverallAmountGroup,
      overInternalLimitPerStudent,
      overInternalLimitGroup,

      // Backward-compatibility aliases
      accommodationBudgetPerStudent: internalAccommodationLimitPerStudent,
      accommodationBudgetGroup: internalAccommodationLimitGroup,
      remainingPerStudentBudget: remainingOverallPerStudentBudget,
      remainingGroupBudget: remainingOverallGroupBudget,
      overAmountPerStudent: overOverallAmountPerStudent,
      overAmountGroup: overOverallAmountGroup,

      isExcluded,
      accommodationSummary,
      selectedCount: accommodationSummary.selectedCount,
      totalSegments: accommodationSummary.totalSegments,
    };
  }

  // Personal Trip
  const totalBudget = budgetConfig.accommodationBudgetGroup;
  const remaining = totalBudget - estimatedAccommodationGroup;
  const isOverBudget = remaining < 0;
  const overAmount = Math.max(0, -remaining);

  return {
    isCampus: false,
    expectedStudents: 1,
    totalBudget,
    estimatedAccommodation: estimatedAccommodationGroup,
    remaining,
    isOverBudget,
    overAmount,
    accommodationSummary,
    selectedCount: accommodationSummary.selectedCount,
    totalSegments: accommodationSummary.totalSegments,
  };
}

/**
 * Calculates canonical budget summary for Campus and Personal Trips
 * @param {Object} trip - The trip object
 * @param {Array} staySegments - The stay segments
 * @param {Array} itinerary - The itinerary days
 * @returns {Object} Complete dual-level budget analysis
 */
export function calculateTripBudgetAnalysis(trip, staySegments = [], itinerary = []) {
  const isCampus = trip?.tripCategory === "CAMPUS";
  const expectedStudents = isCampus
    ? parseInt(trip?.campusConfig?.expectedParticipants, 10) || parseInt(trip?.travelers, 10) || 1
    : 1;

  // 1. Authoritative Accommodation from staySegments
  const accommodationSummary = calculateAccommodationSummary(staySegments, trip);
  const totalAccommodationGroup = accommodationSummary.totalGroupAccommodation;
  const totalAccommodationPerStudent = accommodationSummary.totalPerStudentAccommodation;

  if (!isCampus) {
    const totalBudget = Number(trip?.budget) || 60000;
    const breakdown = {
      Transport: 0,
      Hotels: totalAccommodationGroup,
      Activities: 0,
      Food: 0,
      "Local Transport": 0,
      Shopping: 0,
      Experiences: 0,
    };

    (itinerary || []).forEach((day) => {
      (day.plan || []).forEach((item) => {
        const cost = parseFloat(item.price || item.estimatedCost || item.fare || 0);
        if (isNaN(cost) || cost <= 0) return;

        const cat = String(item.category || "").toLowerCase();
        const act = String(item.activity || "").toLowerCase();
        const isHotel = cat.includes("hotel") || cat.includes("stay") || act.includes("hotel") || (cat.includes("operational") && act.includes("check-in"));

        // Do NOT add hotel items from itinerary because Hotels is already set from staySegments!
        if (isHotel) return;

        if (cat.includes("train") || cat.includes("flight") || cat.includes("bus")) {
          breakdown.Transport += cost;
        } else if (cat.includes("food") || cat.includes("dining") || cat.includes("cafe")) {
          breakdown.Food += cost;
        } else if (cat.includes("transport") || cat.includes("taxi") || cat.includes("cab")) {
          breakdown["Local Transport"] += cost;
        } else if (cat.includes("shopping")) {
          breakdown.Shopping += cost;
        } else if (cat.includes("experience")) {
          breakdown.Experiences += cost;
        } else {
          breakdown.Activities += cost;
        }
      });
    });

    const totalSpent = Object.values(breakdown).reduce((a, b) => a + b, 0);
    const remaining = totalBudget - totalSpent;

    return {
      isCampus: false,
      totalBudget,
      totalSpent,
      remaining,
      isOverBudget: remaining < 0,
      overAmount: Math.max(0, -remaining),
      spentPercentage: totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0,
      breakdown,
      accommodationSummary,
    };
  }

  // CAMPUS TRIP
  const budgetPerStudent =
    parseFloat(trip?.campusConfig?.budgetPerStudent) ||
    parseFloat(trip?.budget) ||
    0;
  const totalGroupBudget = budgetPerStudent * expectedStudents;

  const inclusions = trip?.campusConfig?.inclusions || {};
  const mealInclusions = trip?.campusConfig?.mealInclusions || {};

  const breakdown = {
    Transport: 0,
    Hotels: inclusions.accommodation !== false ? totalAccommodationGroup : 0,
    Activities: 0,
    Food: 0,
    "Local Transport": 0,
    Shopping: 0,
    Experiences: 0,
  };

  (itinerary || []).forEach((day) => {
    (day.plan || []).forEach((item) => {
      let cost = parseFloat(item.price || item.estimatedCost || item.fare || 0);
      if (isNaN(cost) || cost <= 0) return;

      const cat = String(item.category || "").toLowerCase();
      const act = String(item.activity || "").toLowerCase();

      const isHotel = cat.includes("hotel") || cat.includes("stay") || act.includes("hotel") || (cat.includes("operational") && act.includes("check-in"));
      // SKIP hotel items from itinerary because Hotels is already authoritatively derived from staySegments!
      if (isHotel) return;

      const isTravel = cat.includes("train") || cat.includes("flight") || cat.includes("bus") || act.includes("travel") || act.includes("return") || cat.includes("transport");
      const isLocalTransport = cat.includes("local") || cat.includes("taxi") || cat.includes("cab");
      const isActivity = cat.includes("activity") || cat.includes("sightseeing") || cat.includes("visit");
      const isBreakfast = act.includes("breakfast");
      const isLunch = act.includes("lunch");
      const isDinner = act.includes("dinner");
      const isMeal = isBreakfast || isLunch || isDinner || cat.includes("food") || cat.includes("dining") || cat.includes("cafe");
      const isShopping = cat.includes("shopping") || act.includes("shopping");
      const isExperience = cat.includes("experience") || act.includes("experience");

      // Check inclusions
      if (inclusions.travel === false && isTravel) return;
      if (inclusions.localTransport === false && isLocalTransport) return;
      if (inclusions.activities === false && isActivity) return;
      if (mealInclusions.breakfast === false && isBreakfast) return;
      if (mealInclusions.lunch === false && isLunch) return;
      if (mealInclusions.dinner === false && isDinner) return;
      if (isShopping || item.isExcluded || item.optional) return;

      if (isTravel) breakdown.Transport += cost;
      else if (isLocalTransport) breakdown["Local Transport"] += cost;
      else if (isMeal) breakdown.Food += cost;
      else if (isExperience) breakdown.Experiences += cost;
      else if (isShopping) breakdown.Shopping += cost;
      else breakdown.Activities += cost;
    });
  });

  const totalGroupSpent = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const costPerStudent = Math.round(totalGroupSpent / expectedStudents);
  const remainingGroupBudget = totalGroupBudget - totalGroupSpent;
  const remainingPerStudentBudget = Math.round(remainingGroupBudget / expectedStudents);
  const isOverBudget = remainingGroupBudget < 0;
  const overAmount = Math.max(0, -remainingGroupBudget);
  const spentPercentage = totalGroupBudget > 0 ? Math.min(100, Math.round((totalGroupSpent / totalGroupBudget) * 100)) : 0;

  // Accommodation alone over budget check
  const accommodationAloneOverBudget = (inclusions.accommodation !== false) && (totalAccommodationGroup > totalGroupBudget);
  const accommodationAloneOverAmount = Math.max(0, totalAccommodationGroup - totalGroupBudget);
  const accommodationAloneOverPerStudent = Math.max(0, totalAccommodationPerStudent - budgetPerStudent);

  const categoryBudget = calculateCampusCategoryBudgetAnalysis(trip, staySegments, itinerary);

  return {
    isCampus: true,
    // Per Student Level
    budgetPerStudent,
    costPerStudent: categoryBudget.perStudent.totalIncluded,
    remainingPerStudent: categoryBudget.perStudent.remaining,
    remainingPerStudentBudget: categoryBudget.perStudent.remaining,
    // Group / Bulk Level
    expectedStudents,
    totalBudget: totalGroupBudget,
    totalGroupBudget,
    totalSpent: categoryBudget.group.totalIncluded,
    totalGroupSpent: categoryBudget.group.totalIncluded,
    remaining: categoryBudget.group.remaining,
    remainingGroupBudget: categoryBudget.group.remaining,
    isOverBudget: categoryBudget.isOverBudget,
    overAmount: categoryBudget.overAmount,
    spentPercentage: categoryBudget.spentPercentage,
    breakdown,
    categoryBudget,
    // Accommodation Specifics
    accommodationSummary,
    totalAccommodationGroup,
    totalAccommodationPerStudent,
    accommodationAloneOverBudget,
    accommodationAloneOverAmount,
    accommodationAloneOverPerStudent,
  };
}

/**
 * Calculates canonical category-wise Campus budget analysis with a single source of truth.
 * Returns both PER STUDENT and OVERALL GROUP / BULK sections with identical 4 categories:
 * - Accommodation (authoritative from Stay Plan)
 * - Travel (main travel + local transport)
 * - Food (Breakfast + Lunch + Dinner combined)
 * - Activities (INCLUSIVE educational visits and activities only)
 *
 * @param {Object} trip - The trip object
 * @param {Array} staySegments - The stay segments
 * @param {Array} itinerary - The itinerary days
 * @returns {Object} Structured category budget analysis
 */
export function calculateCampusCategoryBudgetAnalysis(trip, staySegments = [], itinerary = []) {
  const isCampus = trip?.tripCategory === "CAMPUS";
  const expectedStudents = isCampus
    ? parseInt(trip?.campusConfig?.expectedParticipants, 10) || parseInt(trip?.travelers, 10) || 1
    : 1;

  const overallBudgetPerStudent =
    parseFloat(trip?.campusConfig?.budgetPerStudent) ||
    parseFloat(trip?.budget) ||
    15000;
  const overallGroupBudget = overallBudgetPerStudent * expectedStudents;

  // 1. Authoritative Accommodation from Stay Plan (Single Source of Truth)
  const segments = (staySegments && staySegments.length > 0) ? staySegments : (trip?.staySegments || []);
  const accommodationSummary = calculateAccommodationSummary(segments, trip);
  const isAccomIncluded = trip?.campusConfig?.inclusions?.accommodation !== false;
  const groupAccommodation = isAccomIncluded ? accommodationSummary.totalGroupAccommodation : 0;
  const perStudentAccommodation = isAccomIncluded ? accommodationSummary.totalPerStudentAccommodation : 0;

  const inclusions = trip?.campusConfig?.inclusions || {};
  const mealInclusions = trip?.campusConfig?.mealInclusions || {};

  let groupTravel = 0;
  let groupFood = 0;
  let groupActivities = 0;

  const days = (itinerary && itinerary.length > 0) ? itinerary : (trip?.itinerary || []);

  days.forEach((day) => {
    const plan = day.plan || [];
    const hasSpecificTravel = plan.some((p) => {
      const cat = String(p.category || "").toLowerCase();
      const act = String(p.activity || p.name || "").toLowerCase();
      return (
        (cat.includes("travel") || cat.includes("transport") || cat.includes("transit") || cat.includes("train") || cat.includes("bus")) &&
        !act.startsWith("travel:") &&
        !act.startsWith("return:") &&
        parseFloat(p.price || p.estimatedCost || p.fare || 0) > 0
      );
    });

    plan.forEach((item) => {
      let cost = parseFloat(item.price || item.estimatedCost || item.fare || 0);
      if (isNaN(cost) || cost <= 0) return;

      const cat = String(item.category || "").toLowerCase();
      const act = String(item.activity || "").toLowerCase();

      // Skip hotel items from itinerary because Accommodation is authoritatively derived from Stay Plan
      const isHotel =
        cat.includes("hotel") ||
        cat.includes("stay") ||
        act.includes("hotel") ||
        cat.includes("operational") ||
        act.includes("check-in") ||
        act.includes("check-out") ||
        act.includes("checkout");
      if (isHotel) return;

      const isBreakfast = act.includes("breakfast");
      const isLunch = act.includes("lunch");
      const isDinner = act.includes("dinner");
      const isMeal =
        cat.includes("food") ||
        cat.includes("dining") ||
        cat.includes("cafe") ||
        isBreakfast ||
        isLunch ||
        isDinner;

      const isTravel =
        !isMeal &&
        (cat.includes("travel") ||
          cat.includes("transport") ||
          cat.includes("transit") ||
          cat.includes("train") ||
          cat.includes("flight") ||
          cat.includes("bus") ||
          act.includes("train") ||
          act.includes("bus") ||
          act.includes("flight") ||
          act.includes("travel") ||
          act.includes("transit") ||
          act.includes("transfer") ||
          act.includes("return") ||
          act.includes("journey"));

      const isLocalTransport =
        !isMeal &&
        (cat.includes("local") ||
          cat.includes("taxi") ||
          cat.includes("cab"));

      const isShopping = cat.includes("shopping") || act.includes("shopping");

      // Check explicit exclusion flags on individual item
      const isExplicitlyExcluded =
        item.isExcluded === true ||
        item.optional === true ||
        item.isInclusive === false ||
        item.included === false ||
        item.exclusive === true ||
        item.isExclusive === true ||
        item.type === "optional";

      if (isExplicitlyExcluded) return;

      // Shopping is always personal/exclusive expenses
      if (isShopping) return;

      // Check Campus inclusions configuration
      if (isTravel && inclusions.travel === false) return;
      if (isLocalTransport && inclusions.localTransport === false) return;
      if (isMeal) {
        if (inclusions.meals === false) return;
        if (isBreakfast && mealInclusions.breakfast === false) return;
        if (isLunch && mealInclusions.lunch === false) return;
        if (isDinner && mealInclusions.dinner === false) return;
      }

      const isActivity = !isTravel && !isLocalTransport && !isMeal;
      if (isActivity && inclusions.activities === false) return;

      // Skip synthetic 'Travel: ...' placeholder if specific real transport exists on the day
      if (isTravel && hasSpecificTravel && act.startsWith("travel:")) {
        return;
      }

      // Cost allocation: In Campus trips, costs <= budgetPerStudent are per-student ticket/fare amounts;
      // costs > budgetPerStudent are bulk group amounts
      let itemGroupCost = 0;
      let itemPerStudentCost = 0;
      if (
        item.isPerStudent === true ||
        item.pricingType === "per_person" ||
        item.pricingType === "per_student" ||
        cost <= overallBudgetPerStudent
      ) {
        itemPerStudentCost = cost;
        itemGroupCost = cost * expectedStudents;
      } else {
        itemGroupCost = cost;
        itemPerStudentCost = Math.round(cost / expectedStudents);
      }

      if (isTravel || isLocalTransport) {
        groupTravel += itemGroupCost;
      } else if (isMeal) {
        groupFood += itemGroupCost;
      } else if (isActivity) {
        groupActivities += itemGroupCost;
      }
    });
  });

  // Include actual configured travel legs from trip.travelLegs if not already present in day.plan
  if (Array.isArray(trip?.travelLegs) && inclusions.travel !== false) {
    trip.travelLegs.forEach((leg) => {
      const rawCost = parseFloat(leg.fare || leg.price || leg.estimatedCost || leg.cost || 0);
      if (isNaN(rawCost) || rawCost <= 0) return;

      const alreadyInPlan = days.some((day) =>
        (day.plan || []).some(
          (p) =>
            (p.travelLegId && p.travelLegId === leg.id) ||
            (p.trainNumber && leg.trainNumber && p.trainNumber === leg.trainNumber) ||
            (p.flightNumber && leg.flightNumber && p.flightNumber === leg.flightNumber)
        )
      );

      if (!alreadyInPlan) {
        const legGroupCost = (leg.isPerStudent || leg.pricingType === "per_person" || leg.pricingType === "per_student")
          ? rawCost * expectedStudents
          : rawCost;
        groupTravel += legGroupCost;
      }
    });
  }

  const perStudentTravel = Math.round(groupTravel / expectedStudents);
  const perStudentFood = Math.round(groupFood / expectedStudents);
  const perStudentActivities = Math.round(groupActivities / expectedStudents);

  // FINAL CAMPUS BUDGET FORMULA:
  // ACTUAL INCLUDED COST = Accommodation + Actual Travel + Included Itinerary Activities
  // Food is already provided/included through the accommodation/stay arrangement,
  // so Budget Analysis must NOT calculate or display a separate food amount.
  const totalIncludedGroup = groupAccommodation + groupTravel + groupActivities;
  const totalIncludedPerStudent = perStudentAccommodation + perStudentTravel + perStudentActivities;

  const remainingGroup = overallGroupBudget - totalIncludedGroup;
  const remainingPerStudent = overallBudgetPerStudent - totalIncludedPerStudent;

  const isOverBudget = remainingGroup < 0;
  const overAmountGroup = Math.max(0, -remainingGroup);
  const overAmountPerStudent = Math.max(0, -remainingPerStudent);
  const gapGroup = overAmountGroup;
  const gapPerStudent = overAmountPerStudent;
  const spentPercentage = overallGroupBudget > 0 ? Math.min(100, Math.round((totalIncludedGroup / overallGroupBudget) * 100)) : 0;

  return {
    isCampus,
    expectedStudents,
    overallBudgetPerStudent,
    overallGroupBudget,
    perStudent: {
      accommodation: perStudentAccommodation,
      travel: perStudentTravel,
      activities: perStudentActivities,
      totalIncluded: totalIncludedPerStudent,
      remaining: remainingPerStudent,
      gap: gapPerStudent,
      food: perStudentFood,
    },
    group: {
      accommodation: groupAccommodation,
      travel: groupTravel,
      activities: groupActivities,
      totalIncluded: totalIncludedGroup,
      remaining: remainingGroup,
      gap: gapGroup,
      food: groupFood,
    },
    totalSpent: totalIncludedGroup,
    remaining: remainingGroup,
    gap: gapGroup,
    isOverBudget,
    overAmount: overAmountGroup,
    overAmountGroup,
    overAmountPerStudent,
    gapGroup,
    gapPerStudent,
    spentPercentage,
    accommodationSummary,
  };
}

/**
 * Calculates duration-based planning baselines and Budget Prediction for Campus Trips.
 * Transix is package-first: this helper only analyzes the package to evaluate if the
 * entered package budget is realistic, without modifying, downgrading, or altering the trip.
 *
 * Distinct concepts:
 * 1. Current Package Budget (entered by coordinator)
 * 2. Actual Estimated Package Cost (canonical sum of included categories)
 * 3. Budget Prediction (duration-based recommended planning range)
 *
 * @param {Object} trip - The trip object
 * @param {Object} categoryBudget - Precomputed category budget analysis (optional)
 * @param {Array} staySegments - Stay segments array (optional)
 * @param {Array} itinerary - Itinerary days array (optional)
 * @returns {Object} Deterministic budget prediction result
 */
export function calculateCampusBudgetPrediction(trip, categoryBudget = null, staySegments = [], itinerary = []) {
  if (trip?.tripCategory !== "CAMPUS") {
    return { isCampus: false };
  }

  const catBudget = categoryBudget || calculateCampusCategoryBudgetAnalysis(trip, staySegments, itinerary);
  const durationDays = getTripDurationDays(trip);
  const expectedStudents = catBudget.expectedStudents || 200;

  const currentBudgetPerStudent = catBudget.overallBudgetPerStudent;
  const currentBudgetGroup = catBudget.overallGroupBudget;

  const actualCostPerStudent = catBudget.perStudent?.totalIncluded || 0;
  const actualCostGroup = catBudget.group?.totalIncluded || 0;

  const inclusions = trip?.campusConfig?.inclusions || {};
  const mealInclusions = trip?.campusConfig?.mealInclusions || {};

  // 1. Duration-based Baseline Planning Components (per student)
  // Accommodation: ₹1,000/day capped at ₹10,000 for standard trips
  let baselineAccommodation = 0;
  if (inclusions.accommodation !== false) {
    baselineAccommodation = Math.min(durationDays * 1000, 10000);
  }

  // Travel: ₹1,500 + durationDays * 250 (8 days -> ₹3,500, 10 days -> ₹4,000)
  let baselineTravel = 0;
  if (inclusions.travel !== false || inclusions.localTransport !== false) {
    const rawTravel = 1500 + durationDays * 250;
    if (inclusions.travel !== false && inclusions.localTransport === false) {
      baselineTravel = Math.round(rawTravel * 0.75);
    } else if (inclusions.travel === false && inclusions.localTransport !== false) {
      baselineTravel = Math.round(rawTravel * 0.25);
    } else {
      baselineTravel = rawTravel;
    }
  }

  // Food: ₹2,500 for 8 days, ₹3,000 for 10 days
  let baselineFood = 0;
  if (inclusions.meals !== false) {
    const rawFood = durationDays >= 8 ? 2500 + (durationDays - 8) * 250 : durationDays * 300;
    const wBreakfast = mealInclusions.breakfast !== false ? 0.25 : 0;
    const wLunch = mealInclusions.lunch !== false ? 0.40 : 0;
    const wDinner = mealInclusions.dinner !== false ? 0.35 : 0;
    const mealRatio = wBreakfast + wLunch + wDinner;
    baselineFood = Math.round(rawFood * (mealRatio > 0 ? mealRatio : 1));
  }

  // Activities: ₹1,000 for inclusive educational visits / industry entries
  let baselineActivities = 0;
  if (inclusions.activities !== false) {
    baselineActivities = 1000;
  }

  const baselineTotal = baselineAccommodation + baselineTravel + baselineFood + baselineActivities;

  // 2. Derive Recommended Planning Budget Range [min, max]
  // Baseline planning standards:
  // 8-day: approx ₹15,000/student (₹14,500–₹15,000)
  // 10-day: approx ₹18,000/student (₹17,500–₹18,000)
  let recommendedMax = baselineTotal;
  let recommendedMin = Math.max(1000, baselineTotal - 500);

  // If actual cost exceeds baseline, adapt upper range to reflect configured package requirements
  if (actualCostPerStudent > baselineTotal) {
    const bufferedCostMax = Math.round((actualCostPerStudent * 1.1) / 500) * 500;
    recommendedMax = Math.max(baselineTotal, bufferedCostMax);
    recommendedMin = Math.max(baselineTotal, recommendedMax - 500);
  }

  const recommendedGroupMin = recommendedMin * expectedStudents;
  const recommendedGroupMax = recommendedMax * expectedStudents;

  // 3. Status Determination
  let status = "within_recommended";
  let statusLevel = "success";
  let statusMessage = "Package budget is within the recommended planning range.";
  let reason = `Configured package budget covers the actual estimated costs and aligns with the ${durationDays}-day educational planning standard.`;
  let gapPerStudent = 0;
  let gapGroup = 0;

  if (currentBudgetPerStudent < actualCostPerStudent) {
    status = "insufficient";
    statusLevel = "error";
    gapPerStudent = actualCostPerStudent - currentBudgetPerStudent;
    gapGroup = gapPerStudent * expectedStudents;
    statusMessage = "Package budget is insufficient for the currently configured package.";
    reason = `The ${durationDays}-day package falls within a planning baseline of approximately ₹${recommendedMax.toLocaleString()}/student, while the currently configured package budget is ₹${currentBudgetPerStudent.toLocaleString()}.`;
  } else if (currentBudgetPerStudent < recommendedMin) {
    status = "below_recommended";
    statusLevel = "warning";
    statusMessage = "Package budget is below the recommended planning range.";
    reason = `The ${durationDays}-day package falls within a planning baseline of approximately ₹${recommendedMax.toLocaleString()}/student, while the currently configured package budget is ₹${currentBudgetPerStudent.toLocaleString()}.`;
  }

  return {
    isCampus: true,
    durationDays,
    expectedStudents,
    currentBudgetPerStudent,
    currentBudgetGroup,
    actualCostPerStudent,
    actualCostGroup,
    planningBaseline: baselineTotal,
    explanation: `Planning estimate based on ${durationDays}-day trip duration and package structure`,
    baselinePerStudent: {
      accommodation: baselineAccommodation,
      travel: baselineTravel,
      food: baselineFood,
      activities: baselineActivities,
      total: baselineTotal,
    },
    recommendedPerStudent: {
      min: recommendedMin,
      max: recommendedMax,
      display: `₹${recommendedMin.toLocaleString()}–₹${recommendedMax.toLocaleString()}`,
    },
    recommendedGroup: {
      min: recommendedGroupMin,
      max: recommendedGroupMax,
      display: `₹${recommendedGroupMin.toLocaleString()}–₹${recommendedGroupMax.toLocaleString()}`,
    },
    status,
    statusLevel,
    statusMessage,
    reason,
    gapPerStudent,
    gapGroup,
    isInsufficient: status === "insufficient",
    isBelowRecommended: status === "below_recommended",
    isOptimal: status === "within_recommended",
  };
}

/**
 * Identifies real cost-reduction options for Campus Trips.
 * Strictly uses real configured items and costs:
 * - Activities: only explicitly INCLUDED activities with real configured costs
 * - Accommodation: only real alternative hotels with real configured lower prices
 * - Food: unavailable if reliable configured food cost is not available
 * - Transport: unavailable unless real alternative transport exists
 *
 * @param {Object} trip - The trip object
 * @param {Array} staySegments - Stay segments array
 * @param {Array} itinerary - Itinerary days array
 * @returns {Object} Real cost reduction scenarios and metadata
 */
export function getCampusCostReductionScenarios(trip, staySegments = [], itinerary = []) {
  if (trip?.tripCategory !== "CAMPUS") {
    return { isCampus: false };
  }

  const catBudget = calculateCampusCategoryBudgetAnalysis(trip, staySegments, itinerary);
  const expectedStudents = catBudget.expectedStudents || 200;
  const currentBudgetPerStudent = catBudget.overallBudgetPerStudent;
  const actualCostPerStudent = catBudget.perStudent?.totalIncluded || 0;
  const shortfallPerStudent = Math.max(0, actualCostPerStudent - currentBudgetPerStudent);
  const shortfallGroup = shortfallPerStudent * expectedStudents;

  const days = (itinerary && itinerary.length > 0) ? itinerary : (trip?.itinerary || []);
  const inclusions = trip?.campusConfig?.inclusions || {};

  // 1. Activity Cost Reduction
  // Only explicitly INCLUDED activities that have a real configured cost
  const activityOptions = [];

  if (inclusions.activities !== false) {
    days.forEach((day, dayIndex) => {
      (day.plan || []).forEach((item, itemIndex) => {
        const cost = parseFloat(item.price || item.estimatedCost || item.fare || 0);
        if (isNaN(cost) || cost <= 0) return;

        const cat = String(item.category || "").toLowerCase();
        const act = String(item.activity || item.name || "").toLowerCase();

        const isHotel =
          cat.includes("hotel") ||
          cat.includes("stay") ||
          act.includes("hotel") ||
          cat.includes("operational") ||
          act.includes("check-in") ||
          act.includes("check-out") ||
          act.includes("checkout");
        if (isHotel) return;

        const isBreakfast = act.includes("breakfast");
        const isLunch = act.includes("lunch");
        const isDinner = act.includes("dinner");
        const isMeal =
          cat.includes("food") ||
          cat.includes("dining") ||
          cat.includes("cafe") ||
          isBreakfast ||
          isLunch ||
          isDinner;

        const isTravel =
          !isMeal &&
          (cat.includes("travel") ||
            cat.includes("transport") ||
            cat.includes("transit") ||
            cat.includes("train") ||
            cat.includes("flight") ||
            cat.includes("bus") ||
            act.includes("train") ||
            act.includes("bus") ||
            act.includes("flight") ||
            act.includes("travel") ||
            act.includes("transit") ||
            act.includes("transfer") ||
            act.includes("return") ||
            act.includes("journey"));

        const isLocalTransport =
          !isMeal &&
          (cat.includes("local") ||
            cat.includes("taxi") ||
            cat.includes("cab"));

        const isShopping = cat.includes("shopping") || act.includes("shopping");

        const isExplicitlyExcluded =
          item.isExcluded === true ||
          item.optional === true ||
          item.isInclusive === false ||
          item.included === false ||
          item.exclusive === true ||
          item.isExclusive === true ||
          item.type === "optional";

        if (isExplicitlyExcluded || isShopping || isTravel || isLocalTransport || isMeal) return;

        // Valid included activity with real cost
        let perStudentCost = 0;
        let groupCost = 0;
        if (
          item.isPerStudent === true ||
          item.pricingType === "per_person" ||
          item.pricingType === "per_student" ||
          cost <= currentBudgetPerStudent
        ) {
          perStudentCost = cost;
          groupCost = cost * expectedStudents;
        } else {
          groupCost = cost;
          perStudentCost = Math.round(cost / expectedStudents);
        }

        activityOptions.push({
          id: item.id || `act-${dayIndex}-${itemIndex}`,
          name: item.name || item.activity || `Activity (Day ${day.day || dayIndex + 1})`,
          category: item.category || "Activity",
          day: day.day || dayIndex + 1,
          dayIndex,
          itemIndex,
          cost,
          costPerStudent: perStudentCost,
          groupCost,
          potentialReductionPerStudent: perStudentCost,
          potentialReductionGroup: groupCost,
        });
      });
    });
  }

  // 2. Accommodation Cost Reduction
  // Check if existing hotel data contains both real alternative hotel option and real price
  const accommodationOptions = {
    available: false,
    message: "Accommodation alternatives\nNo comparable priced alternative is currently available.",
    alternatives: [],
  };

  const segments = (staySegments && staySegments.length > 0) ? staySegments : (trip?.staySegments || []);
  segments.forEach((seg) => {
    if (!seg.selectedHotel) return;
    const currentHotel = seg.selectedHotel;
    const currentPrice = Number(currentHotel.price || currentHotel.nightlyPrice || currentHotel.groupPrice || 0);

    const altHotels = Array.isArray(seg.alternativeHotels)
      ? seg.alternativeHotels
      : Array.isArray(seg.hotels)
      ? seg.hotels.filter((h) => h.name !== currentHotel.name)
      : [];

    altHotels.forEach((alt) => {
      const altPrice = Number(alt.price || alt.nightlyPrice || alt.groupPrice || 0);
      if (altPrice > 0 && currentPrice > 0 && altPrice < currentPrice) {
        accommodationOptions.available = true;
        accommodationOptions.alternatives.push({
          segmentLocation: seg.location,
          currentHotel: {
            name: currentHotel.name,
            rating: currentHotel.rating || "N/A",
            price: currentPrice,
          },
          alternativeHotel: {
            name: alt.name,
            rating: alt.rating || "N/A",
            price: altPrice,
          },
          potentialReductionPerStudent: Math.round((currentPrice - altPrice) / expectedStudents),
          potentialReductionGroup: currentPrice - altPrice,
        });
      }
    });
  });

  // 3. Food Cost Reduction
  const foodOptions = {
    available: false,
    message: "Food\nCost optimization unavailable because a reliable configured food cost is not currently available.",
  };

  // 4. Transport Cost Reduction
  const transportOptions = {
    available: false,
    message: "Transport alternatives\nNo comparable priced alternative is currently available.",
  };

  return {
    isCampus: true,
    expectedStudents,
    currentBudgetPerStudent,
    actualCostPerStudent,
    shortfallPerStudent,
    shortfallGroup,
    activityOptions,
    accommodationOptions,
    foodOptions,
    transportOptions,
  };
}

/**
 * Simulates a cost reduction scenario by calculating canonical impact
 * without mutating or persisting any trip changes.
 *
 * @param {Object} trip - The original trip
 * @param {Array<string>} removedActivityIds - IDs of activities to remove in simulation
 * @returns {Object} Simulation analysis result
 */
export function simulateCampusReductionScenario(trip, removedActivityIds = []) {
  if (trip?.tripCategory !== "CAMPUS") {
    return { isCampus: false };
  }

  const days = trip?.itinerary || [];
  const simulatedDays = days.map((day) => ({
    ...day,
    plan: (day.plan || []).filter((item) => !removedActivityIds.includes(item.id)),
  }));

  const simulatedTrip = {
    ...trip,
    itinerary: simulatedDays,
  };

  const simulatedAnalysis = calculateCampusCategoryBudgetAnalysis(simulatedTrip, trip?.staySegments, simulatedDays);
  const originalAnalysis = calculateCampusCategoryBudgetAnalysis(trip, trip?.staySegments, days);

  const originalCostPerStudent = originalAnalysis.perStudent.totalIncluded;
  const simulatedCostPerStudent = simulatedAnalysis.perStudent.totalIncluded;
  const currentBudgetPerStudent = originalAnalysis.overallBudgetPerStudent;

  const reductionPerStudent = Math.max(0, originalCostPerStudent - simulatedCostPerStudent);
  const reductionGroup = reductionPerStudent * (originalAnalysis.expectedStudents || 200);

  const fitsBudget = simulatedCostPerStudent <= currentBudgetPerStudent;
  const remainingShortfall = Math.max(0, simulatedCostPerStudent - currentBudgetPerStudent);

  return {
    simulatedTrip,
    originalCostPerStudent,
    simulatedCostPerStudent,
    originalCostGroup: originalAnalysis.group.totalIncluded,
    simulatedCostGroup: simulatedAnalysis.group.totalIncluded,
    reductionPerStudent,
    reductionGroup,
    currentBudgetPerStudent,
    fitsBudget,
    remainingShortfall,
    statusMessage: fitsBudget
      ? "✓ Simulated package fits within current budget."
      : `Package still exceeds budget by ₹${remainingShortfall.toLocaleString()}/student.`,
    simulatedAnalysis,
  };
}
