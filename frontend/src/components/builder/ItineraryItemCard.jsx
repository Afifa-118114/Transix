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
      className={`group relative flex flex-col justify-between rounded-xl border bg-white p-3.5 shadow-xs transition-all duration-200 hover:shadow-sm ${
        hasConflict
          ? "border-amber-300 bg-amber-50/20"
          : "border-slate-200/80 hover:border-indigo-300"
      }`}
    >
      {/* Top Row: Time, Sequence, Edit Time, Drag Handle */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-50 text-[10px] font-bold text-indigo-700">
            {itemIndex + 1}
          </span>

          <span className="flex items-center gap-1 text-xs font-semibold text-slate-700">
            <FiClock className="text-indigo-600 text-xs" />
            <span>
              {item.startTime && item.endTime
                ? `${item.startTime} – ${item.endTime}`
                : item.time || "Flexible Timing"}
            </span>
          </span>

          {item.duration && (
            <span className="rounded-md bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-slate-600">
              {item.duration}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Edit Time Trigger */}
          <button
            onClick={() => setIsEditingTime(!isEditingTime)}
            title="Customize activity timing"
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 transition"
          >
            <FiEdit2 className="text-[10px]" />
            <span>{isEditingTime ? "Cancel" : "Edit Time"}</span>
          </button>

          {/* Drag Handle */}
          <div
            className="flex cursor-grab items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 active:cursor-grabbing hover:bg-indigo-50 hover:text-indigo-600 transition"
            title="Drag to reorder or move between days"
          >
            <FiMove className="text-[10px]" />
            <span>Drag</span>
          </div>
        </div>
      </div>

      {/* Time Editor Inline Modal / Drawer */}
      {isEditingTime && (
        <div className="my-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 text-xs">
          <p className="font-bold text-indigo-900 mb-2">Customize Activity Schedule</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Start Time</label>
              <input
                type="text"
                value={startTimeInput}
                onChange={(e) => setStartTimeInput(e.target.value)}
                placeholder="e.g. 10:30 AM"
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">End Time</label>
              <input
                type="text"
                value={endTimeInput}
                onChange={(e) => setEndTimeInput(e.target.value)}
                placeholder="e.g. 12:00 PM"
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Travel Buffer (mins)</label>
              <input
                type="number"
                min="0"
                max="120"
                value={bufferInput}
                onChange={(e) => setBufferInput(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-end gap-2">
            <button
              onClick={handleCancelTime}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
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
          <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
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
            <h4 className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition">
              {item.name || item.activity}
            </h4>
            <span className="shrink-0 text-xs font-extrabold text-indigo-600">
              {item.displayPrice || (typeof item.price === "number" && item.price > 0 ? `₹${item.price.toLocaleString()}` : "Check rate")}
            </span>
          </div>

          {item.location || item.place ? (
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
              <FiMapPin className="shrink-0 text-indigo-500 text-[10px]" />
              <span className="truncate">{item.location || item.place}</span>
            </div>
          ) : null}

          {/* Badges */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {item.rating && (
              <span className="flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                <FiStar className="fill-amber-400 text-amber-400 text-[8px]" />
                {item.rating}
              </span>
            )}

            {item.dnaMatch && (
              <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                {item.dnaMatch}% Match
              </span>
            )}

            {item.categoryLabel && (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600">
                {item.categoryLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Conflict Warnings List */}
      {hasConflict && (
        <div className="mt-2 space-y-1 rounded-lg bg-amber-50 p-2 text-[11px] font-medium text-amber-900 border border-amber-200">
          {itemConflicts.map((c, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <FiAlertTriangle className="shrink-0 text-amber-600 text-xs" />
              <span className="line-clamp-1">{c.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Actions Bar */}
      <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
        <span className="text-[10px] text-slate-400 font-medium">
          Activity #{itemIndex + 1}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => duplicateItem(dayIndex, item.id)}
            title="Duplicate"
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition"
          >
            <FiCopy className="text-xs" />
            <span>Duplicate</span>
          </button>

          <button
            onClick={() => removeItemFromDay(dayIndex, item.id)}
            title="Remove"
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition"
          >
            <FiTrash2 className="text-xs" />
            <span>Remove</span>
          </button>
        </div>
      </div>
    </div>
  );
}
