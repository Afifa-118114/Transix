import React from "react";
import { FiMapPin, FiMoon, FiCalendar, FiArrowRight } from "react-icons/fi";
import { Link } from "react-router-dom";
import { formatDate } from "../../utils/formatTrip";

export default function StayPlan({ trip, staySegments, viewOnly = false }) {
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
            
            <div className="mt-4 sm:mt-0 sm:ml-4 flex items-center justify-end">
              {segment.selectedHotel ? (
                <div className="flex items-center gap-3 bg-white dark:bg-[#131b2e] p-2.5 rounded-xl border border-emerald-200/80 dark:border-emerald-800/80 shadow-2xs">
                  {segment.selectedHotel.image && (
                    <img 
                      src={segment.selectedHotel.image} 
                      alt={segment.selectedHotel.name} 
                      className="w-12 h-12 rounded-lg object-cover border border-emerald-100 dark:border-emerald-900/50 shrink-0" 
                    />
                  )}
                  <div className="text-left sm:text-right">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <span>✓ Stay Selected</span>
                      {segment.selectedHotel.rating && (
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-black">
                          ★ {segment.selectedHotel.rating}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1 max-w-[180px]">
                      {segment.selectedHotel.name}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      ₹{(segment.selectedHotel.nightlyPrice || segment.selectedHotel.pricePerNight || segment.selectedHotel.price || 2800).toLocaleString()}/night
                    </div>
                  </div>
                </div>
              ) : (
                <span className="text-[11px] font-semibold text-slate-400 italic">No hotel selected</span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 flex justify-center border-t border-slate-100 dark:border-slate-800 pt-5">
        <Link 
          to={`/itinerary/${trip?._id || 'draft'}/stays`}
          state={{ viewOnly, trip }}
          className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-indigo-700"
        >
          View Full Stay Plan
        </Link>
      </div>
    </section>
  );
}
