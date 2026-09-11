import { useEffect, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { FiShield, FiCheckCircle } from "react-icons/fi";
import { updateOperatorAccess } from "../../api/tripApi";
import toast from "react-hot-toast";
import HeroBanner from "../dashboard/hero/HeroBanner";
import TravelOptions from "../dashboard/travel/TravelOptions";
import ItineraryPreview from "../dashboard/itinerary/ItineraryPreview";
import ExperiencesPreview from "../dashboard/experiences/ExperiencesPreview";
import HotelsPreview from "../dashboard/hotels/HotelsPreview";
import FoodPreview from "../dashboard/food/FoodPreview";
import EssentialsPreview from "../dashboard/essentials/EssentialsPreview";
import AskTransix from "./AskTransix";

// MapPreview is intentionally removed — Map is now accessed via the Sidebar Map modal overlay.

const TripDashboard = ({ trip, setTrip }) => {
  const [isProcessingAccess, setIsProcessingAccess] = useState(false);

  if (!trip) return null;

  const handleToggleAccess = async () => {
    setIsProcessingAccess(true);
    try {
      const token = localStorage.getItem("token");
      const currentAccess = trip.operatorAccess?.enabled || false;
      const res = await updateOperatorAccess(trip._id, !currentAccess, token);
      if (res.success) {
        setTrip(res.trip);
        toast.success(res.message);
      }
    } catch (err) {
      toast.error("Failed to update operator access.");
    }
    setIsProcessingAccess(false);
  };

  const isShared = trip.operatorAccess?.enabled;

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex justify-between items-center bg-slate-900 rounded-2xl p-4 border border-slate-800">
        <div className="flex items-center gap-3 text-white">
          <div className={`p-2 rounded-xl ${isShared ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
            <FiShield size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Operator Access</div>
            <div className="text-sm font-bold flex items-center gap-1.5">
              {isShared ? (
                <><FiCheckCircle className="text-emerald-400" /> Shared with Operator</>
              ) : (
                "Off (Private)"
              )}
            </div>
          </div>
        </div>
        <button
          onClick={handleToggleAccess}
          disabled={isProcessingAccess}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            isShared 
              ? 'bg-slate-800 text-slate-300 hover:bg-rose-500/20 hover:text-rose-400 border border-slate-700' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {isProcessingAccess ? "Updating..." : isShared ? "Revoke Access" : "Share with Operator"}
        </button>
      </div>

      <AskTransix trip={trip} setTrip={setTrip} />

      <HeroBanner trip={trip} />
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
