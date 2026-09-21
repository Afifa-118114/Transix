import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowRight, FiCompass, FiLogIn } from "react-icons/fi";
import { Sparkles } from "lucide-react";

export default function PublicCTASection() {
  const navigate = useNavigate();

  const handlePlanMyTrip = () => {
    // Clear any stale trip state so TripPlanner shows the fresh questionnaire
    try {
      localStorage.removeItem("currentTrip");
      localStorage.removeItem("transix_builder_trip");
    } catch (_) {}

    const planIntent = {
      destination: "Kerala",
      duration: "7 days",
      travelers: "4 people",
      timestamp: Date.now(),
      autoGenerate: false,
    };

    sessionStorage.setItem("transix_pending_plan", JSON.stringify(planIntent));
    navigate("/planner");
  };

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-indigo-50/80 via-white to-slate-50/90 dark:from-[#131b2e] dark:via-[#0f172a] dark:to-[#131b2e] border border-indigo-100/90 dark:border-indigo-900/60 px-8 py-16 sm:px-16 sm:py-20 text-center shadow-xl shadow-indigo-500/5">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800/60 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Start Your Journey
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-4">
            Ready to Plan Your Next Adventure?
          </h2>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 mb-8 max-w-xl font-normal leading-relaxed">
            Explore Transix and start organizing your next journey.
          </p>

          {/* 3 Buttons with Clear Visual Hierarchy */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">
            {/* Primary CTA: Plan My Trip */}
            <button
              type="button"
              onClick={handlePlanMyTrip}
              className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Plan My Trip</span>
              <FiArrowRight className="text-base shrink-0" />
            </button>

            {/* Secondary CTA: Sign In */}
            <Link
              to="/login"
              className="px-6 py-3.5 rounded-2xl bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700/80 hover:border-indigo-400 text-sm font-bold shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <FiLogIn className="text-base text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Sign In</span>
            </Link>

            {/* Secondary CTA: Join as Guide */}
            <Link
              to="/join-as-guide"
              className="px-6 py-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-sm font-bold shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <FiCompass className="text-base text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Join as Guide</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
