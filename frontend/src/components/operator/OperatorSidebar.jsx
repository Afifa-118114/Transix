import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { getUnreadNotificationCount } from "../../api/notificationApi";
import NotificationPanel from "../notifications/NotificationPanel";
import TripChatModal from "../chat/TripChatModal";

/* ── Inline monochrome SVG icons (Trip.com style — single grey stroke) ── */
const IconDashboard = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const IconAllTrips = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" />
  </svg>
);
const IconPersonal = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="3" /><path d="M6.5 20c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" />
  </svg>
);
const IconCampus = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);
const IconBookings = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IconActivities = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const IconVendors = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const IconQuotes = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);
const IconVendorPortal = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    <line x1="12" y1="12" x2="12" y2="16" /><line x1="10" y1="14" x2="14" y2="14" />
  </svg>
);
const IconGuide = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" />
  </svg>
);
const IconChat = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const IconBell = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const IconLogo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 7l10-5 10 5-10 5-10-5z" /><path d="M2 12l10 5 10-5" /><path d="M2 17l10 5 10-5" />
  </svg>
);

/* ── Nav Item ── */
function NavItem({ to, icon: Icon, label, badge, badgeVariant = "count", active, onClick }) {
  const base = "group flex items-center justify-between py-2.5 pr-4 transition-all duration-150 cursor-pointer w-full text-left";
  const activeStyle = "border-l-[3px] border-[#006CE4] bg-[#EFF6FF] text-[#006CE4] font-semibold pl-[13px]";
  const inactiveStyle = "border-l-[3px] border-transparent text-[#4A5568] hover:bg-[#F7F8FA] hover:text-[#1A202C] pl-[13px]";

  const iconColor = active ? "text-[#006CE4]" : "text-[#718096] group-hover:text-[#2D3748]";

  const badgeEl = (() => {
    if (badge === undefined || badge === null) return null;
    if (badgeVariant === "count")
      return <span className="text-[11px] font-bold min-w-[20px] text-center px-1.5 py-0.5 rounded-full bg-[#E2E8F0] text-[#4A5568]">{badge}</span>;
    if (badgeVariant === "alert" && badge > 0)
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DC2626] text-white">{badge}</span>;
    if (badgeVariant === "new")
      return <span className="text-[9px] font-black px-2 py-0.5 rounded bg-[#DC2626] text-white tracking-wider uppercase">New</span>;
    if (badgeVariant === "live")
      return <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]">Live</span>;
    if (badgeVariant === "ready")
      return <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A]">✓ Ready</span>;
    return null;
  })();

  const inner = (
    <>
      <div className="flex items-center gap-3">
        <span className={`transition-colors duration-150 flex-shrink-0 ${iconColor}`}>
          <Icon size={17} />
        </span>
        <span className="text-[13.5px] leading-tight">{label}</span>
      </div>
      {badgeEl}
    </>
  );

  if (onClick)
    return <button type="button" onClick={onClick} className={`${base} ${active ? activeStyle : inactiveStyle}`}>{inner}</button>;
  return <Link to={to} className={`${base} ${active ? activeStyle : inactiveStyle}`}>{inner}</Link>;
}

function SectionLabel({ label }) {
  return <div className="px-4 pt-4 pb-1"><span className="text-[10.5px] font-bold tracking-[0.09em] text-[#A0AEC0] uppercase">{label}</span></div>;
}
function Divider() {
  return <div className="mx-0 my-1 border-t border-[#EDF2F7]" />;
}

/* ── Main Export ── */
export default function OperatorSidebar({ personalCount, campusCount, pendingCount }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const typeParam = searchParams.get("type");
  const pathname = location.pathname;

  const isDashboard = pathname === "/operator/dashboard";
  const isPersonal = pathname === "/operator/trips" && typeParam === "personal";
  const isCampus = pathname === "/operator/trips" && typeParam === "campus";
  const isAllTrips = pathname === "/operator/trips" && !typeParam;
  const isBookings = pathname === "/operator/bookings";
  const isActivities = pathname === "/operator/activities";
  const isVendors = pathname === "/operator/vendors";
  const isVendorRequests = pathname === "/operator/vendor-requests";
  const isDemoVendorPortal = pathname === "/vendor/requests";
  const isGuidePortal = pathname === "/guide/portal" || pathname.startsWith("/guide/");
  const isChat = pathname === "/operator/chat";

  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
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
          setUnreadNotificationCount(res.unreadCount);
        }
      } catch (_) {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); }
    catch (e) { return {}; }
  })();
  const companyName = user.companyName || user.name || "Transix Partner";
  const initials = companyName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col h-full bg-white border-r border-[#E2E8F0] text-[#2D3748] font-sans select-none overflow-hidden">

      {/* Brand Header */}
      <div className="px-4 py-4 border-b border-[#EDF2F7]">
        <Link to="/operator/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-[#006CE4] flex items-center justify-center shadow-sm flex-shrink-0">
            <IconLogo />
          </div>
          <div>
            <div className="text-[15px] font-extrabold tracking-tight text-[#1A202C] leading-none">TRANSIX</div>
            <div className="text-[10px] text-[#718096] mt-0.5 tracking-wide font-medium">Operation Center</div>
          </div>
        </Link>
      </div>

      {/* Operator Identity Card */}
      <div className="mx-3 my-3 px-3 py-2.5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-[#006CE4] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-[#1A202C] truncate leading-tight">{companyName}</div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] inline-block" />
            <span className="text-[10px] text-[#16A34A] font-medium">Verified Partner</span>
          </div>
        </div>
      </div>

      <Divider />

      {/* Navigation */}
      <div
        className="flex-1 overflow-y-auto pb-4"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#E2E8F0 transparent" }}
      >
        <SectionLabel label="Overview" />
        <NavItem to="/operator/dashboard" icon={IconDashboard} label="Dashboard" active={isDashboard} />

        <Divider />

        <SectionLabel label="Trips" />
        <NavItem to="/operator/trips" icon={IconAllTrips} label="All Itineraries" active={isAllTrips} />
        <NavItem
          to="/operator/trips?type=personal"
          icon={IconPersonal}
          label="Personal Trips"
          active={isPersonal}
          badge={typeof personalCount === "number" ? personalCount : undefined}
          badgeVariant="count"
        />
        <NavItem
          to="/operator/trips?type=campus"
          icon={IconCampus}
          label="Campus Tours"
          active={isCampus}
          badge={typeof campusCount === "number" ? campusCount : undefined}
          badgeVariant="count"
        />

        <Divider />

        <SectionLabel label="Operations" />
        <NavItem
          to="/operator/bookings"
          icon={IconBookings}
          label="Bookings"
          active={isBookings}
          badge={pendingCount > 0 ? pendingCount : (pendingCount === 0 ? "ready" : undefined)}
          badgeVariant={pendingCount > 0 ? "alert" : "ready"}
        />
        <NavItem to="/operator/activities" icon={IconActivities} label="Activities & Tickets" active={isActivities} />

        <Divider />

        <SectionLabel label="Network" />
        <NavItem to="/operator/vendors" icon={IconVendors} label="Vendor Directory" active={isVendors} />
        <NavItem to="/operator/vendor-requests" icon={IconQuotes} label="Vendor Quotes" active={isVendorRequests} />
        <NavItem
          to="/vendor/requests"
          icon={IconVendorPortal}
          label="Vendor Portal"
          active={isDemoVendorPortal}
          badge="live"
          badgeVariant="live"
        />
        <NavItem to="/guide/portal" icon={IconGuide} label="Guide Portal" active={isGuidePortal} />

        <Divider />

        <SectionLabel label="Communication" />
        <NavItem to="/operator/chat" icon={IconChat} label="Traveler Chat" active={isChat} />
        <NavItem
          icon={IconBell}
          label="Alerts & Notifications"
          active={false}
          badge={unreadNotificationCount > 0 ? unreadNotificationCount : undefined}
          badgeVariant="alert"
          onClick={() => setIsNotificationPanelOpen(prev => !prev)}
        />
      </div>

      {/* Panels */}
      <NotificationPanel
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
        onUnreadCountChange={(cnt) => setUnreadNotificationCount(cnt)}
      />
      {activeChatTripId && (
        <TripChatModal
          isOpen={isChatModalOpen}
          tripId={activeChatTripId}
          currentRole="operator"
          onClose={() => { setIsChatModalOpen(false); setActiveChatTripId(null); }}
        />
      )}
    </div>
  );
}
