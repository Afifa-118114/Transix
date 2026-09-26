import { useState, useMemo } from "react";
import {
  FiSearch,
  FiMapPin,
  FiStar,
  FiClock,
  FiPlus,
  FiChevronDown,
  FiX,
  FiCompass,
  FiShoppingBag,
  FiSun,
} from "react-icons/fi";
import {
  FaWandMagicSparkles,
  FaHotel,
  FaTrainSubway,
  FaPlaneDeparture,
  FaBus,
  FaUtensils,
  FaCar,
} from "react-icons/fa6";
import { useTripBuilder } from "../../context/TripBuilderContext";
import { CATEGORIES } from "../../data/builderCatalogData";

export default function AvailableOptionsPanel({ onClose }) {
  const {
    destinationInventory,
    isLoadingInventory,
    selectedCategory,
    setSelectedCategory,
    searchTerm,
    setSearchTerm,
    setDraggedItem,
    setDragSource,
    addItemToDay,
    activeDayIndex,
    trip,
  } = useTripBuilder();

  const [activeMenuId, setActiveMenuId] = useState(null);

  // Helper to render SVG icons for categories (ZERO EMOJIS)
  const getCategoryIcon = (catId) => {
    switch (catId?.toLowerCase()) {
      case "hotel":
        return <FaHotel className="text-xs" />;
      case "train":
        return <FaTrainSubway className="text-xs" />;
      case "flight":
        return <FaPlaneDeparture className="text-xs" />;
      case "bus":
        return <FaBus className="text-xs" />;
      case "food":
        return <FaUtensils className="text-xs" />;
      case "activity":
        return <FiCompass className="text-xs" />;
      case "transport":
        return <FaCar className="text-xs" />;
      case "shopping":
        return <FiShoppingBag className="text-xs" />;
      case "experience":
        return <FiSun className="text-xs" />;
      case "all":
      default:
        return <FaWandMagicSparkles className="text-xs" />;
    }
  };

  // Get items list for selected category
  const rawCategoryItems = useMemo(() => {
    if (selectedCategory === "all") return destinationInventory.all || [];
    if (selectedCategory === "hotel") return destinationInventory.hotels || [];
    if (selectedCategory === "activity") return destinationInventory.activities || [];
    if (selectedCategory === "food") return destinationInventory.food || [];
    if (selectedCategory === "train") return destinationInventory.trains || [];
    if (selectedCategory === "flight") return destinationInventory.flights || [];
    if (selectedCategory === "bus") return destinationInventory.buses || [];
    if (selectedCategory === "transport") return destinationInventory.transport || [];
    if (selectedCategory === "experience") return destinationInventory.experiences || [];
    if (selectedCategory === "shopping") return destinationInventory.shopping || [];
    return destinationInventory.all || [];
  }, [destinationInventory, selectedCategory]);

  // Filter items by search term
  const filteredItems = useMemo(() => {
    if (!searchTerm) return rawCategoryItems;
    const term = searchTerm.toLowerCase();
    return rawCategoryItems.filter(
      (item) =>
        item.name?.toLowerCase().includes(term) ||
        item.location?.toLowerCase().includes(term) ||
        item.notes?.toLowerCase().includes(term) ||
        item.categoryLabel?.toLowerCase().includes(term)
    );
  }, [rawCategoryItems, searchTerm]);

  // Category counts
  const categoryCounts = useMemo(() => {
    return {
      all: (destinationInventory.all || []).length,
      hotel: (destinationInventory.hotels || []).length,
      activity: (destinationInventory.activities || []).length,
      food: (destinationInventory.food || []).length,
      train: (destinationInventory.trains || []).length,
      flight: (destinationInventory.flights || []).length,
      bus: (destinationInventory.buses || []).length,
      transport: (destinationInventory.transport || []).length,
      experience: (destinationInventory.experiences || []).length,
      shopping: (destinationInventory.shopping || []).length,
    };
  }, [destinationInventory]);

  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    setDragSource({ type: "catalog", item });
    e.dataTransfer.setData("application/json", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragSource(null);
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-4 shadow-xs transition-colors">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Available Options</h2>
            <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
              {filteredItems.length}
            </span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition"
              title="Close Panel"
            >
              <FiX className="text-xs" />
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Real inventory for {trip.destination || "Destination"}
        </p>
      </div>

      {/* Search Input */}
      <div className="relative mb-2.5">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-xs" />
        <input
          type="text"
          placeholder="Search places, hotels, trains..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 py-2 pl-8 pr-7 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <FiX className="text-xs" />
          </button>
        )}
      </div>

      {/* Category Pills Bar with Dynamic Counts */}
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count = categoryCounts[cat.id] || 0;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                isSelected
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span className={isSelected ? "text-white" : "text-slate-500 dark:text-slate-400"}>
                {getCategoryIcon(cat.id)}
              </span>
              <span>{cat.label}</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                  isSelected
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Draggable Cards List */}
      <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
        {isLoadingInventory ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-4 text-center">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">No matching options</p>
            <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">Try adjusting category or search term</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              onDragEnd={handleDragEnd}
              className="group relative cursor-grab overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-2.5 shadow-xs transition-all duration-200 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-sm active:cursor-grabbing"
            >
              {/* Thumbnail & Badges */}
              <div className="relative h-24 w-full overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-800">
                <img
                  src={item.image || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600"}
                  alt={item.name}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Category Pill */}
                <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-slate-900/80 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-xs">
                  {getCategoryIcon(item.category)}
                  <span>{item.categoryLabel}</span>
                </div>

                {/* Rating on image bottom right */}
                {item.rating && (
                  <div className="absolute bottom-1.5 right-2 flex items-center gap-1 rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-xs">
                    <FiStar className="fill-amber-400 text-amber-400 text-[9px]" />
                    <span>{item.rating}</span>
                  </div>
                )}
              </div>

              {/* Info Body */}
              <div className="mt-2">
                <div className="flex items-start justify-between gap-1">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                    {item.name}
                  </h3>
                  <span className="shrink-0 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {item.displayPrice ||
                      (typeof item.price === "number" && item.price > 0
                        ? `₹${item.price.toLocaleString()}`
                        : "Check rate")}
                  </span>
                </div>

                <div className="mt-0.5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-0.5 truncate">
                    <FiMapPin className="text-slate-400 dark:text-slate-500 text-[9px] shrink-0" />
                    <span className="truncate">{item.location || trip.destination}</span>
                  </span>
                  <span className="flex items-center gap-0.5 shrink-0 text-slate-400 dark:text-slate-500 ml-1">
                    <FiClock className="text-[9px]" />
                    {item.duration || "Flexible"}
                  </span>
                </div>

                {/* Quick Add Button & Day Dropdown */}
                <div className="mt-2 flex gap-1.5">
                  <button
                    onClick={() => addItemToDay(activeDayIndex, item)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200 transition hover:bg-indigo-600 hover:border-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:border-indigo-600 dark:hover:text-white"
                  >
                    <FiPlus className="text-xs" />
                    <span>Add to Day {activeDayIndex + 1}</span>
                  </button>

                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveMenuId(activeMenuId === item.id ? null : item.id)
                      }
                      title="Select Day"
                      className="flex h-full items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <FiChevronDown className="text-xs" />
                    </button>

                    {activeMenuId === item.id && (
                      <div className="absolute bottom-full right-0 z-30 mb-1 w-36 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a233a] p-1 shadow-lg">
                        <p className="px-2 py-0.5 text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500">
                          Select Target Day:
                        </p>
                        {trip.itinerary.map((d, dIdx) => (
                          <button
                            key={dIdx}
                            onClick={() => {
                              addItemToDay(dIdx, item);
                              setActiveMenuId(null);
                            }}
                            className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            <span>Day {dIdx + 1}</span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500">
                              {d.plan?.length || 0} items
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
