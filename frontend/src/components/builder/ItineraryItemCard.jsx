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
  FiX,
} from "react-icons/fi";
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

  // Check conflicts for this item
  const itemConflicts = validationStats.conflicts.filter(
    (c) => c.day === dayIndex + 1 && (c.itemId === item.id || c.itemTitle === item.name || c.itemTitle === item.activity)
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
      className={`group relative flex flex-col justify-between rounded-xl border bg-white dark:bg-[#1a233a] p-3.5 shadow-xs transition-all duration-200 hover:shadow-sm ${
        hasConflict
          ? "border-amber-300 dark:border-amber-700/60 bg-amber-50/20 dark:bg-amber-950/10"
          : "border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-600/50"
      }`}
    >
      {/* Top Row: Time, Sequence, Edit Time, Drag Handle */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
            {itemIndex + 1}
          </span>

          <span className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <FiClock className="text-indigo-600 dark:text-indigo-400 text-xs" />
            <span>
              {item.startTime && item.endTime
                ? `${item.startTime} – ${item.endTime}`
                : item.time || "Flexible Timing"}
            </span>
          </span>

          {item.duration && (
            <span className="rounded-md bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.2 text-[10px] font-medium text-slate-600 dark:text-slate-400">
              {item.duration}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Edit Time Trigger */}
          <button
            onClick={() => setIsEditingTime(!isEditingTime)}
            title="Customize activity timing"
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
          >
            <FiEdit2 className="text-[10px]" />
            <span>{isEditingTime ? "Cancel" : "Edit Time"}</span>
          </button>

          {/* Drag Handle */}
          <div
            className="flex cursor-grab items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 active:cursor-grabbing hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            title="Drag to reorder or move between days"
          >
            <FiMove className="text-[10px]" />
            <span>Drag</span>
          </div>
        </div>
      </div>

      {/* Time Editor Inline Modal / Drawer */}
      {isEditingTime && (
        <div className="my-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-indigo-950/30 p-3 text-xs">
          <p className="font-bold text-indigo-900 dark:text-indigo-200 mb-2">Customize Activity Schedule</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Start Time</label>
              <input
                type="text"
                value={startTimeInput}
                onChange={(e) => setStartTimeInput(e.target.value)}
                placeholder="e.g. 10:30 AM"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#131b2e] px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-600 dark:focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">End Time</label>
              <input
                type="text"
                value={endTimeInput}
                onChange={(e) => setEndTimeInput(e.target.value)}
                placeholder="e.g. 12:00 PM"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#131b2e] px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-600 dark:focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Travel Buffer (mins)</label>
              <input
                type="number"
                min="0"
                max="120"
                value={bufferInput}
                onChange={(e) => setBufferInput(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#131b2e] px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-600 dark:focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-end gap-2">
            <button
              onClick={handleCancelTime}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTime}
              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-indigo-700 shadow-xs"
            >
              <FiCheck className="text-xs" />
              <span>Apply Time</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="mt-2.5 flex items-start gap-3">
        {/* Thumbnail */}
        {item.image && (
          <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
            <img
              src={item.image}
              alt={item.name || item.activity}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            {item.icon && (
              <span className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1 py-0.2 text-[9px] text-white backdrop-blur-xs">
                {item.icon}
              </span>
            )}
          </div>
        )}

        {/* Info Area */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
              {item.name || item.activity}
            </h4>
            <span className="shrink-0 text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
              {item.displayPrice || (typeof item.price === "number" && item.price > 0 ? `₹${item.price.toLocaleString()}` : "Check rate")}
            </span>
          </div>

          {item.location || item.place ? (
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <FiMapPin className="shrink-0 text-indigo-500 dark:text-indigo-400 text-[10px]" />
              <span className="truncate">{item.location || item.place}</span>
            </div>
          ) : null}

          {/* Badges */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {item.rating && (
              <span className="flex items-center gap-0.5 rounded-md bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-300">
                <FiStar className="fill-amber-400 text-amber-400 text-[8px]" />
                {item.rating}
              </span>
            )}

            {item.dnaMatch && (
              <span className="rounded-md bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                {item.dnaMatch}% Match
              </span>
            )}

            {item.categoryLabel && (
              <span className="rounded-md bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 dark:text-slate-400">
                {item.categoryLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Conflict Warnings List */}
      {hasConflict && (
        <div className="mt-2 space-y-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2 text-[11px] font-medium text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50">
          {itemConflicts.map((c, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <FiAlertTriangle className="shrink-0 text-amber-600 dark:text-amber-400 text-xs" />
              <span className="line-clamp-1">{c.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Actions Bar */}
      <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 pt-2 text-[11px]">
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
          Activity #{itemIndex + 1}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => duplicateItem(dayIndex, item.id)}
            title="Duplicate"
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
          >
            <FiCopy className="text-xs" />
            <span>Duplicate</span>
          </button>

          <button
            onClick={() => removeItemFromDay(dayIndex, item.id)}
            title="Remove"
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-700 dark:hover:text-rose-300 transition"
          >
            <FiTrash2 className="text-xs" />
            <span>Remove</span>
          </button>
        </div>
      </div>
    </div>
  );
}
