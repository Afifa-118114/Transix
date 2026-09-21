import { useState, useRef, useEffect } from "react";
import {
  FiPlus,
  FiTrash2,
  FiGrid,
  FiLayers,
} from "react-icons/fi";
import { FaWandMagicSparkles } from "react-icons/fa6";
import { useTripBuilder } from "../../context/TripBuilderContext";
import ItineraryItemCard from "./ItineraryItemCard";

export default function ItineraryBoard({ isCatalogOpen, onToggleCatalog }) {
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

  // Synchronize activeDayIndex on scroll
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
        const toIdx =
          targetItemIdx !== null
            ? targetItemIdx
            : (trip.itinerary[targetDayIdx]?.plan?.length || 1) - 1;
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
    <div className="flex h-full flex-col">
      {/* Board Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#e7e5e4]">
        <div>
          <div className="flex items-center gap-2">
            <h1
              style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
              className="text-xl sm:text-2xl font-[400] text-[#0c0a09] leading-none"
            >
              {trip.destination ? `Itinerary Canvas — ${trip.destination}` : "Itinerary Canvas"}
            </h1>
            <span className="rounded-full bg-[#034F46]/10 px-2 py-0.5 text-[10px] font-bold text-[#034F46]">
              {trip.itinerary.length} Days
            </span>
          </div>
          <p className="text-[11px] text-[#777169] mt-0.5">
            Organize activities • Customize timings • Reorder by dragging
          </p>
        </div>

        {/* Action Controls: Catalog Toggle, View Switcher, Add Day */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Catalog Open/Close Toggle Button */}
          {onToggleCatalog && (
            <button
              type="button"
              onClick={onToggleCatalog}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                isCatalogOpen
                  ? "bg-[#034F46] text-white shadow-xs"
                  : "border border-[#e7e5e4] bg-white text-[#0c0a09] hover:bg-[#fafaf9] hover:border-[#0c0a09] shadow-2xs"
              }`}
            >
              <FaWandMagicSparkles className="text-xs" />
              <span>{isCatalogOpen ? "Hide Options" : "+ Available Options"}</span>
            </button>
          )}

          {/* View Mode Switcher */}
          <div className="flex rounded-full bg-[#fafaf9] border border-[#e7e5e4] p-0.5">
            <button
              onClick={() => setViewMode("all")}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                viewMode === "all"
                  ? "bg-white text-[#0c0a09] shadow-xs"
                  : "text-[#777169] hover:text-[#0c0a09]"
              }`}
            >
              <FiLayers className="text-xs" />
              <span>All Days</span>
            </button>
            <button
              onClick={() => setViewMode("single")}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                viewMode === "single"
                  ? "bg-white text-[#0c0a09] shadow-xs"
                  : "text-[#777169] hover:text-[#0c0a09]"
              }`}
            >
              <FiGrid className="text-xs" />
              <span>Day {activeDayIndex + 1}</span>
            </button>
          </div>

          {/* Add Day Button */}
          <button
            onClick={() => addDay()}
            className="flex items-center gap-1 rounded-full bg-[#0c0a09] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#292524] active:scale-98"
          >
            <FiPlus className="text-xs" />
            <span>Add Day</span>
          </button>
        </div>
      </div>

      {/* Synchronized Minimalist Day Selector Strip */}
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
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
              className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs transition-all duration-150 ${
                isSelected
                  ? "bg-[#0c0a09] text-white font-semibold shadow-xs"
                  : "border border-[#e7e5e4] bg-white text-[#57534e] hover:border-[#0c0a09] hover:text-[#0c0a09]"
              }`}
            >
              <span className="font-bold">Day {idx + 1}</span>
              <span
                className={`text-[10px] ${
                  isSelected ? "text-stone-300" : "text-[#a8a29e]"
                }`}
              >
                ₹{dayCost.toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Days Editorial Stream (No Heavy Nested Boxes) */}
      <div
        ref={canvasContainerRef}
        className="mt-4 flex-1 space-y-8 overflow-y-auto pr-1 pb-10 scroll-smooth"
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
              className="scroll-mt-4"
            >
              {/* Day Header Bar: Clean & Editorial */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-[#e7e5e4]">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#034F46] text-xs font-bold text-white shadow-xs">
                    {day.day}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[#0c0a09]">
                      {day.title || `Day ${day.day} — Daily Itinerary`}
                    </h3>
                    <p className="text-[11px] text-[#777169]">
                      {dayPlan.length} activities scheduled • Day cost:{" "}
                      <span className="font-semibold text-[#034F46]">
                        ₹{dayTotalCost.toLocaleString()}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Day Action */}
                {trip.itinerary.length > 1 && (
                  <button
                    onClick={() => removeDay(actualDayIndex)}
                    title="Remove Day"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-[#a8a29e] hover:text-rose-600 transition"
                  >
                    <FiTrash2 className="text-xs" />
                  </button>
                )}
              </div>

              {/* Day Activities Stream with Vertical Timeline */}
              <div className="space-y-2.5 pl-2 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-px before:bg-[#e7e5e4] last:before:hidden">
                {dayPlan.length === 0 ? (
                  <div
                    onDragOver={(e) => handleDragOverDay(e, actualDayIndex)}
                    onDrop={(e) => handleDropOnDay(e, actualDayIndex, 0)}
                    className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#e7e5e4] bg-[#fafaf9] p-6 text-center transition hover:border-[#0c0a09]"
                  >
                    <p className="text-xs font-semibold text-[#0c0a09]">
                      No activities scheduled for Day {day.day}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#777169]">
                      Open Available Options to drag or add items
                    </p>
                  </div>
                ) : (
                  dayPlan.map((item, itemIdx) => (
                    <div key={item.id || itemIdx}>
                      {/* Insertion indicator if dragging above this item */}
                      {isTargeted && dragOverItemIndex === itemIdx && (
                        <div className="my-1 flex items-center justify-center rounded-md border border-dashed border-[#0c0a09] bg-stone-100 py-1 text-[10px] font-bold text-[#0c0a09]">
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

                {/* Bottom "+ Drop or Add Activity" Target Row */}
                <div
                  onDragOver={(e) => handleDragOverDay(e, actualDayIndex)}
                  onDrop={(e) => handleDropOnDay(e, actualDayIndex, dayPlan.length)}
                  onClick={onToggleCatalog}
                  className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed py-2 text-[11px] font-medium transition-all ${
                    isTargeted
                      ? "border-[#0c0a09] bg-[#fafaf9] text-[#0c0a09]"
                      : "border-[#e7e5e4] bg-white text-[#777169] hover:border-[#0c0a09] hover:text-[#0c0a09]"
                  }`}
                >
                  <FiPlus className="text-xs" />
                  <span>Add activity to Day {day.day}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
