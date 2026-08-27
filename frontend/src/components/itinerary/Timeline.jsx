import TimelineCard from "./TimelineCard";

export default function Timeline({ plan, destination }) {
  return (
    <div className="relative mx-auto mt-6 w-full max-w-3xl">
      {/* Central Guide Line */}
      <div className="absolute left-[39px] top-6 bottom-6 w-[2px] rounded-full bg-slate-200 dark:bg-slate-700/60" />

      <div className="flex flex-col gap-4">
        {plan.map((activity, index) => (
          <TimelineCard
            key={`${activity.time}-${activity.place}-${index}`}
            activity={activity}
            destination={destination}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
