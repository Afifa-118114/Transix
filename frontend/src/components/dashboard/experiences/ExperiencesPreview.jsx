import ExperienceCard from "./ExperienceCard";

export default function ExperiencesPreview({ trip }) {
  if (!trip) return null;

  // Extract unique places from itinerary
  const experiences = trip.itinerary
    ?.flatMap((day) =>
      day.plan.map((item) => ({
        id: `${day.day}-${item.place}`,
        title: item.place || item.name,
        place: item.activity || item.place,
        image: `https://picsum.photos/400/250?random=${encodeURIComponent(
          item.place || item.name || "kerala"
        )}`,
        rating: item.rating || "4.8",
        price: item.price || 800,
      })),
    )
    .slice(0, 6);

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-5 md:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-colors">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-serif font-light text-slate-900">Local Experiences &amp; Activities</h2>
          <p className="text-xs text-slate-500 mt-0.5">Popular sights and things to do</p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
        {experiences?.map((experience) => (
          <ExperienceCard key={experience.id} experience={experience} />
        ))}
      </div>
    </section>
  );
}
