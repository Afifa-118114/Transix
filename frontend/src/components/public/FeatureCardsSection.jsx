import React from "react";
import { FiCpu, FiGlobe, FiLayers, FiUsers, FiArrowUpRight } from "react-icons/fi";

const FEATURES = [
  {
    id: "ai-planning",
    title: "AI Trip Planning",
    description: "Turn your travel requirements into a day-by-day itinerary with smart recommendations.",
    icon: FiCpu,
    accent: "from-indigo-500/20 to-purple-500/20",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    badge: "Smart Engine",
  },
  {
    id: "explore-destinations",
    title: "Explore Destinations",
    description: "Discover destinations, activities and experiences across the world.",
    icon: FiGlobe,
    accent: "from-cyan-500/20 to-blue-500/20",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    badge: "Global Atlas",
  },
  {
    id: "smart-journey",
    title: "Smart Journey Management",
    description: "Organize stays, transport and activities in one place.",
    icon: FiLayers,
    accent: "from-purple-500/20 to-pink-500/20",
    iconColor: "text-purple-600 dark:text-purple-400",
    badge: "End-to-End",
  },
  {
    id: "campus-group",
    title: "Campus & Group Travel",
    description: "Plan and manage organized group journeys with ease.",
    icon: FiUsers,
    accent: "from-emerald-500/20 to-teal-500/20",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    badge: "Multi-User",
  },
];

export default function FeatureCardsSection() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200/60 dark:border-slate-800/60">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-3 block">
          Platform Capabilities
        </span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
          Everything You Need for <br />
          <span className="bg-gradient-to-r from-indigo-600 to-cyan-500 dark:from-indigo-400 dark:to-cyan-400 bg-clip-text text-transparent">
            The Perfect Journey
          </span>
        </h2>
        <p className="mt-4 text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
          Intelligent travel architecture engineered to bridge imagination, day-to-day coordination, and on-ground execution.
        </p>
      </div>

      {/* 4 Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {FEATURES.map((feature, idx) => {
          const IconComponent = feature.icon;
          return (
            <div
              key={feature.id}
              className="group relative bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-7 shadow-xs hover:shadow-xl hover:shadow-indigo-500/10 dark:hover:shadow-indigo-500/5 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden"
            >
              {/* Card Header & Icon */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div
                    className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${feature.accent} border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                  >
                    <IconComponent className={`text-2xl ${feature.iconColor}`} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400">
                    0{idx + 1}
                  </span>
                </div>

                <div className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3">
                  {feature.badge}
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {feature.title}
                </h3>

                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>

              {/* Card Footer Micro CTA */}
              <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                <span>Integrated Tooling</span>
                <FiArrowUpRight className="text-sm group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
