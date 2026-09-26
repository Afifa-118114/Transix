const WEEKDAYS = [
  { key: "MON", label: "MON", full: "Monday" },
  { key: "TUE", label: "TUE", full: "Tuesday" },
  { key: "WED", label: "WED", full: "Wednesday" },
  { key: "THU", label: "THU", full: "Thursday" },
  { key: "FRI", label: "FRI", full: "Friday" },
  { key: "SAT", label: "SAT", full: "Saturday" },
  { key: "SUN", label: "SUN", full: "Sunday" },
];

export function isDayActive(dayObj, daysData) {
  if (!daysData) return false;

  // Array format e.g. ["Monday", "Wednesday"] or ["daily"]
  if (Array.isArray(daysData)) {
    if (daysData.length === 0) return false;
    if (
      daysData.length === 7 ||
      daysData.some((d) => {
        const s = String(d).trim().toLowerCase();
        return s === "daily" || s === "all days" || s === "all";
      })
    ) {
      return true;
    }
    return daysData.some((d) => {
      const s = String(d).trim().toUpperCase();
      return s.startsWith(dayObj.key) || s === dayObj.full.toUpperCase();
    });
  }

  // Object format e.g. { SUN: 1, MON: 0, TUE: 1, ... }
  if (typeof daysData === "object") {
    const val =
      daysData[dayObj.key] ??
      daysData[dayObj.key.toLowerCase()] ??
      daysData[dayObj.full] ??
      daysData[dayObj.full.toLowerCase()] ??
      daysData[dayObj.key.charAt(0) + dayObj.key.slice(1).toLowerCase()];
    return Boolean(val);
  }

  // String format e.g. "Daily" or "Monday, Wednesday"
  if (typeof daysData === "string") {
    const s = daysData.trim().toLowerCase();
    if (s.includes("daily") || s.includes("all days")) return true;
    if (s.includes(dayObj.key.toLowerCase()) || s.includes(dayObj.full.toLowerCase())) {
      return true;
    }
  }

  return false;
}

export default function WeeklyScheduleChips({ daysData, title = "Schedule" }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {WEEKDAYS.map((day) => {
        const active = isDayActive(day, daysData);
        return (
          <span
            key={day.key}
            title={`${day.full}: ${active ? "Runs" : "Does not run"}`}
            className={`inline-flex items-center justify-center min-w-[38px] px-2 py-1 rounded-md text-xs tracking-wider transition-colors select-none ${
              active
                ? "bg-purple-600 dark:bg-purple-600 text-white font-black shadow-xs border border-purple-500"
                : "bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 font-semibold border border-slate-200/50 dark:border-slate-700/50"
            }`}
          >
            {day.label}
          </span>
        );
      })}
    </div>
  );
}
