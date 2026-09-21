import { FiBell } from "react-icons/fi";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function Navbar({ trip, setTrip }) {
  const { user } = useAuth();

  return (
    <header className="flex h-15 items-center justify-between rounded-2xl border border-[#e7e5e4] bg-[#ffffff] px-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-colors">
      {/* Left: Trip Context Info */}
      <div className="flex items-center gap-3">
        <div>
          <h1
            style={{ fontFamily: trip ? "'EB Garamond', Georgia, serif" : "inherit" }}
            className={`font-semibold text-[#0c0a09] ${trip ? "text-xl font-[300]" : "text-sm font-bold"}`}
          >
            {trip
              ? `${trip.source} → ${trip.destination}`
              : "AI Travel Intelligence & Planning"}
          </h1>

          {trip ? (
            <p className="flex items-center gap-2 text-xs text-[#777169] font-medium mt-0.5">
              <span>{trip.itinerary?.length || 0} Days</span>
              <span>•</span>
              <span>{trip.travelers || 2} Travelers</span>
              <span>•</span>
              <span>
                {trip.currency || "₹"} {Number(trip.budget || 0).toLocaleString()}
              </span>
            </p>
          ) : (
            <p className="text-xs text-[#777169] mt-0.5">
              Personalized multi-modal itineraries with express rail timetables
            </p>
          )}
        </div>
      </div>

      {/* Right: Actions & User Info */}
      <div className="flex items-center gap-3">
        <Link
          to="/builder"
          className="flex items-center gap-1.5 rounded-full bg-[#292524] px-4 py-2 text-xs font-medium text-white shadow-xs transition-all hover:bg-[#0c0a09] active:scale-98"
        >
          <span>✨ Build My Tour</span>
        </Link>

        {trip && (
          <button
            onClick={() => {
              localStorage.removeItem("currentTrip");
              localStorage.removeItem("transix_builder_trip");
              if (setTrip) setTrip(null);
              window.dispatchEvent(new CustomEvent("transix_trip_updated", { detail: null }));
            }}
            className="rounded-full border border-[#d6d3d1] bg-white px-3.5 py-1.5 text-xs font-medium text-[#292524] transition hover:bg-[#f5f5f5] hover:border-[#0c0a09]"
          >
            Plan Another
          </button>
        )}

        {/* User initials plate */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-[#f0efed]">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0efed] border border-[#e7e5e4] text-xs font-bold text-[#0c0a09]">
            {user?.name ? user.name[0].toUpperCase() : "T"}
          </div>
          <span className="hidden sm:block text-xs font-medium text-[#292524]">
            {user?.name || "Traveler"}
          </span>
        </div>
      </div>
    </header>
  );
}
