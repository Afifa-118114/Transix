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
} from "react-icons/fi";
import { FaTrain } from "react-icons/fa6";
import logo from "../../assets/logo/logo.png";
import { useTripBuilder } from "../../context/TripBuilderContext";
import { useAuth } from "../../hooks/useAuth";

const NAV_ITEMS = [
  { title: "Home", path: "/home", icon: <FiHome className="text-lg shrink-0" /> },
  { title: "Tour Builder", path: "/builder", icon: <FiLayers className="text-lg shrink-0" /> },
  { title: "Train Routes", path: "/travel-options", icon: <FaTrain className="text-base shrink-0" /> },
  { title: "Journey Planner", path: "/planner", icon: <FiCompass className="text-lg shrink-0" /> },
  { title: "Saved Trips", path: "/saved", icon: <FiBookmark className="text-lg shrink-0" /> },
  { title: "Profile", path: "/profile", icon: <FiUser className="text-lg shrink-0" /> },
];

export default function Sidebar({ trip: propTrip, setTrip: propSetTrip }) {
  const { trip: contextTrip, setTrip: contextSetTrip, openMapModal } = useTripBuilder();
  const trip = propTrip !== undefined ? propTrip : contextTrip;
  const setTrip = propSetTrip || contextSetTrip;
  const { user, logout } = useAuth();
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
      className="sticky top-0 z-30 flex h-screen shrink-0 flex-col justify-between border-r border-[#e7e5e4] bg-[#ffffff] select-none overflow-hidden"
    >
      {/* Top Section */}
      <div className="flex flex-col gap-4 p-4">
        {/* Header: Brand & Collapse Toggle */}
        <div className="flex items-center justify-between min-w-0">
          <Link
            to="/home"
            className="flex items-center gap-2.5 transition hover:opacity-85 min-w-0 overflow-hidden"
            title="Transix"
          >
            <img src={logo} alt="Transix" className="h-8 w-8 shrink-0 object-contain" />
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col whitespace-nowrap overflow-hidden"
                >
                  <span className="font-sans text-base font-bold tracking-tight text-[#0c0a09]">
                    Transix
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-[#777169]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    Rail & Transit OS
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>

          {/* SVG Open/Close Toggle Button with smooth rotation */}
          <button
            type="button"
            onClick={toggleSidebar}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#e7e5e4] text-[#4e4e4e] transition-colors hover:bg-[#f5f5f5] hover:text-[#0c0a09]"
          >
            {collapsed ? (
              <FiChevronsRight className="text-sm" />
            ) : (
              <FiChevronsLeft className="text-sm" />
            )}
          </button>
        </div>

        {/* Shifted from Navbar: Active Journey Card */}
        {trip ? (
          collapsed ? (
            <Link
              to="/builder"
              title={`${trip.source} → ${trip.destination}`}
              className="flex h-11 w-11 items-center justify-center mx-auto rounded-xl border border-[#034F46]/20 bg-[#034F46]/10 text-[#034F46] hover:bg-[#034F46] hover:text-white transition-colors"
            >
              <FaTrain className="text-base" />
            </Link>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl border border-[#e7e5e4] bg-[#faf9f5] p-3.5 flex flex-col gap-2.5 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#034F46]">
                  Active Journey
                </span>
                <span className="rounded-full bg-[#034F46]/10 px-2 py-0.5 text-[10px] font-bold text-[#034F46]">
                  {trip.itinerary?.length || 0} Days
                </span>
              </div>

              <div>
                <h3
                  style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
                  className="text-base font-[300] leading-tight text-[#0c0a09] truncate"
                >
                  {trip.source} → {trip.destination}
                </h3>
                <p className="mt-0.5 text-[11px] text-[#777169] truncate">
                  {trip.travelers || 2} Travelers • {trip.currency || "₹"}{" "}
                  {Number(trip.budget || 0).toLocaleString()}
                </p>
              </div>

              {/* Quick Actions */}
              <div className="mt-1">
                <button
                  type="button"
                  onClick={handlePlanAnother}
                  className="w-full flex items-center justify-center gap-1.5 rounded-full border border-[#d6d3d1] bg-white py-1.5 text-[11px] font-medium text-[#4e4e4e] transition hover:bg-[#f5f5f5] hover:border-[#0c0a09] active:scale-[0.98]"
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
                className="flex items-center justify-center gap-2 rounded-full bg-[#292524] py-2.5 text-xs font-medium text-white shadow-xs transition hover:bg-[#0c0a09] active:scale-[0.98]"
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
                className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#777169] mb-1 whitespace-nowrap overflow-hidden"
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
                    ? "bg-[#f0efed] font-semibold text-[#0c0a09] shadow-xs"
                    : "text-[#4e4e4e] hover:bg-[#f5f5f5] hover:text-[#0c0a09]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="activeNavIndicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-[#0c0a09]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="text-[#0c0a09] shrink-0">{item.icon}</span>
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
            className={`flex items-center rounded-xl text-xs font-medium text-[#4e4e4e] transition hover:bg-[#f5f5f5] hover:text-[#0c0a09] ${
              collapsed
                ? "h-11 w-11 mx-auto justify-center"
                : "gap-3 px-3.5 py-2.5 text-left"
            }`}
          >
            <FiMap className="text-lg text-[#0c0a09] shrink-0" />
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

      {/* Bottom Section: Shifted from Navbar (User Profile & Logout) */}
      <div className="p-4 border-t border-[#f0efed] overflow-hidden">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div
              title={user?.name || "Traveler"}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f0efed] border border-[#e7e5e4] text-xs font-bold text-[#0c0a09]"
            >
              {user?.name ? user.name[0].toUpperCase() : "T"}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#777169] transition hover:bg-[#f5f5f5] hover:text-[#dc2626]"
            >
              <FiLogOut className="text-sm" />
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-between min-w-0"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f0efed] border border-[#e7e5e4] text-xs font-bold text-[#0c0a09]">
                {user?.name ? user.name[0].toUpperCase() : "T"}
              </div>

              <div className="min-w-0 flex-1 whitespace-nowrap overflow-hidden">
                <h4 className="truncate text-xs font-bold text-[#0c0a09]">
                  {user?.name || "Traveler"}
                </h4>
                <p className="truncate text-[11px] text-[#777169]">
                  {user?.email || "Personal Account"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e7e5e4] text-[#777169] transition hover:bg-[#f5f5f5] hover:text-[#dc2626]"
            >
              <FiLogOut className="text-xs" />
            </button>
          </motion.div>
        )}
      </div>
    </motion.aside>
  );
}
