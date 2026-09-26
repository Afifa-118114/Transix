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
  FiCompass,
  FiMaximize2,
  FiNavigation,
  FiLayers,
  FiMapPin,
  FiClock,
  FiHome,
  FiCheck,
  FiArrowRight,
  FiInfo,
  FiPlus,
  FiMinus,
} from "react-icons/fi";
import { resolveActivityImage } from "../../services/imageService";
import { getDayColor, DAY_COLORS } from "../../utils/itineraryLocationHelper";

// Check if optional free CARTO API key is provided in environment
const cartoApiKey = import.meta.env.VITE_CARTO_API_KEY || "";

// Map tile layers: OpenStreetMap is the primary default, Esri for Satellite, with keyless fallbacks
const TILE_LAYERS = {
  standard: {
    name: "OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    subdomains: "abc",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  voyager: {
    name: "Voyager",
    url: cartoApiKey
      ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${cartoApiKey}`
      : "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    subdomains: cartoApiKey ? "abcd" : "abc",
    attribution: cartoApiKey
      ? '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles by <a href="https://www.hotosm.org/">Humanitarian OSM</a>',
    maxZoom: 19,
  },
  dark: {
    name: "Dark",
    url: cartoApiKey
      ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?api_key=${cartoApiKey}`
      : "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    subdomains: cartoApiKey ? "abcd" : "abc",
    className: cartoApiKey ? "" : "leaflet-tile-dark",
    attribution: cartoApiKey
      ? '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  satellite: {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    subdomains: "abc",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS",
    maxZoom: 18,
  },
};

// Captures map instance safely for outer controls
function MapInstanceCapturer({ onMapReady }) {
  const map = useMap();
  useEffect(() => {
    if (map && onMapReady) {
      onMapReady(map);
    }
  }, [map, onMapReady]);
  return null;
}

// Component to handle auto-fitting bounds and panning to selected location
function MapViewportController({ points, focusPoint, selectedDay, triggerFit }) {
  const map = useMap();
  const prevFocusRef = useRef(null);

  // Invalidate map size whenever container changes
  useEffect(() => {
    if (!map) return;
    map.invalidateSize();
  }, [map]);

  // Auto-fit geographic bounds whenever selectedDay changes, points change, or triggerFit is fired
  useEffect(() => {
    if (!map || !points || points.length === 0) return;

    const timer = setTimeout(() => {
      try {
        map.invalidateSize();

        if (points.length === 1) {
          map.setView(points[0], 13, { animate: true });
        } else {
          const bounds = L.latLngBounds(points);
          if (bounds.isValid()) {
            map.fitBounds(bounds, {
              padding: [50, 50],
              maxZoom: 15,
              animate: true,
              duration: 0.8,
            });
          }
        }
      } catch (err) {
        console.error("Map fitBounds calculation error:", err);
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [map, selectedDay, points, triggerFit]);

  // Handle active focusPoint only when a specific activity is explicitly focused
  useEffect(() => {
    if (!map || !focusPoint || focusPoint.length !== 2) {
      prevFocusRef.current = null;
      return;
    }

    const isNewFocus =
      !prevFocusRef.current ||
      prevFocusRef.current[0] !== focusPoint[0] ||
      prevFocusRef.current[1] !== focusPoint[1];

    if (isNewFocus) {
      prevFocusRef.current = focusPoint;
      map.flyTo(focusPoint, Math.max(map.getZoom(), 14), {
        duration: 0.8,
        easeLinearity: 0.25,
      });
    }
  }, [map, focusPoint]);

  return null;
}

// Custom zoom buttons component that safely uses the captured map instance
function CustomZoomButtons({ map }) {
  if (!map) return null;
  return (
    <div className="flex flex-col rounded-xl overflow-hidden shadow-lg border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-[#131b2e]/95 backdrop-blur-md">
      <button
        type="button"
        title="Zoom In"
        onClick={() => map.zoomIn()}
        className="p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition border-b border-slate-100 dark:border-slate-800 cursor-pointer"
      >
        <FiPlus className="text-sm font-bold" />
      </button>
      <button
        type="button"
        title="Zoom Out"
        onClick={() => map.zoomOut()}
        className="p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
      >
        <FiMinus className="text-sm font-bold" />
      </button>
    </div>
  );
}

// ==============================================================================
// 1. COMPACT DAY-LEVEL MARKER ICON (MODE A: ALL DAYS)
// Displays only one primary day marker per itinerary day: [ DAY 1 ], [ DAY 2 ]...
// ==============================================================================
function createDayLevelMarkerIcon({ dayNumber, dayColor }) {
  const color = dayColor || getDayColor(dayNumber);
  const html = `
    <div class="transix-day-marker-pill group cursor-pointer transition-transform duration-150 hover:scale-110 flex flex-col items-center">
      <div style="background-color: ${color.hex};" class="px-2.5 py-1 rounded-full text-white font-black text-[10px] sm:text-[11px] uppercase tracking-wider shadow-lg border-1.5 border-white flex items-center gap-1.5">
        <span class="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></span>
        <span>DAY ${dayNumber}</span>
      </div>
      <div style="border-top-color: ${color.hex};" class="w-0 h-0 border-x-[4px] border-x-transparent border-t-[5px] -mt-0.5"></div>
    </div>
  `;
  return L.divIcon({
    html,
    className: "transix-day-level-marker",
    iconSize: [68, 28],
    iconAnchor: [34, 26],
    popupAnchor: [0, -26],
  });
}

// ==============================================================================
// 2. COMPACT NUMBERED ACTIVITY MARKER ICON (MODE B: INDIVIDUAL DAY)
// Small 24px circular numbered marker with distinct Start / End indicators
// ==============================================================================
function createActivityMarkerIcon({
  sequenceNumber,
  isFirstInDay,
  isLastInDay,
  isSelected,
  dayColor,
}) {
  const color = dayColor || getDayColor(1);
  const seq = sequenceNumber || 1;

  let pinBg = color.hex;
  let ringStyle = "border-white";

  if (isFirstInDay) {
    pinBg = "#059669"; // Emerald for Start
    ringStyle = "border-white ring-2 ring-emerald-400/80";
  } else if (isLastInDay) {
    pinBg = "#7c3aed"; // Purple for End
    ringStyle = "border-white ring-2 ring-purple-400/80";
  }

  const selectedClass = isSelected
    ? "scale-125 z-50 ring-2 ring-indigo-400 shadow-[0_0_14px_rgba(99,102,241,0.85)]"
    : "hover:scale-110 z-20 shadow-md";

  const html = `
    <div class="flex flex-col items-center cursor-pointer transition-transform duration-150">
      <div style="background-color: ${pinBg};" class="h-6 w-6 rounded-full text-white font-extrabold text-[10px] border-1.5 ${ringStyle} flex items-center justify-center ${selectedClass}">
        ${seq}
      </div>
      <div style="border-top-color: ${pinBg};" class="w-0 h-0 border-x-[3.5px] border-x-transparent border-t-[4px] -mt-0.5"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "transix-activity-pin",
    iconSize: [26, 32],
    iconAnchor: [13, 28],
    popupAnchor: [0, -28],
  });
}

export default function ItineraryMap({
  trip,
  selectedDay, // "all" or 0-based day index
  selectedLocationId,
  onSelectLocation,
  onSelectDay,
  mappableLocations = [],
  dayPolylines = {},
  dayRouteSegments = {},
  interDayConnections = [],
  dayStartLocations = [],
  allDaysPolyline = [],
  loading = false,
  unmappableCount = 0,
  onViewInItinerary,
}) {
  const [activeTileLayer, setActiveTileLayer] = useState("standard");
  const [fitTrigger, setFitTrigger] = useState(0);
  const [legendOpen, setLegendOpen] = useState(true);
  const [locationImage, setLocationImage] = useState("");
  const [mapInstance, setMapInstance] = useState(null);
  const markerRefs = useRef({});

  // Active day index and day number calculation
  const isAllDays = selectedDay === "all";
  const activeDayNumber = isAllDays ? null : Number(selectedDay) + 1;

  // Layer Visibility Controls
  const [layers, setLayers] = useState({
    routes: true,
  });

  // ==============================================================================
  // DATA FILTERING FOR THE TWO MODES
  // ==============================================================================

  // MODE A (ALL DAYS): Only one primary day marker per day (from dayStartLocations)
  // MODE B (INDIVIDUAL DAY): All mapped activities belonging to the selected day
  const visibleDayMarkers = useMemo(() => {
    if (!isAllDays) return [];
    return dayStartLocations.filter((d) => d.coordinates && d.coordinates.length === 2);
  }, [isAllDays, dayStartLocations]);

  const visibleActivityLocations = useMemo(() => {
    if (isAllDays) return []; // In All Days mode, do NOT display individual activity markers
    return mappableLocations.filter((loc) => loc.day === activeDayNumber);
  }, [isAllDays, activeDayNumber, mappableLocations]);

  // Points for calculating auto-fit map bounds
  const boundsPoints = useMemo(() => {
    if (isAllDays) {
      // In All Days mode, fit the complete journey across all day markers
      return visibleDayMarkers.map((d) => d.coordinates).filter(Boolean);
    } else {
      // In Individual Day mode, fit this day's mapped activities and route polyline
      const pts = [];
      visibleActivityLocations.forEach((loc) => {
        if (loc.coordinates) pts.push(loc.coordinates);
      });
      const dayPoly = dayPolylines[activeDayNumber];
      if (Array.isArray(dayPoly)) {
        dayPoly.forEach((p) => {
          if (p) pts.push(p);
        });
      }
      return pts;
    }
  }, [isAllDays, visibleDayMarkers, visibleActivityLocations, dayPolylines, activeDayNumber]);

  // All Days inter-day route coordinates connecting day markers in chronological order
  const allDaysRoutePositions = useMemo(() => {
    if (!isAllDays || visibleDayMarkers.length < 2) return [];
    return visibleDayMarkers.map((d) => d.coordinates).filter(Boolean);
  }, [isAllDays, visibleDayMarkers]);

  // Selected Location Object
  const selectedLocation = useMemo(() => {
    if (!selectedLocationId) return null;
    return mappableLocations.find((l) => l.id === selectedLocationId) || null;
  }, [selectedLocationId, mappableLocations]);

  // Load image when selected location changes
  useEffect(() => {
    if (!selectedLocation) {
      setLocationImage("");
      return;
    }
    if (selectedLocation.image) {
      setLocationImage(selectedLocation.image);
      return;
    }

    let isMounted = true;
    async function loadImg() {
      const res = await resolveActivityImage(selectedLocation, trip?.destination);
      if (isMounted && res?.url) setLocationImage(res.url);
    }
    loadImg();
    return () => {
      isMounted = false;
    };
  }, [selectedLocation, trip?.destination]);

  // Open Leaflet popup programmatically when selectedLocation changes
  useEffect(() => {
    if (selectedLocation && markerRefs.current[selectedLocation.id]) {
      const marker = markerRefs.current[selectedLocation.id];
      if (marker && marker.openPopup) {
        marker.openPopup();
      }
    }
  }, [selectedLocation]);

  // Connected segments for the currently selected location (for highlighting)
  const highlightedSegments = useMemo(() => {
    if (!selectedLocationId || !layers.routes || isAllDays) return [];
    const segments = [];
    Object.values(dayRouteSegments).forEach((daySegs) => {
      if (Array.isArray(daySegs)) {
        daySegs.forEach((seg) => {
          if (seg.fromId === selectedLocationId || seg.toId === selectedLocationId) {
            segments.push(seg);
          }
        });
      }
    });
    return segments;
  }, [selectedLocationId, dayRouteSegments, layers.routes, isAllDays]);

  const handleFitAll = () => {
    if (mapInstance && boundsPoints.length > 0) {
      mapInstance.invalidateSize();
      if (boundsPoints.length === 1) {
        mapInstance.setView(boundsPoints[0], 13);
      } else {
        const bounds = L.latLngBounds(boundsPoints);
        if (bounds.isValid()) {
          mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
      }
    } else {
      setFitTrigger((prev) => prev + 1);
    }
  };

  const initialCenter = boundsPoints[0] || [20.5937, 78.9629];

  return (
    <div className="relative h-full w-full rounded-2xl overflow-hidden border border-slate-200/90 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-sm flex flex-col">
      {/* ================= TOP FLOATING CONTROL BAR ================= */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Map Tile Selector */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-[#131b2e]/95 p-1 shadow-md backdrop-blur-md pointer-events-auto">
          {Object.entries(TILE_LAYERS).map(([key, style]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTileLayer(key)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                activeTileLayer === key
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {style.name}
            </button>
          ))}
        </div>

        {/* Right: Auto-Fit Button & Status Pill */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="hidden sm:flex items-center gap-1.5 rounded-xl bg-white/95 dark:bg-[#131b2e]/95 border border-slate-200/90 dark:border-slate-800 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-md backdrop-blur-md">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: isAllDays
                  ? "#4f46e5"
                  : getDayColor(activeDayNumber).hex,
              }}
            />
            <span>
              {isAllDays
                ? `${visibleDayMarkers.length} Days Overview`
                : `Day ${activeDayNumber} (${visibleActivityLocations.length} Stops)`}
            </span>
          </span>

          <button
            type="button"
            onClick={handleFitAll}
            title="Auto-Fit Map"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-[#131b2e]/95 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-md hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95 cursor-pointer backdrop-blur-md"
          >
            <FiMaximize2 className="text-indigo-600 dark:text-indigo-400 text-xs" />
            <span className="hidden sm:inline">Fit Route</span>
          </button>
        </div>
      </div>

      {/* ================= MODE-SPECIFIC COMPACT LEGEND ================= */}
      <div className="absolute top-14 left-3 z-30 max-w-xs transition-all duration-200">
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-[#131b2e]/95 p-2.5 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
              {isAllDays ? "Trip Legend" : `Day ${activeDayNumber} Legend`}
            </span>
            <button
              type="button"
              onClick={() => setLegendOpen((prev) => !prev)}
              className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            >
              {legendOpen ? "Collapse" : "Show"}
            </button>
          </div>

          {legendOpen && (
            <div className="mt-2 space-y-1.5 text-[10px] font-medium text-slate-700 dark:text-slate-300">
              {isAllDays ? (
                /* ALL DAYS LEGEND */
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[8px] font-black uppercase">
                      DAY 1
                    </div>
                    <span>
                      <strong className="text-slate-900 dark:text-white">Day Marker</strong> (Start of each day)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="h-0.5 w-4 border-t-2 border-dashed border-indigo-600 shrink-0" />
                    <span>
                      <strong className="text-indigo-600 dark:text-indigo-400">Journey Route</strong> (Between days)
                    </span>
                  </div>

                  {/* Quick jump to day */}
                  {visibleDayMarkers.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-1">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Explore Day Route:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {visibleDayMarkers.map((d) => (
                          <button
                            key={d.day}
                            type="button"
                            onClick={() => onSelectDay && onSelectDay(d.dayIndex)}
                            style={{ borderColor: d.color.hex }}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: d.color.hex }}
                            />
                            <span>Day {d.day}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* INDIVIDUAL DAY LEGEND */
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-emerald-600 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                      1
                    </div>
                    <span>
                      <strong className="text-emerald-700 dark:text-emerald-400">Start</strong> (First stop of day)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                      2
                    </div>
                    <span>
                      <strong>Activity Stop</strong> (Itinerary sequence)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-purple-600 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                      ■
                    </div>
                    <span>
                      <strong className="text-purple-700 dark:text-purple-400">End</strong> (Final stop of day)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="h-0.5 w-4 bg-indigo-600 shrink-0 border-t-2 border-indigo-600" />
                    <span>
                      <strong>Within-Day Route</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full border-2 border-indigo-500 bg-indigo-100 dark:bg-indigo-950 shrink-0" />
                    <span>
                      <strong className="text-indigo-600 dark:text-indigo-400">Selected Stop</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================= FLOATING ZOOM BUTTONS ================= */}
      <div className="absolute bottom-4 right-4 z-30 flex flex-col gap-2">
        <CustomZoomButtons map={mapInstance} />
      </div>

      {/* ================= LOADING SPINNER OVERLAY ================= */}
      {loading && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 bg-white/70 dark:bg-[#0b0f19]/70 backdrop-blur-xs">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Resolving journey coordinates & routes...
          </p>
        </div>
      )}

      {/* ================= SELECTED LOCATION DETAILS BOTTOM CARD ================= */}
      {!isAllDays && selectedLocation && (
        <div className="absolute bottom-4 left-4 right-16 sm:right-auto sm:max-w-sm z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131b2e] p-3 shadow-2xl backdrop-blur-md">
            <div className="flex gap-2.5">
              {locationImage ? (
                <img
                  src={locationImage}
                  alt={selectedLocation.name}
                  className="h-16 w-16 shrink-0 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <div className="h-16 w-16 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg text-indigo-500 font-bold border border-slate-200 dark:border-slate-700">
                  📍
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedLocation.sequenceNumber && (
                    <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[9px] font-black">
                      Stop #{selectedLocation.sequenceNumber}
                    </span>
                  )}
                  {selectedLocation.day && selectedLocation.day !== "stay" && (
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      Day {selectedLocation.day}
                    </span>
                  )}
                  {selectedLocation.time && (
                    <span className="text-[10px] text-slate-400 font-medium">
                      • {selectedLocation.time}
                    </span>
                  )}
                </div>

                <h4 className="mt-1 text-xs font-bold text-slate-900 dark:text-white truncate">
                  {selectedLocation.name}
                </h4>

                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                  <FiMapPin className="text-indigo-500 shrink-0 text-[10px]" />
                  <span>{selectedLocation.place || selectedLocation.address}</span>
                </p>

                {onViewInItinerary && (
                  <button
                    type="button"
                    onClick={() => onViewInItinerary(selectedLocation)}
                    className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
                  >
                    <span>View Activity</span>
                    <FiArrowRight className="text-[9px]" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= LEAFLET MAP CONTAINER ================= */}
      {boundsPoints.length > 0 ? (
        <MapContainer
          center={initialCenter}
          zoom={10}
          scrollWheelZoom={true}
          zoomControl={false}
          className="h-full w-full"
          style={{ height: "100%", width: "100%", zIndex: 1 }}
        >
          {/* Base Tile Layer */}
          <TileLayer
            key={activeTileLayer}
            attribution={TILE_LAYERS[activeTileLayer].attribution}
            url={TILE_LAYERS[activeTileLayer].url}
            subdomains={TILE_LAYERS[activeTileLayer].subdomains || "abc"}
            className={TILE_LAYERS[activeTileLayer].className || ""}
            maxZoom={TILE_LAYERS[activeTileLayer].maxZoom || 19}
          />

          {/* Map Instance Capturer for Custom Zoom Controls */}
          <MapInstanceCapturer onMapReady={setMapInstance} />

          {/* Viewport Bounds Controller */}
          <MapViewportController
            points={boundsPoints}
            focusPoint={selectedLocation?.coordinates}
            selectedDay={selectedDay}
            triggerFit={fitTrigger}
          />

          {/* ============================================================================== */}
          {/* MODE A: ALL DAYS ROUTE & MARKERS                                               */}
          {/* ============================================================================== */}
          {isAllDays && (
            <>
              {/* Inter-day progression route connecting Day 1 -> Day 2 -> Day 3 */}
              {layers.routes && allDaysRoutePositions.length > 1 && (
                <>
                  <Polyline
                    positions={allDaysRoutePositions}
                    color="#818cf8"
                    weight={6}
                    opacity={0.3}
                    lineCap="round"
                    lineJoin="round"
                  />
                  <Polyline
                    positions={allDaysRoutePositions}
                    color="#4f46e5"
                    weight={3}
                    opacity={0.9}
                    dashArray="6, 6"
                    lineCap="round"
                    lineJoin="round"
                  />
                </>
              )}

              {/* Day-level markers: Exactly one marker per day */}
              {visibleDayMarkers.map((d) => (
                <Marker
                  key={`day-level-marker-${d.day}`}
                  position={d.coordinates}
                  icon={createDayLevelMarkerIcon({
                    dayNumber: d.day,
                    dayColor: d.color,
                  })}
                  eventHandlers={{
                    click: () => onSelectDay && onSelectDay(d.dayIndex),
                  }}
                >
                  <Popup className="custom-leaflet-popup">
                    <div className="p-1 min-w-[170px] text-center">
                      <div
                        style={{ backgroundColor: d.color.hex }}
                        className="inline-block text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full mb-1"
                      >
                        DAY {d.day}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {d.title || `Day ${d.day} Journey`}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        📍 Starts at {d.locationName}
                      </p>
                      <button
                        type="button"
                        onClick={() => onSelectDay && onSelectDay(d.dayIndex)}
                        className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        <span>Explore Day {d.day} Route</span>
                        <FiArrowRight className="text-[9px]" />
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </>
          )}

          {/* ============================================================================== */}
          {/* MODE B: INDIVIDUAL DAY ROUTE & NUMBERED ACTIVITY MARKERS                       */}
          {/* ============================================================================== */}
          {!isAllDays && (
            <>
              {/* Within-Day Route connecting consecutive activities 1 -> 2 -> 3 */}
              {layers.routes && dayPolylines[activeDayNumber]?.length > 1 && (
                <>
                  <Polyline
                    positions={dayPolylines[activeDayNumber]}
                    color={getDayColor(activeDayNumber).glow}
                    weight={6}
                    opacity={0.3}
                    lineCap="round"
                    lineJoin="round"
                  />
                  <Polyline
                    positions={dayPolylines[activeDayNumber]}
                    color={getDayColor(activeDayNumber).hex}
                    weight={3}
                    opacity={0.9}
                    dashArray="6, 5"
                    lineCap="round"
                    lineJoin="round"
                  />
                </>
              )}

              {/* Selected Activity Adjacent Segment Highlight */}
              {highlightedSegments.map((seg) => (
                <Polyline
                  key={`highlight-${seg.id}`}
                  positions={seg.positions}
                  color="#4f46e5"
                  weight={5}
                  opacity={1.0}
                  dashArray="4, 4"
                  lineCap="round"
                  lineJoin="round"
                />
              ))}

              {/* Numbered Activity Markers for this day */}
              {visibleActivityLocations.map((loc) => {
                const isSelected = selectedLocationId === loc.id;

                return (
                  <Marker
                    key={loc.id}
                    position={loc.displayCoordinates || loc.coordinates}
                    ref={(ref) => {
                      if (ref) markerRefs.current[loc.id] = ref;
                    }}
                    icon={createActivityMarkerIcon({
                      sequenceNumber: loc.sequenceNumber,
                      isFirstInDay: loc.isFirstInDay,
                      isLastInDay: loc.isLastInDay,
                      isSelected,
                      dayColor: loc.dayColor,
                    })}
                    eventHandlers={{
                      click: () => onSelectLocation(loc),
                    }}
                  >
                    <Popup className="custom-leaflet-popup">
                      <div className="p-1 min-w-[200px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {loc.isFirstInDay && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-white bg-emerald-600">
                              Start
                            </span>
                          )}
                          {loc.isLastInDay && !loc.isFirstInDay && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-white bg-purple-600">
                              End
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-slate-600">
                            Stop #{loc.sequenceNumber} • Day {loc.day}
                          </span>
                        </div>

                        <h4 className="mt-1 text-xs font-bold text-slate-900 leading-snug">
                          {loc.name}
                        </h4>

                        {loc.category && (
                          <span className="inline-block mt-0.5 text-[9px] font-semibold text-slate-500 capitalize">
                            Category: {loc.category}
                          </span>
                        )}

                        {loc.place && (
                          <p className="text-[10px] text-slate-600 mt-0.5 flex items-center gap-1">
                            <span>📍</span>
                            <span className="truncate">{loc.place}</span>
                          </p>
                        )}

                        {loc.time && (
                          <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                            <span>🕒</span>
                            <span>{loc.time}</span>
                          </p>
                        )}

                        {onViewInItinerary && (
                          <button
                            type="button"
                            onClick={() => onViewInItinerary(loc)}
                            className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                          >
                            <span>View Activity</span>
                            <FiArrowRight className="text-[9px]" />
                          </button>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </>
          )}
        </MapContainer>
      ) : (
        /* Empty State for Day with No Mapped Locations */
        <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center bg-white dark:bg-[#0b0f19]">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl mb-3 shadow-xs">
            <FiMapPin />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {isAllDays
              ? "No Verified Map Coordinates Found"
              : `No Mapped Locations for Day ${activeDayNumber}`}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1">
            {isAllDays
              ? "This journey currently has no verified geographic coordinates. The full itinerary is available in the timeline panel."
              : `Activities scheduled for Day ${activeDayNumber} do not have verified coordinates. The complete timeline remains available.`}
          </p>
          {!isAllDays && (
            <button
              type="button"
              onClick={() => onSelectDay && onSelectDay("all")}
              className="mt-4 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition cursor-pointer shadow-xs"
            >
              View All Days Map
            </button>
          )}
        </div>
      )}
    </div>
  );
}
