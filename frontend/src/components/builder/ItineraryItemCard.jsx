import { useState } from "react";
import {
  FiClock,
  FiMapPin,
  FiStar,
  FiTrash2,
  FiCopy,
  FiMove,
  FiAlertTriangle,
  FiEdit2,
  FiCheck,
  FiCompass,
  FiShoppingBag,
  FiSun,
} from "react-icons/fi";
import {
  FaHotel,
  FaTrainSubway,
  FaPlaneDeparture,
  FaBus,
  FaUtensils,
  FaCar,
} from "react-icons/fa6";
import { useTripBuilder } from "../../context/TripBuilderContext";

export default function ItineraryItemCard({
  item,
  dayIndex,
  itemIndex,
  onDragStartItem,
  onDragOverItem,
  onDropOnItem,
}) {
  const { removeItemFromDay, duplicateItem, updateItemTime, validationStats } = useTripBuilder();

  const [isEditingTime, setIsEditingTime] = useState(false);
  const [startTimeInput, setStartTimeInput] = useState(item.startTime || "10:00 AM");
  const [endTimeInput, setEndTimeInput] = useState(item.endTime || "12:00 PM");
  const [bufferInput, setBufferInput] = useState(item.travelBuffer || 30);

  // SVG category icon helper (zero emojis)
  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case "hotel":
      case "stay":
        return <FaHotel className="text-[10px]" />;
      case "train":
        return <FaTrainSubway className="text-[10px]" />;
      case "flight":
        return <FaPlaneDeparture className="text-[10px]" />;
      case "bus":
        return <FaBus className="text-[10px]" />;
      case "food":
      case "restaurant":
        return <FaUtensils className="text-[10px]" />;
      case "transport":
        return <FaCar className="text-[10px]" />;
      case "shopping":
        return <FiShoppingBag className="text-[10px]" />;
      case "experience":
        return <FiSun className="text-[10px]" />;
      case "activity":
      default:
        return <FiCompass className="text-[10px]" />;
    }
  };

  // Check conflicts for this item
  const itemConflicts = validationStats.conflicts.filter(
    (c) =>
      c.day === dayIndex + 1 &&
      (c.itemId === item.id || c.itemTitle === item.name || c.itemTitle === item.activity)
  );

  const hasConflict = itemConflicts.length > 0;

  const handleSaveTime = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const success = updateItemTime(dayIndex, item.id, {
      startTime: startTimeInput,
      endTime: endTimeInput,
      travelBuffer: Number(bufferInput) || 30,
    });
    if (success) {
      setIsEditingTime(false);
    }
  };

  const handleCancelTime = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setStartTimeInput(item.startTime || "10:00 AM");
    setEndTimeInput(item.endTime || "12:00 PM");
    setIsEditingTime(false);
  };

  return (
    <div
      draggable={!isEditingTime}
      onDragStart={(e) => onDragStartItem(e, dayIndex, itemIndex, item)}
      onDragOver={(e) => onDragOverItem(e, dayIndex, itemIndex)}
      onDrop={(e) => onDropOnItem(e, dayIndex, itemIndex)}
      className={`group relative rounded-xl border bg-white dark:bg-[#131b2e] p-3 shadow-2xs transition-all duration-150 hover:shadow-xs ${
        hasConflict
          ? "border-amber-400/80 dark:border-amber-500/50 bg-amber-50/10 dark:bg-amber-950/20"
          : "border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500"
      }`}
    >
      {/* Header Row: Time, Sequence, Quick Actions, Drag Handle */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-800 dark:text-slate-200">
            {itemIndex + 1}
          </span>

          <span className="flex items-center gap-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
            <FiClock className="text-indigo-600 dark:text-indigo-400 text-xs" />
            <span>
              {item.startTime && item.endTime
                ? `${item.startTime} – ${item.endTime}`
                : item.time || "Flexible Timing"}
            </span>
          </span>

          {item.duration && (
            <span className="rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.2 text-[10px] font-medium text-slate-600 dark:text-slate-300">
              {item.duration}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setIsEditingTime(!isEditingTime)}
            title="Edit timing"
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            <FiEdit2 className="text-[10px]" />
            <span>{isEditingTime ? "Cancel" : "Time"}</span>
          </button>

          <button
            type="button"
            onClick={() => duplicateItem(dayIndex, item.id)}
            title="Duplicate activity"
            className="flex items-center rounded-md p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            <FiCopy className="text-[11px]" />
          </button>

          <button
            type="button"
            onClick={() => removeItemFromDay(dayIndex, item.id)}
            title="Remove activity"
            className="flex items-center rounded-md p-1 text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition cursor-pointer"
          >
            <FiTrash2 className="text-[11px]" />
          </button>

          <div
            className="flex cursor-grab items-center rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white active:cursor-grabbing transition ml-0.5"
            title="Drag to reorder"
          >
            <FiMove className="text-[11px]" />
          </div>
        </div>
      </div>

      {/* Time Editor Inline Drawer */}
      {isEditingTime && (
        <div className="my-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 text-xs">
          <p className="font-bold text-slate-900 dark:text-white mb-2">Customize Activity Schedule</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Start Time</label>
              <input
                type="text"
                value={startTimeInput}
                onChange={(e) => setStartTimeInput(e.target.value)}
                placeholder="e.g. 10:30 AM"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">End Time</label>
              <input
                type="text"
                value={endTimeInput}
                onChange={(e) => setEndTimeInput(e.target.value)}
                placeholder="e.g. 12:00 PM"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Travel Buffer (mins)</label>
              <input
                type="number"
                min="0"
                max="120"
                value={bufferInput}
                onChange={(e) => setBufferInput(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-end gap-2">
            <button
              onClick={handleCancelTime}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTime}
              className="flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-1 text-[11px] font-bold text-white shadow-xs cursor-pointer"
            >
              <FiCheck className="text-xs" />
              <span>Apply Time</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Row */}
      <div className="mt-2.5 flex items-start gap-3">
        {item.image && (
          <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-700">
            <img
              src={item.image}
              alt={item.name || item.activity}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <span className="absolute bottom-0.5 right-0.5 flex items-center justify-center rounded-sm bg-black/70 p-0.5 text-white backdrop-blur-xs">
              {getCategoryIcon(item.category)}
            </span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
              {item.name || item.activity}
            </h4>
            <span className="shrink-0 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {item.displayPrice ||
                (typeof item.price === "number" && item.price > 0
                  ? `₹${item.price.toLocaleString()}`
                  : "Check rate")}
            </span>
          </div>

          {item.location || item.place ? (
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <FiMapPin className="shrink-0 text-rose-500 text-[10px]" />
              <span className="truncate">{item.location || item.place}</span>
            </div>
          ) : null}

          {item.notes && (
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
              {item.notes}
            </p>
          )}

          {/* Badges */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {item.rating && (
              <span className="flex items-center gap-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 text-[9px] font-bold text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                <FiStar className="fill-amber-400 text-amber-400 text-[8px]" />
                {item.rating}
              </span>
            )}

            {item.dnaMatch && (
              <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.2 text-[9px] font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
                {item.dnaMatch}% Match
              </span>
            )}

            {item.categoryLabel && (
              <span className="rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-1.5 py-0.2 text-[9px] font-medium text-slate-600 dark:text-slate-300">
                {item.categoryLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Conflict Warnings List */}
      {hasConflict && (
        <div className="mt-2 space-y-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2 text-[11px] font-medium text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/50">
          {itemConflicts.map((c, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <FiAlertTriangle className="shrink-0 text-amber-600 dark:text-amber-400 text-xs" />
              <span className="line-clamp-1">{c.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
