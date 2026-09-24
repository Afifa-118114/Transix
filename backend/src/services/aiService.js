const { GoogleGenerativeAI } = require("@google/generative-ai");
const crypto = require("crypto");

const getModel = () => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-flash-latest",
  });
};

const {
  validateItinerary,
  timeToMinutes,
  minutesToTimeStr,
  calculateCampusGroupRoomRate,
  detectConflicts
} = require("./itineraryValidator");

const { resolveStationCandidates } = require("./stationService");
const { searchDirectTrains } = require("./trainPlannerService");
const { fetchTravelOptions } = require("./travelService");
const FlightSchedule = require("../models/FlightSchedule");
const { resolveAirports } = require("../utils/airportCodes");
const { doesScheduleOperateOnWeekday } = require("../utils/flightScheduleMatcher");

const parseDurationMinutes = (durStr) => {
  if (!durStr) return 120;
  const s = String(durStr).toLowerCase();
  let total = 0;
  const hMatch = s.match(/(\d+)\s*h/);
  const mMatch = s.match(/(\d+)\s*m/);
  if (hMatch) total += parseInt(hMatch[1], 10) * 60;
  if (mMatch) total += parseInt(mMatch[1], 10);
  return total > 0 ? total : 120;
};

const parseFareNumber = (fareStr, defaultFare = 1000) => {
  if (typeof fareStr === "number") return fareStr;
  if (!fareStr) return defaultFare;
  const num = parseFloat(String(fareStr).replace(/[^0-9.]/g, ""));
  return isNaN(num) || num <= 0 ? defaultFare : num;
};

const minutesTo24H = (mins) => {
  if (mins === null || mins === undefined) return "00:00:00";
  const m = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
};

/**
 * Builds an unambiguous, fully-qualified transport leg with exact dates and datetimes.
 * For return legs, targetArrivalDate guarantees arrivalDate <= targetArrivalDate.
 */
const buildTransportLeg = ({
  from,
  to,
  mode,
  provider,
  trainNumber,
  trainName,
  flightNumber,
  airline,
  departureDate,
  departureTime,
  durationMinutes,
  estimatedCost,
  estimated = false,
  targetArrivalDate = null
}) => {
  const depMin = timeToMinutes(departureTime) ?? (8 * 60);
  const durMin = Math.max(30, parseInt(durationMinutes, 10) || 120);

  let actualDepDate = departureDate;
  if (targetArrivalDate) {
    const totalMinutes = depMin + durMin;
    const daysAdded = Math.floor(totalMinutes / 1440);
    const targetDateObj = new Date(targetArrivalDate + (targetArrivalDate.includes('T') ? '' : 'T00:00:00Z'));
    const depDateObj = new Date(targetDateObj.getTime() - daysAdded * 86400000);
    actualDepDate = depDateObj.toISOString().split("T")[0];
  }

  const depDateObj = new Date(actualDepDate + (actualDepDate.includes('T') ? '' : 'T00:00:00Z'));
  const totalArrMinutes = depMin + durMin;
  const daysAdded = Math.floor(totalArrMinutes / 1440);
  const arrMinutesOfDay = totalArrMinutes % 1440;

  const arrDateObj = new Date(depDateObj.getTime() + daysAdded * 86400000);
  const arrivalDate = arrDateObj.toISOString().split("T")[0];
  const arrivalTime = minutesToTimeStr(arrMinutesOfDay);

  const depTime24 = minutesTo24H(depMin);
  const arrTime24 = minutesTo24H(arrMinutesOfDay);

  const departureDateTime = `${actualDepDate}T${depTime24}`;
  const arrivalDateTime = `${arrivalDate}T${arrTime24}`;
  const isOvernight = actualDepDate !== arrivalDate;

  return {
    from,
    to,
    mode,
    provider: provider || trainName || airline || `${mode} Transfer`,
    trainNumber,
    trainName,
    flightNumber,
    airline,
    date: actualDepDate,
    departureDate: actualDepDate,
    departureTime: minutesToTimeStr(depMin),
    departureDateTime,
    arrivalDate,
    arrivalTime,
    arrivalDateTime,
    startTime: minutesToTimeStr(depMin),
    endTime: arrivalTime,
    durationMinutes: durMin,
    estimatedCost: Math.round(estimatedCost || 0),
    estimated,
    isOvernight
  };
};

/**
 * Resolves both outbound (Day 1) and return intercity transport
 * strictly based on the user's selected travelMode.
 */
const resolveIntercityTransport = async (tripData) => {
  const mode = String(tripData.travelMode || "train").toLowerCase();
  const travelers = parseInt(tripData.travelers, 10) || 1;
  const src = tripData.source;
  const dst = tripData.destination;
  const startDate = tripData.startDate;
  const endDate = tripData.endDate;

  let outboundLeg = null;
  let returnLeg = null;

  if (mode === "flight") {
    try {
      const srcAirports = resolveAirports(src);
      const dstAirports = resolveAirports(dst);
      const srcCodes = srcAirports.map(t => t.code);
      const dstCodes = dstAirports.map(t => t.code);

      const outFlights = await FlightSchedule.find({
        $and: [
          { $or: [{ "origin.code": { $in: srcCodes } }, { "origin.name": { $in: srcAirports.map(t => t.name) } }] },
          { $or: [{ "destination.code": { $in: dstCodes } }, { "destination.name": { $in: dstAirports.map(t => t.name) } }] }
        ]
      }).limit(20).lean();

      let outMatched = outFlights;
      if (startDate) {
        const dObj = new Date(startDate);
        if (!isNaN(dObj.getTime())) {
          const dayFiltered = outFlights.filter(f => doesScheduleOperateOnWeekday(f, dObj));
          if (dayFiltered.length > 0) outMatched = dayFiltered;
        }
      }

      const retFlights = await FlightSchedule.find({
        $and: [
          { $or: [{ "origin.code": { $in: dstCodes } }, { "origin.name": { $in: dstAirports.map(t => t.name) } }] },
          { $or: [{ "destination.code": { $in: srcCodes } }, { "destination.name": { $in: srcAirports.map(t => t.name) } }] }
        ]
      }).limit(20).lean();

      let retMatched = retFlights;
      if (endDate) {
        const dObj = new Date(endDate);
        if (!isNaN(dObj.getTime())) {
          const dayFiltered = retFlights.filter(f => doesScheduleOperateOnWeekday(f, dObj));
          if (dayFiltered.length > 0) retMatched = dayFiltered;
        }
      }

      const travelOpts = await fetchTravelOptions(src, dst).catch(() => ({}));
      const flightOpt = travelOpts.flight?.[0];
      const baseFare = parseFareNumber(flightOpt?.estimatedFare, 4500);

      if (outMatched.length > 0) {
        const f = outMatched[0];
        const dep = f.scheduledDepartureTime || f.departureTime || "08:30 AM";
        const arr = f.scheduledArrivalTime || f.arrivalTime || "11:00 AM";
        const depMin = timeToMinutes(dep) || 8 * 60 + 30;
        let arrMin = timeToMinutes(arr) || depMin + 150;
        if (arrMin < depMin) arrMin += 1440;
        outboundLeg = buildTransportLeg({
          from: f.origin.name || src,
          to: f.destination.name || dst,
          mode: "Flight",
          flightNumber: `${f.airline} #${f.flightNumber}`,
          airline: f.airline,
          departureDate: startDate,
          departureTime: minutesToTimeStr(depMin),
          durationMinutes: arrMin - depMin,
          estimatedCost: baseFare * travelers,
          estimated: false
        });
      }

      if (retMatched.length > 0) {
        const f = retMatched[0];
        const dep = f.scheduledDepartureTime || f.departureTime || "06:00 PM";
        const arr = f.scheduledArrivalTime || f.arrivalTime || "08:30 PM";
        const depMin = timeToMinutes(dep) || 18 * 60;
        let arrMin = timeToMinutes(arr) || depMin + 150;
        if (arrMin < depMin) arrMin += 1440;
        returnLeg = buildTransportLeg({
          from: f.origin.name || dst,
          to: f.destination.name || src,
          mode: "Flight",
          flightNumber: `${f.airline} #${f.flightNumber}`,
          airline: f.airline,
          departureDate: endDate,
          departureTime: minutesToTimeStr(depMin),
          durationMinutes: arrMin - depMin,
          estimatedCost: baseFare * travelers,
          estimated: false,
          targetArrivalDate: endDate
        });
      }

      if (!outboundLeg) {
        const dur = parseDurationMinutes(flightOpt?.duration || "2h 30m");
        outboundLeg = buildTransportLeg({
          from: src,
          to: dst,
          mode: "Flight",
          flightNumber: "Air India #AI-602",
          airline: "Air India",
          departureDate: startDate,
          departureTime: "09:00 AM",
          durationMinutes: dur,
          estimatedCost: baseFare * travelers,
          estimated: true
        });
      }
      if (!returnLeg) {
        const dur = parseDurationMinutes(flightOpt?.duration || "2h 30m");
        returnLeg = buildTransportLeg({
          from: dst,
          to: src,
          mode: "Flight",
          flightNumber: "Air India #AI-603",
          airline: "Air India",
          departureDate: endDate,
          departureTime: "06:00 PM",
          durationMinutes: dur,
          estimatedCost: baseFare * travelers,
          estimated: true,
          targetArrivalDate: endDate
        });
      }
    } catch (e) {
      console.error("[aiService] Flight resolution error:", e.message);
    }
  } else if (mode === "train") {
    try {
      const srcStations = await resolveStationCandidates(src).catch(() => ({ codes: [], stationNames: [] }));
      const dstStations = await resolveStationCandidates(dst).catch(() => ({ codes: [], stationNames: [] }));

      const hasSrcStations = srcStations && ((srcStations.codes && srcStations.codes.length > 0) || (srcStations.stationNames && srcStations.stationNames.length > 0));
      const hasDstStations = dstStations && ((dstStations.codes && dstStations.codes.length > 0) || (dstStations.stationNames && dstStations.stationNames.length > 0));

      const travelOpts = await fetchTravelOptions(src, dst).catch(() => ({}));
      const trainOpt = travelOpts.train?.[0];
      const baseFare = parseFareNumber(trainOpt?.estimatedFare, 1200);
      const fallbackDur = parseDurationMinutes(trainOpt?.duration || "6h 00m");

      let outTrains = [];
      if (hasSrcStations && hasDstStations) {
        outTrains = await searchDirectTrains(srcStations, dstStations, startDate).catch(() => []);
      }

      if (outTrains.length > 0) {
        const t = outTrains[0];
        const depMin = timeToMinutes(t.from.departure) || 7 * 60 + 30;
        const dur = t.durationMinutes || parseDurationMinutes(t.duration) || fallbackDur;
        const dist = Math.abs((t.to.distance || 500) - (t.from.distance || 0)) || 500;
        const fare = (t.price || t.fare || Math.round(dist * 1.5)) * travelers;
        outboundLeg = buildTransportLeg({
          from: t.from.name || src,
          to: t.to.name || dst,
          mode: "Train",
          trainNumber: t.trainNumber,
          trainName: t.trainName,
          departureDate: startDate,
          departureTime: minutesToTimeStr(depMin),
          durationMinutes: dur,
          estimatedCost: fare,
          estimated: false
        });
      }

      // Determine return train departure date so that arrivalDate <= endDate
      const estRetDur = outboundLeg ? outboundLeg.durationMinutes : fallbackDur;
      const estRetDepMin = 16 * 60 + 30;
      const daysAdded = Math.floor((estRetDepMin + estRetDur) / 1440);
      const retDepDateObj = new Date(new Date(endDate + (endDate.includes('T') ? '' : 'T00:00:00Z')).getTime() - daysAdded * 86400000);
      const retDepDate = retDepDateObj.toISOString().split("T")[0];

      let retTrains = [];
      if (hasSrcStations && hasDstStations) {
        retTrains = await searchDirectTrains(dstStations, srcStations, retDepDate).catch(() => []);
      }

      if (retTrains.length > 0) {
        const t = retTrains[0];
        const depMin = timeToMinutes(t.from.departure) || 16 * 60 + 30;
        const dur = t.durationMinutes || parseDurationMinutes(t.duration) || estRetDur;
        const dist = Math.abs((t.to.distance || 500) - (t.from.distance || 0)) || 500;
        const fare = (t.price || t.fare || Math.round(dist * 1.5)) * travelers;
        returnLeg = buildTransportLeg({
          from: t.from.name || dst,
          to: t.to.name || src,
          mode: "Train",
          trainNumber: t.trainNumber,
          trainName: t.trainName,
          departureDate: retDepDate,
          departureTime: minutesToTimeStr(depMin),
          durationMinutes: dur,
          estimatedCost: fare,
          estimated: false,
          targetArrivalDate: endDate
        });
      }

      if (!outboundLeg) {
        outboundLeg = buildTransportLeg({
          from: src,
          to: dst,
          mode: "Train",
          trainNumber: "12955",
          trainName: "Express",
          departureDate: startDate,
          departureTime: "07:30 AM",
          durationMinutes: fallbackDur,
          estimatedCost: baseFare * travelers,
          estimated: true
        });
      }
      if (!returnLeg) {
        returnLeg = buildTransportLeg({
          from: dst,
          to: src,
          mode: "Train",
          trainNumber: "12956",
          trainName: "Express Return",
          departureDate: retDepDate,
          departureTime: "04:30 PM",
          durationMinutes: estRetDur,
          estimatedCost: baseFare * travelers,
          estimated: true,
          targetArrivalDate: endDate
        });
      }
    } catch (e) {
      console.error("[aiService] Train resolution error:", e.message);
    }
  } else if (mode === "bus") {
    try {
      const travelOpts = await fetchTravelOptions(src, dst).catch(() => ({}));
      const busOpt = travelOpts.bus?.[0];
      const baseFare = parseFareNumber(busOpt?.estimatedFare, 800);
      const dur = parseDurationMinutes(busOpt?.duration || "5h 00m");

      outboundLeg = buildTransportLeg({
        from: src,
        to: dst,
        mode: "Bus",
        provider: "Intercity Express Bus",
        departureDate: startDate,
        departureTime: "07:00 AM",
        durationMinutes: dur,
        estimatedCost: baseFare * travelers,
        estimated: true
      });
      returnLeg = buildTransportLeg({
        from: dst,
        to: src,
        mode: "Bus",
        provider: "Intercity Express Bus",
        departureDate: endDate,
        departureTime: "04:00 PM",
        durationMinutes: dur,
        estimatedCost: baseFare * travelers,
        estimated: true,
        targetArrivalDate: endDate
      });
    } catch (e) {
      console.error("[aiService] Bus resolution error:", e.message);
    }
  } else {
    try {
      const travelOpts = await fetchTravelOptions(src, dst).catch(() => ({}));
      const cabOpt = travelOpts.cab?.[0];
      const baseFare = parseFareNumber(cabOpt?.estimatedFare, 2500);
      const dur = parseDurationMinutes(cabOpt?.duration || "4h 00m");

      outboundLeg = buildTransportLeg({
        from: src,
        to: dst,
        mode: "Car",
        provider: "Private Cab Transfer",
        departureDate: startDate,
        departureTime: "08:00 AM",
        durationMinutes: dur,
        estimatedCost: baseFare,
        estimated: true
      });
      returnLeg = buildTransportLeg({
        from: dst,
        to: src,
        mode: "Car",
        provider: "Private Cab Transfer",
        departureDate: endDate,
        departureTime: "03:00 PM",
        durationMinutes: dur,
        estimatedCost: baseFare,
        estimated: true,
        targetArrivalDate: endDate
      });
    } catch (e) {
      console.error("[aiService] Car resolution error:", e.message);
    }
  }

  // Diagnostic logging as requested by user
  console.log("[Transport Debug]", {
    mode,
    outbound: {
      departureDateTime: outboundLeg?.departureDateTime,
      arrivalDateTime: outboundLeg?.arrivalDateTime
    },
    return: {
      departureDateTime: returnLeg?.departureDateTime,
      arrivalDateTime: returnLeg?.arrivalDateTime
    }
  });

  return { outboundLeg, returnLeg };
};

/**
 * Ensures stay segments cover the exact trip dates and have realistic costs.
 */
/**
 * Ensures stay segments cover the exact destination occupancy dates and have realistic costs.
 * Strictly avoids duplicate stays, overlapping intervals, or charging for transit nights.
 */
const ensureStaySegments = (parsedData, tripData, outboundLeg, returnLeg) => {
  const travelers = parseInt(tripData.travelers, 10) || 1;
  const hotelType = tripData.hotelType || "Standard";
  const rooms = Math.max(1, Math.ceil(travelers / 2));

  // Stay check-in starts when travelers arrive in destination
  const expectedFirstCheckIn = (outboundLeg && outboundLeg.arrivalDate)
    ? outboundLeg.arrivalDate
    : tripData.startDate;

  // Stay check-out occurs when travelers depart destination for return
  const expectedLastCheckOut = (returnLeg && returnLeg.departureDate)
    ? returnLeg.departureDate
    : tripData.endDate;

  const checkInObj = new Date(expectedFirstCheckIn + (expectedFirstCheckIn.includes('T') ? '' : 'T00:00:00Z'));
  const checkOutObj = new Date(expectedLastCheckOut + (expectedLastCheckOut.includes('T') ? '' : 'T00:00:00Z'));
  const expectedHotelNights = Math.max(1, Math.round((checkOutObj - checkInObj) / (1000 * 60 * 60 * 24)));

  let baseRate = 3500;
  if (hotelType.toLowerCase() === "budget") baseRate = 1800;
  if (hotelType.toLowerCase() === "luxury") baseRate = 7500;

  if (tripData.tripCategory === "CAMPUS") {
    const students = parseInt(tripData.campusConfig?.expectedParticipants, 10) || travelers;
    const campusRooms = Math.max(1, Math.ceil(students / (parseInt(tripData.campusConfig?.studentsPerRoom, 10) || 2)));
    baseRate = calculateCampusGroupRoomRate(baseRate, campusRooms);
  }

  let stayCost = baseRate * rooms * expectedHotelNights;
  const userBudget = parseFloat(tripData.budget) || 0;
  if (userBudget > 0 && stayCost > userBudget * 0.45) {
    stayCost = Math.round(userBudget * 0.4);
  }

  // Deduplicate and validate Gemini stay segments
  let hasValidStays = false;
  if (Array.isArray(parsedData.staySegments) && parsedData.staySegments.length > 0) {
    const cleanStays = [];
    const seenIntervals = new Set();

    parsedData.staySegments.forEach(s => {
      if (!s.checkIn || !s.checkOut) return;
      const key = `${s.location}_${s.checkIn}_${s.checkOut}`.toLowerCase();
      if (seenIntervals.has(key)) return;
      seenIntervals.add(key);
      cleanStays.push(s);
    });

    let contiguous = true;
    let sumNights = 0;
    let prevOut = null;

    cleanStays.forEach((s, idx) => {
      const ci = new Date(s.checkIn + (s.checkIn.includes('T') ? '' : 'T00:00:00Z'));
      const co = new Date(s.checkOut + (s.checkOut.includes('T') ? '' : 'T00:00:00Z'));
      if (isNaN(ci.getTime()) || isNaN(co.getTime()) || ci >= co) {
        contiguous = false;
        return;
      }
      const n = Math.round((co - ci) / (1000 * 60 * 60 * 24));
      s.nights = n;
      sumNights += n;
      if (idx === 0 && s.checkIn !== expectedFirstCheckIn) contiguous = false;
      if (idx === cleanStays.length - 1 && s.checkOut !== expectedLastCheckOut) contiguous = false;
      if (prevOut && s.checkIn !== prevOut) contiguous = false;
      prevOut = s.checkOut;
    });

    if (contiguous && sumNights === expectedHotelNights) {
      hasValidStays = true;
      const perSegCost = Math.round(stayCost / cleanStays.length);
      cleanStays.forEach(s => {
        if (!s.estimatedCost) s.estimatedCost = perSegCost;
      });
      parsedData.staySegments = cleanStays;
    }
  }

  if (!hasValidStays) {
    parsedData.staySegments = [
      {
        id: "stay-1",
        location: tripData.destination,
        checkIn: expectedFirstCheckIn,
        checkOut: expectedLastCheckOut,
        nights: expectedHotelNights,
        accommodationType: hotelType,
        estimatedCost: stayCost,
        reason: `Central accommodation in ${tripData.destination}`
      }
    ];
  }
};

/**
 * Detects and repairs any residual overlap conflicts by shifting or removing overlapping items.
 */
const repairResidualConflicts = (data) => {
  const trip = { days: data.days, travelLegs: data.travelLegs, staySegments: data.staySegments, startDate: data.startDate };
  let conflicts = detectConflicts(trip).filter(c => c.type === "OVERLAP");
  let maxPasses = 8;

  while (conflicts.length > 0 && maxPasses > 0) {
    maxPasses--;
    for (const conflict of conflicts) {
      const day = data.days.find(d => d.day === conflict.affectedDay);
      if (!day || !Array.isArray(day.plan)) continue;

      const itemIdx = day.plan.findIndex(p => p.id === conflict.itemId);
      if (itemIdx === -1) continue;

      const item = day.plan[itemIdx];
      // Only remove flexible activities, never fixed transport or hotel events
      if (item.category !== "transport" && item.category !== "operational" && !item.trainNumber && !item.flightNumber) {
        day.plan.splice(itemIdx, 1);
      }
    }
    conflicts = detectConflicts(trip).filter(c => c.type === "OVERLAP");
  }
};

/**
 * Overhauls the day schedules into a deterministic, chronological timeline with zero overlaps.
 */
const buildDeterministicTimeline = (data, tripData, outboundLeg, returnLeg) => {
  if (!Array.isArray(data.days)) return;

  const tripStartObj = new Date(tripData.startDate + (tripData.startDate.includes('T') ? '' : 'T00:00:00Z'));

  data.days.forEach((day, dayIndex) => {
    if (!Array.isArray(day.plan)) day.plan = [];

    const dayNum = day.day || dayIndex + 1;
    const currentDayDate = new Date(tripStartObj.getTime() + dayIndex * 86400000).toISOString().split("T")[0];

    // Filter out pseudo hotel checkin/checkout activities generated by AI
    day.plan = day.plan.filter(p => {
      const act = (p.activity || p.name || "").toLowerCase();
      if ((act.includes("check-in") || act.includes("check in") || act.includes("check-out") || act.includes("checkout")) && p.id && !p.id.startsWith("sync-")) {
        return false;
      }
      return true;
    });

    const fixedTransport = day.plan.filter(p => p.category === "transport" || p.trainNumber || p.flightNumber || p.id?.includes("arrival"));
    const operational = day.plan.filter(p => p.category === "operational" && !p.id?.includes("arrival"));
    const flexible = day.plan.filter(p => p.category !== "transport" && p.category !== "operational" && !p.trainNumber && !p.flightNumber && !p.id?.includes("arrival"));

    let dayStartFloor = 8 * 60; // 08:00 AM
    let dayEndCap = 22 * 60 + 30; // 10:30 PM

    // If an outbound transport arrives on this day:
    if (outboundLeg && outboundLeg.arrivalDate === currentDayDate && outboundLeg.departureDate !== currentDayDate) {
      const arrM = timeToMinutes(outboundLeg.endTime) || 0;
      dayStartFloor = Math.max(dayStartFloor, arrM + 30); // 30m post-arrival
    }

    // If a return transport arrives on this day:
    if (returnLeg && returnLeg.arrivalDate === currentDayDate && returnLeg.departureDate !== currentDayDate) {
      const arrM = timeToMinutes(returnLeg.endTime) || 0;
      dayStartFloor = Math.max(dayStartFloor, arrM + 30);
    }

    // If an outbound transport departs on this day:
    if (outboundLeg && outboundLeg.departureDate === currentDayDate) {
      const depM = timeToMinutes(outboundLeg.startTime) || 8 * 60;
      if (depM < dayStartFloor) {
        dayStartFloor = Math.max(0, depM - 60);
      }
      dayEndCap = Math.min(dayEndCap, depM - 60);
    }

    // If a return transport departs on this day:
    if (returnLeg && returnLeg.departureDate === currentDayDate) {
      const depM = timeToMinutes(returnLeg.startTime) || 16 * 60;
      if (depM < dayStartFloor) {
        dayStartFloor = Math.max(0, depM - 90);
      }
      dayEndCap = Math.min(dayEndCap, depM - 60);
    }

    const scheduledItems = [];

    // Add fixed transport items with proper timestamps
    fixedTransport.forEach(t => {
      const sMin = timeToMinutes(t.startTime);
      const eMin = timeToMinutes(t.endTime);
      t.startTime = minutesToTimeStr(sMin);
      t.endTime = minutesToTimeStr(eMin);
      t.time = `${t.startTime} - ${t.endTime}`;
      t._absStart = (dayNum - 1) * 1440 + (sMin || 0);
      let absE = (dayNum - 1) * 1440 + (eMin || 0);
      if (t.isOvernight || (eMin !== null && sMin !== null && eMin < sMin)) {
        absE += 1440;
      }
      t._absEnd = absE;
      scheduledItems.push(t);
    });

    // Add operational check-in / check-out items
    operational.forEach(op => {
      let opStart = timeToMinutes(op.startTime) || 11 * 60;
      if (op.activity?.toLowerCase().includes("check-out") && returnLeg && returnLeg.departureDate === currentDayDate) {
        const retDepM = timeToMinutes(returnLeg.startTime) || 16 * 60;
        opStart = Math.min(opStart, retDepM - 45);
      }
      if (op.activity?.toLowerCase().includes("check-in") && outboundLeg && outboundLeg.arrivalDate === currentDayDate) {
        const outArrM = timeToMinutes(outboundLeg.endTime) || 12 * 60;
        opStart = Math.max(opStart, outArrM + 30);
      }
      op.startTime = minutesToTimeStr(opStart);
      op.endTime = minutesToTimeStr(opStart + 30);
      op.time = `${op.startTime} - ${op.endTime}`;
      op.duration = "30m";
      op._absStart = (dayNum - 1) * 1440 + opStart;
      op._absEnd = (dayNum - 1) * 1440 + opStart + 30;
      scheduledItems.push(op);
    });

    flexible.sort((a, b) => {
      const aStart = timeToMinutes(a.startTime || (a.time ? String(a.time).split("-")[0] : null)) || 0;
      const bStart = timeToMinutes(b.startTime || (b.time ? String(b.time).split("-")[0] : null)) || 0;
      return aStart - bStart;
    });

    let dayCursor = dayStartFloor;

    flexible.forEach(act => {
      let durationMins = 90;
      const nameLower = (act.activity || act.name || "").toLowerCase();
      if (nameLower.includes("lunch") || nameLower.includes("dinner") || nameLower.includes("breakfast")) {
        durationMins = 60;
      } else if (act.duration) {
        const durStr = String(act.duration).toLowerCase();
        let dm = 0;
        const hMatch = durStr.match(/(\d+)\s*h/);
        const mMatch = durStr.match(/(\d+)\s*m/);
        if (hMatch) dm += parseInt(hMatch[1], 10) * 60;
        if (mMatch) dm += parseInt(mMatch[1], 10);
        if (dm >= 30 && dm <= 240) durationMins = dm;
      }

      if (nameLower.includes("breakfast") && dayCursor < 8 * 60) dayCursor = 8 * 60;
      if (nameLower.includes("lunch") && dayCursor < 12 * 60 + 30) dayCursor = 12 * 60 + 30;
      if (nameLower.includes("dinner") && dayCursor < 19 * 60 + 30) dayCursor = 19 * 60 + 30;

      for (const s of scheduledItems) {
        const sStart = timeToMinutes(s.startTime);
        const sEnd = timeToMinutes(s.endTime);
        if (sStart !== null && sEnd !== null) {
          if (dayCursor + durationMins > sStart - 15 && dayCursor < sEnd + 15) {
            dayCursor = sEnd + 15;
          }
        }
      }

      if (dayCursor + durationMins <= dayEndCap) {
        const startM = dayCursor;
        const endM = startM + durationMins;
        act.startTime = minutesToTimeStr(startM);
        act.endTime = minutesToTimeStr(endM);
        act.time = `${act.startTime} - ${act.endTime}`;
        act.duration = `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`.replace("0h ", "");
        act._absStart = (dayNum - 1) * 1440 + startM;
        act._absEnd = (dayNum - 1) * 1440 + endM;
        scheduledItems.push(act);
        dayCursor = endM + 15;
      }
    });

    scheduledItems.sort((a, b) => {
      const aStart = timeToMinutes(a.startTime) || 0;
      const bStart = timeToMinutes(b.startTime) || 0;
      return aStart - bStart;
    });

    day.plan = scheduledItems;
  });

  repairResidualConflicts(data);
};

/**
 * Ensures user interests are reflected in the generated activities.
 */
const ensureInterestAlignment = (data, tripData) => {
  const userInterests = Array.isArray(tripData.interests) ? tripData.interests.map(i => i.toLowerCase()) : [];
  if (userInterests.length === 0 || !Array.isArray(data.days)) return;

  let matched = 0;
  data.days.forEach(day => {
    (day.plan || []).forEach(p => {
      const str = `${p.activity || ""} ${p.category || ""} ${p.notes || ""}`.toLowerCase();
      if (userInterests.some(interest => str.includes(interest))) {
        matched++;
      }
    });
  });

  if (matched === 0) {
    const primaryInterest = tripData.interests[0];
    data.days.forEach(day => {
      const flexible = (day.plan || []).find(p => p.category !== "transport" && p.category !== "operational");
      if (flexible) {
        flexible.notes = `${flexible.notes ? flexible.notes + " - " : ""}${primaryInterest} experience`;
      }
    });
  }
};

/**
 * Calculates accurate budget breakdown covering transport, stays, food, activities, and misc.
 */
const recalculateBudgetBreakdown = (data, tripData) => {
  const userBudget = parseFloat(tripData.budget) || 0;

  let totalTransport = 0;
  if (Array.isArray(data.travelLegs)) {
    data.travelLegs.forEach(l => {
      totalTransport += parseFloat(l.estimatedCost) || 0;
    });
  }

  let totalStay = 0;
  if (Array.isArray(data.staySegments)) {
    data.staySegments.forEach(s => {
      totalStay += parseFloat(s.estimatedCost) || 0;
    });
  }

  let totalActivities = 0;
  let totalFood = 0;

  if (Array.isArray(data.days)) {
    data.days.forEach(day => {
      (day.plan || []).forEach(p => {
        const cost = parseFloat(p.estimatedCost) || 0;
        const nameLower = (p.activity || p.name || "").toLowerCase();
        if (p.category === "transport" || p.trainNumber || p.flightNumber) {
          // accounted in totalTransport
        } else if (p.category === "operational") {
          // operational events cost 0
        } else if (nameLower.includes("breakfast") || nameLower.includes("lunch") || nameLower.includes("dinner")) {
          totalFood += cost;
        } else {
          totalActivities += cost;
        }
      });
    });
  }

  let remainingBudget = Math.max(0, userBudget - totalTransport - totalStay);
  if (totalFood === 0 && remainingBudget > 0) {
    totalFood = Math.round(remainingBudget * 0.45);
  }
  if (totalActivities === 0 && remainingBudget > 0) {
    totalActivities = Math.round(remainingBudget * 0.45);
  }
  let totalMisc = Math.max(0, Math.round(remainingBudget * 0.1));

  let totalEstimated = totalTransport + totalStay + totalFood + totalActivities + totalMisc;

  if (userBudget > 0 && totalEstimated > userBudget) {
    const fixedCost = totalTransport + totalStay;
    if (fixedCost < userBudget) {
      const allowedFlexible = (userBudget - fixedCost) * 0.9;
      const flexRatio = allowedFlexible / (totalFood + totalActivities + totalMisc || 1);
      totalFood = Math.round(totalFood * flexRatio);
      totalActivities = Math.round(totalActivities * flexRatio);
      totalMisc = Math.round(totalMisc * flexRatio);
      totalEstimated = fixedCost + totalFood + totalActivities + totalMisc;

      if (Array.isArray(data.days)) {
        data.days.forEach(day => {
          (day.plan || []).forEach(p => {
            if (p.category !== "transport" && p.category !== "operational") {
              const current = parseFloat(p.estimatedCost) || 0;
              p.estimatedCost = String(Math.round(current * flexRatio));
            }
          });
        });
      }
    }
  }

  data.budgetBreakdown = {
    travel: `₹${Math.round(totalTransport).toLocaleString('en-IN')}`,
    stay: `₹${Math.round(totalStay).toLocaleString('en-IN')}`,
    food: `₹${Math.round(totalFood).toLocaleString('en-IN')}`,
    misc: `₹${Math.round(totalMisc).toLocaleString('en-IN')}`,
    transport: `₹${Math.round(totalTransport).toLocaleString('en-IN')}`,
    accommodation: `₹${Math.round(totalStay).toLocaleString('en-IN')}`,
    activities: `₹${Math.round(totalActivities).toLocaleString('en-IN')}`,
    total: `₹${Math.round(totalEstimated).toLocaleString('en-IN')}`
  };
};

const generateTripPlan = async (tripData) => {
  const model = getModel();

  let numDays = 5;
  if (tripData.startDate && tripData.endDate) {
    const start = new Date(tripData.startDate);
    const end = new Date(tripData.endDate);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      numDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }
  }

  // Authoritative Intercity Transport Resolver
  const { outboundLeg, returnLeg } = await resolveIntercityTransport(tripData);

  const outboundStr = outboundLeg
    ? `${outboundLeg.mode} (${outboundLeg.trainNumber || outboundLeg.flightNumber || outboundLeg.provider || "Direct"}): Departs ${outboundLeg.from} at ${outboundLeg.startTime}, Arrives ${outboundLeg.to} at ${outboundLeg.endTime}. Est. Cost: ₹${outboundLeg.estimatedCost}`
    : `Standard ${tripData.travelMode} from ${tripData.source} to ${tripData.destination}`;

  const returnStr = returnLeg
    ? `${returnLeg.mode} (${returnLeg.trainNumber || returnLeg.flightNumber || returnLeg.provider || "Direct"}): Departs ${returnLeg.from} at ${returnLeg.startTime}, Arrives ${returnLeg.to} at ${returnLeg.endTime}. Est. Cost: ₹${returnLeg.estimatedCost}`
    : `Standard ${tripData.travelMode} from ${tripData.destination} to ${tripData.source}`;

  const expectedFirstCheckIn = (outboundLeg && outboundLeg.arrivalDate)
    ? outboundLeg.arrivalDate
    : tripData.startDate;

  const expectedLastCheckOut = (returnLeg && returnLeg.departureDate)
    ? returnLeg.departureDate
    : tripData.endDate;

  const checkInObj = new Date(expectedFirstCheckIn + (expectedFirstCheckIn.includes('T') ? '' : 'T00:00:00Z'));
  const checkOutObj = new Date(expectedLastCheckOut + (expectedLastCheckOut.includes('T') ? '' : 'T00:00:00Z'));
  const expectedHotelNights = Math.max(1, Math.round((checkOutObj - checkInObj) / (1000 * 60 * 60 * 24)));

  const feasibleTransportString = `
OUTBOUND INTERCITY TRANSPORT (${tripData.source} → ${tripData.destination}):
- Departs: ${outboundLeg ? outboundLeg.departureDate : tripData.startDate} at ${outboundLeg?.startTime || '08:00 AM'}
- Arrives: ${outboundLeg ? outboundLeg.arrivalDate : tripData.startDate} at ${outboundLeg?.endTime || '12:00 PM'}
- Details: ${outboundStr}

RETURN INTERCITY TRANSPORT (${tripData.destination} → ${tripData.source}):
- Departs: ${returnLeg ? returnLeg.departureDate : tripData.endDate} at ${returnLeg?.startTime || '04:30 PM'}
- Arrives: ${returnLeg ? returnLeg.arrivalDate : tripData.endDate} at ${returnLeg?.endTime || '10:00 PM'}
- Details: ${returnStr}
`;

  const basePrompt = `
You are an expert travel planner acting as a strict financial and geographic planner.

Trip Details:
Source: ${tripData.source}
Destination: ${tripData.destination}
Start Date: ${tripData.startDate}
End Date: ${tripData.endDate}
Travelers: ${tripData.travelers}
Total Budget: ${tripData.budget} ${tripData.currency} (This is a STRICT constraint for ALL travelers combined)
Preferred Travel Mode: ${tripData.travelMode}
Hotel Type: ${tripData.hotelType}
Food Preference: ${tripData.foodPreference}
Trip Type: ${tripData.tripType}
Interests: ${tripData.interests.join(", ")}
Number of Days: ${numDays}
${tripData.tripCategory === "CAMPUS" && tripData.campusConfig ? `
--- CAMPUS TRIP REQUIREMENTS ---
Expected Participants: ${tripData.campusConfig.expectedParticipants}
Per-Student Budget: ${tripData.campusConfig.budgetPerStudent} ${tripData.currency}
Total Group Budget (Strict): ${tripData.campusConfig.budgetPerStudent * tripData.campusConfig.expectedParticipants} ${tripData.currency}

EDUCATIONAL/INDUSTRY VISITS REQUIRED:
${tripData.campusConfig.educationalRequirements.map(req => `- ${req.institutionName} (Type: ${req.institutionType}) ${req.notes ? `Notes: ${req.notes}` : ''}`).join("\n")}

IMPORTANT CAMPUS RULES:
- You MUST include the above educational/industry visits as PROPOSED activities in the itinerary. Do NOT claim they are confirmed bookings.
- Distribute the educational visits logically during the core days of the itinerary.
- The "Total Budget" for the trip is the "Total Group Budget" calculated above.
--------------------------------
` : ''}
FEASIBLE TRANSPORT CANDIDATES:
${feasibleTransportString}

Your task is to plan a robust itinerary using the following strict scheduling order:
STEP 1: Stay segments: Central accommodation in ${tripData.destination} from ${expectedFirstCheckIn} to ${expectedLastCheckOut} (${expectedHotelNights} nights).
STEP 2: Use the FEASIBLE TRANSPORT CANDIDATES above for Outbound and Return.
STEP 3: Assign feasible, chronological daily activities:
- Outbound travel departs ${outboundLeg?.departureDate || tripData.startDate} at ${outboundLeg?.startTime || '08:00 AM'}.
- Destination activities can only take place during destination occupancy (${expectedFirstCheckIn} to ${expectedLastCheckOut}).
- Return travel departs ${returnLeg?.departureDate || tripData.endDate} at ${returnLeg?.startTime || '04:30 PM'}.

RULES:
1. Stay Segments MUST perfectly cover destination occupancy: ${expectedFirstCheckIn} to ${expectedLastCheckOut} (${expectedHotelNights} nights). No overlaps.
2. Transport constraints: Leave at least a 60-minute pre-departure buffer and a 30-minute post-arrival buffer for transport legs.
3. Hotel constraints: Leave at least a 30-minute buffer for hotel checkout.
4. TIMING PREFERENCES:
   - Breakfast: ~08:00 AM - 09:30 AM.
   - Lunch: ~12:30 PM - 02:00 PM.
   - Dinner: ~07:30 PM - 09:30 PM.
   - Normal activities should end by 10:00 PM. Avoid clumping activities late at night.
5. PRESERVE DURATIONS: Respect transport and fixed-event constraints absolutely.
6. Total estimated cost MUST NOT exceed budget. Provide pure numbers for "estimatedCost" (no currency symbols).
7. TRANSPORT MODE IS A HARD USER CONSTRAINT:
   The user has explicitly chosen: ${String(tripData.travelMode).toUpperCase()}.
   Outbound intercity transport MUST be ${String(tripData.travelMode).toUpperCase()}.
   Return intercity transport MUST be ${String(tripData.travelMode).toUpperCase()}.
   Do NOT substitute another mode.
8. INTEREST ALIGNMENT:
   You MUST align activities with user interests (${tripData.interests.join(", ")}). Mention them in activity names or notes.

Return ONLY this EXACT JSON structure, do NOT use markdown or backticks:

{
  "summary": "Brief summary of the trip",
  "staySegments": [
    {
      "id": "stay-1",
      "location": "${tripData.destination}",
      "checkIn": "${expectedFirstCheckIn}",
      "checkOut": "${expectedLastCheckOut}",
      "nights": ${expectedHotelNights},
      "reason": "Base stay in ${tripData.destination}"
    }
  ],
  "travelLegs": [
    {
      "from": "${tripData.source}",
      "to": "${tripData.destination}",
      "date": "${outboundLeg?.departureDate || tripData.startDate}",
      "startTime": "${outboundLeg?.startTime || '08:00 AM'}",
      "endTime": "${outboundLeg?.endTime || '12:00 PM'}",
      "durationMinutes": ${outboundLeg?.durationMinutes || 240},
      "mode": "${outboundLeg?.mode || tripData.travelMode}",
      "estimated": true
    },
    {
      "from": "${tripData.destination}",
      "to": "${tripData.source}",
      "date": "${returnLeg?.departureDate || tripData.endDate}",
      "startTime": "${returnLeg?.startTime || '04:30 PM'}",
      "endTime": "${returnLeg?.endTime || '10:00 PM'}",
      "durationMinutes": ${returnLeg?.durationMinutes || 240},
      "mode": "${returnLeg?.mode || tripData.travelMode}",
      "estimated": true
    }
  ],
  "days": [
    {
      "day": 1,
      "title": "Day title",
      "plan": [
        {
          "time": "09:00 AM - 11:00 AM",
          "place": "Location",
          "activity": "Activity Name",
          "notes": "Notes",
          "duration": "2 hours",
          "estimatedCost": "1000",
          "category": "activity"
        }
      ]
    }
  ],
  "budgetBreakdown": {
    "travel": "",
    "stay": "",
    "food": "",
    "misc": ""
  },
  "tips": []
}
`;

  let currentPrompt = basePrompt;
  let parsedData = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    let result;
    try {
      result = await model.generateContent(currentPrompt);
    } catch (err) {
      if (err.message && (err.message.includes("503") || err.message.includes("429"))) {
        if (attempt < 3) {
          const delay = err.message.includes("429") ? 10000 : 2000;
          console.log(`[aiService] Gemini rate limit/capacity retry ${attempt} in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        } else {
          throw new Error("Gemini AI is currently experiencing high demand or rate limits. Please try again in a few moments.");
        }
      }
      throw err;
    }

    let text = result.response.text().trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
    }

    try {
      parsedData = JSON.parse(text);

      // 1. Authoritative Travel Legs Assignment
      parsedData.travelLegs = [outboundLeg, returnLeg].filter(Boolean);

      // 2. Authoritative Stay Segments Assignment
      ensureStaySegments(parsedData, tripData, outboundLeg, returnLeg);

      // 3. Inject authoritative Outbound and Return transport into day plans
      if (Array.isArray(parsedData.days) && parsedData.days.length > 0) {
        const tripStartObj = new Date(tripData.startDate + (tripData.startDate.includes('T') ? '' : 'T00:00:00Z'));

        // Clean existing transport from all days
        parsedData.days.forEach(d => {
          if (Array.isArray(d.plan)) {
            d.plan = d.plan.filter(p => p.category !== "transport" && !p.trainNumber && !p.flightNumber && !p.id?.startsWith("sync-"));
          }
        });

        // Inject Outbound Transport
        if (outboundLeg) {
          const outDateObj = new Date(outboundLeg.departureDate + 'T00:00:00Z');
          const outDayIdx = Math.max(0, Math.min(parsedData.days.length - 1, Math.round((outDateObj - tripStartObj) / 86400000)));
          const outDay = parsedData.days[outDayIdx];
          if (outDay && Array.isArray(outDay.plan)) {
            outDay.plan.unshift({
              id: `itin_outbound_${crypto.randomUUID()}`,
              time: `${outboundLeg.startTime} - ${outboundLeg.endTime}`,
              startTime: outboundLeg.startTime,
              endTime: outboundLeg.endTime,
              departureDate: outboundLeg.departureDate,
              departureTime: outboundLeg.departureTime,
              departureDateTime: outboundLeg.departureDateTime,
              arrivalDate: outboundLeg.arrivalDate,
              arrivalTime: outboundLeg.arrivalTime,
              arrivalDateTime: outboundLeg.arrivalDateTime,
              isOvernight: outboundLeg.isOvernight,
              activity: `${outboundLeg.mode} to ${tripData.destination}`,
              place: outboundLeg.from,
              to: outboundLeg.to,
              mode: outboundLeg.mode,
              trainNumber: outboundLeg.trainNumber,
              trainName: outboundLeg.trainName,
              flightNumber: outboundLeg.flightNumber,
              airline: outboundLeg.airline,
              estimatedCost: String(outboundLeg.estimatedCost || 0),
              category: "transport"
            });
          }
        }

        // Inject Hotel Check-in on check-in day
        const firstStay = parsedData.staySegments[0];
        if (firstStay) {
          const checkInDateObj = new Date(firstStay.checkIn + 'T00:00:00Z');
          const checkInDayIdx = Math.max(0, Math.min(parsedData.days.length - 1, Math.round((checkInDateObj - tripStartObj) / 86400000)));
          const checkInDay = parsedData.days[checkInDayIdx];

          if (checkInDay && Array.isArray(checkInDay.plan)) {
            let checkInMin = 14 * 60; // 02:00 PM default
            if (outboundLeg && outboundLeg.arrivalDate === firstStay.checkIn) {
              const arrMin = timeToMinutes(outboundLeg.endTime) || 0;
              if (arrMin < 12 * 60 && arrMin >= 6 * 60) {
                checkInMin = Math.max(10 * 60, arrMin + 60);
              } else if (arrMin < 6 * 60) {
                checkInMin = 14 * 60;
              } else {
                checkInMin = Math.max(14 * 60, arrMin + 45);
              }
            }

            checkInDay.plan.push({
              id: `sync-checkin-stay-1`,
              time: `${minutesToTimeStr(checkInMin)} - ${minutesToTimeStr(checkInMin + 30)}`,
              startTime: minutesToTimeStr(checkInMin),
              endTime: minutesToTimeStr(checkInMin + 30),
              activity: "Hotel Check-in",
              place: firstStay.location || tripData.destination,
              category: "operational",
              duration: "30m",
              estimatedCost: "0"
            });
          }
        }

        // Inject Hotel Check-out on check-out day
        const lastStay = parsedData.staySegments[parsedData.staySegments.length - 1];
        if (lastStay) {
          const checkOutDateObj = new Date(lastStay.checkOut + 'T00:00:00Z');
          const checkOutDayIdx = Math.max(0, Math.min(parsedData.days.length - 1, Math.round((checkOutDateObj - tripStartObj) / 86400000)));
          const checkOutDay = parsedData.days[checkOutDayIdx];

          if (checkOutDay && Array.isArray(checkOutDay.plan)) {
            let checkOutMin = 11 * 60; // 11:00 AM default
            if (returnLeg && returnLeg.departureDate === lastStay.checkOut) {
              const retStartMin = timeToMinutes(returnLeg.startTime) || 16 * 60;
              checkOutMin = Math.min(11 * 60, retStartMin - 60);
            }

            checkOutDay.plan.unshift({
              id: `sync-checkout-stay-1`,
              time: `${minutesToTimeStr(checkOutMin)} - ${minutesToTimeStr(checkOutMin + 30)}`,
              startTime: minutesToTimeStr(checkOutMin),
              endTime: minutesToTimeStr(checkOutMin + 30),
              activity: "Hotel Check-out",
              place: lastStay.location || tripData.destination,
              category: "operational",
              duration: "30m",
              estimatedCost: "0"
            });
          }
        }

        // Inject Return Transport
        if (returnLeg) {
          const retDateObj = new Date(returnLeg.departureDate + 'T00:00:00Z');
          const retDayIdx = Math.max(0, Math.min(parsedData.days.length - 1, Math.round((retDateObj - tripStartObj) / 86400000)));
          const retDay = parsedData.days[retDayIdx];

          if (retDay && Array.isArray(retDay.plan)) {
            retDay.plan.push({
              id: `itin_return_${crypto.randomUUID()}`,
              time: `${returnLeg.startTime} - ${returnLeg.endTime}`,
              startTime: returnLeg.startTime,
              endTime: returnLeg.endTime,
              departureDate: returnLeg.departureDate,
              departureTime: returnLeg.departureTime,
              departureDateTime: returnLeg.departureDateTime,
              arrivalDate: returnLeg.arrivalDate,
              arrivalTime: returnLeg.arrivalTime,
              arrivalDateTime: returnLeg.arrivalDateTime,
              isOvernight: returnLeg.isOvernight,
              activity: `${returnLeg.mode} to ${tripData.source}`,
              place: returnLeg.from,
              to: returnLeg.to,
              mode: returnLeg.mode,
              trainNumber: returnLeg.trainNumber,
              trainName: returnLeg.trainName,
              flightNumber: returnLeg.flightNumber,
              airline: returnLeg.airline,
              estimatedCost: String(returnLeg.estimatedCost || 0),
              category: "transport"
            });
          }

          // If return leg is overnight and arrives on a subsequent day (e.g. Day 7), inject conclusion on arrival day
          if (returnLeg.isOvernight) {
            const arrDateObj = new Date(returnLeg.arrivalDate + 'T00:00:00Z');
            const arrDayIdx = Math.max(0, Math.min(parsedData.days.length - 1, Math.round((arrDateObj - tripStartObj) / 86400000)));
            if (arrDayIdx > retDayIdx) {
              const arrDay = parsedData.days[arrDayIdx];
              if (arrDay && Array.isArray(arrDay.plan)) {
                const arrEndM = timeToMinutes(returnLeg.endTime) || 10 * 60;
                arrDay.plan.unshift({
                  id: `itin_arrival_${crypto.randomUUID()}`,
                  time: `${returnLeg.endTime} - ${minutesToTimeStr(arrEndM + 30)}`,
                  startTime: returnLeg.endTime,
                  endTime: minutesToTimeStr(arrEndM + 30),
                  activity: `Arrive in ${tripData.source} (Trip Concludes)`,
                  place: returnLeg.to,
                  category: "operational",
                  duration: "30m",
                  estimatedCost: "0"
                });
              }
            }
          }
        }
      }

      // 4. Deterministic Timeline Normalization & Conflict Elimination
      buildDeterministicTimeline(parsedData, tripData, outboundLeg, returnLeg);

      // 5. Interest Alignment Guarantee
      ensureInterestAlignment(parsedData, tripData);

      // 6. Accurate Budget Recalculation
      recalculateBudgetBreakdown(parsedData, tripData);

      // 7. Validation Safety Net
      const validationResult = validateItinerary(parsedData, tripData);

      if (validationResult.valid) {
        parsedData.validation = validationResult;
        return parsedData;
      }

      console.log(
        `[Attempt ${attempt}] Validation errors:\n` +
        validationResult.errors
          .map(e => `- ${e.type}: ${e.message}`)
          .join("\n")
      );

      const errorMessages = validationResult.errors.map(e => `- ${e.type}: ${e.message}`).join("\n");
      currentPrompt = basePrompt + `\n\nYOUR PREVIOUS ATTEMPT FAILED VALIDATION WITH THESE ERRORS:\n${errorMessages}\n\nPlease carefully correct these specific errors while preserving the user's dates, interests, and traveler count. Return the full corrected JSON.`;
    } catch (err) {
      console.log(`[Attempt ${attempt}] AI returned invalid JSON:`, text);
      currentPrompt = basePrompt + "\n\nYOUR PREVIOUS ATTEMPT RETURNED INVALID/MALFORMED JSON. Please ensure your response is strictly valid JSON.";
    }
  }

  return {
    summary: "Could not generate a valid, conflict-free itinerary. Please try adjusting your constraints or increasing your budget.",
    staySegments: [],
    travelLegs: [],
    days: [],
    budgetBreakdown: {},
    validation: {
      valid: false,
      errors: [{ type: "GENERATION_FAILED", day: null, message: "AI repeatedly failed to generate a valid, conflict-free itinerary after 3 attempts." }],
      warnings: []
    }
  };
};

const regenerateTripDay = async (trip, day) => {
  const model = getModel();
  const prompt = `
Return ONLY valid JSON.

Regenerate ONLY Day ${day}.

Destination: ${trip.destination}

Trip Type: ${trip.tripType}

Budget: ${trip.budget}

Travel Mode: ${trip.travelMode}

Keep every other day unchanged.

Return

{
 "day": ${day},
 "title":"",
 "plan":[
   {
      "time":"",
      "place":"",
      "activity":"",
      "notes":"",
      "duration":"",
      "estimatedCost":""
   }
 ]
}
`;

  let result;

  for (let i = 0; i < 3; i++) {
    try {
      result = await model.generateContent(prompt);
      break;
    } catch (err) {
      if (err.message.includes("503")) {
        if (i < 2) {
          console.log(`Retry ${i + 1}...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        } else {
          throw new Error("Gemini AI is currently experiencing high demand and is temporarily unavailable. Please try again later.");
        }
      }
      throw err;
    }
  }
  let text = result.response.text();

  text = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(text);
  } catch (err) {
    console.log("❌ Regenerate AI Output:\n", text);
    throw new Error("Invalid JSON returned while regenerating day.");
  }
};

const syncItineraryWithStayPlan = async (trip, newStaySegments) => {
  if (!Array.isArray(newStaySegments) || newStaySegments.length === 0) {
    throw new Error("Cannot synchronize itinerary: Stay Plan has no segments.");
  }

  const oldItinerary = trip.itinerary || [];

  const parseIsoDate = (dStr) => {
    if (!dStr) return null;
    if (dStr instanceof Date) return dStr;
    const s = String(dStr).split("T")[0];
    return new Date(`${s}T00:00:00Z`);
  };

  const tripStart = parseIsoDate(trip.startDate);
  const tripEnd = parseIsoDate(trip.endDate);
  if (!tripStart || isNaN(tripStart.getTime()) || !tripEnd || isNaN(tripEnd.getTime())) {
    throw new Error("Invalid trip startDate or endDate.");
  }

  const expectedDays = Math.max(1, Math.round((tripEnd.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  // 1. Identify overnight transit nights from old itinerary
  const transitNights = new Set();
  for (let d = 1; d <= expectedDays; d++) {
    const oldDayData = oldItinerary[d - 1];
    if (oldDayData && Array.isArray(oldDayData.plan)) {
      for (const item of oldDayData.plan) {
        const cat = String(item.category || "").toLowerCase();
        if (cat.includes("transport") || item.trainNumber || item.flightNumber) {
          const tStart = timeToMinutes(item.startTime || (item.time ? String(item.time).split("-")[0] : null));
          const tEnd = timeToMinutes(item.endTime || (item.time ? String(item.time).split("-")[1] : null));
          if (tStart !== null && tEnd !== null && tEnd < tStart) {
            transitNights.add(d);
            break;
          }
        }
      }
    }
  }

  // 2. Canonicalize segments: assign sequential checkIn / checkOut dates
  const canonicalSegments = [];
  let currDate = new Date(tripStart);
  let dayIdx = 1;

  for (let i = 0; i < newStaySegments.length; i++) {
    const rawSeg = newStaySegments[i];
    const nights = Math.max(1, parseInt(rawSeg.nights, 10) || 1);
    const location = String(rawSeg.location || trip.destination || "Destination").trim();
    const segId = rawSeg.id || `stay-${crypto.randomUUID()}`;

    // Skip transit nights before checkIn
    while (transitNights.has(dayIdx) && dayIdx < expectedDays) {
      currDate.setUTCDate(currDate.getUTCDate() + 1);
      dayIdx++;
    }

    const checkIn = currDate.toISOString().split("T")[0];
    let remaining = nights;
    while (remaining > 0 && dayIdx < expectedDays) {
      currDate.setUTCDate(currDate.getUTCDate() + 1);
      if (!transitNights.has(dayIdx)) {
        remaining--;
      }
      dayIdx++;
    }
    const checkOut = currDate.toISOString().split("T")[0];

    canonicalSegments.push({
      ...rawSeg,
      id: segId,
      location,
      nights,
      checkIn,
      checkOut,
      selectedHotel: rawSeg.selectedHotel || null,
    });
  }

  // 3. Map each night (1 .. expectedDays - 1) to its assigned segment
  const nightToSegment = {};
  for (let d = 1; d < expectedDays; d++) {
    if (transitNights.has(d)) {
      nightToSegment[d] = null;
      continue;
    }
    const overnightDate = new Date(tripStart);
    overnightDate.setUTCDate(tripStart.getUTCDate() + (d - 1));
    const overnightIso = overnightDate.toISOString().split("T")[0];

    const matchSeg = canonicalSegments.find(s => overnightIso >= s.checkIn && overnightIso < s.checkOut);
    nightToSegment[d] = matchSeg || null;
  }

  // 4. Determine old day locations
  const oldDayLocations = {};
  for (let d = 1; d <= expectedDays; d++) {
    const overnightDate = new Date(tripStart);
    overnightDate.setUTCDate(tripStart.getUTCDate() + (d - 1));
    const overnightIso = overnightDate.toISOString().split("T")[0];

    let oldLoc = null;
    for (const seg of (trip.staySegments || [])) {
      if (seg.checkIn && seg.checkOut) {
        if (overnightIso >= seg.checkIn && overnightIso < seg.checkOut) {
          oldLoc = seg.location;
          break;
        }
      }
    }
    if (!oldLoc && oldItinerary[d - 1]?.title) {
      const match = oldItinerary[d - 1].title.match(/in\s+([A-Za-z\s]+)/i);
      if (match) oldLoc = match[1].trim();
    }
    oldDayLocations[d] = oldLoc || (d === expectedDays ? (oldDayLocations[d - 1] || trip.destination) : trip.destination);
  }

  // 5. Build robust Day Metadata for all days (1 .. expectedDays)
  const dayMeta = {};
  for (let d = 1; d <= expectedDays; d++) {
    const isDeparture = (d === expectedDays);
    const isTransit = transitNights.has(d);
    const staySegForNight = isDeparture ? null : nightToSegment[d];
    const prevNightStay = (d > 1) ? nightToSegment[d - 1] : null;

    let dayLocation = trip.destination;
    if (staySegForNight) {
      dayLocation = staySegForNight.location;
    } else if (prevNightStay) {
      dayLocation = prevNightStay.location;
    }

    dayMeta[d] = {
      dayNum: d,
      isDeparture,
      isTransit,
      staySegForNight,
      prevNightStay,
      location: dayLocation,
    };
  }

  // 6. Compare previous Stay Plan and new Stay Plan to classify the change
  const oldStaySegments = trip.staySegments || [];
  const oldLocations = oldStaySegments.map(s => String(s.location || "").toLowerCase().trim()).filter(Boolean);
  const newLocations = canonicalSegments.map(s => String(s.location || "").toLowerCase().trim()).filter(Boolean);

  const uniqueOldLocations = new Set(oldLocations);
  for (let d = 1; d <= expectedDays; d++) {
    if (oldDayLocations[d]) {
      uniqueOldLocations.add(String(oldDayLocations[d]).toLowerCase().trim());
    }
  }

  const uniqueNewLocations = new Set(newLocations);
  const newDestinations = [...uniqueNewLocations].filter(loc => !uniqueOldLocations.has(loc));
  const removedDestinations = [...uniqueOldLocations].filter(loc => !uniqueNewLocations.has(loc));

  const isSameCount = oldStaySegments.length === canonicalSegments.length;
  const isSameOrder = isSameCount && oldLocations.every((loc, i) => loc === newLocations[i]);
  const isSameNights = isSameCount && oldStaySegments.every((s, i) => parseInt(s.nights || 1, 10) === parseInt(canonicalSegments[i].nights || 1, 10));
  const isSameHotels = isSameCount && oldStaySegments.every((s, i) => {
    const hOld = s.selectedHotel?.id || s.selectedHotel?._id || s.selectedHotel?.name || null;
    const hNew = canonicalSegments[i].selectedHotel?.id || canonicalSegments[i].selectedHotel?._id || canonicalSegments[i].selectedHotel?.name || null;
    return hOld === hNew;
  });
  const sameLocationsSet = newDestinations.length === 0 && removedDestinations.length === 0;

  let changeType = "MIXED_CHANGE";
  if (isSameCount && isSameOrder && isSameNights && isSameHotels) {
    changeType = "NO_CHANGE";
  } else if (isSameCount && isSameOrder && isSameNights && !isSameHotels) {
    changeType = "HOTEL_ONLY";
  } else if (sameLocationsSet && isSameCount && !isSameOrder && isSameNights) {
    changeType = "ORDER_ONLY";
  } else if (sameLocationsSet && isSameCount && isSameOrder && !isSameNights) {
    changeType = "NIGHT_DURATION_CHANGE";
  } else if (sameLocationsSet && (!isSameOrder || !isSameNights)) {
    changeType = "ORDER_AND_NIGHTS_CHANGE";
  } else if (newDestinations.length > 0 && removedDestinations.length === 0) {
    changeType = "ADDITION_OF_NEW_DESTINATION";
  } else if (newDestinations.length === 0 && removedDestinations.length > 0) {
    changeType = "REMOVAL_OF_DESTINATION";
  } else if (newDestinations.length > 0 && removedDestinations.length > 0) {
    changeType = "DESTINATION_CHANGE";
  }

  // Helper to extract clean core activities from a day's plan
  const extractCorePlan = (plan) => {
    if (!Array.isArray(plan)) return [];
    return plan.filter(p => {
      const cat = String(p.category || "").toLowerCase();
      const act = String(p.activity || "").toLowerCase();
      const isHotelOp = cat === "operational" || act.includes("check-in") || act.includes("check out");
      const isIntercityTravel = (cat === "transport" || p.trainNumber || p.flightNumber) &&
        (act.includes("travel:") || act.includes("return:") || act.includes("transfer to") || act.includes("travel to") || act.includes("airport"));
      return !isHotelOp && !isIntercityTravel;
    });
  };

  // Map old nights to old segments
  const nightToOldSegment = {};
  for (let d = 1; d < expectedDays; d++) {
    if (transitNights.has(d)) continue;
    const overnightDate = new Date(tripStart);
    overnightDate.setUTCDate(tripStart.getUTCDate() + (d - 1));
    const overnightIso = overnightDate.toISOString().split("T")[0];
    const matchOld = oldStaySegments.find(s => overnightIso >= s.checkIn && overnightIso < s.checkOut);
    if (matchOld) nightToOldSegment[d] = matchOld;
  }

  // Pools of available existing day plans
  const poolBySegmentId = {};
  const poolByLocation = {};

  for (let d = 1; d < expectedDays; d++) {
    if (transitNights.has(d)) continue;
    const oldDayData = oldItinerary[d - 1];
    const corePlan = extractCorePlan(oldDayData?.plan);
    const dayTitle = oldDayData?.title || `Day in ${oldDayLocations[d]}`;
    const oldSeg = nightToOldSegment[d];
    const locLower = String(oldDayLocations[d] || (oldSeg?.location) || "").toLowerCase().trim();

    const dayObj = {
      title: dayTitle,
      plan: corePlan,
      location: locLower,
      originalDayNum: d
    };

    if (oldSeg && oldSeg.id) {
      if (!poolBySegmentId[oldSeg.id]) poolBySegmentId[oldSeg.id] = [];
      poolBySegmentId[oldSeg.id].push(dayObj);
    }
    if (locLower) {
      if (!poolByLocation[locLower]) poolByLocation[locLower] = [];
      poolByLocation[locLower].push(dayObj);
    }
  }

  // Old departure day
  const oldDepartureDayData = oldItinerary[expectedDays - 1];
  const oldDepartureCorePlan = extractCorePlan(oldDepartureDayData?.plan);

  // 7. Map existing activities deterministically or identify dirty days
  const newItineraryDays = [];
  const dirtyDays = [];
  const usedPooledDays = new Set();

  for (let d = 1; d <= expectedDays; d++) {
    const meta = dayMeta[d];

    if (meta.isDeparture) {
      // Departure day: preserve activities, strip old checkouts/checkins/transports
      newItineraryDays.push({
        day: d,
        title: oldDepartureDayData?.title || `Day ${d} - Departure from ${meta.location}`,
        plan: oldDepartureCorePlan.length > 0 ? [...oldDepartureCorePlan] : []
      });
      continue;
    }

    if (meta.isTransit) {
      const oldDayData = oldItinerary[d - 1];
      newItineraryDays.push(oldDayData ? { day: d, title: oldDayData.title, plan: oldDayData.plan || [] } : { day: d, title: `Day ${d} - Transit`, plan: [] });
      continue;
    }

    // For regular stay days:
    const seg = meta.staySegForNight;
    const targetLoc = (meta.location || "").toLowerCase().trim();

    let matchedDayObj = null;

    // For HOTEL_ONLY or NO_CHANGE, keep day d aligned directly if location matches
    if (changeType === "HOTEL_ONLY" || changeType === "NO_CHANGE") {
      const oldDayData = oldItinerary[d - 1];
      const oldLoc = String(oldDayLocations[d] || "").toLowerCase().trim();
      if (oldDayData && oldLoc === targetLoc) {
        matchedDayObj = {
          title: oldDayData.title,
          plan: extractCorePlan(oldDayData.plan),
          location: targetLoc,
          originalDayNum: d
        };
      }
    }

    // 1. Try to pull an unused day from matching segment ID pool
    if (!matchedDayObj && seg && seg.id && poolBySegmentId[seg.id]) {
      matchedDayObj = poolBySegmentId[seg.id].find(obj => !usedPooledDays.has(obj));
    }

    // 2. If not found by segment ID, try to pull from matching location pool
    if (!matchedDayObj && targetLoc && poolByLocation[targetLoc]) {
      matchedDayObj = poolByLocation[targetLoc].find(obj => !usedPooledDays.has(obj));
    }

    if (matchedDayObj) {
      usedPooledDays.add(matchedDayObj);
      let dayTitle = matchedDayObj.title || `Day ${d} in ${meta.location}`;
      dayTitle = dayTitle.replace(/^Day\s*\d+\s*[-:–]?\s*/i, `Day ${d} - `);
      newItineraryDays.push({
        day: d,
        title: dayTitle,
        plan: [...matchedDayObj.plan]
      });
    } else {
      // Truly new location/day without existing activities -> mark dirty for Gemini
      dirtyDays.push({ dayNum: d, location: meta.location });
      newItineraryDays.push(null);
    }
  }

  const geminiRequired = dirtyDays.length > 0;

  // Concise backend debug logging
  console.log(`[StayPlan Sync]
Change type: ${changeType}
Locations changed: ${!sameLocationsSet}
New destinations: ${newDestinations.length}
Removed destinations: ${removedDestinations.length}
Gemini required: ${geminiRequired}${geminiRequired ? `\nAffected days: [${dirtyDays.map(d => d.dayNum).join(", ")}]` : ""}`);

  // 8. Call Gemini ONLY if there are dirty days!
  if (geminiRequired) {
    const dirtyPrompt = `
You are an expert travel planner.
I have a trip to ${trip.destination} for ${trip.travelers} travelers.
Budget: ${trip.budget} ${trip.currency}

Generate core destination activities ONLY for the following specific days and locations:
${dirtyDays.map(d => `- Day ${d.dayNum} in ${d.location}`).join("\n")}

Rules:
1. Do NOT include transport between cities.
2. Do NOT include hotel check-in/check-out.
3. Provide ONLY pure activities and meals.
4. Return ONLY a valid JSON array of day objects matching the exact format below.

[
  {
    "day": 1,
    "title": "Exploring Location",
    "plan": [
       {
         "time": "09:00 AM - 11:00 AM",
         "place": "Place Name",
         "activity": "Activity Name",
         "notes": "Details",
         "duration": "2h",
         "estimatedCost": "500",
         "category": "activity"
       }
    ]
  }
]
`;

    let result;
    try {
      const model = getModel();
      result = await model.generateContent(dirtyPrompt);
    } catch (err) {
      if (err.message && (err.message.includes("429") || err.message.includes("quota") || err.message.includes("RESOURCE_EXHAUSTED"))) {
        throw new Error("Gemini API quota exceeded. Please try again in a few moments.");
      }
      throw err;
    }

    let text = result.response.text().replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
    let generatedDays = JSON.parse(text);

    for (const gd of generatedDays) {
      if (gd && gd.day && newItineraryDays[gd.day - 1] === null) {
        newItineraryDays[gd.day - 1] = gd;
      }
    }
  }

  // 9. Assemble final days and inject structured operational events
  const finalDays = [];
  for (let d = 1; d <= expectedDays; d++) {
    let dayData = newItineraryDays[d - 1] || { day: d, title: `Day ${d}`, plan: [] };
    if (!Array.isArray(dayData.plan)) dayData.plan = [];
    finalDays.push(dayData);
  }

  const isCampus = trip.tripCategory === "CAMPUS";
  const expectedStudents = isCampus
    ? parseInt(trip.campusConfig?.expectedParticipants, 10) || parseInt(trip.travelers, 10) || 1
    : 1;
  const studentsPerRoom = isCampus
    ? parseInt(trip.campusConfig?.studentsPerRoom, 10) || 2
    : 2;
  const requiredRooms = isCampus
    ? Math.max(1, Math.ceil(expectedStudents / studentsPerRoom))
    : 1;

  // Inject Check-in and Check-out for each canonical stay segment
  canonicalSegments.forEach((seg, sIdx) => {
    const checkInDate = new Date(seg.checkIn + "T00:00:00Z");
    const checkOutDate = new Date(seg.checkOut + "T00:00:00Z");
    const dayInIdx = Math.round((checkInDate - tripStart) / (1000 * 60 * 60 * 24)); // 0-based
    const dayOutIdx = Math.round((checkOutDate - tripStart) / (1000 * 60 * 60 * 24)); // 0-based

    const hotelName = seg.selectedHotel?.name || "Hotel";
    const nights = Math.max(1, parseInt(seg.nights || 1, 10));

    let hotelPrice = 0;
    if (seg.selectedHotel) {
      if (isCampus) {
        if (seg.selectedHotel.groupPrice && Number(seg.selectedHotel.groupPrice) > 0) {
          hotelPrice = Number(seg.selectedHotel.groupPrice);
        } else if (seg.selectedHotel.rooms && Number(seg.selectedHotel.rooms) > 1 && seg.selectedHotel.price) {
          hotelPrice = Number(seg.selectedHotel.price);
        } else {
          let nightlyRate = Number(seg.selectedHotel.nightlyPrice || seg.selectedHotel.pricePerNight || 0);
          if (!nightlyRate && seg.selectedHotel.price) {
            nightlyRate = Math.round(Number(seg.selectedHotel.price) / nights);
          }
          if (!nightlyRate || nightlyRate < 1000) {
            const nameStr = seg.selectedHotel.name || "";
            const locStr = seg.location || "";
            const seed = (nameStr + locStr).length || 10;
            nightlyRate = 3500 + (seed % 10) * 500;
          }
          const groupNightlyRate = calculateCampusGroupRoomRate(nightlyRate, requiredRooms);
          hotelPrice = requiredRooms * groupNightlyRate * nights;
          seg.selectedHotel.nightlyPrice = groupNightlyRate;
        }
        // Keep hotel object properties consistent
        seg.selectedHotel.price = hotelPrice;
        seg.selectedHotel.groupPrice = hotelPrice;
        seg.selectedHotel.rooms = requiredRooms;
        seg.selectedHotel.perStudentPrice = Math.round(hotelPrice / expectedStudents);
      } else {
        hotelPrice = seg.selectedHotel.price || "0";
      }
    }

    const defaultTransportCost = isCampus
      ? String(Math.round(expectedStudents * 500))
      : "1000";

    // Intercity transport on check-in day
    if (dayInIdx >= 0 && dayInIdx < finalDays.length) {
      const dayPlan = finalDays[dayInIdx].plan;
      const fromLoc = (sIdx > 0 && canonicalSegments[sIdx - 1]) ? canonicalSegments[sIdx - 1].location : trip.source;

      const hasTransport = dayPlan.some(p => p.category === "transport" || p.trainNumber || p.flightNumber);
      if (!hasTransport && fromLoc.toLowerCase() !== seg.location.toLowerCase()) {
        dayPlan.unshift({
          id: `itin_${crypto.randomUUID()}`,
          time: "09:00 AM - 12:00 PM",
          place: `Travel to ${seg.location}`,
          activity: `Travel: ${fromLoc} to ${seg.location}`,
          category: "transport",
          duration: "3h",
          estimatedCost: defaultTransportCost
        });
      }

      // Hotel Check-in
      dayPlan.push({
        id: `sync-checkin-${seg.id}`,
        time: "02:00 PM - 02:30 PM",
        place: hotelName !== "Hotel" ? hotelName : seg.location,
        activity: `Check-in at ${hotelName}`,
        category: "operational",
        duration: "30m",
        estimatedCost: `${hotelPrice}`,
        stayId: seg.id
      });
    }

    // Hotel Check-out
    if (dayOutIdx >= 0 && dayOutIdx < finalDays.length) {
      const dayPlan = finalDays[dayOutIdx].plan;
      dayPlan.push({
        id: `sync-checkout-${seg.id}`,
        time: "11:00 AM - 11:30 AM",
        place: hotelName !== "Hotel" ? hotelName : seg.location,
        activity: `Check out from ${hotelName}`,
        category: "operational",
        duration: "30m",
        estimatedCost: "0",
        stayId: seg.id
      });
    }
  });

  // Departure day return transport (if not already present)
  const depDay = finalDays[expectedDays - 1];
  if (depDay && Array.isArray(depDay.plan)) {
    const hasDepTransport = depDay.plan.some(p => p.category === "transport" || p.trainNumber || p.flightNumber);
    if (!hasDepTransport) {
      const lastSeg = canonicalSegments[canonicalSegments.length - 1];
      const fromLoc = lastSeg ? lastSeg.location : trip.destination;
      const depTransportCost = isCampus
        ? String(Math.round(expectedStudents * 500))
        : "1000";
      depDay.plan.push({
        id: `itin_${crypto.randomUUID()}`,
        time: "02:00 PM - 05:00 PM",
        place: `Travel to ${trip.source}`,
        activity: `Return: ${fromLoc} to ${trip.source}`,
        category: "transport",
        duration: "3h",
        estimatedCost: depTransportCost
      });
    }
  }

  // Ensure every item in every day plan has a valid unique ID
  finalDays.forEach(day => {
    if (Array.isArray(day.plan)) {
      day.plan.forEach(p => {
        if (!p.id && !p._id) {
          p.id = `itin_${crypto.randomUUID()}`;
        }
      });
    }
  });

  const parsedData = { days: finalDays, staySegments: canonicalSegments };

  // 9. Run deterministic scheduler
  buildDeterministicTimeline(parsedData);

  // 10. Run itinerary validator
  const valRes = validateItinerary(parsedData, trip);
  if (valRes.errors && valRes.errors.length > 0) {
    const hardConflicts = valRes.errors.filter(c => !c.message.includes("is tightly packed"));
    if (hardConflicts.length > 0) {
      throw new Error("Synchronized itinerary generated schedule conflicts: " + hardConflicts.map(c => c.message).join(" | "));
    }
  }

  // 11. Transactional persistence: only update trip when all steps succeed
  trip.itinerary = parsedData.days;
  trip.staySegments = canonicalSegments;
  trip.markModified("itinerary");
  trip.markModified("staySegments");

  await trip.save();
  return trip;
};

module.exports = {
  generateTripPlan,
  regenerateTripDay,
  syncItineraryWithStayPlan,
};
