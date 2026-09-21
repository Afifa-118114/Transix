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
    <div className="flex h-full flex-col rounded-2xl border border-[#e7e5e4] bg-white p-4 shadow-xs transition-colors">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#0c0a09]">Available Options</h2>
            <span className="rounded-full bg-[#034F46]/10 px-2 py-0.5 text-[10px] font-bold text-[#034F46]">
              {filteredItems.length}
            </span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e7e5e4] bg-[#fafaf9] text-[#777169] hover:bg-[#f5f5f4] hover:text-[#0c0a09] transition"
              title="Close Panel"
            >
              <FiX className="text-xs" />
            </button>
          )}
        </div>
        <p className="text-[11px] text-[#777169]">
          Real inventory for {trip.destination || "Destination"}
        </p>
      </div>

      {/* Search Input */}
      <div className="relative mb-2.5">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a29e] text-xs" />
        <input
          type="text"
          placeholder="Search places, hotels, trains..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] py-2 pl-8 pr-7 text-xs text-[#0c0a09] placeholder-[#a8a29e] outline-none transition focus:border-[#0c0a09] focus:bg-white"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#a8a29e] hover:text-[#0c0a09]"
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
                  ? "bg-[#0c0a09] text-white shadow-xs"
                  : "border border-[#e7e5e4] bg-[#fafaf9] text-[#57534e] hover:bg-[#f0efed] hover:text-[#0c0a09]"
              }`}
            >
              <span className={isSelected ? "text-white" : "text-[#777169]"}>
                {getCategoryIcon(cat.id)}
              </span>
              <span>{cat.label}</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? "bg-white/20 text-white" : "bg-[#e7e5e4] text-[#57534e]"
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
              <div key={i} className="h-32 animate-pulse rounded-xl bg-[#f5f5f4] border border-[#e7e5e4]" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-[#e7e5e4] p-4 text-center">
            <p className="text-xs font-semibold text-[#57534e]">No matching options</p>
            <p className="mt-0.5 text-[10px] text-[#a8a29e]">Try adjusting category or search term</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              onDragEnd={handleDragEnd}
              className="group relative cursor-grab overflow-hidden rounded-xl border border-[#e7e5e4] bg-[#fafaf9] p-2.5 shadow-xs transition-all duration-200 hover:border-[#0c0a09] hover:bg-white hover:shadow-sm active:cursor-grabbing"
            >
              {/* Thumbnail & Badges */}
              <div className="relative h-24 w-full overflow-hidden rounded-lg bg-[#e7e5e4]">
                <img
                  src={item.image || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600"}
                  alt={item.name}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Category Pill */}
                <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-xs">
                  {getCategoryIcon(item.category)}
                  <span>{item.categoryLabel}</span>
                </div>

                {/* Rating on image bottom right */}
                {item.rating && (
                  <div className="absolute bottom-1.5 right-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-xs">
                    <FiStar className="fill-amber-400 text-amber-400 text-[9px]" />
                    <span>{item.rating}</span>
                  </div>
                )}
              </div>

              {/* Info Body */}
              <div className="mt-2">
                <div className="flex items-start justify-between gap-1">
                  <h3 className="text-xs font-bold text-[#0c0a09] line-clamp-1 group-hover:text-[#034F46] transition">
                    {item.name}
                  </h3>
                  <span className="shrink-0 text-xs font-bold text-[#034F46]">
                    {item.displayPrice ||
                      (typeof item.price === "number" && item.price > 0
                        ? `₹${item.price.toLocaleString()}`
                        : "Check rate")}
                  </span>
                </div>

                <div className="mt-0.5 flex items-center justify-between text-[10px] text-[#777169]">
                  <span className="flex items-center gap-0.5 truncate">
                    <FiMapPin className="text-[#a8a29e] text-[9px] shrink-0" />
                    <span className="truncate">{item.location || trip.destination}</span>
                  </span>
                  <span className="flex items-center gap-0.5 shrink-0 text-[#a8a29e] ml-1">
                    <FiClock className="text-[9px]" />
                    {item.duration || "Flexible"}
                  </span>
                </div>

                {/* Quick Add Button & Day Dropdown */}
                <div className="mt-2 flex gap-1.5">
                  <button
                    onClick={() => addItemToDay(activeDayIndex, item)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white border border-[#e7e5e4] py-1 text-[11px] font-semibold text-[#0c0a09] transition hover:bg-[#0c0a09] hover:text-white"
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
                      className="flex h-full items-center rounded-lg border border-[#e7e5e4] bg-white px-1.5 text-[#57534e] hover:bg-[#f5f5f4]"
                    >
                      <FiChevronDown className="text-xs" />
                    </button>

                    {activeMenuId === item.id && (
                      <div className="absolute bottom-full right-0 z-30 mb-1 w-36 rounded-xl border border-[#e7e5e4] bg-white p-1 shadow-lg">
                        <p className="px-2 py-0.5 text-[9px] font-bold uppercase text-[#a8a29e]">
                          Select Target Day:
                        </p>
                        {trip.itinerary.map((d, dIdx) => (
                          <button
                            key={dIdx}
                            onClick={() => {
                              addItemToDay(dIdx, item);
                              setActiveMenuId(null);
                            }}
                            className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-[11px] font-semibold text-[#57534e] hover:bg-[#fafaf9] hover:text-[#0c0a09]"
                          >
                            <span>Day {dIdx + 1}</span>
                            <span className="text-[9px] text-[#a8a29e]">
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
