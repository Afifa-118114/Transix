import React from "react";
import { FiMapPin, FiMoon, FiCalendar, FiArrowRight } from "react-icons/fi";
import { formatDate } from "../../utils/formatTrip";

export default function StayPlan({ staySegments }) {
  if (!staySegments || staySegments.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] p-6 shadow-xs">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">
          Stay Plan
        </h2>
        <span className="rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300">
          {staySegments.length} Location{staySegments.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-4">
        {staySegments.map((segment, index) => (
          <div 
            key={segment.id || index} 
            className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#1a233a] p-4 transition hover:border-indigo-200 dark:hover:border-indigo-800"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <FiMapPin className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {segment.location}
                </h3>
              </div>
              
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <FiCalendar className="text-indigo-500" />
                  <span>
                    {formatDate(segment.checkIn)} <FiArrowRight className="inline mx-0.5 text-[10px]" /> {formatDate(segment.checkOut)}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <FiMoon className="text-indigo-500" />
                  <span>{segment.nights} night{segment.nights !== 1 ? 's' : ''}</span>
                </div>
              </div>
              
              {segment.reason && (
                <p className="mt-2 text-[11px] font-medium text-slate-500 italic">
                  "{segment.reason}"
                </p>
              )}
            </div>
            
            <div className="mt-4 sm:mt-0 sm:ml-4">
              <button 
                className="w-full sm:w-auto rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                onClick={() => alert("Hotel Selection functionality will be integrated here.")}
              >
                View Hotels →
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
