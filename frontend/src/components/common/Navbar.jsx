import { FiBell } from "react-icons/fi";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function Navbar({ trip, setTrip }) {
  const { user } = useAuth();

  return (
    <header className="flex h-15 items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-5 shadow-xs">
      {/* Left: Trip Context Info */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-900">
            {trip
              ? `${trip.source} → ${trip.destination}`
              : "AI Travel Intelligence & Planning"}
          </h1>

          {trip ? (
            <p className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>{trip.itinerary?.length || 0} Days</span>
              <span>•</span>
              <span>{trip.travelers || 2} Travelers</span>
              <span>•</span>
              <span>
                {trip.currency || "₹"} {Number(trip.budget || 0).toLocaleString()}
              </span>
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Personalized itineraries, smart transport & live tour building
            </p>
          )}
        </div>
      </div>

      {/* Right: Actions & User Info */}
      <div className="flex items-center gap-3">
        <Link
          to="/builder"
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 active:scale-98"
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
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Plan Another
          </button>
        )}

        <div className="h-5 w-px bg-slate-200" />

        <button
          title="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
        >
          <FiBell className="text-base" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-indigo-600" />
        </button>

        {/* User Avatar */}
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700">
          {user?.name?.charAt(0).toUpperCase() || "U"}
        </div>
      </div>
    </header>
  );
}
