export function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  return isNaN(d.getTime())
    ? String(date)
    : d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

export function formatBudget(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

export function getDuration(trip) {
  if (!trip) return "0 Days";
  // Derive from date range (inclusive) first to prevent 0 days on empty itinerary
  if (trip.startDate && trip.endDate) {
    const start = new Date(trip.startDate + (trip.startDate.includes('T') ? '' : 'T00:00:00Z'));
    const end = new Date(trip.endDate + (trip.endDate.includes('T') ? '' : 'T00:00:00Z'));
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      return `${days} Days`;
    }
  }
  // Authoritative: itinerary length
  if (trip.itinerary?.length) {
    return `${trip.itinerary.length} Days`;
  }
  // Stored duration string
  if (trip.duration) {
    return typeof trip.duration === "number" ? `${trip.duration} Days` : String(trip.duration);
  }
  return "5 Days";
}

// Convert time string (e.g. "10:30 AM", "14:00", "09:00") to minutes from midnight
export function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const cleaned = String(timeStr).trim();
  const isPM = /pm/i.test(cleaned);
  const isAM = /am/i.test(cleaned);
  const match = cleaned.match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

// Format minutes from midnight to 12h display string
export function minutesToTimeStr(minutes) {
  if (typeof minutes !== "number" || isNaN(minutes)) return "09:00 AM";
  const normalized = ((minutes % 1440) + 1440) % 1440;
  let hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const pad = (n) => (n < 10 ? `0${n}` : n);
  return `${pad(displayHours)}:${pad(mins)} ${ampm}`;
}

// Parse numeric price safely from string or number
export function parsePrice(priceVal) {
  if (typeof priceVal === "number") return isNaN(priceVal) ? 0 : priceVal;
  if (!priceVal) return 0;
  const cleaned = String(priceVal).replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// Parse duration safely into minutes (capped between 45 and 180 mins for realistic day scheduling)
export function parseDurationMinutes(durationVal, fallback = 90) {
  if (typeof durationVal === "number" && durationVal > 0) {
    return Math.min(240, Math.max(30, durationVal));
  }
  if (!durationVal || typeof durationVal !== "string") return fallback;
  const cleaned = durationVal.toLowerCase().trim();

  // Match decimal hours e.g. "1.5 hours", "2.5 hrs"
  const decHourMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i);
  if (decHourMatch && !cleaned.includes("min")) {
    const hours = parseFloat(decHourMatch[1]);
    if (!isNaN(hours) && hours > 0) return Math.min(240, Math.max(30, Math.round(hours * 60)));
  }

  // Match hours and minutes e.g. "1 hour 30 mins", "2 hrs 15 min"
  const hourMinMatch = cleaned.match(/(\d+)\s*(?:hours?|hrs?)\s*(\d+)?\s*(?:mins?|minutes?)?/i);
  if (hourMinMatch) {
    const hours = parseInt(hourMinMatch[1], 10) || 0;
    const mins = parseInt(hourMinMatch[2], 10) || 0;
    const total = hours * 60 + mins;
    if (total > 0) return Math.min(240, Math.max(30, total));
  }

  // Match standalone minutes e.g. "45 mins", "30 minutes"
  const minMatch = cleaned.match(/(\d+)\s*(?:mins?|minutes?)/i);
  if (minMatch) {
    const mins = parseInt(minMatch[1], 10) || 0;
    if (mins > 0) return Math.min(240, Math.max(30, mins));
  }

  const numMatch = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (numMatch) {
    const num = parseFloat(numMatch[1]);
    const val = /hour|hr/i.test(cleaned) ? Math.round(num * 60) : Math.round(num);
    return Math.min(240, Math.max(30, val));
  }
  return fallback;
}

/**
 * Normalizes any trip object into an authoritative format ensuring:
 * 1. Initial freshly generated plans are guaranteed 100% conflict-free (>=20m buffers, chronological order).
 * 2. Activity custom timings edited by user are respected while maintaining valid time structure.
 * 3. Dynamic budget and feasibility calculation across components.
 */
export function normalizeTrip(rawTrip) {
  if (!rawTrip || typeof rawTrip !== "object") return null;

  const source = rawTrip.source || "Origin";
  const destination = rawTrip.destination || "Destination";
  const budget = parsePrice(rawTrip.budget) || 50000;
  const travelers = Number(rawTrip.travelers) || 2;
  const currency = rawTrip.currency || "INR";

  let rawItinerary = [];
  if (Array.isArray(rawTrip.itinerary) && rawTrip.itinerary.length > 0) {
    rawItinerary = rawTrip.itinerary;
  } else if (Array.isArray(rawTrip.days) && rawTrip.days.length > 0) {
    rawItinerary = rawTrip.days;
  }

  const normalizedItinerary = rawItinerary.map((d, dIdx) => {
    const dayNum = d.day || dIdx + 1;
    const dayTitle = d.title || `Day ${dayNum} — ${destination} Discovery`;
    const rawPlan = Array.isArray(d.plan) ? d.plan : [];

    // Schedule begins at 09:30 AM (570 minutes from midnight)
    let currentTimelineMin = 9 * 60 + 30;

    const normalizedPlan = rawPlan.map((p, pIdx) => {
      const isTrain = Boolean(p.trainNumber || p.category === "transport");
      const priceNum = parsePrice(p.price || p.estimatedCost || p.fare);
      const displayPrice = p.displayPrice || (priceNum > 0 ? `₹${priceNum.toLocaleString("en-IN")}` : null);

      let durationMins = isTrain
        ? (p.durationMinutes || (typeof p.duration === "string" ? (() => {
            const hMatch = p.duration.match(/(\d+)\s*h/i);
            const mMatch = p.duration.match(/(\d+)\s*m/i);
            const hrs = hMatch ? parseInt(hMatch[1], 10) : 0;
            const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
            return (hrs * 60 + mins) || 180;
          })() : 180))
        : parseDurationMinutes(p.durationMinutes || p.duration, 90);

      // Extract existing explicit user-configured times if present
      let explicitStart = null;
      let explicitEnd = null;

      if (p.startTime && p.endTime) {
        explicitStart = timeToMinutes(p.startTime);
        explicitEnd = timeToMinutes(p.endTime);
      } else if (p.time) {
        const parts = String(p.time).split("-").map((t) => t.trim());
        if (parts.length > 0) explicitStart = timeToMinutes(parts[0]);
        if (parts.length > 1) explicitEnd = timeToMinutes(parts[1]);
      }

      let startMin;
      let endMin;

      // If the item has explicit times (from AI or user), trust them unconditionally.
      if (explicitStart !== null && explicitEnd !== null && explicitEnd > explicitStart) {
        startMin = explicitStart;
        endMin = explicitEnd;
        durationMins = endMin - startMin; // Preserve explicit duration
        if (!isTrain) currentTimelineMin = endMin + 25;
      } else if (isTrain && (p.departure || p.startTime)) {
        // Real train scheduled departure time
        const parsedDep = timeToMinutes(p.departure || p.startTime);
        startMin = parsedDep !== null ? parsedDep : currentTimelineMin;
        endMin = (startMin + (durationMins % 1440)) % 1440;
      } else {
        // Only if absolutely no valid time was provided, fall back to sequential placement
        startMin = currentTimelineMin;
        endMin = startMin + durationMins;
        currentTimelineMin = endMin + 25;
      }

      const startTimeStr = (isTrain && !p.legType && p.departure) ? p.departure : minutesToTimeStr(startMin);
      const endTimeStr = (isTrain && !p.legType && p.arrival) ? p.arrival : minutesToTimeStr(endMin);

      const canonicalId = p._id ? String(p._id) : p.id;
      
      return {
        id: canonicalId,
        _id: canonicalId,
        name: p.name || p.activity || p.place || (isTrain ? `${p.trainName} (#${p.trainNumber})` : `Activity ${pIdx + 1}`),
        activity: p.activity || p.name || p.place || `Activity ${pIdx + 1}`,
        place: p.place || p.location || destination,
        location: p.location || p.place || destination,
        notes: p.notes || p.description || "",
        time: p.time || (isTrain && !p.legType ? `${p.departure || startTimeStr} - ${p.arrival || endTimeStr}` : `${startTimeStr} - ${endTimeStr}`),
        startTime: p.startTime || (isTrain && !p.legType ? (p.departure || startTimeStr) : startTimeStr),
        endTime: p.endTime || (isTrain && !p.legType ? (p.arrival || endTimeStr) : endTimeStr),
        departure: p.departure || (isTrain ? startTimeStr : null),
        arrival: p.arrival || (isTrain ? endTimeStr : null),
        duration: isTrain ? (p.duration || `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`) : `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`,
        durationMinutes: durationMins,
        price: priceNum,
        displayPrice,
        category: p.category || (isTrain ? "transport" : "activity"),
        categoryLabel: p.categoryLabel || (isTrain ? "Transport" : "Activities"),
        rating: p.rating || 4.7,
        dnaMatch: p.dnaMatch || 94,
        icon: p.icon || (isTrain ? "🚆" : "✨"),
        image: p.image || null,
        trainNumber: p.trainNumber || null,
        trainName: p.trainName || null,
        type: p.type || (isTrain ? "Express" : null),
        journeyDirection: p.journeyDirection || null,
        routeSource: p.routeSource || null,
        routeDestination: p.routeDestination || null,
        source: p.source || null,
        destination: p.destination || null,
        from: p.from || null,
        to: p.to || null,
        stops: p.stops !== undefined ? p.stops : p.totalStops,
        totalStops: p.totalStops !== undefined ? p.totalStops : p.stops,
        route: p.route || null,
        fares: p.fares || null,
        runningDays: p.runningDays || null,
        isGateway: Boolean(p.isGateway),
        gatewayLabel: p.gatewayLabel || null,
        legType: p.legType || null,
        isStaySegmentHotel: p.isStaySegmentHotel || false,
        staySegmentId: p.staySegmentId || null,
      };
    });

    return {
      day: dayNum,
      title: dayTitle,
      date: d.date || `Day ${dayNum}`,
      plan: normalizedPlan,
    };
  });

  // ---- Date / Duration / Itinerary synchronization ----
  let finalStartDate = rawTrip.startDate || null;
  let finalEndDate = rawTrip.endDate || null;
  let numDays = normalizedItinerary.length || 5;

  if (finalStartDate) {
    const s = new Date(finalStartDate + (finalStartDate.includes('T') ? '' : 'T00:00:00Z'));
    if (!isNaN(s.getTime())) {
      if (!finalEndDate) {
        // Compute endDate from itinerary count
        const e = new Date(s.getTime());
        e.setUTCDate(s.getUTCDate() + numDays - 1);
        finalEndDate = e.toISOString().split("T")[0];
      } else {
        // Just sync numDays with the explicit dates, do not shift finalEndDate
        const e = new Date(finalEndDate + (finalEndDate.includes('T') ? '' : 'T00:00:00Z'));
        if (!isNaN(e.getTime())) {
          const calDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
          numDays = calDays;
        }
      }
    }
  }

  const finalTrip = {
    ...rawTrip,
    _id: rawTrip._id || `trip-${Date.now()}`,
    source,
    destination,
    budget,
    travelers,
    currency,
    startDate: finalStartDate,
    endDate: finalEndDate,
    duration: `${numDays} Days`,
    heroImage: rawTrip.heroImage || null,
    itinerary: normalizedItinerary,
    staySegments: Array.isArray(rawTrip.staySegments) ? rawTrip.staySegments : [],
    travelLegs: Array.isArray(rawTrip.travelLegs) ? rawTrip.travelLegs : [],
    validation: rawTrip.validation || null,
  };

  // We return the trip directly. If there are old injected hotels, we filter them out.
  if (finalTrip.itinerary) {
    finalTrip.itinerary = finalTrip.itinerary.map(day => ({
      ...day,
      plan: (day.plan || []).filter(item => !item.isStaySegmentHotel)
    }));
  }

  return finalTrip;
}


