import { getPlaceCoordinates } from "../services/geocodeService.js";

/**
 * Standard Transix Day Color Palette:
 * Gives each itinerary day a consistent, vibrant, harmonious color identity.
 */
export const DAY_COLORS = [
  { name: "Indigo", hex: "#4f46e5", glow: "#818cf8", bg: "bg-indigo-600", text: "text-indigo-600", border: "border-indigo-500", ring: "ring-indigo-400" },
  { name: "Emerald", hex: "#059669", glow: "#34d399", bg: "bg-emerald-600", text: "text-emerald-600", border: "border-emerald-500", ring: "ring-emerald-400" },
  { name: "Amber", hex: "#d97706", glow: "#fbbf24", bg: "bg-amber-600", text: "text-amber-600", border: "border-amber-500", ring: "ring-amber-400" },
  { name: "Rose", hex: "#e11d48", glow: "#fb7185", bg: "bg-rose-600", text: "text-rose-600", border: "border-rose-500", ring: "ring-rose-400" },
  { name: "Sky", hex: "#0284c7", glow: "#38bdf8", bg: "bg-sky-600", text: "text-sky-600", border: "border-sky-500", ring: "ring-sky-400" },
  { name: "Purple", hex: "#7c3aed", glow: "#a78bfa", bg: "bg-purple-600", text: "text-purple-600", border: "border-purple-500", ring: "ring-purple-400" },
  { name: "Teal", hex: "#0d9488", glow: "#2dd4bf", bg: "bg-teal-600", text: "text-teal-600", border: "border-teal-500", ring: "ring-teal-400" },
  { name: "Orange", hex: "#ea580c", glow: "#fb923c", bg: "bg-orange-600", text: "text-orange-600", border: "border-orange-500", ring: "ring-orange-400" },
];

export function getDayColor(dayNumber) {
  const index = Math.max(0, Number(dayNumber) - 1) % DAY_COLORS.length;
  return DAY_COLORS[index];
}

/**
 * Normalizes and categorizes an itinerary activity into standard Transix map categories:
 * - 'attraction': Sights, monuments, temples, parks, museums, nature, viewpoints
 * - 'hotel': Hotels, resorts, stay segments, check-in/out
 * - 'transport': Airports, train stations, bus stands, flights, transfers
 * - 'start': Journey starting point
 * - 'end': Journey destination / arrival
 * - 'activity': Food, dining, leisure, shopping, workshops, etc.
 */
export function classifyLocationCategory(item, explicitCategory = "") {
  const cat = (explicitCategory || item?.category || item?.type || "").toLowerCase();
  const text = `${item?.activity || ""} ${item?.place || ""} ${item?.location || ""} ${item?.name || ""}`.toLowerCase();

  if (cat.includes("start") || cat.includes("origin")) return "start";
  if (cat.includes("destination") || cat.includes("final")) return "end";

  // Hotel / Accommodation
  if (
    cat.includes("hotel") ||
    cat.includes("stay") ||
    cat.includes("resort") ||
    cat.includes("lodging") ||
    text.includes("hotel") ||
    text.includes("resort") ||
    text.includes("check-in") ||
    text.includes("check-out") ||
    text.includes("homestay") ||
    text.includes("villa") ||
    item?.isStaySegmentHotel
  ) {
    return "hotel";
  }

  // Transport
  if (
    cat.includes("transport") ||
    cat.includes("transit") ||
    cat.includes("flight") ||
    cat.includes("train") ||
    cat.includes("bus") ||
    cat.includes("cab") ||
    text.includes("airport") ||
    text.includes("station") ||
    text.includes("terminal") ||
    text.includes("transfer to") ||
    text.includes("flight to") ||
    text.includes("drive to") ||
    text.includes("arrival at") ||
    text.includes("departure from")
  ) {
    return "transport";
  }

  // Attractions
  if (
    cat.includes("sightseeing") ||
    cat.includes("nature") ||
    cat.includes("culture") ||
    cat.includes("heritage") ||
    cat.includes("history") ||
    cat.includes("wildlife") ||
    cat.includes("art") ||
    text.includes("fort") ||
    text.includes("palace") ||
    text.includes("temple") ||
    text.includes("museum") ||
    text.includes("park") ||
    text.includes("falls") ||
    text.includes("waterfall") ||
    text.includes("dam") ||
    text.includes("lake") ||
    text.includes("beach") ||
    text.includes("monument") ||
    text.includes("viewpoint") ||
    text.includes("sanctuary") ||
    text.includes("safari")
  ) {
    return "attraction";
  }

  return "activity";
}

/**
 * Extracts, geocodes, and structures all locations and route connections from a saved Transix journey.
 * Never creates fake coordinates. Excludes unresolvable points from geographic route lines.
 */
export async function resolveJourneyLocations(trip) {
  if (!trip) {
    return {
      allLocations: [],
      mappableLocations: [],
      locationsByDay: {},
      dayPolylines: {},
      allDaysPolyline: [],
      dayRouteSegments: {},
      interDayConnections: [],
      dayStartLocations: [],
      unmappableCount: 0,
      mappableCount: 0,
      categoryCounts: {
        attraction: 0,
        hotel: 0,
        transport: 0,
        start_end: 0,
        activity: 0,
      },
    };
  }

  const allLocations = [];
  const sourceName = trip.source || "Origin";
  const destName = trip.destination || "Destination";
  const itinerary = Array.isArray(trip.itinerary) ? trip.itinerary : [];
  const staySegments = Array.isArray(trip.staySegments) ? trip.staySegments : [];

  // Track coordinate collisions to avoid completely hidden overlapping markers
  const coordCounts = {};

  // 1. Origin / Start Marker (System Journey Start)
  const sourceCoords = await getPlaceCoordinates(sourceName);
  if (sourceCoords) {
    allLocations.push({
      id: "loc-origin",
      name: sourceName,
      title: sourceName,
      place: sourceName,
      address: sourceName,
      category: "start",
      label: "START",
      day: 0,
      dayIndex: 0,
      time: "Departure",
      description: "Journey Departure Hub",
      coordinates: sourceCoords,
      displayCoordinates: sourceCoords,
      isMappable: true,
      isSystemPoint: true,
    });
  }

  // 2. Stay Segments / Hotels
  for (let sIdx = 0; sIdx < staySegments.length; sIdx++) {
    const seg = staySegments[sIdx];
    const hotelName = seg?.selectedHotel?.name || seg?.hotel?.name || seg?.location;
    if (hotelName) {
      let coords = null;
      if (Array.isArray(seg?.selectedHotel?.coordinates) && seg.selectedHotel.coordinates.length === 2) {
        coords = seg.selectedHotel.coordinates;
      } else if (seg?.selectedHotel?.lat && seg?.selectedHotel?.lng) {
        coords = [parseFloat(seg.selectedHotel.lat), parseFloat(seg.selectedHotel.lng)];
      } else {
        coords = await getPlaceCoordinates(hotelName, seg.location || destName);
      }

      allLocations.push({
        id: `loc-stay-${sIdx}`,
        name: hotelName,
        title: hotelName,
        place: seg.location || hotelName,
        address: seg.location || hotelName,
        category: "hotel",
        label: "STAY",
        day: "stay",
        dayIndex: -1,
        time: `Check-in: ${seg.checkIn ? new Date(seg.checkIn).toLocaleDateString() : "Scheduled"}`,
        description: `${seg.nights || 1} Night${seg.nights !== 1 ? "s" : ""} Stay Accommodation`,
        stayNights: seg.nights,
        rating: seg?.selectedHotel?.rating,
        image: seg?.selectedHotel?.image,
        coordinates: coords,
        displayCoordinates: coords,
        isMappable: Boolean(coords),
        isStaySegment: true,
      });
    }
  }

  // 3. Day-by-day Itinerary Activities
  for (let dayIdx = 0; dayIdx < itinerary.length; dayIdx++) {
    const dayObj = itinerary[dayIdx];
    const dayNum = dayObj.day || dayIdx + 1;
    const plan = Array.isArray(dayObj.plan) ? dayObj.plan : [];
    const dayColor = getDayColor(dayNum);

    const cleanDayContext = (() => {
      if (dayObj.title && typeof dayObj.title === "string") {
        const cityMatch = dayObj.title.match(
          /\b(mumbai|delhi|kochi|cochin|munnar|alleppey|alappuzha|thekkady|wayanad|varkala|trivandrum|jaipur|jodhpur|udaipur|jaisalmer|goa|panaji|bangalore|bengaluru|chennai|hyderabad|pune|agra|varanasi|kerala|rajasthan|kalyan)\b/i
        );
        if (cityMatch) return cityMatch[1];
      }
      return destName;
    })();

    // First pass: resolve coordinates and count valid coordinates for this day
    const dayItems = [];
    for (let actIdx = 0; actIdx < plan.length; actIdx++) {
      const act = plan[actIdx];
      const placeQuery = act.place || act.location || act.name || act.activity;
      const category = classifyLocationCategory(act);

      let coords = null;
      if (Array.isArray(act.coordinates) && act.coordinates.length === 2) {
        coords = act.coordinates;
      } else if (act.lat && act.lng) {
        coords = [parseFloat(act.lat), parseFloat(act.lng)];
      } else if (placeQuery) {
        coords = await getPlaceCoordinates(placeQuery, cleanDayContext);
      }

      dayItems.push({
        act,
        placeQuery,
        category,
        coords,
        actIdx,
      });
    }

    // Count mapped activities for this day
    const mappedDayItems = dayItems.filter((item) => Boolean(item.coords));
    const totalDayMapped = mappedDayItems.length;

    let seqInDay = 0;
    for (let actIdx = 0; actIdx < dayItems.length; actIdx++) {
      const { act, placeQuery, category, coords } = dayItems[actIdx];
      const isMappable = Boolean(coords);

      let currentSeq = null;
      let isFirstInDay = false;
      let isLastInDay = false;
      let displayCoords = coords;

      if (isMappable) {
        seqInDay += 1;
        currentSeq = seqInDay;
        isFirstInDay = seqInDay === 1;
        isLastInDay = seqInDay === totalDayMapped;

        // Apply a subtle display offset if another marker has the exact same lat/lng
        const coordKey = `${coords[0].toFixed(5)},${coords[1].toFixed(5)}`;
        if (coordCounts[coordKey]) {
          const count = coordCounts[coordKey];
          coordCounts[coordKey] = count + 1;
          const angle = (count * Math.PI) / 3;
          displayCoords = [
            coords[0] + 0.00025 * Math.cos(angle),
            coords[1] + 0.00025 * Math.sin(angle),
          ];
        } else {
          coordCounts[coordKey] = 1;
        }
      }

      const stableId = act.id || act._id || `d${dayNum}-act-${actIdx}`;

      allLocations.push({
        id: stableId,
        actRef: act,
        name: act.activity || placeQuery,
        title: act.activity || placeQuery,
        place: placeQuery,
        address: placeQuery,
        category,
        label: isMappable ? `${currentSeq}` : "-",
        sequenceNumber: currentSeq, // Restarts from 1 every day
        daySequenceNumber: currentSeq,
        dayTotalMapped: totalDayMapped,
        isFirstInDay,
        isLastInDay,
        dayColor,
        day: dayNum,
        dayIndex: dayIdx,
        time: act.time || "Scheduled",
        description: act.notes || act.description || act.activity,
        estimatedCost: act.estimatedCost || act.price,
        duration: act.duration,
        coordinates: coords,
        displayCoordinates: displayCoords,
        isMappable,
      });
    }
  }

  // 4. Destination / End Marker (System Journey Conclusion)
  const destCoords = await getPlaceCoordinates(destName);
  if (destCoords) {
    allLocations.push({
      id: "loc-destination",
      name: destName,
      title: destName,
      place: destName,
      address: destName,
      category: "end",
      label: "END",
      day: itinerary.length + 1,
      dayIndex: itinerary.length,
      time: "Arrival / Completion",
      description: "Journey Destination & Conclusion",
      coordinates: destCoords,
      displayCoordinates: destCoords,
      isMappable: true,
      isSystemPoint: true,
    });
  }

  const mappableLocations = allLocations.filter((l) => l.isMappable && l.coordinates);
  const unmappableCount = allLocations.length - mappableLocations.length;

  // Group locations, build day route segments, and prepare day start markers
  const locationsByDay = {};
  const dayPolylines = {};
  const dayRouteSegments = {};
  const dayStartLocations = [];

  for (let i = 0; i < itinerary.length; i++) {
    const dayObj = itinerary[i];
    const dNum = dayObj.day || i + 1;
    const dayColor = getDayColor(dNum);

    // Mappable activities for this day in strict itinerary sequence
    const dayActivities = mappableLocations.filter(
      (l) => l.day === dNum && !l.isStaySegment && !l.isSystemPoint
    );

    locationsByDay[dNum] = dayActivities;
    dayPolylines[dNum] = dayActivities.map((l) => l.coordinates);

    // Day route segments connecting consecutive activities
    const segments = [];
    for (let k = 0; k < dayActivities.length - 1; k++) {
      const locA = dayActivities[k];
      const locB = dayActivities[k + 1];
      segments.push({
        id: `seg-d${dNum}-${k}`,
        day: dNum,
        fromId: locA.id,
        toId: locB.id,
        fromName: locA.name,
        toName: locB.name,
        fromSeq: locA.sequenceNumber,
        toSeq: locB.sequenceNumber,
        fromCoords: locA.coordinates,
        toCoords: locB.coordinates,
        positions: [locA.coordinates, locB.coordinates],
        color: dayColor.hex,
      });
    }
    dayRouteSegments[dNum] = segments;

    // Day start marker info (for Day 1, Day 2 label badges in All Days mode)
    if (dayActivities.length > 0) {
      const firstAct = dayActivities[0];
      dayStartLocations.push({
        day: dNum,
        dayIndex: i,
        title: dayObj.title || `Day ${dNum}`,
        locationId: firstAct.id,
        locationName: firstAct.name,
        coordinates: firstAct.displayCoordinates || firstAct.coordinates,
        color: dayColor,
        activityCount: dayActivities.length,
      });
    }
  }

  // Inter-day connections connecting Day N's last stop to Day N+1's first stop
  const interDayConnections = [];
  const daysWithStops = Object.keys(locationsByDay)
    .map(Number)
    .filter((d) => locationsByDay[d]?.length > 0)
    .sort((a, b) => a - b);

  for (let idx = 0; idx < daysWithStops.length - 1; idx++) {
    const dayA = daysWithStops[idx];
    const dayB = daysWithStops[idx + 1];
    const actsA = locationsByDay[dayA];
    const actsB = locationsByDay[dayB];

    if (actsA.length > 0 && actsB.length > 0) {
      const lastStopA = actsA[actsA.length - 1];
      const firstStopB = actsB[0];
      interDayConnections.push({
        id: `inter-d${dayA}-d${dayB}`,
        fromDay: dayA,
        toDay: dayB,
        fromId: lastStopA.id,
        toId: firstStopB.id,
        fromName: lastStopA.name,
        toName: firstStopB.name,
        positions: [lastStopA.coordinates, firstStopB.coordinates],
      });
    }
  }

  // Complete journey sequence polyline (All Days)
  const allDaysPolyline = [];
  if (sourceCoords) allDaysPolyline.push(sourceCoords);

  for (let i = 0; i < itinerary.length; i++) {
    const dNum = itinerary[i].day || i + 1;
    const dayPoints = (dayPolylines[dNum] || []).filter(Boolean);
    allDaysPolyline.push(...dayPoints);
  }

  if (destCoords && (!allDaysPolyline.length || allDaysPolyline[allDaysPolyline.length - 1] !== destCoords)) {
    allDaysPolyline.push(destCoords);
  }

  // Category counts
  const categoryCounts = {
    attraction: mappableLocations.filter((l) => l.category === "attraction").length,
    hotel: mappableLocations.filter((l) => l.category === "hotel").length,
    transport: mappableLocations.filter((l) => l.category === "transport").length,
    start_end: mappableLocations.filter((l) => l.category === "start" || l.category === "end").length,
    activity: mappableLocations.filter((l) => l.category === "activity").length,
  };

  return {
    allLocations,
    mappableLocations,
    locationsByDay,
    dayPolylines,
    dayRouteSegments,
    interDayConnections,
    dayStartLocations,
    allDaysPolyline,
    unmappableCount,
    mappableCount: mappableLocations.length,
    categoryCounts,
  };
}

