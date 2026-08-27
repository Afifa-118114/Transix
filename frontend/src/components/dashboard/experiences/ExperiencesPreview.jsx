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
    <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] p-5 shadow-xs transition-colors">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Local Experiences &amp; Activities</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Popular sights and things to do</p>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {experiences?.map((experience) => (
          <ExperienceCard key={experience.id} experience={experience} />
        ))}
      </div>
    </section>
  );
}
