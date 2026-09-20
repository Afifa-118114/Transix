/**
 * Bus Requirement Detector (Backend)
 * 
 * Deterministically extracts road/bus transport requirements from a trip's itinerary and travel legs.
 * Does NOT invent schedules, bus numbers, fake inventory, or booking data.
 * Adheres strictly to the operational requirement architecture for Transix.
 */

function cleanLocation(str) {
  if (!str) return "";
  return str
    .replace(/^(?:drive|transfer|travel|bus|cab|taxi|road\s*trip)\s+to\s+/i, "")
    .replace(/^(?:hotel|stay|resort)\s+in\s+/i, "")
    .replace(/\s+(?:hotel|resort|stay)$/i, "")
    .trim();
}

function resolveItemRoute(item, fallbackFrom = "", fallbackTo = "") {
  if (item.from && item.to) {
    return { from: cleanLocation(item.from), to: cleanLocation(item.to) };
  }

  const candidates = [item.place, item.activity, item.name].filter(Boolean);

  // 1. Check for explicit "A → B" or "A to B"
  for (const text of candidates) {
    const arrow = text.match(/([A-Za-z\s]+?)\s*(?:→|->)\s*([A-Za-z\s]+)/);
    if (arrow) {
      return { from: cleanLocation(arrow[1]), to: cleanLocation(arrow[2]) };
    }

    const fromTo = text.match(/(?:drive|transfer|travel|bus|cab|taxi)?\s*from\s+([A-Za-z\s]+?)\s+to\s+([A-Za-z\s]+)/i);
    if (fromTo) {
      return { from: cleanLocation(fromTo[1]), to: cleanLocation(fromTo[2]) };
    }

    const shortFromTo = text.match(/^([A-Za-z\s]+?)\s+to\s+([A-Za-z\s]+)$/i);
    if (shortFromTo) {
      return { from: cleanLocation(shortFromTo[1]), to: cleanLocation(shortFromTo[2]) };
    }
  }

  // 2. Check for "drive/transfer to [City]"
  for (const text of candidates) {
    const toMatch = text.match(/(?:drive|transfer|travel|bus|cab|taxi)\s+to\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
    if (toMatch) {
      return { from: fallbackFrom, to: cleanLocation(toMatch[1]) };
    }

    const excursion = text.match(/(?:excursion|day\s*trip)\s+to\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
    if (excursion) {
      return { from: fallbackFrom, to: cleanLocation(excursion[1]) };
    }
  }

  return { from: fallbackFrom, to: fallbackTo };
}

function calculateDayDate(startDateStr, dayNumber) {
  if (!startDateStr) return `Day ${dayNumber}`;
  const d = new Date(startDateStr);
  if (isNaN(d.getTime())) return `Day ${dayNumber}`;
  d.setDate(d.getDate() + (dayNumber - 1));
  return d.toISOString().split("T")[0];
}

function calculateCampusFleetRequirements({
  studentsCount = 200,
  teachersStaffCount = 10,
  capacityPerVehicle = 25,
  vehicleType = "Coach",
  comfort = "AC",
  luggageCount,
  notes = "",
} = {}) {
  const totalTravelers = (Number(studentsCount) || 0) + (Number(teachersStaffCount) || 0);
  const capacity = Math.max(1, Number(capacityPerVehicle) || 25);
  const vehiclesRequired = Math.ceil(totalTravelers / capacity);
  return {
    totalTravelers,
    studentsCount: Number(studentsCount) || 0,
    teachersStaffCount: Number(teachersStaffCount) || 0,
    capacityPerVehicle: capacity,
    vehiclesRequired,
    vehicleType,
    comfort,
    luggageCount: luggageCount !== undefined ? luggageCount : totalTravelers,
    notes,
  };
}

function resolveLocalTransportArrangement(trip) {
  if (!trip) return null;
  const pref = trip.localTransportPreference || trip.busPreferences || {};
  const rawType = pref.arrangementType || pref.arrangement;

  // Detect arrangement type with backwards compatibility
  let arrangementType = "TRAVELER_MANAGED";
  if (rawType === "PRIVATE_CAR") {
    arrangementType = "PRIVATE_CAR";
  } else if (rawType === "PRIVATE_MINIBUS") {
    arrangementType = "PRIVATE_MINIBUS";
  } else if (rawType === "TRAVELER_MANAGED" || rawType === "TRAVELER_ARRANGED") {
    arrangementType = "TRAVELER_MANAGED";
  } else if (rawType === "TRANSIX_COORDINATED") {
    const travelers = Number(trip.travelers || 1);
    arrangementType = travelers > 6 ? "PRIVATE_MINIBUS" : "PRIVATE_CAR";
  } else if (trip.tripCategory === "CAMPUS") {
    arrangementType = "GROUP_FLEET";
  }

  const isTravelerManaged = arrangementType === "TRAVELER_MANAGED";
  const isPrivateCar = arrangementType === "PRIVATE_CAR";
  const isPrivateMinibus = arrangementType === "PRIVATE_MINIBUS";
  const isTransixCoordinated = isPrivateCar || isPrivateMinibus || arrangementType === "GROUP_FLEET";

  return {
    arrangementType,
    isTravelerManaged,
    isPrivateCar,
    isPrivateMinibus,
    isTransixCoordinated,
    preferences: {
      vehicleType: pref.vehicleType || (isPrivateMinibus ? "Private AC Mini Bus" : (isPrivateCar ? "Private AC Car" : "")),
      comfort: pref.comfort || "AC",
      travelerCount: pref.travelerCount || trip.travelers || 1,
      seatCount: pref.seatCount || pref.capacity || trip.travelers || 1,
      luggageCount: pref.luggageCount !== undefined ? pref.luggageCount : trip.travelers || 1,
      notes: pref.notes || "",
    },
  };
}

/**
 * Detects all bus/road transport requirements from a trip.
 * Merges existing preferences if already present in trip.busRequirements.
 *
 * @param {Object} trip - Trip document
 * @returns {Array<Object>} List of structured Bus Transport Requirements
 */
function detectBusRequirements(trip) {
  if (!trip) return [];

  const existingReqs = Array.isArray(trip.busRequirements) ? trip.busRequirements : [];
  const existingMap = new Map();
  existingReqs.forEach((r) => {
    if (r.id) existingMap.set(r.id, r);
    if (r.itineraryItemId) existingMap.set(r.itineraryItemId, r);
  });

  const travelers = Number(
    trip.travelers ||
    trip.campusConfig?.expectedParticipants ||
    1
  );

  const isCampus =
    trip.tripCategory === "CAMPUS" ||
    Boolean(trip.campusConfig?.expectedParticipants && trip.campusConfig.expectedParticipants > 8);

  const requirements = [];
  const seenKeys = new Set();

  // 1. Scan travelLegs for road/bus movements
  if (Array.isArray(trip.travelLegs)) {
    trip.travelLegs.forEach((leg, idx) => {
      const mode = String(leg.mode || "").toUpperCase();
      const isRoadMode = mode === "BUS" || mode === "CAR" || mode === "ROAD" || mode === "CAB";
      const isIntercityTrainOrFlight =
        leg.trainNumber ||
        leg.flightNumber ||
        mode === "TRAIN" ||
        mode === "FLIGHT";

      if (isRoadMode || (!isIntercityTrainOrFlight && leg.from && leg.to)) {
        const reqId = `bus-req-leg-${leg.id || leg._id || idx}`;
        const key = `${leg.from}-${leg.to}-${leg.date || idx}`;
        if (seenKeys.has(key)) return;
        seenKeys.add(key);

        const existing = existingMap.get(reqId) || existingMap.get(leg.id || leg._id);

        const rawArrangement =
          existing?.arrangementType ||
          existing?.arrangement ||
          trip.localTransportPreference?.arrangementType ||
          trip.localTransportPreference?.arrangement;
        
        const isSelfManaged = rawArrangement === "TRAVELER_MANAGED" || rawArrangement === "TRAVELER_ARRANGED";
        const legArrangement = isSelfManaged
          ? (rawArrangement === "TRAVELER_ARRANGED" ? "TRAVELER_ARRANGED" : "TRAVELER_MANAGED")
          : (rawArrangement === "PRIVATE_MINIBUS" ? "PRIVATE_MINIBUS" : (rawArrangement || "PRIVATE_CAR"));

        const legPreferences = !isSelfManaged && trip.localTransportPreference
          ? {
              arrangementType: legArrangement,
              vehicleType: trip.localTransportPreference.vehicleType || (legArrangement === "PRIVATE_MINIBUS" ? "Tempo Traveller" : "Sedan"),
              comfort: trip.localTransportPreference.comfort || "AC",
              seatCount: trip.localTransportPreference.seatCount || travelers,
              luggageCount: trip.localTransportPreference.luggageCount || travelers,
              notes: trip.localTransportPreference.notes || "",
            }
          : (existing?.preferences || {});

        requirements.push({
          id: reqId,
          tripId: trip._id ? String(trip._id) : undefined,
          itineraryItemId: leg.id ? String(leg.id) : `leg-${idx}`,
          day: leg.departureDay || leg.day || 1,
          date: leg.date || calculateDayDate(trip.startDate, leg.departureDay || 1),
          from: leg.from,
          to: leg.to,
          requiredDepartureTime: leg.startTime || leg.departure || "09:00 AM",
          pickupTime: leg.startTime || leg.departure || "09:00 AM",
          requiredArrivalTime: leg.endTime || leg.arrival || "01:00 PM",
          travelers,
          mode: isCampus ? "BUS" : "PRIVATE_VEHICLE",
          requirementType: isCampus ? "GROUP_TRANSPORT" : "OUTSTATION_TRANSPORT",
          arrangement: isCampus ? "TRANSIX_COORDINATED" : legArrangement,
          preferences: legPreferences,
          status: existing?.status || "PENDING",
        });
      }
    });
  }

  // 2. Scan itinerary day plans for road/bus movements
  if (Array.isArray(trip.itinerary)) {
    trip.itinerary.forEach((day, dIdx) => {
      const dayNum = day.day || dIdx + 1;
      const dayDate = day.date || calculateDayDate(trip.startDate, dayNum);
      const plan = Array.isArray(day.plan) ? day.plan : [];

      // Determine current day's primary stay location
      const stayLocation =
        day.location ||
        trip.staySegments?.find(
          (s) => s.checkIn <= dayDate && s.checkOut >= dayDate
        )?.location ||
        trip.destination ||
        "Hotel";

      plan.forEach((item, pIdx) => {
        const cat = String(item.category || "").toLowerCase();
        const act = String(item.activity || item.name || "").toLowerCase();
        const place = String(item.place || item.location || "").toLowerCase();

        // Check if explicitly marked or matches transport activity keywords
        const isTrain = Boolean(
          item.trainNumber ||
          act.includes("train") ||
          cat.includes("train") ||
          act.includes("express") ||
          act.includes("superfast") ||
          act.includes("vande bharat") ||
          act.includes("rajdhani") ||
          act.includes("shatabdi") ||
          item.legType === "departure" ||
          item.legType === "arrival" ||
          item.legType === "assembly"
        );
        const isFlight = Boolean(
          item.flightNumber ||
          act.includes("flight") ||
          cat.includes("flight") ||
          act.includes("boarding") ||
          act.includes("takeoff") ||
          act.includes("landing")
        );
        if (isTrain || isFlight) return; // Skip Train and Flight entirely

        const isMealOrAccom =
          cat === "food" ||
          cat === "hotel" ||
          cat === "stay" ||
          act.includes("check-in") ||
          act.includes("check-out") ||
          act.includes("breakfast") ||
          act.includes("lunch") ||
          act.includes("dinner");
        if (isMealOrAccom) return;

        const isExplicitTransport =
          cat.includes("transport") ||
          cat.includes("transfer") ||
          cat.includes("travel") ||
          cat.includes("bus") ||
          cat.includes("cab") ||
          cat.includes("road") ||
          item.mode?.toLowerCase() === "bus";

        const hasRoadKeywords =
          act.includes("drive") ||
          act.includes("transfer") ||
          act.includes("travel") ||
          act.includes("cab") ||
          act.includes("taxi") ||
          act.includes("bus") ||
          act.includes("road trip") ||
          act.includes("day excursion") ||
          act.includes("day trip") ||
          act.includes("sightseeing tour") ||
          place.includes("→") ||
          place.includes("->") ||
          act.includes("→") ||
          act.includes("->");

        if (isExplicitTransport || hasRoadKeywords) {
          const route = resolveItemRoute(item, stayLocation, trip.destination);

          // If from and to are identical or missing, use intelligent fallback
          let fromLoc = route.from || stayLocation;
          let toLoc = route.to || (act.includes("airport") ? "Airport" : trip.destination);
          if (fromLoc.toLowerCase() === toLoc.toLowerCase()) {
            if (act.includes("airport transfer")) {
              toLoc = "Airport";
            } else {
              toLoc = cleanLocation(item.place || item.location || trip.destination);
            }
          }

          const itemId = item.id || item._id || `itin-${dayNum}-${pIdx}`;
          const reqId = `bus-req-${itemId}`;
          const key = `${fromLoc}-${toLoc}-${dayDate}`;
          if (seenKeys.has(key)) return;
          seenKeys.add(key);

          const existing = existingMap.get(reqId) || existingMap.get(itemId);

          // Parse departure & arrival times
          let depTime = item.startTime;
          let arrTime = item.endTime;
          if (!depTime && item.time) {
            const parts = item.time.split("-");
            depTime = parts[0]?.trim();
            arrTime = parts[1]?.trim();
          }
          if (!depTime) depTime = "09:00 AM";
          if (!arrTime) arrTime = "01:00 PM";

          const isOutstation =
            fromLoc &&
            toLoc &&
            fromLoc.toLowerCase() !== toLoc.toLowerCase() &&
            !toLoc.toLowerCase().includes("hotel") &&
            !fromLoc.toLowerCase().includes("hotel");

          const reqType = isCampus
            ? "GROUP_TRANSPORT"
            : isOutstation
            ? "OUTSTATION_TRANSPORT"
            : "LOCAL_TRANSPORT";

          const campusPlan = trip.campusTransportPlan || (isCampus ? trip.campusConfig?.groupTransportPlan : null);
          const rawItemArr =
            existing?.arrangementType ||
            existing?.arrangement ||
            trip.localTransportPreference?.arrangementType ||
            trip.localTransportPreference?.arrangement;
          
          const isItemSelf = rawItemArr === "TRAVELER_MANAGED" || rawItemArr === "TRAVELER_ARRANGED";
          const itemArrangement = isItemSelf
            ? (rawItemArr === "TRAVELER_ARRANGED" ? "TRAVELER_ARRANGED" : "TRAVELER_MANAGED")
            : (rawItemArr === "PRIVATE_MINIBUS" ? "PRIVATE_MINIBUS" : (rawItemArr || "PRIVATE_CAR"));

          const resolvedPreferences = isCampus && campusPlan
            ? {
                vehicleType: campusPlan.vehicleType,
                comfort: campusPlan.comfort,
                capacityPerVehicle: campusPlan.capacityPerVehicle,
                vehiclesRequired: campusPlan.vehiclesRequired,
                studentsCount: campusPlan.studentsCount,
                teachersStaffCount: campusPlan.teachersStaffCount,
                seatCount: campusPlan.totalTravelers,
                luggageCount: campusPlan.luggageCount,
                notes: campusPlan.notes,
              }
            : !isItemSelf && trip.localTransportPreference
            ? {
                arrangementType: itemArrangement,
                vehicleType: trip.localTransportPreference.vehicleType || (itemArrangement === "PRIVATE_MINIBUS" ? "Tempo Traveller" : "Sedan"),
                comfort: trip.localTransportPreference.comfort || "AC",
                seatCount: trip.localTransportPreference.seatCount || travelers,
                luggageCount: trip.localTransportPreference.luggageCount || travelers,
                notes: trip.localTransportPreference.notes || "",
              }
            : (existing?.preferences || {});

          requirements.push({
            id: reqId,
            tripId: trip._id ? String(trip._id) : undefined,
            itineraryItemId: String(itemId),
            day: dayNum,
            date: dayDate,
            from: fromLoc,
            to: toLoc,
            requiredDepartureTime: depTime,
            pickupTime: depTime,
            requiredArrivalTime: arrTime,
            travelers: isCampus && campusPlan ? campusPlan.totalTravelers : travelers,
            mode: isCampus ? "BUS" : "PRIVATE_VEHICLE",
            requirementType: reqType,
            arrangement: isCampus ? "TRANSIX_COORDINATED" : itemArrangement,
            groupTransportPlan: isCampus ? (campusPlan || undefined) : undefined,
            preferences: resolvedPreferences,
            status: existing?.status || "PENDING",
          });
        }
      });
    });
  }

  return requirements;
}

const PERSONAL_CAR_OPTIONS = [
  { id: "hatchback", label: "Hatchback / Compact Sedan", capacity: 3, luggage: 2, recommendedFor: "1-3 travelers" },
  { id: "sedan", label: "Prime Sedan (Dzire / Etios)", capacity: 4, luggage: 3, recommendedFor: "2-4 travelers" },
  { id: "suv", label: "Spacious AC SUV (Ertiga / Innova / Crysta)", capacity: 6, luggage: 5, recommendedFor: "4-6 travelers" },
  { id: "luxury_suv", label: "Luxury SUV (Fortuner / Crysta VIP)", capacity: 5, luggage: 4, recommendedFor: "VIP / Executive" },
];

const PERSONAL_MINIBUS_OPTIONS = [
  { id: "tempo_12", label: "12-14 Seater AC Force Traveller", capacity: 12, luggage: 10, recommendedFor: "7-12 travelers" },
  { id: "tempo_17", label: "16-18 Seater AC Force Traveller", capacity: 16, luggage: 14, recommendedFor: "12-16 travelers" },
  { id: "tempo_20", label: "20-24 Seater Mini Coach", capacity: 20, luggage: 18, recommendedFor: "16-20 travelers" },
];

module.exports = {
  detectBusRequirements,
  resolveItemRoute,
  calculateDayDate,
  cleanLocation,
  calculateCampusFleetRequirements,
  resolveLocalTransportArrangement,
  PERSONAL_CAR_OPTIONS,
  PERSONAL_MINIBUS_OPTIONS,
};
