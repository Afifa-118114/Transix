import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  FiHome,
  FiLayers,
  FiBookmark,
  FiUser,
  FiUsers,
  FiActivity,
  FiCalendar,
  FiBriefcase,
} from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";

export default function MobileBottomNav() {
  const { user } = useAuth();
  const location = useLocation();

  // Hide on authentication pages
  if (location.pathname === "/login" || location.pathname === "/register") {
    return null;
  }

  // If user is operator, show operator-focused navigation items
  const isOperator = user?.role === "operator";

  const travelerNavItems = [
    { label: "Home", path: "/home", icon: FiHome },
    { label: "Builder", path: "/builder", icon: FiLayers },
    { label: "Campus", path: "/campus", icon: FiUsers },
    { label: "Saved", path: "/saved", icon: FiBookmark },
    { label: "Profile", path: "/profile", icon: FiUser },
  ];

  const operatorNavItems = [
    { label: "Dashboard", path: "/operator/dashboard", icon: FiActivity },
    { label: "Trips", path: "/operator/trips", icon: FiCalendar },
    { label: "Bookings", path: "/operator/bookings", icon: FiBriefcase },
    { label: "Vendors", path: "/operator/vendors", icon: FiUsers },
    { label: "Profile", path: "/profile", icon: FiUser },
  ];

  const navItems = isOperator ? operatorNavItems : travelerNavItems;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom,0.5rem),0.5rem)] transition-colors duration-200"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path ||
            (item.path === "/builder" &&
              (location.pathname === "/my-trip" || location.pathname === "/tour-builder")) ||
            (item.path === "/home" && location.pathname === "/");

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150 relative min-w-[56px] select-none ${
                isActive
                  ? "text-indigo-600 dark:text-indigo-400 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium"
              }`}
            >
              <div
                className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-transform ${
                  isActive
                    ? "scale-105 bg-indigo-50 dark:bg-indigo-950/60 shadow-xs"
                    : "hover:scale-102"
                }`}
              >
                <Icon className={`text-lg ${isActive ? "stroke-[2.4]" : "stroke-[1.8]"}`} />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-3 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
