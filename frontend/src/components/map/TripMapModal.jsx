import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  FiX,
  FiMapPin,
  FiMaximize2,
  FiNavigation,
  FiCalendar,
  FiActivity,
  FiHome,
  FiLayers,
  FiList,
  FiMap,
  FiCompass,
  FiDollarSign,
  FiCheckCircle,
  FiAlertTriangle,
  FiArrowRight,
  FiTrendingUp,
  FiClock,
} from "react-icons/fi";
import { useTripBuilder } from "../../context/TripBuilderContext";
import { getPlaceCoordinates } from "../../services/geocodeService";
import { getDuration, formatDate, formatBudget } from "../../utils/formatTrip";

// Verified 100% Keyless, Public Map Tile Layer Providers
const MAP_STYLES = {
  dark: {
    name: "Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    subdomains: "abcd",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    subdomains: "abc",
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP',
  },
  voyager: {
    name: "Voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    subdomains: "abcd",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  standard: {
    name: "Standard",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    subdomains: "abc",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
};

// Helper component to auto-fit map view bounds on coordinates change or button click
function MapBoundsController({ points, focusPoint, triggerReset }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.invalidateSize();

    if (focusPoint && focusPoint.length === 2) {
      map.flyTo(focusPoint, 11, { duration: 1.2 });
    } else if (points && points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 12 });
    } else if (points && points.length === 1) {
      map.setView(points[0], 9);
    }
  }, [map, points, focusPoint, triggerReset]);

  return null;
}

// Create 3D-styled floating leaflet marker pins with elevation and glow
function createCustomMarkerIcon(type, label, isSelected = false) {
  let gradientBg = "bg-gradient-to-b from-indigo-500 via-indigo-600 to-indigo-800";
  let ringStyle = isSelected
    ? "ring-4 ring-indigo-400 shadow-[0_0_25px_rgba(99,102,241,0.8)]"
    : "ring-2 ring-white/90 shadow-lg shadow-indigo-950/40";
  let arrowColor = "border-t-indigo-800";

  if (type === "origin") {
    gradientBg = "bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-800";
    ringStyle = isSelected
      ? "ring-4 ring-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.8)]"
      : "ring-2 ring-white/90 shadow-lg shadow-emerald-950/40";
    arrowColor = "border-t-emerald-800";
  } else if (type === "destination") {
    gradientBg = "bg-gradient-to-b from-purple-500 via-purple-600 to-purple-800";
    ringStyle = isSelected
      ? "ring-4 ring-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.8)]"
      : "ring-2 ring-white/90 shadow-lg shadow-purple-950/40";
    arrowColor = "border-t-purple-800";
  }

  const html = `
    <div class="relative flex flex-col items-center justify-center -translate-x-1/2 -translate-y-full cursor-pointer transition-all duration-300 ${
      isSelected ? "scale-125 z-50" : "hover:scale-110 z-30"
    }">
      ${
        isSelected
          ? '<span class="absolute -top-1.5 -left-1.5 -right-1.5 -bottom-1.5 rounded-full bg-indigo-400/40 animate-ping pointer-events-none"></span>'
          : ""
      }
      <div class="${gradientBg} ${ringStyle} text-white font-black text-[11px] px-3 py-1 rounded-full flex items-center gap-1 min-w-[34px] justify-center tracking-tight">
        <span>${label}</span>
      </div>
      <div class="w-0 h-0 border-x-[5px] border-x-transparent border-t-[6px] ${arrowColor} -mt-0.5"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-map-marker-3d",
    iconSize: [44, 44],
    iconAnchor: [22, 40],
    popupAnchor: [0, -40],
  });
}

// Calculate approximate great-circle distance in kilometers between coordinates
function calculateRouteDistance(points) {
  if (!points || points.length < 2) return null;
  let totalKm = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [lat1, lon1] = points[i];
    const [lat2, lon2] = points[i + 1];
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    totalKm += R * c;
  }
  // Multiply by road/rail detour factor ~1.28
  return Math.round(totalKm * 1.28);
}

export default function TripMapModal({ isOpen, onClose }) {
  const { trip, validationStats, budgetStats } = useTripBuilder();
  const [routeSegments, setRouteSegments] = useState([]);
  const [loadingCoords, setLoadingCoords] = useState(true);
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);
  const [focusCoord, setFocusCoord] = useState(null);
  const [resetCount, setResetCount] = useState(0);
  const [showMobileList, setShowMobileList] = useState(false);
  const [currentMapStyle, setCurrentMapStyle] = useState("dark");

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Load and geocode coordinates dynamically for the active trip
  useEffect(() => {
    if (!isOpen || !trip) return;

    let isMounted = true;
    async function resolveRouteCoordinates() {
      setLoadingCoords(true);
      const segments = [];

      try {
        const sourceName = trip.source || "Origin";
        const destName = trip.destination || "Destination";
        const itinerary = Array.isArray(trip.itinerary) ? trip.itinerary : [];

        // 1. Origin Coordinate
        const sourceCoords = await getPlaceCoordinates(sourceName);
        if (sourceCoords) {
          segments.push({
            type: "origin",
            title: sourceName,
            subtitle: "Journey Departure Point",
            place: sourceName,
            day: 0,
            label: "START",
            coords: sourceCoords,
            activityCount: 0,
            stayCount: 0,
            activities: [],
          });
        }

        // 2. Day-by-day Itinerary Stops (D1 to DN)
        for (let i = 0; i < itinerary.length; i++) {
          const day = itinerary[i];
          const dayNum = day.day || i + 1;
          const plan = Array.isArray(day.plan) ? day.plan : [];

          // Find day's primary place/city or fallback to destination
          const primaryActivity = plan.find((p) => p.place || p.location);
          const placeQuery = primaryActivity?.place || primaryActivity?.location || day.title || destName;

          const dayCoords = await getPlaceCoordinates(placeQuery, destName);

          // Calculate activity & stay counts dynamically
          const activityCount = plan.filter((p) => {
            const cat = (p.category || "").toLowerCase();
            return !cat.includes("hotel") && !cat.includes("stay") && !cat.includes("train") && !cat.includes("flight");
          }).length;

          const stayCount = plan.filter((p) => {
            const cat = (p.category || "").toLowerCase();
            return cat.includes("hotel") || cat.includes("stay");
          }).length;

          // Estimated day cost
          const dayCost = plan.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

          if (dayCoords) {
            segments.push({
              type: "day",
              title: day.title || `Day ${dayNum} — ${destName}`,
              subtitle: primaryActivity?.activity || primaryActivity?.name || `${activityCount} Highlights Planned`,
              place: placeQuery,
              day: dayNum,
              dayIndex: i,
              label: `D${dayNum}`,
              coords: dayCoords,
              activityCount,
              stayCount,
              dayCost,
              activities: plan.slice(0, 4),
            });
          }
        }

        // 3. Final Destination Coordinate
        const destCoords = await getPlaceCoordinates(destName);
        if (destCoords) {
          const lastSeg = segments[segments.length - 1];
          const isSameAsLast = lastSeg && lastSeg.coords[0] === destCoords[0] && lastSeg.coords[1] === destCoords[1];

          if (!isSameAsLast || segments.length === 1) {
            segments.push({
              type: "destination",
              title: destName,
              subtitle: "Final Destination Reached",
              place: destName,
              day: itinerary.length + 1,
              label: "END",
              coords: destCoords,
              activityCount: 0,
              stayCount: 0,
              activities: [],
            });
          }
        }

        if (isMounted) {
          setRouteSegments(segments);
        }
      } catch (err) {
        console.error("Route coordinates resolution error:", err);
      } finally {
        if (isMounted) setLoadingCoords(false);
      }
    }

    resolveRouteCoordinates();
    return () => {
      isMounted = false;
    };
  }, [isOpen, trip]);

  // Extract all points for Polyline
  const allPoints = useMemo(() => {
    return routeSegments.map((s) => s.coords).filter(Boolean);
  }, [routeSegments]);

  // Calculate dynamic approximate distance and duration
  const estDistanceKm = useMemo(() => {
    return calculateRouteDistance(allPoints);
  }, [allPoints]);

  // Handle clicking on a Day card from the sidebar list or floating pills
  const handleSelectDay = useCallback((seg, idx) => {
    setSelectedDayIndex(idx);
    setFocusCoord(seg.coords);
    setShowMobileList(false);
  }, []);

  const handleResetBounds = useCallback(() => {
    setSelectedDayIndex(null);
    setFocusCoord(null);
    setResetCount((prev) => prev + 1);
  }, []);

  if (!isOpen) return null;

  const itineraryDays = routeSegments.filter((s) => s.type === "day");
  const conflictsCount = validationStats?.conflictsCount || 0;
  const isOverBudget = budgetStats?.isOverBudget || false;
  const isReady = conflictsCount === 0 && !isOverBudget && (trip?.itinerary?.length || 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 md:p-6 backdrop-blur-md transition-all duration-300">
      <div
        className="relative flex h-[92vh] w-full max-w-[1550px] flex-col overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#0b0f19] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.5)] transition-colors duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= PREMIUM CINEMATIC HEADER ================= */}
        <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800/80 px-6 sm:px-8 py-4 bg-gradient-to-r from-white via-slate-50 to-white dark:from-[#0b0f19] dark:via-[#111728] dark:to-[#0b0f19] shrink-0 z-10">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 text-white text-xl shadow-lg shadow-indigo-500/25">
              <FiCompass className="animate-spin-slow" />
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest rounded-md bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/80 px-2 py-0.5 text-indigo-700 dark:text-indigo-300">
                  ✈ TRIP ROUTE OVERVIEW
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 px-2 py-0.5 rounded-md">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Route Map
                </span>
              </div>

              <h2 className="mt-1 text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{trip?.source || "Origin"}</span>
                <FiArrowRight className="text-indigo-500 text-base" />
                <span>{trip?.destination || "Destination"}</span>
                <span className="hidden sm:inline-block ml-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {trip?.startDate && trip?.endDate ? `${formatDate(trip.startDate)} – ${formatDate(trip.endDate)} • ` : ""}
                  {getDuration(trip)} • {trip?.travelers || 2} Travelers
                  <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-bold">• ROUTE READY</span>
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Mobile List Toggle */}
            <button
              onClick={() => setShowMobileList((p) => !p)}
              className="md:hidden flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs"
            >
              {showMobileList ? <FiMap /> : <FiList />}
              <span>{showMobileList ? "Map View" : "Journey"}</span>
            </button>

            <button
              onClick={handleResetBounds}
              title="Fit entire route on screen"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-white dark:bg-[#131b2e] px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-xs transition active:scale-95"
            >
              <FiMaximize2 className="text-indigo-500 text-xs" />
              <span>Fit Route</span>
            </button>

            <button
              onClick={onClose}
              title="Close Map (Esc)"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white shadow-xs transition"
            >
              <FiX className="text-base" />
            </button>
          </div>
        </div>

        {/* ================= MODAL BODY ================= */}
        <div className="relative flex flex-1 overflow-hidden">
          {/* LEFT: "YOUR JOURNEY" VERTICAL TIMELINE DRAWER */}
          <div
            className={`${
              showMobileList ? "flex" : "hidden"
            } md:flex w-full md:w-92 shrink-0 flex-col border-r border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#070b14] p-4 sm:p-5 overflow-y-auto z-10`}
          >
            <div className="mb-4 flex items-center justify-between px-1">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                  YOUR JOURNEY
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  {itineraryDays.length} DAYS • {routeSegments.length} STOPS
                </p>
              </div>
              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200/70 dark:border-indigo-800/70 px-2.5 py-0.5 rounded-full shadow-xs">
                {routeSegments.length} Markers
              </span>
            </div>

            <div className="relative space-y-3">
              {/* Vertical connecting route spine */}
              <div className="absolute left-[20px] top-7 bottom-7 w-0.5 bg-gradient-to-b from-emerald-500 via-indigo-500 to-purple-500 opacity-50 pointer-events-none z-0" />

              {routeSegments.map((seg, idx) => {
                const isSelected = selectedDayIndex === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectDay(seg, idx)}
                    className={`group relative z-10 cursor-pointer rounded-2xl border p-3.5 transition-all duration-200 ${
                      isSelected
                        ? "border-indigo-500 bg-white dark:bg-[#131b2e] shadow-xl shadow-indigo-500/15 ring-2 ring-indigo-500/90 -translate-y-0.5"
                        : "border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0f1526] hover:border-indigo-300 dark:hover:border-indigo-700/60 hover:shadow-md shadow-xs"
                    }`}
                  >
                    {/* Active Left Indicator Pill */}
                    {isSelected && (
                      <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-indigo-600 dark:bg-indigo-400" />
                    )}

                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white shadow-md transition-transform group-hover:scale-110 ${
                            seg.type === "origin"
                              ? "bg-gradient-to-br from-emerald-500 to-emerald-700 ring-2 ring-emerald-200 dark:ring-emerald-900"
                              : seg.type === "destination"
                              ? "bg-gradient-to-br from-purple-500 to-purple-700 ring-2 ring-purple-200 dark:ring-purple-900"
                              : "bg-gradient-to-br from-indigo-500 to-indigo-700 ring-2 ring-indigo-200 dark:ring-indigo-900"
                          }`}
                        >
                          {seg.label}
                        </span>

                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                            {seg.title}
                          </h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                            {seg.subtitle}
                          </p>
                        </div>
                      </div>
                    </div>

                    {seg.type === "day" && (
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2 text-[10px] font-semibold">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          {seg.activityCount > 0 && (
                            <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md font-bold">
                              ✦ {seg.activityCount} Activities
                            </span>
                          )}
                          {seg.stayCount > 0 && (
                            <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50 px-1.5 py-0.5 rounded-md">
                              <FiHome className="text-amber-500" />
                              {seg.stayCount} Stay
                            </span>
                          )}
                        </div>

                        {seg.dayCost > 0 && (
                          <span className="font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-200/40 dark:border-indigo-800/40">
                            ₹{seg.dayCost.toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* MAIN: LEAFLET HERO MAP VIEW WITH FLOATING GLASS CONTROLS */}
          <div className="relative flex-1 bg-slate-100 dark:bg-slate-900 overflow-hidden">
            {loadingCoords ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-white dark:bg-[#0b0f19]">
                <div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent shadow-md" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 animate-pulse">
                  Rendering 3D Route Geometry for {trip?.source} → {trip?.destination}...
                </p>
              </div>
            ) : allPoints.length > 0 ? (
              <>
                {/* Floating Quick Day Selector Bar (Top-Center) */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 hidden lg:flex items-center gap-1.5 rounded-2xl border border-slate-200/90 dark:border-slate-700/90 bg-white/95 dark:bg-[#131b2e]/95 p-1.5 shadow-xl backdrop-blur-md">
                  <span className="px-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Stops:
                  </span>
                  {routeSegments.map((seg, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectDay(seg, idx)}
                      className={`px-3 py-1 rounded-xl text-[11px] font-extrabold transition-all duration-200 cursor-pointer ${
                        selectedDayIndex === idx
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/40 scale-105"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {seg.label}
                    </button>
                  ))}
                </div>

                {/* Floating Route Statistics Card (Top-Left on Map) */}
                {estDistanceKm && (
                  <div className="absolute top-4 left-4 z-20 hidden sm:flex items-center gap-3 rounded-2xl border border-slate-200/90 dark:border-slate-700/90 bg-white/90 dark:bg-[#131b2e]/90 px-3.5 py-2 shadow-lg backdrop-blur-md">
                    <div className="flex items-center gap-1.5">
                      <FiTrendingUp className="text-indigo-500 text-xs font-bold" />
                      <div>
                        <p className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">Route Distance</p>
                        <p className="text-xs font-extrabold text-slate-900 dark:text-white">~{estDistanceKm.toLocaleString()} km</p>
                      </div>
                    </div>

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

                    <div className="flex items-center gap-1.5">
                      <FiClock className="text-indigo-500 text-xs font-bold" />
                      <div>
                        <p className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">Total Duration</p>
                        <p className="text-xs font-extrabold text-slate-900 dark:text-white">{getDuration(trip)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Floating Map Style Selector (Bottom-Right on Map) */}
                <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 rounded-2xl border border-slate-200/90 dark:border-slate-700/90 bg-white/95 dark:bg-[#131b2e]/95 p-1 shadow-lg backdrop-blur-md">
                  {Object.entries(MAP_STYLES).map(([key, style]) => (
                    <button
                      key={key}
                      onClick={() => setCurrentMapStyle(key)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                        currentMapStyle === key
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {style.name}
                    </button>
                  ))}
                </div>

                <MapContainer
                  center={allPoints[0]}
                  zoom={6}
                  scrollWheelZoom={true}
                  className="h-full w-full"
                  style={{ height: "100%", width: "100%", zIndex: 1 }}
                >
                  <TileLayer
                    key={currentMapStyle}
                    attribution={MAP_STYLES[currentMapStyle]?.attribution || MAP_STYLES.standard.attribution}
                    url={MAP_STYLES[currentMapStyle]?.url || MAP_STYLES.standard.url}
                    subdomains={MAP_STYLES[currentMapStyle]?.subdomains || "abc"}
                    maxZoom={19}
                  />

                  {/* Auto Bounds Controller */}
                  <MapBoundsController
                    points={allPoints}
                    focusPoint={focusCoord}
                    triggerReset={resetCount}
                  />

                  {/* Wide Route Glow Underlay */}
                  <Polyline
                    positions={allPoints}
                    color="#818cf8"
                    weight={9}
                    opacity={0.4}
                    lineCap="round"
                    lineJoin="round"
                  />

                  {/* Primary Vibrant Animated Dash Polyline */}
                  <Polyline
                    positions={allPoints}
                    color="#4f46e5"
                    weight={4}
                    opacity={0.95}
                    dashArray="12, 8"
                    lineCap="round"
                    lineJoin="round"
                  />

                  {/* 3D-Styled Route Markers */}
                  {routeSegments.map((seg, idx) => (
                    <Marker
                      key={idx}
                      position={seg.coords}
                      icon={createCustomMarkerIcon(seg.type, seg.label, selectedDayIndex === idx)}
                      eventHandlers={{
                        click: () => handleSelectDay(seg, idx),
                      }}
                    >
                      <Popup className="custom-leaflet-popup">
                        <div className="p-1.5 min-w-[220px]">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black text-white shadow-xs ${
                                seg.type === "origin"
                                  ? "bg-emerald-600"
                                  : seg.type === "destination"
                                  ? "bg-purple-600"
                                  : "bg-indigo-600"
                              }`}
                            >
                              {seg.label}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900">{seg.title}</h4>
                          </div>

                          <p className="mt-1.5 text-[11px] text-slate-600 font-semibold flex items-center gap-1">
                            <span>📍 {seg.place}</span>
                          </p>

                          {seg.activities && seg.activities.length > 0 && (
                            <div className="mt-2.5 border-t border-slate-100 pt-2">
                              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                Scheduled Highlights:
                              </p>
                              <ul className="mt-1 space-y-1 text-[11px] text-slate-700 font-medium">
                                {seg.activities.map((act, aIdx) => (
                                  <li key={aIdx} className="flex items-center gap-1.5 truncate">
                                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                                    <span className="truncate">{act.name || act.activity}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-white dark:bg-[#0b0f19] p-6 text-center">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Unable to plot route geometry for {trip?.source} → {trip?.destination}.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ================= MODAL BOTTOM COMMAND BAR ================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/90 dark:bg-[#070b14] px-6 sm:px-8 py-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
          <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <FiCalendar className="text-indigo-500" />
              <span>{getDuration(trip)}</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>{routeSegments.length} STOPS</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>{trip?.travelers || 2} TRAVELERS</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>{trip?.travelMode || "Train"}</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
              {formatBudget(trip?.budget || 50000)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Real-time Feasibility Status */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                isReady
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80"
                  : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/80"
              }`}
            >
              {isReady ? (
                <>
                  <FiCheckCircle className="text-emerald-500" />
                  <span>✓ Ready to finalize your trip • 0 Conflicts • Within Budget</span>
                </>
              ) : conflictsCount > 0 ? (
                <>
                  <FiAlertTriangle className="text-rose-500" />
                  <span>⚠ Resolve {conflictsCount} conflict(s) before finalizing</span>
                </>
              ) : (
                <>
                  <FiAlertTriangle className="text-rose-500" />
                  <span>⚠ Over planned budget</span>
                </>
              )}
            </div>

            <button
              onClick={onClose}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-1.5 text-xs font-bold text-white shadow-md shadow-indigo-600/25 active:scale-95 transition cursor-pointer"
            >
              Close Overview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
