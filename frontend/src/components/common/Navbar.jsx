import { FiBell, FiSun, FiMoon } from "react-icons/fi";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../context/ThemeContext";

export default function Navbar({ trip, setTrip }) {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="flex h-15 items-center justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] px-5 shadow-xs transition-colors">
      {/* Left: Trip Context Info */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white">
            {trip
              ? `${trip.source} → ${trip.destination}`
              : "AI Travel Intelligence & Planning"}
          </h1>

          {trip ? (
            <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>{trip.itinerary?.length || 0} Days</span>
              <span>•</span>
              <span>{trip.travelers || 2} Travelers</span>
              <span>•</span>
              <span>
                {trip.currency || "₹"} {Number(trip.budget || 0).toLocaleString()}
              </span>
            </p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
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
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Plan Another
          </button>
        )}

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

        {/* Dark/Light Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          {isDark ? <FiSun className="text-base text-amber-400" /> : <FiMoon className="text-base" />}
        </button>

        <button
          title="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition"
        >
          <FiBell className="text-base" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-indigo-600" />
        </button>

        {/* User Avatar */}
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300">
          {user?.name?.charAt(0).toUpperCase() || "U"}
        </div>
      </div>
    </header>
  );
}
