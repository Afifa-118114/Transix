import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../../assets/logo/logo.png";
import { useTripBuilder } from "../../context/TripBuilderContext";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../context/ThemeContext";

/* ── Inline Monochrome SVG Icons (Trip.com style: single 1.8px stroke) ── */
const IconHome = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const IconCompass = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);

const IconLayers = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const IconTrain = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="3" width="16" height="15" rx="3" />
    <line x1="4" y1="11" x2="20" y2="11" />
    <line x1="8" y1="3" x2="8" y2="11" />
    <line x1="16" y1="3" x2="16" y2="11" />
    <circle cx="8" cy="14" r="1" fill="currentColor" />
    <circle cx="16" cy="14" r="1" fill="currentColor" />
    <line x1="6" y1="21" x2="8" y2="18" />
    <line x1="18" y1="21" x2="16" y2="18" />
  </svg>
);

const IconCampus = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

const IconBookmark = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const IconMap = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
);

const IconPlus = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconLogOut = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const IconSun = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const IconMoon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const IconCollapse = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="11 17 6 12 11 7" />
    <polyline points="18 17 13 12 18 7" />
  </svg>
);

const IconExpand = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="13 17 18 12 13 7" />
    <polyline points="6 17 11 12 6 7" />
  </svg>
);

/* ── Trip.com Section Label ── */
function SectionLabel({ label }) {
  return (
    <div className="px-4 pt-3.5 pb-1">
      <span className="text-[10px] font-bold tracking-[0.09em] text-[#94A3B8] uppercase">
        {label}
      </span>
    </div>
  );
}

/* ── Trip.com Divider ── */
function Divider() {
  return <div className="mx-0 my-1 border-t border-[#F1F5F9]" />;
}

/* ── Trip.com NavItem ── */
function NavItem({ to, icon: Icon, label, badge, active, collapsed, onClick }) {
  const base =
    "group flex items-center justify-between py-2.5 transition-all duration-150 cursor-pointer w-full text-left";
  const activeStyle =
    "border-l-[3px] border-[#006CE4] bg-[#EFF6FF] text-[#006CE4] font-semibold";
  const inactiveStyle =
    "border-l-[3px] border-transparent text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]";

  const iconColor = active
    ? "text-[#006CE4]"
    : "text-[#64748B] group-hover:text-[#1E293B]";

  const content = (
    <div
      className={`flex items-center gap-3 w-full ${
        collapsed ? "justify-center pl-0" : "pl-[13px] pr-4"
      }`}
    >
      <span className={`transition-colors duration-150 shrink-0 ${iconColor}`}>
        <Icon size={17} />
      </span>
      {!collapsed && (
        <span className="text-[13.5px] leading-tight truncate">{label}</span>
      )}
      {!collapsed && badge && (
        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#E2E8F0] text-[#475569]">
          {badge}
        </span>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={collapsed ? label : undefined}
        className={`${base} ${active ? activeStyle : inactiveStyle}`}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      to={to}
      title={collapsed ? label : undefined}
      className={`${base} ${active ? activeStyle : inactiveStyle}`}
    >
      {content}
    </Link>
  );
}

/* ── Main Component ── */
export default function Sidebar({ trip: propTrip, setTrip: propSetTrip }) {
  const { trip: contextTrip, setTrip: contextSetTrip, openMapModal } = useTripBuilder();
  const trip = propTrip !== undefined ? propTrip : contextTrip;
  const setTrip = propSetTrip || contextSetTrip;
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

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

  const pathname = location.pathname;
  const isHome = pathname === "/home";
  const isPlanner = pathname === "/planner";
  const isBuilder = pathname === "/builder" || pathname === "/tour-builder";
  const isTrainRoutes = pathname === "/travel-options";
  const isCampus = pathname === "/campus" || pathname.startsWith("/campus");
  const isSaved = pathname === "/saved";

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ type: "spring", stiffness: 350, damping: 32 }}
      className="sticky top-0 z-40 flex h-screen shrink-0 flex-col justify-between border-r border-[#E2E8F0] bg-white select-none overflow-hidden transition-colors"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
    >
      {/* ── Top Header & Navigation ── */}
      <div className="flex flex-col min-w-0 overflow-y-auto overflow-x-hidden flex-1 custom-scrollbar">
        {/* Brand Header */}
        <div
          className={`flex items-center border-b border-[#F1F5F9] ${
            collapsed ? "justify-center h-16 px-2" : "justify-between h-16 px-4"
          }`}
        >
          {collapsed ? (
            <div className="flex flex-col items-center gap-1.5">
              <Link to="/home" title="Transix" className="hover:opacity-85 transition">
                <img src={logo} alt="Transix" className="h-7 w-7 object-contain" />
              </Link>
              <button
                type="button"
                onClick={toggleSidebar}
                title="Expand sidebar"
                className="flex h-6 w-6 items-center justify-center rounded text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition cursor-pointer"
              >
                <IconExpand />
              </button>
            </div>
          ) : (
            <>
              <Link to="/home" className="flex items-center gap-2.5 hover:opacity-85 transition min-w-0">
                <img src={logo} alt="Transix" className="h-7 w-7 object-contain shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[15px] font-bold text-[#0F172A] tracking-tight truncate leading-tight">
                    Transix
                  </span>
                  <span className="text-[10px] text-[#64748B] font-medium tracking-wide">
                    Journey Studio
                  </span>
                </div>
              </Link>

              <button
                type="button"
                onClick={toggleSidebar}
                title="Collapse sidebar"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition cursor-pointer"
              >
                <IconCollapse />
              </button>
            </>
          )}
        </div>

        {/* ── Active Journey or Quick Action Card ── */}
        <div className={`pt-3.5 pb-2 ${collapsed ? "px-2" : "px-3.5"}`}>
          {trip ? (
            collapsed ? (
              <Link
                to="/builder"
                title={`${trip.source} → ${trip.destination}`}
                className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#006CE4] hover:bg-[#006CE4] hover:text-white transition"
              >
                <IconTrain size={18} />
              </Link>
            ) : (
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 flex flex-col gap-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#006CE4]">
                    Active Journey
                  </span>
                  <span className="rounded-full bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 text-[9.5px] font-bold text-[#006CE4]">
                    {trip.itinerary?.length || 0} Days
                  </span>
                </div>

                <div>
                  <h3 className="text-[13px] font-semibold text-[#0F172A] truncate">
                    {trip.source} → {trip.destination}
                  </h3>
                  <p className="text-[11px] text-[#64748B] truncate mt-0.5">
                    {trip.travelers || 2} Travelers • {trip.currency || "₹"}{" "}
                    {Number(trip.budget || 0).toLocaleString()}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handlePlanAnother}
                  className="mt-0.5 w-full flex items-center justify-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white py-1.5 text-[11px] font-semibold text-[#334155] hover:bg-[#F1F5F9] hover:border-[#94A3B8] transition cursor-pointer shadow-2xs"
                >
                  <IconPlus size={12} />
                  <span>Plan Another Trip</span>
                </button>
              </div>
            )
          ) : (
            !collapsed && (
              <Link
                to="/planner"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#006CE4] hover:bg-[#005bb5] text-white py-2 text-xs font-semibold shadow-xs transition active:scale-[0.99]"
              >
                <IconCompass size={15} />
                <span>Create New Itinerary</span>
              </Link>
            )
          )}
        </div>

        {/* ── Navigation List ── */}
        <div className="flex flex-col py-1">
          {!collapsed && <SectionLabel label="Travel Workspace" />}

          <NavItem
            to="/home"
            icon={IconHome}
            label="Overview"
            active={isHome}
            collapsed={collapsed}
          />
          <NavItem
            to="/planner"
            icon={IconCompass}
            label="Journey Planner"
            active={isPlanner}
            collapsed={collapsed}
          />
          <NavItem
            to="/builder"
            icon={IconLayers}
            label="Tour Builder"
            active={isBuilder}
            collapsed={collapsed}
          />
          <NavItem
            to="/travel-options"
            icon={IconTrain}
            label="Train & Transit"
            active={isTrainRoutes}
            collapsed={collapsed}
          />

          <Divider />

          {!collapsed && <SectionLabel label="Community & Plans" />}

          <NavItem
            to="/campus"
            icon={IconCampus}
            label="Campus Tours"
            active={isCampus}
            collapsed={collapsed}
          />
          <NavItem
            to="/saved"
            icon={IconBookmark}
            label="Saved Trips"
            active={isSaved}
            collapsed={collapsed}
          />
          <NavItem
            onClick={openMapModal}
            icon={IconMap}
            label="Interactive Map"
            active={false}
            collapsed={collapsed}
          />
        </div>
      </div>

      {/* ── Bottom Section: Theme & User Identity Card ── */}
      <div className="border-t border-[#F1F5F9] p-3 flex flex-col gap-2 bg-[#FAFCFF]">
        {/* Clean Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className={`flex items-center rounded-lg border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition text-xs font-medium cursor-pointer ${
            collapsed ? "h-9 w-9 mx-auto justify-center" : "w-full justify-between px-3 py-1.5"
          }`}
        >
          <div className="flex items-center gap-2">
            {isDark ? <IconSun size={15} /> : <IconMoon size={15} />}
            {!collapsed && <span>{isDark ? "Light Mode" : "Dark Mode"}</span>}
          </div>
          {!collapsed && (
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wide">
              {isDark ? "Dark" : "Light"}
            </span>
          )}
        </button>

        {/* User Identity / Login Card */}
        {user ? (
          collapsed ? (
            <div className="flex flex-col items-center gap-1.5 pt-1">
              <div
                title={user.name || "Traveler"}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-xs font-bold text-[#006CE4]"
              >
                {user.name ? user.name[0].toUpperCase() : "T"}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign Out"
                className="flex h-7 w-7 items-center justify-center rounded text-[#64748B] hover:text-[#DC2626] transition cursor-pointer"
              >
                <IconLogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between min-w-0 pt-0.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-xs font-bold text-[#006CE4]">
                  {user.name ? user.name[0].toUpperCase() : "T"}
                </div>
                <div className="min-w-0 flex-1 truncate">
                  <h4 className="text-[12.5px] font-semibold text-[#0F172A] truncate leading-tight">
                    {user.name || "Traveler"}
                  </h4>
                  <p className="text-[11px] text-[#64748B] truncate">
                    {user.email || "Personal Account"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                title="Sign Out"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#FEE2E2] hover:text-[#DC2626] transition cursor-pointer"
              >
                <IconLogOut size={15} />
              </button>
            </div>
          )
        ) : (
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 rounded-lg border border-[#006CE4] bg-[#EFF6FF] text-[#006CE4] py-1.5 text-xs font-semibold hover:bg-[#006CE4] hover:text-white transition"
          >
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </motion.aside>
  );
}
