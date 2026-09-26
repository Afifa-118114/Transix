import React from "react";
import {
  FiCpu,
  FiLayers,
  FiGlobe,
  FiCompass,
  FiUsers,
  FiAward,
  FiShare2,
  FiCheckCircle,
} from "react-icons/fi";

const CAPABILITIES = [
  {
    num: "01",
    tag: "AI-Powered Personalization",
    title: "AI Trip Planning",
    desc: "Intelligent preference matching tailored to your budget, travel style, interests, and specific pacing.",
    icon: FiCpu,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-100 dark:border-indigo-800/60",
  },
  {
    num: "02",
    tag: "End-to-End Planning",
    title: "Smart Journey Management",
    desc: "Coordinate stays, transport, activities, and localized experiences in one organized journey.",
    icon: FiLayers,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/60 border-purple-100 dark:border-purple-800/60",
  },
  {
    num: "03",
    tag: "Explore Anywhere",
    title: "Global Destination Discovery",
    desc: "Discover destinations, activities, and experiences across the world.",
    icon: FiGlobe,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-50 dark:bg-cyan-950/60 border-cyan-100 dark:border-cyan-800/60",
  },
  {
    num: "04",
    tag: "Adaptive Journeys",
    title: "Dynamic Travel Planning",
    desc: "Keep the itinerary flexible and adapt the journey when plans, preferences, or on-ground conditions change.",
    icon: FiCompass,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-100 dark:border-emerald-800/60",
  },
  {
    num: "05",
    tag: "Campus & Group Specialists",
    title: "Multi-User Travel",
    desc: "Purpose-built coordination for institutional tours, group rosters, and organized group journeys.",
    icon: FiUsers,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/60 border-blue-100 dark:border-blue-800/60",
  },
  {
    num: "06",
    tag: "Verified Local Guides",
    title: "Local Expertise",
    desc: "Connect with vetted regional guides and operators who understand the ground reality.",
    icon: FiAward,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/60 border-amber-100 dark:border-amber-800/60",
  },
  {
    num: "07",
    tag: "Connected Operations",
    title: "End-to-End Coordination",
    desc: "Bridge planning with the practical coordination of stays, transport, activities, and group operations.",
    icon: FiShare2,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/60 border-violet-100 dark:border-violet-800/60",
  },
  {
    num: "08",
    tag: "Intelligent Recommendations",
    title: "Smart Travel Decisions",
    desc: "Turn travel requirements into structured day-by-day plans with relevant recommendations.",
    icon: FiCheckCircle,
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-950/60 border-teal-100 dark:border-teal-800/60",
  },
];

export default function WhyTransixSection() {
  return (
    <section
      id="why-transix"
      className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200/60 dark:border-slate-800/60"
    >
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-3 block">
          WHY TRANSIX
        </span>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15]">
          More Than Just a Trip. <br />
          <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 dark:from-indigo-400 dark:via-purple-400 dark:to-cyan-400 bg-clip-text text-transparent">
            It's a Better Way to Travel.
          </span>
        </h2>

        <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
          Transix combines technology, planning and travel operations to make journeys simpler and more organized — for
          individuals, groups and institutions.
        </p>
      </div>

      {/* 8 Unified Capability Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {CAPABILITIES.map((cap) => {
          const Icon = cap.icon;
          return (
            <div
              key={cap.num}
              className="group bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Header with Icon and Number Badge */}
                <div className="flex items-center justify-between mb-5">
                  <div
                    className={`h-12 w-12 rounded-2xl ${cap.bg} border flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon className={`text-xl ${cap.color}`} />
                  </div>
                  <span className="text-xs font-black font-mono text-slate-400 dark:text-slate-500">
                    {cap.num}
                  </span>
                </div>

                {/* Capability Tag */}
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1.5 block">
                  {cap.tag}
                </span>

                {/* Title */}
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {cap.title}
                </h3>

                {/* Description */}
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {cap.desc}
                </p>
              </div>

              {/* Bottom Subtle Accent Line */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Transix Platform
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
