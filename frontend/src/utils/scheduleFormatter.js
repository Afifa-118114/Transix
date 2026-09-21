/**
 * Transix Schedule Formatter Utility
 * Formats transport operating schedules into compact representations:
 * - "Daily" if operating every day
 * - Abbreviated day names e.g. "Mon, Thu, Sun" if specific days
 */

export function formatCompactSchedule(daysOrRunningDays) {
  if (!daysOrRunningDays) return "Scheduled";

  // If array of days e.g. ["Monday", "Wednesday", "Friday"] or ["Mon", "Wed"] or ["daily"]
  if (Array.isArray(daysOrRunningDays)) {
    if (daysOrRunningDays.length === 0) return "Scheduled";
    if (
      daysOrRunningDays.length === 7 ||
      daysOrRunningDays.some((d) => String(d).trim().toLowerCase() === "daily")
    ) {
      return "Daily";
    }

    const order = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const normalized = daysOrRunningDays.map((d) => {
      const s = String(d).trim().slice(0, 3);
      return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    });

    // Deduplicate and sort by standard week order
    const unique = Array.from(new Set(normalized));
    unique.sort((a, b) => order.indexOf(a) - order.indexOf(b));

    if (unique.length === 7) return "Daily";
    return unique.join(", ");
  }

  // If object of running days e.g. { SUN: 1, MON: 0, TUE: 1, ... }
  if (typeof daysOrRunningDays === "object") {
    const dayKeys = [
      { k: "SUN", l: "Sun" },
      { k: "MON", l: "Mon" },
      { k: "TUE", l: "Tue" },
      { k: "WED", l: "Wed" },
      { k: "THU", l: "Thu" },
      { k: "FRI", l: "Fri" },
      { k: "SAT", l: "Sat" },
    ];

    const activeDays = dayKeys.filter((d) => {
      const val =
        daysOrRunningDays[d.k] ??
        daysOrRunningDays[d.l] ??
        daysOrRunningDays[d.l.toLowerCase()] ??
        daysOrRunningDays[d.k.toLowerCase()];
      return Boolean(val);
    });

    if (activeDays.length === 7) return "Daily";
    if (activeDays.length === 0) return "Regular Schedule";
    return activeDays.map((d) => d.l).join(", ");
  }

  // If string
  if (typeof daysOrRunningDays === "string") {
    const s = daysOrRunningDays.trim();
    if (s.toLowerCase().includes("daily") || s.toLowerCase().includes("all days")) {
      return "Daily";
    }
    // If comma-separated day string
    if (s.includes(",")) {
      const parts = s.split(",").map((p) => p.trim());
      return formatCompactSchedule(parts);
    }
    return s;
  }

  return "Scheduled";
}
