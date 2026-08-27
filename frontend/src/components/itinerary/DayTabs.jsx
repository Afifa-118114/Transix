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
              : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
          }`}
        >
          <span>Day {day.day}</span>
          <span
            className={`rounded-md px-1.5 py-0.2 text-[10px] ${
              selectedDay === index
                ? "bg-indigo-500 text-white"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {day.plan?.length || 0}
          </span>
        </button>
      ))}
    </div>
  );
}
