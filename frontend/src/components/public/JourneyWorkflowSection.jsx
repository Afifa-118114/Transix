import React, { useEffect, useRef, useState } from "react";
import { FiCompass, FiSliders, FiCpu, FiNavigation, FiRefreshCw, FiArrowRight } from "react-icons/fi";

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "DISCOVER",
    desc: "Explore destinations, activities and experiences.",
    icon: FiCompass,
    desktopPos: "-top-6 left-1/2 -translate-x-1/2",
    delayMs: 100,
  },
  {
    step: "02",
    title: "PERSONALIZE",
    desc: "Define budget, preferences, travel style and interests.",
    icon: FiSliders,
    desktopPos: "top-14 -left-6 lg:-left-12",
    delayMs: 250,
  },
  {
    step: "03",
    title: "PLAN",
    desc: "AI builds a personalized, structured itinerary.",
    icon: FiCpu,
    desktopPos: "top-14 -right-6 lg:-right-12",
    delayMs: 400,
  },
  {
    step: "04",
    title: "OPERATE",
    desc: "Coordinate stays, transport, activities and group operations.",
    icon: FiNavigation,
    desktopPos: "bottom-8 -left-6 lg:-left-12",
    delayMs: 550,
  },
  {
    step: "05",
    title: "ADAPT",
    desc: "Respond to changes and keep the journey aligned.",
    icon: FiRefreshCw,
    desktopPos: "bottom-8 -right-6 lg:-right-12",
    delayMs: 700,
  },
];

const PROGRESS_STAGES = [
  "Idea",
  "Discover",
  "Personalize",
  "Plan",
  "Operate",
  "Adapt",
  "Experience",
];

export default function JourneyWorkflowSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const sectionRef = useRef(null);

  // Scroll detection via IntersectionObserver
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

  // Subtle sequential highlight cycling (once visible and if user is not hovering)
  useEffect(() => {
    if (!isVisible) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % WORKFLOW_STEPS.length);
    }, 1500);

    return () => clearInterval(interval);
  }, [isVisible]);

  return (
    <section
      id="journey-flow"
      ref={sectionRef}
      className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200/60 dark:border-slate-800/60 overflow-hidden"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        {/* LEFT COLUMN: Narrative & Connected Progression Path */}
        <div className="lg:col-span-5 flex flex-col items-start text-left">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-3 block">
            END-TO-END JOURNEY WORKFLOW
          </span>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15]">
            From Idea to Experience. <br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 dark:from-indigo-400 dark:via-purple-400 dark:to-cyan-400 bg-clip-text text-transparent">
              One Connected Journey.
            </span>
          </h2>

          <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            Transix connects the major stages of a personalized journey into one coordinated travel experience.
          </p>

          {/* Visual Connecting Path: Idea → Discover → Personalize → Plan → Operate → Adapt → Experience */}
          <div className="mt-8 pt-6 border-t border-slate-200/60 dark:border-slate-800/60 w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 block mb-3">
              Journey Flow Architecture
            </span>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {PROGRESS_STAGES.map((stage, idx) => {
                const isWorkflowStep = idx >= 1 && idx <= 5;
                const stepIdx = idx - 1;
                const isCurrentActive = isWorkflowStep && activeStep === stepIdx;

                return (
                  <React.Fragment key={stage}>
                    <button
                      type="button"
                      onClick={() => {
                        if (isWorkflowStep) setActiveStep(stepIdx);
                      }}
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all duration-300 cursor-pointer ${isCurrentActive
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 scale-105"
                        : isWorkflowStep
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                          : "bg-transparent text-slate-400 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-700"
                        }`}
                    >
                      {stage}
                    </button>
                    {idx < PROGRESS_STAGES.length - 1 && (
                      <FiArrowRight className="text-slate-300 dark:text-slate-600 text-xs shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Circular Scenic Centerpiece + 5 Workflow Callouts */}
        <div className="lg:col-span-7 relative flex flex-col items-center justify-center py-8">
          <div className="relative flex items-center justify-center w-full max-w-lg mx-auto">
            {/* Ambient Aura */}
            <div
              className={`absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-cyan-400/20 blur-3xl scale-110 pointer-events-none transition-opacity duration-1000 ${isVisible ? "opacity-100" : "opacity-0"
                }`}
            />

            {/* Connecting SVG Orbit Path */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none hidden md:block"
              viewBox="0 0 500 500"
              fill="none"
            >
              <circle
                cx="250"
                cy="250"
                r="190"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="4 6"
                className="text-indigo-200/50 dark:text-indigo-900/40"
              />
            </svg>

            {/* Circular Scenic Destination Image */}
            <div
              className={`relative w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-full overflow-hidden shadow-2xl border-4 border-white/95 dark:border-slate-800/95 shrink-0 z-0 group transition-all duration-700 ease-out ${isVisible
                ? "opacity-100 scale-100 filter-none"
                : "opacity-0 scale-90 blur-[3px]"
                }`}
            >
              <img
                src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85"
                alt="Scenic Alpine Lake & Mountain Vista"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </div>

            {/* Desktop & Tablet Floating Workflow Callouts (5 Steps) */}
            <div className="hidden md:block">
              {WORKFLOW_STEPS.map((item, idx) => {
                const Icon = item.icon;
                const isActive = activeStep === idx;

                return (
                  <div
                    key={item.step}
                    onMouseEnter={() => setActiveStep(idx)}
                    className={`absolute ${item.desktopPos} z-10 w-56 lg:w-60 bg-white/95 dark:bg-[#131b2e]/95 backdrop-blur-xl border rounded-2xl p-3.5 shadow-xl transition-all duration-500 ease-out cursor-pointer ${isActive
                      ? "border-indigo-500/80 shadow-indigo-500/20 ring-2 ring-indigo-500/30 scale-105 z-20"
                      : "border-slate-200/90 dark:border-slate-700/80 shadow-slate-200/30 dark:shadow-black/40 opacity-90 hover:opacity-100 hover:scale-102"
                      } ${isVisible
                        ? "opacity-100 translate-y-0 filter-none"
                        : "opacity-0 translate-y-6 blur-[2px]"
                      }`}
                    style={{
                      transitionDelay: `${item.delayMs}ms`,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isActive
                          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/40"
                          : "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50"
                          }`}
                      >
                        <Icon className="text-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-black font-mono text-indigo-600 dark:text-indigo-400">
                            {item.step}
                          </span>
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white truncate">
                            {item.title}
                          </h3>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile View: Clean Sequential Step List */}
          <div className="grid md:hidden grid-cols-1 gap-2.5 w-full mt-8">
            {WORKFLOW_STEPS.map((item, idx) => {
              const Icon = item.icon;
              const isActive = activeStep === idx;

              return (
                <div
                  key={item.step}
                  onClick={() => setActiveStep(idx)}
                  className={`bg-white dark:bg-[#131b2e] border rounded-2xl p-3.5 shadow-xs flex items-start gap-3 transition-all duration-300 ${isActive
                    ? "border-indigo-500/80 ring-2 ring-indigo-500/20"
                    : "border-slate-200/80 dark:border-slate-800/80"
                    }`}
                >
                  <div
                    className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${isActive
                      ? "bg-indigo-600 text-white"
                      : "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400"
                      }`}
                  >
                    <Icon className="text-sm" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-black font-mono text-indigo-600 dark:text-indigo-400">
                        {item.step}
                      </span>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
