export default function DayTabs({ itinerary, selectedDay, setSelectedDay }) {
  if (!Array.isArray(itinerary) || itinerary.length === 0) return null;

  return (
    <div className="w-full flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {itinerary.map((day, index) => {
        const isSelected = selectedDay === index;
        return (
          <button
            key={day.day || index}
            type="button"
            onClick={() => setSelectedDay(index)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-150 ${
              isSelected
                ? "bg-[#0c0a09] text-white shadow-xs"
                : "border border-[#e7e5e4] bg-white text-[#57534e] hover:border-[#0c0a09] hover:text-[#0c0a09]"
            }`}
          >
            <span>Day {day.day || index + 1}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                isSelected ? "bg-white/20 text-white" : "bg-[#f5f5f4] text-[#777169]"
              }`}
            >
              {day.plan?.length || 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
