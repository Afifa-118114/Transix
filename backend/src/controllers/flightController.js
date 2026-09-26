const FlightSchedule = require("../models/FlightSchedule");
const { resolveAirport, resolveAirports } = require("../utils/airportCodes");
const {
  doesScheduleOperateOnWeekday,
  isDateWithinScheduleValidity,
} = require("../utils/flightScheduleMatcher");

/**
 * Search Flight Schedules
 * GET /api/flights/search
 * Query Params: origin (or source), destination, travelDate (or date)
 */
const searchFlights = async (req, res) => {
  try {
    const originParam = req.query.origin || req.query.source;
    const destParam = req.query.destination;
    const dateParam = req.query.travelDate || req.query.date;

    if (!originParam || !destParam) {
      return res.status(400).json({
        success: false,
        message: "Origin (source) and destination are required.",
      });
    }

    const originResolved = resolveAirport(originParam);
    const destResolved = resolveAirport(destParam);
    const originTargets = resolveAirports(originParam);
    const destTargets = resolveAirports(destParam);

    console.log(
      `[Flight Search] Query: "${originParam}" (${originTargets.map((t) => t.code).join("/")}) → "${destParam}" (${destTargets.map((t) => t.code).join("/")}), Date: "${dateParam || "any"}"`
    );

    const originCodes = originTargets.map((t) => t.code);
    const destCodes = destTargets.map((t) => t.code);
    const originNames = originTargets.map((t) => t.name);
    const destNames = destTargets.map((t) => t.name);

    // Build MongoDB query matching origin and destination (supports specific airports and regional mappings)
    const query = {
      $and: [
        {
          $or: [
            { "origin.code": { $in: originCodes } },
            { "origin.name": { $in: originNames.map((n) => new RegExp(`^${n}$`, "i")) } },
            { "origin.name": new RegExp(`^${originParam.trim()}$`, "i") },
          ],
        },
        {
          $or: [
            { "destination.code": { $in: destCodes } },
            { "destination.name": { $in: destNames.map((n) => new RegExp(`^${n}$`, "i")) } },
            { "destination.name": new RegExp(`^${destParam.trim()}$`, "i") },
          ],
        },
      ],
    };

    const rawSchedules = await FlightSchedule.find(query).lean();

    let matchingSchedules = [];
    let topSearchMode = "HISTORICAL";

    if (!dateParam) {
      // No date specified: return all route schedules as HISTORICAL
      matchingSchedules = rawSchedules.map((s) => ({
        ...s,
        _matchMode: "HISTORICAL",
      }));
      topSearchMode = "HISTORICAL";
    } else {
      // Phase 1: Check for active schedules within historical validity window where weekday matches
      const historicalMatches = [];
      for (const sched of rawSchedules) {
        if (
          isDateWithinScheduleValidity(sched, dateParam) &&
          doesScheduleOperateOnWeekday(sched, dateParam)
        ) {
          historicalMatches.push({
            ...sched,
            _matchMode: "HISTORICAL",
          });
        }
      }

      if (historicalMatches.length > 0) {
        matchingSchedules = historicalMatches;
        topSearchMode = "HISTORICAL";
      } else {
        // Phase 2: Date is outside dataset coverage (e.g. future 2026 date)
        // Fall back to historical REFERENCE mode: match using origin, destination, and requested weekday
        const referenceMatches = [];
        for (const sched of rawSchedules) {
          if (doesScheduleOperateOnWeekday(sched, dateParam)) {
            referenceMatches.push({
              ...sched,
              _matchMode: "REFERENCE",
            });
          }
        }

        matchingSchedules = referenceMatches;
        topSearchMode = "REFERENCE";
      }
    }

    // Deterministic sorting:
    // 1. scheduledDepartureTime (ascending)
    // 2. airline (ascending)
    // 3. flightNumber (ascending)
    matchingSchedules.sort((a, b) => {
      const depComp = String(a.scheduledDepartureTime || "").localeCompare(
        String(b.scheduledDepartureTime || "")
      );
      if (depComp !== 0) return depComp;

      const airComp = String(a.airline || "").localeCompare(String(b.airline || ""));
      if (airComp !== 0) return airComp;

      return String(a.flightNumber || "").localeCompare(String(b.flightNumber || ""));
    });

    const formattedFlights = matchingSchedules.map((s) => ({
      id: String(s._id),
      airline: s.airline,
      flightNumber: s.flightNumber,
      origin: {
        code: s.origin.code,
        name: s.origin.name,
      },
      destination: {
        code: s.destination.code,
        name: s.destination.name,
      },
      departureTime: s.scheduledDepartureTime,
      arrivalTime: s.scheduledArrivalTime,
      timezone: s.timezone,
      daysOfWeek: s.daysOfWeek || [],
      operatingDays: s.daysOfWeek || [],
      validFrom: s.validFrom ? s.validFrom.toISOString().split("T")[0] : null,
      validTo: s.validTo ? s.validTo.toISOString().split("T")[0] : null,
      mode: s._matchMode || "HISTORICAL",
      isReference: s._matchMode === "REFERENCE",
      source: s.sourceDataset || "Air-Clean.csv",
    }));

    return res.json({
      success: true,
      type: "direct",
      origin: originResolved,
      destination: destResolved,
      travelDate: dateParam || null,
      searchMode: topSearchMode,
      total: formattedFlights.length,
      count: formattedFlights.length,
      flights: formattedFlights,
    });
  } catch (err) {
    console.error("Flight Search Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to search flight schedules.",
    });
  }
};

module.exports = {
  searchFlights,
};
