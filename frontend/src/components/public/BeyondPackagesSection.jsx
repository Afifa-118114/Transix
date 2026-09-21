import React, { useEffect, useRef, useState } from "react";
import {
  FiPackage,
  FiCalendar,
  FiList,
  FiFileText,
  FiCompass,
  FiCpu,
  FiLayers,
  FiRefreshCw,
  FiArrowRight,
} from "react-icons/fi";

const TRADITIONAL_ITEMS = [
  { label: "Fixed Packages", icon: FiPackage },
  { label: "Fixed Schedules", icon: FiCalendar },
  { label: "Limited Choices", icon: FiList },
  { label: "Manual Changes", icon: FiFileText },
];

const TRANSIX_ITEMS = [
  { label: "Personalized Journeys", icon: FiCompass },
  { label: "Dynamic Planning", icon: FiCpu },
  { label: "Coordinated Operations", icon: FiLayers },
  { label: "Adaptive Changes", icon: FiRefreshCw },
];

export default function BeyondPackagesSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="adaptive-travel"
      ref={sectionRef}
      className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200/60 dark:border-slate-800/60"
    >
      {/* 1. Heading appears */}
      <div
        className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ease-out ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-3 block">
          BEYOND FIXED PACKAGES
        </span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
          Travel That Adapts to You.
        </h2>
        <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto font-normal">
          Traditional packages force travelers into rigid templates. Transix puts you in control while orchestrating
          every component dynamically.
        </p>
      </div>

      {/* Visual Comparison: Traditional vs Transix Side-by-Side */}
      <div className="relative max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* 2. LEFT: Traditional Travel (Subtle neutral/muted treatment) */}
          <div
            className={`relative rounded-3xl p-7 bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/90 dark:border-slate-800/90 shadow-sm transition-all duration-700 ease-out ${
              isVisible
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 translate-y-8 scale-95"
            }`}
            style={{ transitionDelay: "150ms" }}
          >
            <div className="flex items-center justify-between pb-5 mb-6 border-b border-slate-200/80 dark:border-slate-800/80">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Conventional Model
                </span>
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
                  Traditional Travel
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Rigid
              </span>
            </div>

            <ul className="space-y-4">
              {TRADITIONAL_ITEMS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.label}
                    className={`flex items-center gap-3.5 p-3 rounded-2xl bg-white/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40 transition-all duration-500 ease-out ${
                      isVisible
                        ? "opacity-100 translate-x-0"
                        : "opacity-0 -translate-x-4"
                    }`}
                    style={{ transitionDelay: `${250 + idx * 80}ms` }}
                  >
                    <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                      <Icon className="text-sm" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                      {item.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 3. RIGHT: Transix (Existing purple/blue visual language) */}
          <div
            className={`relative rounded-3xl p-7 bg-white dark:bg-[#131b2e] border-2 border-indigo-500/40 dark:border-indigo-500/30 shadow-xl shadow-indigo-500/10 dark:shadow-black/40 transition-all duration-700 ease-out ${
              isVisible
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 translate-y-8 scale-95"
            }`}
            style={{ transitionDelay: "300ms" }}
          >
            {/* Subtle glow highlight behind card */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between pb-5 mb-6 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 block mb-1">
                  Intelligent Platform
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Transix
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/80">
                Adaptive
              </span>
            </div>

            <ul className="space-y-4">
              {TRANSIX_ITEMS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.label}
                    className={`flex items-center gap-3.5 p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100/80 dark:border-indigo-800/50 transition-all duration-500 ease-out hover:scale-102 ${
                      isVisible
                        ? "opacity-100 translate-x-0"
                        : "opacity-0 translate-x-4"
                    }`}
                    style={{ transitionDelay: `${400 + idx * 80}ms` }}
                  >
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/30">
                      <Icon className="text-sm" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {item.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* 6. Subtle connecting visual badge between Traditional → Transix */}
        <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-700 shadow-md items-center justify-center text-indigo-600 dark:text-indigo-400">
          <FiArrowRight className="text-base" />
        </div>
      </div>
    </section>
  );
}
