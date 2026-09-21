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
      className={`group relative rounded-xl border bg-white p-3 shadow-2xs transition-all duration-150 hover:shadow-xs ${
        hasConflict
          ? "border-amber-300 bg-amber-50/10"
          : "border-[#e7e5e4] hover:border-[#0c0a09]"
      }`}
    >
      {/* Header Row: Time, Sequence, Quick Actions, Drag Handle */}
      <div className="flex items-center justify-between pb-2 border-b border-[#f0efed]">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#fafaf9] border border-[#e7e5e4] text-[10px] font-bold text-[#0c0a09]">
            {itemIndex + 1}
          </span>

          <span className="flex items-center gap-1 text-xs font-semibold text-[#0c0a09]">
            <FiClock className="text-[#034F46] text-xs" />
            <span>
              {item.startTime && item.endTime
                ? `${item.startTime} – ${item.endTime}`
                : item.time || "Flexible Timing"}
            </span>
          </span>

          {item.duration && (
            <span className="rounded-md bg-[#fafaf9] border border-[#e7e5e4] px-1.5 py-0.2 text-[10px] font-medium text-[#57534e]">
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
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-[#777169] hover:bg-[#f5f5f4] hover:text-[#0c0a09] transition"
          >
            <FiEdit2 className="text-[10px]" />
            <span>{isEditingTime ? "Cancel" : "Time"}</span>
          </button>

          <button
            type="button"
            onClick={() => duplicateItem(dayIndex, item.id)}
            title="Duplicate activity"
            className="flex items-center rounded-md p-1 text-[#777169] hover:bg-[#f5f5f4] hover:text-[#0c0a09] transition"
          >
            <FiCopy className="text-[11px]" />
          </button>

          <button
            type="button"
            onClick={() => removeItemFromDay(dayIndex, item.id)}
            title="Remove activity"
            className="flex items-center rounded-md p-1 text-[#777169] hover:bg-rose-50 hover:text-rose-600 transition"
          >
            <FiTrash2 className="text-[11px]" />
          </button>

          <div
            className="flex cursor-grab items-center rounded-md p-1 text-[#a8a29e] hover:bg-[#f5f5f4] hover:text-[#0c0a09] active:cursor-grabbing transition ml-0.5"
            title="Drag to reorder"
          >
            <FiMove className="text-[11px]" />
          </div>
        </div>
      </div>

      {/* Time Editor Inline Drawer */}
      {isEditingTime && (
        <div className="my-2.5 rounded-xl border border-[#e7e5e4] bg-[#fafaf9] p-3 text-xs">
          <p className="font-bold text-[#0c0a09] mb-2">Customize Activity Schedule</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-[#777169] mb-1">Start Time</label>
              <input
                type="text"
                value={startTimeInput}
                onChange={(e) => setStartTimeInput(e.target.value)}
                placeholder="e.g. 10:30 AM"
                className="w-full rounded-lg border border-[#e7e5e4] bg-white px-2 py-1 text-xs font-semibold text-[#0c0a09] outline-none focus:border-[#0c0a09]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#777169] mb-1">End Time</label>
              <input
                type="text"
                value={endTimeInput}
                onChange={(e) => setEndTimeInput(e.target.value)}
                placeholder="e.g. 12:00 PM"
                className="w-full rounded-lg border border-[#e7e5e4] bg-white px-2 py-1 text-xs font-semibold text-[#0c0a09] outline-none focus:border-[#0c0a09]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#777169] mb-1">Travel Buffer (mins)</label>
              <input
                type="number"
                min="0"
                max="120"
                value={bufferInput}
                onChange={(e) => setBufferInput(e.target.value)}
                className="w-full rounded-lg border border-[#e7e5e4] bg-white px-2 py-1 text-xs font-semibold text-[#0c0a09] outline-none focus:border-[#0c0a09]"
              />
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-end gap-2">
            <button
              onClick={handleCancelTime}
              className="rounded-lg border border-[#e7e5e4] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#57534e] hover:bg-[#f5f5f4]"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTime}
              className="flex items-center gap-1 rounded-lg bg-[#0c0a09] px-3 py-1 text-[11px] font-bold text-white hover:bg-[#292524] shadow-xs"
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
          <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-[#e7e5e4]">
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
            <h4 className="text-xs font-bold text-[#0c0a09] line-clamp-1 group-hover:text-[#034F46] transition">
              {item.name || item.activity}
            </h4>
            <span className="shrink-0 text-xs font-bold text-[#034F46]">
              {item.displayPrice ||
                (typeof item.price === "number" && item.price > 0
                  ? `₹${item.price.toLocaleString()}`
                  : "Check rate")}
            </span>
          </div>

          {item.location || item.place ? (
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[#777169]">
              <FiMapPin className="shrink-0 text-[#a8a29e] text-[10px]" />
              <span className="truncate">{item.location || item.place}</span>
            </div>
          ) : null}

          {item.notes && (
            <p className="mt-1 text-[11px] text-[#777169] line-clamp-1">
              {item.notes}
            </p>
          )}

          {/* Badges */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {item.rating && (
              <span className="flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.2 text-[9px] font-bold text-amber-800 border border-amber-200/60">
                <FiStar className="fill-amber-400 text-amber-400 text-[8px]" />
                {item.rating}
              </span>
            )}

            {item.dnaMatch && (
              <span className="rounded-md bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800 border border-emerald-200/60">
                {item.dnaMatch}% Match
              </span>
            )}

            {item.categoryLabel && (
              <span className="rounded-md bg-[#fafaf9] border border-[#e7e5e4] px-1.5 py-0.2 text-[9px] font-medium text-[#57534e]">
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
    </div>
  );
}
