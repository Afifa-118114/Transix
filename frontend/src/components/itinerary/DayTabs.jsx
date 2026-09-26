import { FiHome, FiNavigation } from "react-icons/fi";

export default function DayTabs({
  itinerary,
  selectedDay,
  setSelectedDay,
  showAllDaysOption = true,
  onSelectStayPlan,
  onSelectTransportPlan,
  activeSpecialTab = null,
}) {
  if (!Array.isArray(itinerary) || itinerary.length === 0) return null;

  return (
    <div className="w-full flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none py-1">
      {/* 1. Stay Plan Tab */}
      {onSelectStayPlan && (
        <button
          type="button"
          onClick={onSelectStayPlan}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all duration-150 cursor-pointer ${
            activeSpecialTab === "stay"
              ? "bg-teal-600 text-white shadow-xs"
              : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] text-slate-700 dark:text-slate-300 hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400"
          }`}
        >
          <FiHome className="text-xs text-teal-500 dark:text-teal-400" />
          <span>Stay Plan</span>
        </button>
      )}

      {/* 2. Transport Plan Tab */}
      {onSelectTransportPlan && (
        <button
          type="button"
          onClick={onSelectTransportPlan}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all duration-150 cursor-pointer ${
            activeSpecialTab === "transport"
              ? "bg-sky-600 text-white shadow-xs"
              : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] text-slate-700 dark:text-slate-300 hover:border-sky-500 hover:text-sky-600 dark:hover:text-sky-400"
          }`}
        >
          <FiNavigation className="text-xs text-sky-500 dark:text-sky-400" />
          <span>Transport Plan</span>
        </button>
      )}

      {/* 3. All Days Tab */}
      {showAllDaysOption && (
        <button
          type="button"
          onClick={() => setSelectedDay("all")}
          className={`flex shrink-0 items-center rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all duration-150 cursor-pointer ${
            selectedDay === "all" && !activeSpecialTab
              ? "bg-indigo-600 text-white shadow-xs"
              : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] text-slate-700 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400"
          }`}
        >
          <span>All Days</span>
        </button>
      )}

      {/* 4. Day by Day Tabs: Compact Day 1, Day 2, Day 3... (No Stop Counts) */}
      {itinerary.map((day, index) => {
        const isSelected = selectedDay === index && !activeSpecialTab;
        return (
          <button
            key={day.day || index}
            type="button"
            onClick={() => setSelectedDay(index)}
            className={`flex shrink-0 items-center rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all duration-150 cursor-pointer ${
              isSelected
                ? "bg-indigo-600 text-white shadow-xs"
                : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] text-slate-700 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400"
            }`}
          >
            <span>Day {day.day || index + 1}</span>
          </button>
        );
      })}
    </div>
  );
}
