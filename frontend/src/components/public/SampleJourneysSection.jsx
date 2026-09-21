import React from "react";
import { Link } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import { SAMPLE_TRIPS } from "../../data/sampleTripsData";

export default function SampleJourneysSection() {
  return (
    <section
      id="sample-trips"
      className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200/60 dark:border-slate-800/60"
    >
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2.5 block">
          EXPLORE SAMPLE JOURNEYS
        </span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
          Popular Trips, Ready for You
        </h2>
      </div>

      {/* Exactly 4 Compact Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {SAMPLE_TRIPS.slice(0, 4).map((trip) => (
          <div
            key={trip.id}
            className="group bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-xs hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              {/* Card Image Cover (Equal Aspect Ratio) */}
              <div className="relative aspect-[16/11] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                  src={trip.heroImage}
                  alt={trip.title}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>

                {/* Small "Sample Journey" Badge */}
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[9px] font-black uppercase tracking-wider text-amber-300 border border-amber-400/30">
                    Sample Journey
                  </span>
                </div>
              </div>

              {/* Compact Card Body */}
              <div className="p-5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {trip.title}
                </h3>

                {/* Tiny Metadata Row */}
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  <span>{trip.duration}</span>
                  <span>·</span>
                  <span className="truncate">{trip.locationMeta || trip.destination}</span>
                </div>

                {/* Tiny Category Tag */}
                <div className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                  {trip.category || trip.tag}
                </div>
              </div>
            </div>

            {/* Compact Action Button */}
            <div className="p-5 pt-0">
              <Link
                to={`/sample-trips/${trip.id}`}
                className="w-full py-2.5 px-4 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-xs font-bold text-indigo-700 dark:text-indigo-300 transition-all duration-200 flex items-center justify-center gap-1.5 group-hover:border-indigo-600 cursor-pointer shadow-2xs"
              >
                <span>View Itinerary</span>
                <FiArrowRight className="text-xs group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
