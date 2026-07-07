import { FiArrowLeft, FiArrowRight, FiRefreshCw } from "react-icons/fi";

function BottomNav({
  selectedDay,
  totalDays,
  setSelectedDay,
  onRegenerate,
  loading,
}) {
  return (
    <div className=" flex rounded-3xl border border-gray-200 bg-white p-5 shadow-sm gap-10 translate-x-15 translate-y-5 ">
      <button
        disabled={selectedDay === 0}
        onClick={() => setSelectedDay((d) => d - 1)}
        className="flex items-center gap-2 rounded-xl border border-gray-300 px-5 py-3 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <FiArrowLeft />
        Previous Day
      </button>

      <button
        onClick={onRegenerate}
        disabled={loading}
        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <FiRefreshCw className={loading ? "animate-spin" : ""} />

        {loading ? "Regenerating..." : "Regenerate This Day"}
      </button>

      <button
        disabled={selectedDay === totalDays - 1}
        onClick={() => setSelectedDay((d) => d + 1)}
        className="flex items-center gap-2 rounded-xl border border-gray-300 px-5 py-3 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next Day
        <FiArrowRight />
      </button>
    </div>
  );
}

export default BottomNav;
