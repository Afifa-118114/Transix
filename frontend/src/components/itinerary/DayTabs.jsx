export default function DayTabs({ itinerary, selectedDay, setSelectedDay }) {
  return (
    <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto pb-1 scrollbar-none">
      {itinerary.map((day, index) => (
        <button
          key={day.day}
          onClick={() => setSelectedDay(index)}
          className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            selectedDay === index
              ? "bg-indigo-600 text-white shadow-xs"
              : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a233a] text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-600/50 hover:text-indigo-600 dark:hover:text-indigo-400"
          }`}
        >
          <span>Day {day.day}</span>
          <span
            className={`rounded-md px-1.5 py-0.2 text-[10px] ${
              selectedDay === index
                ? "bg-indigo-500 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
            }`}
          >
            {day.plan?.length || 0}
          </span>
        </button>
      ))}
    </div>
  );
}
