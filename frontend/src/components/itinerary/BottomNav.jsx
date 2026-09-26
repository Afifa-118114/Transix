import { FiArrowLeft, FiArrowRight, FiRefreshCw } from "react-icons/fi";
import { FaWandMagicSparkles } from "react-icons/fa6";

export default function BottomNav({
  selectedDay,
  totalDays,
  setSelectedDay,
  onRegenerate,
  loading,
}) {
  return (
    <div className="w-full mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e7e5e4] bg-white p-3.5 shadow-xs">
      <button
        type="button"
        disabled={selectedDay === 0}
        onClick={() => setSelectedDay((d) => d - 1)}
        className="flex items-center gap-1.5 rounded-full border border-[#e7e5e4] bg-white px-4 py-2 text-xs font-semibold text-[#57534e] transition hover:bg-[#fafaf9] hover:text-[#0c0a09] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <FiArrowLeft className="text-xs" />
        <span>Previous Day</span>
      </button>

      <button
        type="button"
        onClick={onRegenerate}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-full bg-[#0c0a09] px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#292524] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? (
          <FiRefreshCw className="text-xs animate-spin" />
        ) : (
          <FaWandMagicSparkles className="text-xs" />
        )}
        <span>{loading ? "Regenerating Day..." : "Regenerate Day with AI"}</span>
      </button>

      <button
        type="button"
        disabled={selectedDay >= totalDays - 1}
        onClick={() => setSelectedDay((d) => d + 1)}
        className="flex items-center gap-1.5 rounded-full border border-[#e7e5e4] bg-white px-4 py-2 text-xs font-semibold text-[#57534e] transition hover:bg-[#fafaf9] hover:text-[#0c0a09] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span>Next Day</span>
        <FiArrowRight className="text-xs" />
      </button>
    </div>
  );
}
