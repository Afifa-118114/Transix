import DayCard from "./DayCard";

function ItineraryPreview({ trip }) {
  if (!trip) return null;

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold translate-x-3">Trip Itinerary</h2>

          <p className="text-gray-500 ">Quick overview of your journey</p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {trip.itinerary.map((day) => (
          <DayCard key={day.day} day={day} trip={trip} />
        ))}
      </div>
    </section>
  );
}

export default ItineraryPreview;
