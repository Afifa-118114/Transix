import { useNavigate } from "react-router-dom";
import { FiMapPin, FiMoon, FiArrowRight } from "react-icons/fi";

export default function HotelsPreview({ trip }) {
  const navigate = useNavigate();

  if (!trip || !trip.staySegments || trip.staySegments.length === 0) {
    return null;
  }

  const staySegments = trip.staySegments;
  const totalNights = staySegments.reduce((acc, seg) => acc + (seg.nights || 0), 0);

  // Count how many segments have a selected hotel
  const selectedCount = staySegments.filter(s => s.selectedHotel).length;

  return (
    <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] p-5 shadow-xs transition-colors">
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Stay Plan</h2>
            <span className="rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/60 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-400">
              {staySegments.length} Segments
            </span>
            {selectedCount > 0 && (
              <span className="rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                {selectedCount} Selected
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {totalNights} nights total across {staySegments.length} location{staySegments.length > 1 ? 's' : ''}.
          </p>
        </div>

        <button
          onClick={() => navigate(`/itinerary/${trip._id || 'draft'}/stays`)}
          className="group flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 cursor-pointer"
        >
          <span>Plan Your Stays</span>
          <FiArrowRight className="transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scroll-smooth scrollbar-none">
        {staySegments.map((segment, idx) => (
          <div
            key={segment.id || idx}
            className="w-56 shrink-0 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#1a233a] p-4 flex flex-col"
          >
            <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400">
              <FiMapPin className="text-sm" />
              <span className="font-black tracking-wide uppercase text-sm">{segment.location}</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4">
              <FiMoon className="text-[10px]" />
              <span>{segment.nights} Night{segment.nights !== 1 ? 's' : ''}</span>
            </div>

            <div className="mt-auto">
              {segment.selectedHotel ? (
                <div className="rounded-lg bg-emerald-100/50 dark:bg-emerald-900/20 px-3 py-2 border border-emerald-200 dark:border-emerald-800/30">
                  <span className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-0.5">✓ Selected</span>
                  <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-1">{segment.selectedHotel.name}</span>
                </div>
              ) : (
                <div className="rounded-lg bg-white dark:bg-slate-800 px-3 py-2 border border-slate-200 dark:border-slate-700">
                  <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 text-center">No hotel selected</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
