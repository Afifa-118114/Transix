import React, { useState, useEffect } from "react";
import { FiBell, FiSun, FiMoon } from "react-icons/fi";
import { Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../hooks/useAuth";
import NotificationPanel from "../notifications/NotificationPanel";
import TripChatModal from "../chat/TripChatModal";
import { getUnreadNotificationCount } from "../../api/notificationApi";

export default function Navbar({ trip, setTrip }) {
  const { isDark, toggleTheme } = useTheme();
  const { user } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [activeChatTripId, setActiveChatTripId] = useState(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  useEffect(() => {
    const fetchUnread = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await getUnreadNotificationCount(token);
        if (res?.success && typeof res.unreadCount === "number") {
          setUnreadCount(res.unreadCount);
        }
      } catch (err) {
        // quiet error
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex h-15 items-center justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] px-6 shadow-xs transition-colors">
      {/* Left: Trip Context Info */}
      <div className="flex items-center gap-3">
        <div>
          <h1
            style={{ fontFamily: trip ? "'EB Garamond', Georgia, serif" : "inherit" }}
            className={`font-semibold text-slate-900 dark:text-white ${trip ? "text-xl font-[300]" : "text-sm font-bold"}`}
          >
            {trip
              ? `${trip.source} → ${trip.destination}`
              : "AI Travel Intelligence & Planning"}
          </h1>

          {trip ? (
            <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              <span>{trip.itinerary?.length || 0} Days</span>
              <span>•</span>
              <span>{trip.travelers || 2} Travelers</span>
              <span>•</span>
              <span>
                {trip.currency || "₹"} {Number(trip.budget || 0).toLocaleString()}
              </span>
            </p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Personalized multi-modal itineraries with express rail timetables
            </p>
          )}
        </div>
      </div>

      {/* Right: Actions & User Info */}
      <div className="flex items-center gap-3">
        <Link
          to="/builder"
          className="flex items-center gap-1.5 rounded-full bg-[#292524] dark:bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-xs transition-all hover:bg-[#0c0a09] dark:hover:bg-indigo-700 active:scale-98"
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
            className="rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700"
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

        {/* Bell Notifications */}
        <button
          type="button"
          onClick={() => setIsNotificationPanelOpen((prev) => !prev)}
          title="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
        >
          <FiBell className="text-base" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-black text-white shadow-xs animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User initials plate */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-700">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0efed] dark:bg-slate-800 border border-[#e7e5e4] dark:border-slate-700 text-xs font-bold text-[#0c0a09] dark:text-white">
            {user?.name ? user.name[0].toUpperCase() : "T"}
          </div>
          <span className="hidden sm:block text-xs font-medium text-slate-700 dark:text-slate-300">
            {user?.name || "Traveler"}
          </span>
        </div>
      </div>

      {/* Notifications Dropdown Panel */}
      <NotificationPanel
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
        onUnreadCountChange={(cnt) => setUnreadCount(cnt)}
        onOpenTripChat={(tripId) => {
          setActiveChatTripId(tripId);
          setIsChatModalOpen(true);
        }}
      />

      {/* 1-to-1 Trip Chat Modal */}
      {activeChatTripId && (
        <TripChatModal
          isOpen={isChatModalOpen}
          tripId={activeChatTripId}
          onClose={() => {
            setIsChatModalOpen(false);
            setActiveChatTripId(null);
          }}
        />
      )}
    </header>
  );
}
