import TimelineCard from "./TimelineCard";

export default function Timeline({ plan, destination }) {
  if (!Array.isArray(plan) || plan.length === 0) {
    return (
      <div className="relative mx-auto mt-4 w-full rounded-2xl border border-dashed border-[#e7e5e4] bg-[#fafaf9] p-8 text-center">
        <p className="text-sm font-semibold text-[#0c0a09]">No activities scheduled for this day</p>
        <p className="text-xs text-[#777169] mt-1">Customize in the Tour Builder to add or reorder items</p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto mt-4 w-full">
      {/* Central Guide Line */}
      <div className="absolute left-[39px] top-6 bottom-6 w-[2px] rounded-full bg-[#e7e5e4]" />

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
