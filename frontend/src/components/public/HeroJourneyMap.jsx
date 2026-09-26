import React, { useState, useEffect, useRef } from "react";
import keralaMapBg from "../../assets/travel/kerala_journey_map_bg.jpg";

/**
 * Transix Hero — Final Premium Hybrid Design with Destination Labels Above Route
 * Combines Option 4 (Photographic Landscape Blend) + Option 2 (Floating Destination Cards).
 * All 5 destination cards sit firmly ABOVE their route markers and route spline.
 * Continuous moving white dot travels along the curved route with synchronized reveals.
 */
const DESTINATIONS = [
  {
    id: "kochi",
    name: "Kochi",
    day: "Day 1",
    image:
      "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=160&q=80",
    pos: { left: "10%", top: "52%" },
    align: "-translate-x-[15%]",
    svgX: 100,
    svgY: 125,
    color: "#38bdf8", // Cyan
    mobileKey: true,
    revealThreshold: 0.0,
    activeRange: [0.0, 0.08],
  },
  {
    id: "munnar",
    name: "Munnar",
    day: "Day 2",
    image:
      "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=160&q=80",
    pos: { left: "28%", top: "32%" },
    align: "-translate-x-[35%]",
    svgX: 280,
    svgY: 77,
    color: "#818cf8", // Indigo
    mobileKey: false,
    revealThreshold: 0.22,
    activeRange: [0.21, 0.29],
  },
  {
    id: "alleppey",
    name: "Alleppey",
    day: "Day 3",
    image:
      "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=160&q=80",
    pos: { left: "48%", top: "58.3%" },
    align: "-translate-x-[50%]",
    svgX: 480,
    svgY: 140,
    color: "#a855f7", // Purple
    mobileKey: true,
    revealThreshold: 0.46,
    activeRange: [0.46, 0.54],
  },
  {
    id: "thekkady",
    name: "Thekkady",
    day: "Day 4",
    image:
      "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=160&q=80",
    pos: { left: "68%", top: "41.7%" },
    align: "-translate-x-[65%]",
    svgX: 680,
    svgY: 100,
    color: "#c084fc", // Violet
    mobileKey: false,
    revealThreshold: 0.71,
    activeRange: [0.71, 0.79],
  },
  {
    id: "kovalam",
    name: "Kovalam",
    day: "Day 5",
    image:
      "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=160&q=80",
    pos: { left: "88%", top: "56.3%" },
    align: "-translate-x-[85%]",
    svgX: 880,
    svgY: 135,
    color: "#38bdf8", // Cyan
    mobileKey: true,
    revealThreshold: 0.94,
    activeRange: [0.93, 1.0],
  },
];

// Ambient underglow trail that gracefully spans across the lower terrain
const AMBIENT_TRAIL_PATH =
  "M 30 135 C 60 130, 80 125, 100 125 C 160 125, 210 77, 280 77 C 350 77, 410 140, 480 140 C 550 140, 610 100, 680 100 C 750 100, 810 135, 880 135 C 920 135, 950 130, 975 125";

// Active journey path running strictly from Kochi (100, 125) to Kovalam (880, 135)
const ACTIVE_JOURNEY_PATH =
  "M 100 125 C 160 125, 210 77, 280 77 C 350 77, 410 140, 480 140 C 550 140, 610 100, 680 100 C 750 100, 810 135, 880 135";

// One complete journey cycle: ~7.2 seconds (steady, tranquil travel pace)
const JOURNEY_DURATION = 7200;

export default function HeroJourneyMap() {
  const pathRef = useRef(null);
  const routeDrawRef = useRef(null);
  const dotRef = useRef(null);
  const haloRef = useRef(null);

  // Synchronized animation states
  const [revealedIds, setRevealedIds] = useState(() => new Set(["kochi"]));
  const [activeId, setActiveId] = useState("kochi");

  const revealedRef = useRef(new Set(["kochi"]));
  const activeIdRef = useRef("kochi");

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;

    let totalLength = 800;
    try {
      totalLength = path.getTotalLength();
    } catch (_) {
      totalLength = 800;
    }

    // Initialize route draw line
    if (routeDrawRef.current) {
      routeDrawRef.current.style.strokeDasharray = `${totalLength}`;
      routeDrawRef.current.style.strokeDashoffset = `${totalLength}`;
    }

    // Set initial dot position immediately at Kochi (t=0)
    try {
      const initialPoint = path.getPointAtLength(0);
      if (dotRef.current) {
        dotRef.current.setAttribute("cx", `${initialPoint.x}`);
        dotRef.current.setAttribute("cy", `${initialPoint.y}`);
        dotRef.current.setAttribute("opacity", "1");
      }
      if (haloRef.current) {
        haloRef.current.setAttribute("cx", `${initialPoint.x}`);
        haloRef.current.setAttribute("cy", `${initialPoint.y}`);
        haloRef.current.setAttribute("opacity", "0.4");
      }
    } catch (_) {}

    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setRevealedIds(new Set(DESTINATIONS.map((d) => d.id)));
      if (routeDrawRef.current) {
        routeDrawRef.current.style.strokeDashoffset = "0";
      }
      return;
    }

    let animationFrameId;
    let startTime = null;

    const tick = (now) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;

      // Overall timeline progress (used for initial sequential reveals)
      const totalProgress = elapsed / JOURNEY_DURATION;
      // Looping progress 0.0 -> 1.0 (used for the traveling dot)
      const loopProgress = (elapsed % JOURNEY_DURATION) / JOURNEY_DURATION;

      // 1. Calculate current SVG position along the route
      const currentDistance = loopProgress * totalLength;
      try {
        const point = path.getPointAtLength(currentDistance);

        // Soft edge opacity for seamless loop:
        // Kovalam (0.97 -> 1.0): dissolves out over ~200ms
        // Kochi (0.0 -> 0.03): dissolves in as the new journey begins
        let dotOpacity = 1.0;
        if (loopProgress < 0.03) {
          dotOpacity = Math.max(0.1, loopProgress / 0.03);
        } else if (loopProgress > 0.97) {
          dotOpacity = Math.max(0.0, (1 - loopProgress) / 0.03);
        }

        if (dotRef.current) {
          dotRef.current.setAttribute("cx", `${point.x}`);
          dotRef.current.setAttribute("cy", `${point.y}`);
          dotRef.current.setAttribute("opacity", `${dotOpacity}`);
        }
        if (haloRef.current) {
          haloRef.current.setAttribute("cx", `${point.x}`);
          haloRef.current.setAttribute("cy", `${point.y}`);
          haloRef.current.setAttribute("opacity", `${dotOpacity * 0.45}`);
        }
      } catch (_) {}

      // 2. Synchronize route stroke-draw during first pass
      if (routeDrawRef.current) {
        if (totalProgress < 1.0) {
          const offset = totalLength * (1 - totalProgress);
          routeDrawRef.current.style.strokeDashoffset = `${offset}`;
        } else {
          routeDrawRef.current.style.strokeDashoffset = "0";
        }
      }

      // 3. Synchronize Destination Reveals
      let needsRevealUpdate = false;
      const currentRevealed = revealedRef.current;
      DESTINATIONS.forEach((dest) => {
        if (totalProgress >= dest.revealThreshold && !currentRevealed.has(dest.id)) {
          currentRevealed.add(dest.id);
          needsRevealUpdate = true;
        }
      });
      if (needsRevealUpdate) {
        setRevealedIds(new Set(currentRevealed));
      }

      // 4. Synchronize Active Destination Highlight
      let currentActive = null;
      for (const dest of DESTINATIONS) {
        if (loopProgress >= dest.activeRange[0] && loopProgress <= dest.activeRange[1]) {
          currentActive = dest.id;
          break;
        }
      }
      if (currentActive !== activeIdRef.current) {
        activeIdRef.current = currentActive;
        setActiveId(currentActive);
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      aria-label="Transix Cinematic Journey Route"
      className="relative w-full h-full min-h-[280px] sm:min-h-[320px] flex-1 select-none overflow-hidden flex flex-col justify-end"
    >
      {/* 
        =========================================================
        OPTION 4 FOUNDATION: Photographic Landscape Blend
        Panoramic aerial coastal-hill scenery with soft 4-edge masking
        and subtle blur. Sits below the route and destination labels.
        =========================================================
      */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          maskImage:
            "radial-gradient(ellipse 95% 82% at 50% 55%, black 45%, transparent 98%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 95% 82% at 50% 55%, black 45%, transparent 98%)",
        }}
      >
        <img
          src={keralaMapBg}
          alt=""
          className="w-full h-full object-cover object-bottom filter blur-[2px] sm:blur-[3px] scale-105 opacity-55 dark:opacity-30 transition-opacity duration-1000"
          loading="eager"
        />
        {/* Soft atmospheric tint overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/[0.03] via-transparent to-purple-500/[0.04] pointer-events-none" />
      </div>

      {/* 
        Soft Gradient Edge Fades (Top, Bottom, Left, Right)
        Guarantees NO rectangular photo edges and natural section transition.
      */}
      <div className="absolute top-0 inset-x-0 h-14 sm:h-18 bg-gradient-to-b from-[#f8faff] dark:from-[#0b0f19] via-[#f8faff]/85 dark:via-[#0b0f19]/85 to-transparent z-10 pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-12 sm:h-16 bg-gradient-to-t from-[#f8faff] dark:from-[#0b0f19] via-[#f8faff]/90 dark:via-[#0b0f19]/90 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 left-0 w-16 sm:w-28 md:w-44 bg-gradient-to-r from-[#f8faff] dark:from-[#0b0f19] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-16 sm:w-28 md:w-44 bg-gradient-to-l from-[#f8faff] dark:from-[#0b0f19] to-transparent z-10 pointer-events-none" />

      {/* 
        =========================================================
        JOURNEY ROUTE & FLOATING DESTINATION CARDS LAYER
        Sits atop the landscape, below the Hero typography.
        =========================================================
      */}
      <div className="relative z-20 w-full h-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center">
        {/* Continuous Flowing SVG Route */}
        <svg
          viewBox="0 0 1000 240"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
        >
          <defs>
            {/* Refined Transix Brand Gradient: Blue -> Purple -> Cyan */}
            <linearGradient id="hybridRouteGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
              <stop offset="25%" stopColor="#818cf8" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#a855f7" stopOpacity="0.95" />
              <stop offset="75%" stopColor="#c084fc" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.85" />
            </linearGradient>

            {/* Subtle path underglow filter */}
            <filter id="hybridRouteGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>

            {/* Traveling beacon glow filter */}
            <filter id="hybridBeaconGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Ambient Trail: subtle under-path across whole scenery */}
          <path
            d={AMBIENT_TRAIL_PATH}
            fill="none"
            stroke="url(#hybridRouteGradient)"
            strokeWidth="4.5"
            strokeLinecap="round"
            opacity="0.2"
            filter="url(#hybridRouteGlow)"
          />

          {/* 
            Active Route Path (Kochi -> Munnar -> Alleppey -> Thekkady -> Kovalam)
            Provides the geometry for getPointAtLength() and draws progressively with the dot.
          */}
          <path
            ref={pathRef}
            d={ACTIVE_JOURNEY_PATH}
            fill="none"
            stroke="transparent"
            strokeWidth="1"
          />

          {/* Main Continuous Journey Path with Synchronized Stroke Draw */}
          <path
            ref={routeDrawRef}
            d={ACTIVE_JOURNEY_PATH}
            fill="none"
            stroke="url(#hybridRouteGradient)"
            strokeWidth="2.4"
            strokeLinecap="round"
            className="transition-opacity duration-300"
          />

          {/* Intermediate Route Nodes (subtle waypoints) */}
          {[190, 380, 580, 780].map((cx, idx) => {
            const cys = [98, 110, 120, 115];
            return (
              <circle
                key={idx}
                cx={cx}
                cy={cys[idx]}
                r="2"
                fill="#ffffff"
                stroke="#818cf8"
                strokeWidth="1.5"
                opacity="0.65"
              />
            );
          })}

          {/* 
            Synchronized Moving Light Beacon:
            Soft Halo + Bright White Center
            Positions initialized directly at Kochi at t=0
          */}
          <circle
            ref={haloRef}
            cx="100"
            cy="125"
            r="8"
            fill="#38bdf8"
            filter="url(#hybridBeaconGlow)"
            opacity="0.4"
          />
          <circle
            ref={dotRef}
            cx="100"
            cy="125"
            r="3.5"
            fill="#ffffff"
            filter="url(#hybridBeaconGlow)"
            opacity="1"
          />
        </svg>

        {/* 
          =========================================================
          DESTINATION LABELS STRICTLY ABOVE ROUTE
          Each card floats ABOVE its waypoint marker.
          A subtle connecting stem connects downward to the route pin.
          Pin sits directly on the route line.
          =========================================================
        */}
        {DESTINATIONS.map((dest) => {
          const isRevealed = revealedIds.has(dest.id);
          const isActive = activeId === dest.id;

          return (
            <div
              key={dest.id}
              className={`absolute -translate-y-full flex flex-col items-center pointer-events-auto select-none transition-all duration-500 ${
                dest.align
              } ${
                isRevealed
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-95 pointer-events-none"
              } ${dest.mobileKey ? "flex" : "hidden sm:flex"}`}
              style={{
                left: dest.pos.left,
                top: dest.pos.top,
              }}
            >
              {/* Destination Card (ALWAYS ON TOP / ABOVE ROUTE) */}
              <div
                className={`flex items-center gap-2 sm:gap-2.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl sm:rounded-2xl bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border transition-all duration-300 mb-1 ${
                  isActive
                    ? "border-indigo-400 dark:border-indigo-400 shadow-lg shadow-indigo-500/20 scale-105 ring-2 ring-indigo-500/25"
                    : "border-white/80 dark:border-slate-700/80 shadow-md shadow-indigo-950/5 dark:shadow-black/30 hover:scale-105"
                }`}
              >
                <img
                  src={dest.image}
                  alt={dest.name}
                  className="w-7 h-6 sm:w-8.5 sm:h-7.5 object-cover rounded-lg shrink-0 shadow-xs"
                  loading="lazy"
                />
                <div className="flex flex-col text-left leading-tight pr-1">
                  <span
                    className={`text-xs sm:text-[13px] font-bold tracking-tight transition-colors duration-200 ${
                      isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {dest.name}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                    {dest.day}
                  </span>
                </div>
              </div>

              {/* Subtle connecting vertical stem down to route pin */}
              <div
                className={`w-[1.5px] transition-all duration-300 ${
                  isActive
                    ? "h-2.5 sm:h-3.5 bg-gradient-to-b from-indigo-500 to-indigo-400 shadow-xs"
                    : "h-2 sm:h-3 bg-gradient-to-b from-indigo-500/80 to-indigo-400/40"
                }`}
              />

              {/* Glowing Map Pin Beacon directly on the Route */}
              <div className="relative flex items-center justify-center -mb-1.5">
                <span
                  className={`absolute rounded-full transition-all duration-300 ${
                    isActive
                      ? "w-4 h-4 opacity-80 animate-ping"
                      : "w-2.5 h-2.5 opacity-40"
                  }`}
                  style={{ backgroundColor: dest.color }}
                />
                <span
                  className={`relative rounded-full border-2 border-white dark:border-slate-900 transition-all duration-300 ${
                    isActive
                      ? "w-3 h-3 scale-125 shadow-md shadow-indigo-500/40"
                      : "w-2 h-2 shadow-xs"
                  }`}
                  style={{ backgroundColor: dest.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
