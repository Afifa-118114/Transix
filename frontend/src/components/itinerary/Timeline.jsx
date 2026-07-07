import TimelineCard from "./TimelineCard";

function Timeline({ plan, destination }) {
  return (
    <div className="relative mx-auto mt-10 w-full max-w-2xl">
      <div className="absolute left-[50px] top-0 h-full w-[3px] rounded-full bg-gradient-to-b from-indigo-600 via-indigo-300 to-transparent" />

      <div className="flex flex-col gap-6">
        {plan.map((activity, index) => (
          <TimelineCard
            key={`${activity.time}-${activity.place}-${index}`}
            activity={activity}
            destination={destination}
          />
        ))}
      </div>
    </div>
  );
}

export default Timeline;
