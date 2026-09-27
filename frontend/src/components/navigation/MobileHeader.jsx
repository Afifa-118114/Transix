import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiBell, FiSun, FiMoon } from "react-icons/fi";
import logo from "../../assets/logo/logo.png";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../hooks/useAuth";
import NotificationPanel from "../notifications/NotificationPanel";
import { getUnreadNotificationCount } from "../../api/notificationApi";

export default function MobileHeader({ trip, onPlanAnother }) {
  const { isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

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
    const interval = setInterval(fetchUnread, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-200">
        {/* Brand & Mini-Context */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link to="/home" className="flex items-center gap-2 shrink-0">
            <img src={logo} alt="Transix" className="h-7 w-7 object-contain" />
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-800 dark:from-indigo-400 dark:to-cyan-400 bg-clip-text text-transparent">
              Transix
            </span>
          </Link>

          {trip && (
            <div className="min-w-0 pl-2 border-l border-slate-200 dark:border-slate-700">
              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                {trip.destination || trip.source}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Toggle Theme"
          >
            {isDark ? <FiSun className="text-sm text-amber-400" /> : <FiMoon className="text-sm" />}
          </button>

          {/* Notifications */}
          <button
            type="button"
            onClick={() => setIsNotificationOpen(true)}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Notifications"
          >
            <FiBell className="text-sm" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Notification Slide Panel */}
      <NotificationPanel
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />
    </>
  );
}
