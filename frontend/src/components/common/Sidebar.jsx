import { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiHome,
  FiBookmark,
  FiUser,
  FiMap,
  FiCompass,
  FiLayers,
  FiLogOut,
  FiPlus,
  FiChevronsLeft,
  FiChevronsRight,
  FiUsers,
  FiSun,
  FiMoon,
} from "react-icons/fi";
import { FaTrain } from "react-icons/fa6";
import logo from "../../assets/logo/logo.png";
import { useTripBuilder } from "../../context/TripBuilderContext";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../context/ThemeContext";

const NAV_ITEMS = [
  { title: "Home", path: "/home", icon: <FiHome className="text-lg shrink-0" /> },
  { title: "Tour Builder", path: "/builder", icon: <FiLayers className="text-lg shrink-0" /> },
  { title: "Campus Trips", path: "/campus", icon: <FiUsers className="text-lg shrink-0" /> },
  { title: "Train Routes", path: "/travel-options", icon: <FaTrain className="text-base shrink-0" /> },
  { title: "Journey Planner", path: "/planner", icon: <FiCompass className="text-lg shrink-0" /> },
  { title: "Saved Trips", path: "/saved", icon: <FiBookmark className="text-lg shrink-0" /> },
];


export default function Sidebar({ trip: propTrip, setTrip: propSetTrip }) {
  const { trip: contextTrip, setTrip: contextSetTrip, openMapModal } = useTripBuilder();
  const trip = propTrip !== undefined ? propTrip : contextTrip;
  const setTrip = propSetTrip || contextSetTrip;
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Collapsible state (saved in localStorage)
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("transix_sidebar_collapsed") === "true";
  });

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("transix_sidebar_collapsed", String(next));
      return next;
    });
  };

  const handlePlanAnother = () => {
    localStorage.removeItem("currentTrip");
    localStorage.removeItem("transix_builder_trip");
    if (setTrip) setTrip(null);
    window.dispatchEvent(new CustomEvent("transix_trip_updated", { detail: null }));
    navigate("/home");
  };

  const handleLogout = () => {
    if (logout) logout();
    navigate("/login");
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 272 }}
      transition={{ type: "spring", stiffness: 350, damping: 32 }}
      className="sticky top-0 z-40 flex h-screen shrink-0 flex-col justify-between border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] select-none overflow-hidden transition-colors duration-200"
    >
      {/* Top Section */}
      <div className={`flex flex-col gap-4 ${collapsed ? "px-2 py-4" : "p-4"}`}>
        {/* Header: Brand & Collapse Toggle */}
        {collapsed ? (
          <div className="flex flex-col items-center gap-2.5">
            <Link
              to="/home"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition hover:opacity-85"
              title="Transix Home"
            >
              <img src={logo} alt="Transix" className="h-8 w-8 shrink-0 object-contain" />
            </Link>

            <button
              type="button"
              onClick={toggleSidebar}
              title="Expand sidebar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <FiChevronsRight className="text-sm" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between min-w-0">
            <Link
              to="/home"
              className="flex items-center gap-2.5 transition hover:opacity-85 min-w-0 overflow-hidden"
              title="Transix"
            >
              <img src={logo} alt="Transix" className="h-8 w-8 shrink-0 object-contain" />
              <AnimatePresence initial={false}>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col whitespace-nowrap overflow-hidden"
                >
                  <span className="font-sans text-base font-bold tracking-tight text-slate-900 dark:text-white">
                    Transix
                  </span>
                </motion.div>
              </AnimatePresence>
            </Link>

            {/* SVG Open/Close Toggle Button with smooth rotation */}
            <button
              type="button"
              onClick={toggleSidebar}
              title="Collapse sidebar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <FiChevronsLeft className="text-sm" />
            </button>
          </div>
        )}

        {/* Shifted from Navbar: Active Journey Card */}
        {trip ? (
          collapsed ? (
            <Link
              to="/builder"
              title={`${trip.source} → ${trip.destination}`}
              className="flex h-11 w-11 items-center justify-center mx-auto rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-colors"
            >
              <FaTrain className="text-base" />
            </Link>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-3.5 flex flex-col gap-2.5 overflow-hidden shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Active Journey
                </span>
                <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                  {trip.itinerary?.length || 0} Days
                </span>
              </div>

              <div>
                <h3
                  style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
                  className="text-base font-medium leading-tight text-slate-900 dark:text-white truncate"
                >
                  {trip.source} → {trip.destination}
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {trip.travelers || 2} Travelers • {trip.currency || "₹"}{" "}
                  {Number(trip.budget || 0).toLocaleString()}
                </p>
              </div>

              {/* Quick Actions */}
              <div className="mt-1">
                <button
                  type="button"
                  onClick={handlePlanAnother}
                  className="w-full flex items-center justify-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 active:scale-[0.98] cursor-pointer shadow-2xs"
                >
                  <FiPlus className="text-xs" />
                  <span>Plan Another Trip</span>
                </button>
              </div>
            </motion.div>
          )
        ) : (
          !collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              <Link
                to="/builder"
                className="flex items-center justify-center gap-2 rounded-full bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 py-2.5 text-xs font-semibold text-white shadow-xs transition active:scale-[0.98]"
              >
                <FiLayers className="text-xs" />
                <span>Open Tour Builder</span>
              </Link>
            </motion.div>
          )
        )}

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-1 mt-1">
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 whitespace-nowrap overflow-hidden"
              >
                Navigation
              </motion.span>
            )}
          </AnimatePresence>

          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.title}
              to={item.path}
              title={collapsed ? item.title : undefined}
              className={({ isActive }) =>
                `group relative flex items-center rounded-xl text-xs font-medium transition-all ${
                  collapsed
                    ? "h-11 w-11 mx-auto justify-center"
                    : "gap-3 px-3.5 py-2.5"
                } ${
                  isActive
                    ? "bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="activeNavIndicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-indigo-600 dark:bg-indigo-400"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 shrink-0">{item.icon}</span>
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.15 }}
                        className="truncate whitespace-nowrap"
                      >
                        {item.title}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          ))}

          {/* Interactive Map Button */}
          <button
            type="button"
            onClick={openMapModal}
            title={collapsed ? "Interactive Map" : undefined}
            className={`flex items-center rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 transition hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white cursor-pointer ${
              collapsed
                ? "h-11 w-11 mx-auto justify-center"
                : "gap-3 px-3.5 py-2.5 text-left"
            }`}
          >
            <FiMap className="text-lg text-slate-700 dark:text-slate-300 shrink-0" />
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="truncate whitespace-nowrap"
                >
                  Interactive Map
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </nav>
      </div>

      {/* Bottom Section: Theme Toggle, User Profile & Logout */}
      <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col gap-2.5">
        {/* Dark/Light Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className={`flex items-center rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors cursor-pointer ${
            collapsed ? "h-9 w-9 mx-auto justify-center" : "w-full justify-between px-3 py-2"
          }`}
        >
          <div className="flex items-center gap-2">
            {isDark ? (
              <FiSun className="text-amber-400 text-sm shrink-0" />
            ) : (
              <FiMoon className="text-indigo-600 text-sm shrink-0" />
            )}
            {!collapsed && <span>{isDark ? "Light Mode" : "Dark Mode"}</span>}
          </div>
          {!collapsed && (
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
              {isDark ? "Dark" : "Light"}
            </span>
          )}
        </button>

        {collapsed ? (
          <div className="flex flex-col items-center gap-2 pt-1">
            <div
              title={user?.name || "Traveler"}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
            >
              {user?.name ? user.name[0].toUpperCase() : "T"}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
            >
              <FiLogOut className="text-sm" />
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-between min-w-0 pt-1"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white">
                {user?.name ? user.name[0].toUpperCase() : "T"}
              </div>

              <div className="min-w-0 flex-1 whitespace-nowrap overflow-hidden">
                <h4 className="truncate text-xs font-bold text-slate-900 dark:text-white">
                  {user?.name || "Traveler"}
                </h4>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {user?.email || "Personal Account"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
            >
              <FiLogOut className="text-xs" />
            </button>
          </motion.div>
        )}
      </div>
    </motion.aside>
  );
}
