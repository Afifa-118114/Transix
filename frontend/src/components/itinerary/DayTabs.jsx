function DayTabs({ itinerary, selectedDay, setSelectedDay }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 translate-x-12">
      {itinerary.map((day, index) => (
        <button
          key={day.day}
          onClick={() => setSelectedDay(index)}
          className={`min-w-[80px] rounded-2xl px-5 py-3 text-sm font-semibold transition-all duration-300
            ${
              selectedDay === index
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-indigo-50 hover:text-indigo-600"
            }`}
        >
          Day {day.day}
        </button>
      ))}
    </div>
  );
}

export default DayTabs;
