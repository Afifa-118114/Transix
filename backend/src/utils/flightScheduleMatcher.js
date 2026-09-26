/**
 * Flight Schedule Date and Weekday Matcher
 * Deterministic schedule validity verification without heuristics or Gemini.
 */

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Parses a date input into local date components without UTC offset distortion.
 * @param {string|Date} dateVal - Date string (YYYY-MM-DD) or Date object
 * @returns {{ year: number, month: number, day: number, dateObj: Date, weekday: string, weekdayShort: string } | null}
 */
function parseLocalDate(dateVal) {
  if (!dateVal) return null;

  if (typeof dateVal === "string") {
    const parts = dateVal.split("T")[0].split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const dateObj = new Date(year, month, day, 12, 0, 0); // midday avoids DST / timezone edge shifts
      const dayIdx = dateObj.getDay();
      return {
        year,
        month,
        day,
        dateObj,
        weekday: WEEKDAYS[dayIdx],
        weekdayShort: WEEKDAY_SHORT[dayIdx],
        isoDateStr: `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`,
      };
    }
  }

  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;

  const dayIdx = d.getDay();
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
    dateObj: d,
    weekday: WEEKDAYS[dayIdx],
    weekdayShort: WEEKDAY_SHORT[dayIdx],
    isoDateStr: d.toISOString().split("T")[0],
  };
}

/**
 * Checks if a flight schedule operates on the weekday of the requested travel date.
 * Mandatory for all dates (both HISTORICAL and REFERENCE).
 * @param {Object} schedule
 * @param {string|Date} travelDate
 * @returns {boolean}
 */
function doesScheduleOperateOnWeekday(schedule, travelDate) {
  if (!schedule || !travelDate) return false;

  const parsedTravel = parseLocalDate(travelDate);
  if (!parsedTravel) return false;

  const operatingDays = Array.isArray(schedule.daysOfWeek)
    ? schedule.daysOfWeek
    : typeof schedule.daysOfWeek === "string"
      ? schedule.daysOfWeek.split(",").map((s) => s.trim())
      : [];

  if (operatingDays.length === 0) {
    return true; // No day restrictions recorded
  }

  const operatesDaily =
    operatingDays.some((d) => String(d).toLowerCase().trim() === "daily") ||
    operatingDays.length === 7;

  if (operatesDaily) {
    return true;
  }

  const travelDayName = parsedTravel.weekday.toLowerCase();
  const travelDayShort = parsedTravel.weekdayShort.toLowerCase();

  return operatingDays.some((op) => {
    const opClean = String(op).toLowerCase().trim();
    return (
      opClean === travelDayName ||
      opClean === travelDayShort ||
      (opClean.length >= 3 && travelDayName.startsWith(opClean))
    );
  });
}

/**
 * Checks if a travel date falls within the schedule's historical validity period.
 * @param {Object} schedule
 * @param {string|Date} travelDate
 * @returns {boolean}
 */
function isDateWithinScheduleValidity(schedule, travelDate) {
  if (!schedule || !travelDate) return false;

  const parsedTravel = parseLocalDate(travelDate);
  if (!parsedTravel) return false;

  const validFrom = schedule.validFrom ? new Date(schedule.validFrom) : null;
  const validTo = schedule.validTo ? new Date(schedule.validTo) : null;

  if (validFrom && !isNaN(validFrom.getTime())) {
    const vFromStr = validFrom.toISOString().split("T")[0];
    if (parsedTravel.isoDateStr < vFromStr) return false;
  }

  if (validTo && !isNaN(validTo.getTime())) {
    const vToStr = validTo.toISOString().split("T")[0];
    if (parsedTravel.isoDateStr > vToStr) return false;
  }

  return true;
}

/**
 * Evaluates whether a schedule matches the requested travel date and determines its mode:
 * - HISTORICAL: within dataset validity period AND matches weekday.
 * - REFERENCE: outside dataset validity window (e.g. future date) AND matches weekday.
 * - Does NOT match: weekday does not operate.
 * @param {Object} schedule
 * @param {string|Date} travelDate
 * @returns {{ matches: boolean, mode: "HISTORICAL" | "REFERENCE" | null }}
 */
function evaluateScheduleMatch(schedule, travelDate) {
  if (!schedule) return { matches: false, mode: null };
  if (!travelDate) return { matches: true, mode: "HISTORICAL" };

  // 1. Weekday matching is mandatory for all dates
  const weekdayMatches = doesScheduleOperateOnWeekday(schedule, travelDate);
  if (!weekdayMatches) {
    return { matches: false, mode: null };
  }

  // 2. Check historical validity window
  const isWithinValidity = isDateWithinScheduleValidity(schedule, travelDate);
  if (isWithinValidity) {
    return { matches: true, mode: "HISTORICAL" };
  }

  // 3. Date outside validity window (e.g. future 2026 trip date) -> Matches as historical REFERENCE
  return { matches: true, mode: "REFERENCE" };
}

/**
 * Backwards-compatible helper returning boolean match.
 * @param {Object} schedule
 * @param {string|Date} travelDate
 * @returns {boolean}
 */
function doesScheduleOperateOnDate(schedule, travelDate) {
  const res = evaluateScheduleMatch(schedule, travelDate);
  return res.matches;
}

module.exports = {
  parseLocalDate,
  doesScheduleOperateOnWeekday,
  isDateWithinScheduleValidity,
  evaluateScheduleMatch,
  doesScheduleOperateOnDate,
  WEEKDAYS,
  WEEKDAY_SHORT,
};

