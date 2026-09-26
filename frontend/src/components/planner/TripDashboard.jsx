import { useState } from "react";
import { FiShield, FiCheckCircle, FiSun, FiMoon } from "react-icons/fi";
import { updateOperatorAccess } from "../../api/tripApi";
import { useTheme } from "../../context/ThemeContext";
import toast from "react-hot-toast";
import HeroBanner from "../dashboard/hero/HeroBanner";
import TravelOptions from "../dashboard/travel/TravelOptions";
import ItineraryPreview from "../dashboard/itinerary/ItineraryPreview";
import ExperiencesPreview from "../dashboard/experiences/ExperiencesPreview";
import HotelsPreview from "../dashboard/hotels/HotelsPreview";
import FoodPreview from "../dashboard/food/FoodPreview";
import EssentialsPreview from "../dashboard/essentials/EssentialsPreview";
import AskTransix from "./AskTransix";

const TripDashboard = ({ trip, setTrip }) => {
  const [isProcessingAccess, setIsProcessingAccess] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  if (!trip) return null;

  const handleToggleAccess = async () => {
    const currentAccess = trip.operatorAccess?.enabled || false;
    setIsProcessingAccess(true);
    try {
      const token = localStorage.getItem("token");
      const res = await updateOperatorAccess(trip._id, !currentAccess, token);
      if (res.success) {
        setTrip(res.trip);
        toast.success(res.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update operator access.");
    }
    setIsProcessingAccess(false);
  };

  const isShared = trip.operatorAccess?.enabled;

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#131b2e] rounded-xl p-3.5 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${isShared ? 'bg-blue-50 dark:bg-sky-950/60 text-[#006CE4] dark:text-sky-400 border border-blue-100 dark:border-sky-800/60' : 'bg-[#F5F7FA] dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
            <FiShield size={18} />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Operator Access</div>
            <div className="text-sm font-bold flex items-center gap-1.5 text-[#1A1A1A] dark:text-white">
              {isShared ? (
                <><FiCheckCircle className="text-[#00A65E]" /> Shared with Operator</>
              ) : (
                "Off (Private)"
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-[#006CE4] dark:hover:border-sky-500 transition cursor-pointer shadow-2xs"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <FiSun className="text-amber-400 text-sm" /> : <FiMoon className="text-[#006CE4] text-sm" />}
            <span className="hidden sm:inline">{isDark ? "Light Mode" : "Dark Mode"}</span>
          </button>

          <button
            onClick={handleToggleAccess}
            disabled={isProcessingAccess}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs ${
              isShared
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-500/20 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700'
                : 'bg-[#006CE4] text-white hover:bg-[#005bb5]'
            }`}
          >
            {isProcessingAccess ? "Updating..." : isShared ? "Revoke Access" : "Share with Operator"}
          </button>
        </div>
      </div>

      <AskTransix trip={trip} setTrip={setTrip} />

      <HeroBanner trip={trip} onResetTrip={() => setTrip && setTrip(null)} />
      <TravelOptions trip={trip} />
      <ItineraryPreview trip={trip} />
      <HotelsPreview trip={trip} />
      <ExperiencesPreview trip={trip} />
      <FoodPreview trip={trip} />
      <EssentialsPreview trip={trip} />
    </div>
  );
};

export default TripDashboard;
