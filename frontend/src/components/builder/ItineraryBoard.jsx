import { useState, useRef, useEffect } from "react";
import {
  FiPlus,
  FiTrash2,
  FiGrid,
  FiLayers,
} from "react-icons/fi";
import { useTripBuilder } from "../../context/TripBuilderContext";
import ItineraryItemCard from "./ItineraryItemCard";

export default function ItineraryBoard() {
  const {
    trip,
    activeDayIndex,
    setActiveDayIndex,
    draggedItem,
    setDraggedItem,
    dragSource,
    setDragSource,
    addItemToDay,
    reorderInDay,
    moveBetweenDays,
    addDay,
    removeDay,
  } = useTripBuilder();

  const [dragOverDayIndex, setDragOverDayIndex] = useState(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState(null);
  const [viewMode, setViewMode] = useState("all"); // 'all' | 'single'

  const dayRefs = useRef({});
  const canvasContainerRef = useRef(null);
  const isProgrammaticScrollRef = useRef(false);

  // Day Tab Click: Scroll smoothly to target day
  const handleDayTabClick = (idx) => {
    setActiveDayIndex(idx);
    if (viewMode === "all") {
      const targetElement = dayRefs.current[idx];
      if (targetElement) {
        isProgrammaticScrollRef.current = true;
        targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 600);
      }
    }
  };

  // Two-way synchronization: On manual scroll, update activeDayIndex based on visible day container
  useEffect(() => {
    if (viewMode !== "all") return;
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return;
      const containerTop = container.getBoundingClientRect().top;

      let closestIdx = 0;
      let minDistance = Infinity;

      trip.itinerary.forEach((_, idx) => {
        const el = dayRefs.current[idx];
        if (el) {
          const rect = el.getBoundingClientRect();
          const distance = Math.abs(rect.top - containerTop);
          if (distance < minDistance) {
            minDistance = distance;
            closestIdx = idx;
          }
        }
      });

      if (closestIdx !== activeDayIndex) {
        setActiveDayIndex(closestIdx);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [trip.itinerary, activeDayIndex, viewMode, setActiveDayIndex]);

  // Item drag start
  const handleDragStartItem = (e, dayIdx, itemIdx, item) => {
    setDraggedItem(item);
    setDragSource({
      type: "itinerary",
      dayIndex: dayIdx,
      itemIndex: itemIdx,
      item,
    });
    e.dataTransfer.setData("application/json", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "move";
  };

  // Day container drag over
  const handleDragOverDay = (e, dayIdx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = dragSource?.type === "catalog" ? "copy" : "move";
    if (dragOverDayIndex !== dayIdx) {
      setDragOverDayIndex(dayIdx);
    }
  };

  // Specific item drag over
  const handleDragOverItem = (e, dayIdx, itemIdx) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverDayIndex(dayIdx);
    setDragOverItemIndex(itemIdx);
  };

  // Drop on Day or Drop Zone
  const handleDropOnDay = (e, targetDayIdx, targetItemIdx = null) => {
    e.preventDefault();
    e.stopPropagation();

    if (!dragSource) {
      try {
        const raw = e.dataTransfer.getData("application/json");
        if (raw) {
          const parsed = JSON.parse(raw);
          addItemToDay(targetDayIdx, parsed, targetItemIdx);
        }
      } catch (err) {
        console.error("Drop parse error:", err);
      }
    } else if (dragSource.type === "catalog") {
      addItemToDay(targetDayIdx, dragSource.item, targetItemIdx);
    } else if (dragSource.type === "itinerary") {
      if (dragSource.dayIndex === targetDayIdx) {
        const toIdx = targetItemIdx !== null ? targetItemIdx : (trip.itinerary[targetDayIdx]?.plan?.length || 1) - 1;
        reorderInDay(targetDayIdx, dragSource.itemIndex, toIdx);
      } else {
        moveBetweenDays(
          dragSource.dayIndex,
          targetDayIdx,
          dragSource.itemIndex,
          targetItemIdx
        );
      }
    }

    setDraggedItem(null);
    setDragSource(null);
    setDragOverDayIndex(null);
    setDragOverItemIndex(null);
  };

  // Days to render based on viewMode
  const daysToRender =
    viewMode === "all"
      ? trip.itinerary
      : [trip.itinerary[activeDayIndex] || trip.itinerary[0]];

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
      {/* Board Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900">
              {trip.destination ? `Itinerary Canvas — ${trip.destination}` : "Itinerary Canvas"}
            </h1>
            <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
              {trip.itinerary.length} Days
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Click Day tabs to jump • Drag to reorder • Customize activity timings
          </p>
        </div>

        {/* View Mode Toggle & Add Day */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-slate-100 p-0.5">
            <button
              onClick={() => setViewMode("all")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                viewMode === "all"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <FiLayers className="text-xs" />
              <span>All Days</span>
            </button>
            <button
              onClick={() => setViewMode("single")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                viewMode === "single"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <FiGrid className="text-xs" />
              <span>Day {activeDayIndex + 1}</span>
            </button>
          </div>

          <button
            onClick={() => addDay()}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 active:scale-98"
          >
            <FiPlus className="text-xs" />
            <span>Add Day</span>
          </button>
        </div>
      </div>

      {/* Synchronized Day Selector Tabs */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {trip.itinerary.map((day, idx) => {
          const isSelected = activeDayIndex === idx;
          const dayCost = (day.plan || []).reduce(
            (sum, item) => sum + (Number(item.price || item.estimatedCost) || 0),
            0
          );

          return (
            <button
              key={day.day || idx}
              onClick={() => handleDayTabClick(idx)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-1.5 text-left transition-all duration-200 ${
                isSelected
                  ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs ring-1 ring-indigo-200 font-bold"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300 hover:bg-white"
              }`}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-extrabold ${
                  isSelected
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                D{idx + 1}
              </div>
              <div>
                <p className="text-[11px] font-bold">Day {idx + 1}</p>
                <p className="text-[9px] text-slate-500 font-medium">
                  {day.plan?.length || 0} items • ₹{dayCost.toLocaleString()}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Days Canvas List */}
      <div
        ref={canvasContainerRef}
        className="mt-3 flex-1 space-y-4 overflow-y-auto pr-1 pb-4 scroll-smooth"
      >
        {daysToRender.map((day) => {
          const actualDayIndex = trip.itinerary.findIndex((d) => d.day === day.day);
          const isTargeted = dragOverDayIndex === actualDayIndex;
          const dayPlan = day.plan || [];
          const dayTotalCost = dayPlan.reduce(
            (sum, item) => sum + (Number(item.price || item.estimatedCost) || 0),
            0
          );

          return (
            <div
              key={day.day}
              ref={(el) => {
                if (el) dayRefs.current[actualDayIndex] = el;
              }}
              onDragOver={(e) => handleDragOverDay(e, actualDayIndex)}
              onDrop={(e) => handleDropOnDay(e, actualDayIndex)}
              className={`rounded-xl border transition-all duration-200 p-3.5 scroll-mt-2 ${
                isTargeted
                  ? "border-indigo-500 bg-indigo-50/30 shadow-sm"
                  : "border-slate-200 bg-slate-50/50"
              }`}
            >
              {/* Day Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-extrabold text-white">
                    {day.day}
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      Day {day.day} — {day.title || "Daily Itinerary"}
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      {dayPlan.length} scheduled items • Day Budget:{" "}
                      <span className="font-bold text-indigo-600">
                        ₹{dayTotalCost.toLocaleString()}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Day Actions */}
                <div className="flex items-center gap-1.5">
                  {trip.itinerary.length > 1 && (
                    <button
                      onClick={() => removeDay(actualDayIndex)}
                      title="Remove Day"
                      className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition"
                    >
                      <FiTrash2 className="text-[10px]" />
                    </button>
                  )}
                </div>
              </div>

              {/* Items List Inside Day */}
              <div className="mt-3 space-y-2.5">
                {dayPlan.length === 0 ? (
                  <div
                    onDragOver={(e) => handleDragOverDay(e, actualDayIndex)}
                    onDrop={(e) => handleDropOnDay(e, actualDayIndex, 0)}
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white p-6 text-center transition hover:border-indigo-400"
                  >
                    <p className="text-xs font-bold text-slate-700">
                      Day {day.day} is currently empty
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      Drag options from the left catalog here or click "+ Add"
                    </p>
                  </div>
                ) : (
                  dayPlan.map((item, itemIdx) => (
                    <div key={item.id || itemIdx}>
                      {/* Insertion indicator if dragging above this item */}
                      {isTargeted && dragOverItemIndex === itemIdx && (
                        <div className="my-1 flex items-center justify-center rounded-md border border-dashed border-indigo-500 bg-indigo-50 py-1 text-[10px] font-bold text-indigo-700">
                          ↓ Insert before this item
                        </div>
                      )}

                      <ItineraryItemCard
                        item={item}
                        dayIndex={actualDayIndex}
                        itemIndex={itemIdx}
                        onDragStartItem={handleDragStartItem}
                        onDragOverItem={handleDragOverItem}
                        onDropOnItem={(e) => handleDropOnDay(e, actualDayIndex, itemIdx)}
                      />
                    </div>
                  ))
                )}

                {/* Bottom "+ Drop Activity" Zone */}
                <div
                  onDragOver={(e) => handleDragOverDay(e, actualDayIndex)}
                  onDrop={(e) => handleDropOnDay(e, actualDayIndex, dayPlan.length)}
                  className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed py-2 text-[11px] font-bold transition-all ${
                    isTargeted
                      ? "border-indigo-600 bg-indigo-100/60 text-indigo-800"
                      : "border-slate-300 bg-white text-slate-500 hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600"
                  }`}
                >
                  <FiPlus className="text-xs" />
                  <span>+ Drop Activity in Day {day.day}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
