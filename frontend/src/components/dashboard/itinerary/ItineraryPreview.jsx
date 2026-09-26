import { useState, useEffect } from "react";
import DayCard from "./DayCard";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function ItineraryPreview({ trip }) {
  if (!trip) return null;

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-5 md:p-6 shadow-xs transition-colors">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Trip Itinerary</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Day-by-day plan of your journey</p>
        </div>

        <Link
          to="/builder"
          className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-[#006CE4] hover:text-[#006CE4] dark:hover:border-sky-400 dark:hover:text-sky-400 shadow-2xs transition"
        >
          Customize in Builder →
        </Link>
      </div>

      {/* Animated Verification Badge */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/10 overflow-hidden"
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 2.2 }}
          className="flex items-center gap-2"
        >
          <motion.svg 
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 2.4 }}
            className="h-5 w-5 text-emerald-600 dark:text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </motion.svg>
          <h3 className="text-xs font-bold tracking-wide uppercase text-emerald-900 dark:text-emerald-400">
            Transix Verified
          </h3>
        </motion.div>

        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { 
              opacity: 1,
              transition: { staggerChildren: 0.35 }
            }
          }}
          className="flex flex-wrap items-center gap-x-4 gap-y-2"
        >
          {["Chronology", "Travel buffers", "Hotel constraints", "Budget", "Dates"].map((check, idx) => (
            <motion.div 
              key={idx}
              variants={{
                hidden: { opacity: 0, x: -10 },
                visible: { opacity: 1, x: 0, transition: { duration: 0.3 } }
              }}
              className="flex items-center gap-1 text-[11px] font-medium text-emerald-800 dark:text-emerald-300"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg> 
              {check}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
        {trip.itinerary?.map((day) => (
          <DayCard key={day.day} day={day} trip={trip} />
        ))}
      </div>
    </section>
  );
}
