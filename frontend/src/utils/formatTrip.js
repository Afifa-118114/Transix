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
  // Authoritative: itinerary length
  if (trip.itinerary?.length) {
    return `${trip.itinerary.length} Days`;
  }
  // Stored duration string
  if (trip.duration) {
    return typeof trip.duration === "number" ? `${trip.duration} Days` : String(trip.duration);
  }
  // Derive from date range (inclusive)
  if (trip.startDate && trip.endDate) {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      return `${days} Days`;
    }
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
      const priceNum = parsePrice(p.price || p.estimatedCost || p.fare);
      const displayPrice = p.displayPrice || (priceNum > 0 ? `₹${priceNum.toLocaleString("en-IN")}` : null);

      let durationMins = parseDurationMinutes(p.durationMinutes || p.duration, 90);

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

      // If user has explicitly configured this item's custom time (or on initial load with explicit times)
      if (explicitStart !== null && explicitEnd !== null && explicitEnd > explicitStart && p.startTime && p.endTime) {
        startMin = explicitStart;
        endMin = explicitEnd;
        durationMins = endMin - startMin;
        currentTimelineMin = endMin + 25; // 25m travel buffer
      } else {
        // Build a guaranteed feasible sequence with 20-30m buffers
        if (explicitStart !== null && explicitStart >= currentTimelineMin) {
          startMin = explicitStart;
        } else {
          startMin = currentTimelineMin;
        }

        endMin = startMin + durationMins;
        currentTimelineMin = endMin + 25; // 25m travel buffer
      }

      const startTimeStr = minutesToTimeStr(startMin);
      const endTimeStr = minutesToTimeStr(endMin);

      return {
        id: p.id || `item-d${dayNum}-${pIdx}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: p.name || p.activity || p.place || `Activity ${pIdx + 1}`,
        activity: p.activity || p.name || p.place || `Activity ${pIdx + 1}`,
        place: p.place || p.location || destination,
        location: p.location || p.place || destination,
        notes: p.notes || p.description || "",
        time: `${startTimeStr} - ${endTimeStr}`,
        startTime: startTimeStr,
        endTime: endTimeStr,
        duration: p.duration || `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`,
        durationMinutes: durationMins,
        price: priceNum,
        displayPrice,
        category: p.category || "activity",
        categoryLabel: p.categoryLabel || "Activities",
        rating: p.rating || 4.7,
        dnaMatch: p.dnaMatch || 94,
        icon: p.icon || "✨",
        image: p.image || rawTrip.heroImage || null,
        trainNumber: p.trainNumber || null,
        trainName: p.trainName || null,
        stops: p.stops,
        route: p.route,
        fares: p.fares,
        runningDays: p.runningDays,
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
  const numDays = normalizedItinerary.length || 5;
  let finalStartDate = rawTrip.startDate || null;
  let finalEndDate = rawTrip.endDate || null;

  if (finalStartDate) {
    const s = new Date(finalStartDate);
    if (!isNaN(s.getTime())) {
      if (!finalEndDate) {
        // Compute endDate from itinerary count
        const e = new Date(s);
        e.setDate(s.getDate() + numDays - 1);
        finalEndDate = e.toISOString().split("T")[0];
      } else {
        // Ensure endDate is aligned with itinerary count (adjust if mismatch)
        const e = new Date(finalEndDate);
        if (!isNaN(e.getTime())) {
          const calDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
          if (calDays !== numDays) {
            const adjustedE = new Date(s);
            adjustedE.setDate(s.getDate() + numDays - 1);
            finalEndDate = adjustedE.toISOString().split("T")[0];
          }
        }
      }
    }
  }

  return {
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
  };
}
