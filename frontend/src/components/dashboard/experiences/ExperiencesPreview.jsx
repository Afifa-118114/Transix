import ExperienceCard from "./ExperienceCard";

function ExperiencesPreview({ trip }) {
  if (!trip) return null;

  // Extract unique places from itinerary
  const experiences = trip.itinerary
    ?.flatMap((day) =>
      day.plan.map((item) => ({
        id: `${day.day}-${item.place}`,
        title: item.place,
        place: item.activity,
        image: `https://picsum.photos/400/250?random=${encodeURIComponent(
          item.place,
        )}`,
        rating: "4.8",
      })),
    )
    .slice(0, 6);

  return (
    <section className="overflow-x-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="translate-x-3 text-2xl font-bold">
              Local Experiences
            </h2>

            <p className="mt-1 translate-x-3 text-sm text-gray-500">
              Explore the best activities
            </p>
          </div>

          <button className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-600">
            View All →
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2">
          {experiences?.map((experience) => (
            <ExperienceCard key={experience.id} experience={experience} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default ExperiencesPreview;
