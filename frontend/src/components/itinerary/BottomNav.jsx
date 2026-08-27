import { FiArrowLeft, FiArrowRight, FiRefreshCw } from "react-icons/fi";

export default function BottomNav({
  selectedDay,
  totalDays,
  setSelectedDay,
  onRegenerate,
  loading,
}) {
  return (
    <div className="mx-auto mt-6 flex max-w-3xl items-center justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] p-3.5 shadow-xs transition-colors">
      <button
        disabled={selectedDay === 0}
        onClick={() => setSelectedDay((d) => d - 1)}
        className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <FiArrowLeft className="text-xs" />
        <span>Previous Day</span>
      </button>

      <button
        onClick={onRegenerate}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <FiRefreshCw className={`text-xs ${loading ? "animate-spin" : ""}`} />
        <span>{loading ? "Regenerating..." : "Regenerate Day"}</span>
      </button>

      <button
        disabled={selectedDay === totalDays - 1}
        onClick={() => setSelectedDay((d) => d + 1)}
        className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span>Next Day</span>
        <FiArrowRight className="text-xs" />
      </button>
    </div>
  );
}
