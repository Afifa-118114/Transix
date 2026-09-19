import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  FiActivity, FiCheckCircle, FiBriefcase, FiAlertTriangle, 
  FiZap, FiBell, FiUser, FiCompass
} from "react-icons/fi";
import { Sparkles, GraduationCap } from "lucide-react";
import NotificationPanel from "../notifications/NotificationPanel";
import TripChatModal from "../chat/TripChatModal";
import { getUnreadNotificationCount } from "../../api/notificationApi";

export default function OperatorSidebar({ personalCount, campusCount, pendingCount }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const typeParam = searchParams.get("type");
  const pathname = location.pathname;

  const isDashboard = pathname === "/operator/dashboard";
  const isPersonal = pathname === "/operator/trips" && typeParam === "personal";
  const isCampus = pathname === "/operator/trips" && typeParam === "campus";
  const isAllTrips = pathname === "/operator/trips" && !typeParam;

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
      } catch (err) {
        // quiet error
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-200">
      {/* Brand */}
      <div className="p-6 border-b border-slate-800/80">
        <Link to="/" className="flex items-center gap-2 text-white">
          <Sparkles className="text-indigo-500" size={22} />
          <span className="text-xl font-black tracking-tight">TRANSIX</span>
        </Link>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
          Tour Operations Center
        </div>
      </div>

      <div className="flex-1 px-4 py-6 space-y-6 overflow-y-auto custom-scrollbar">
        {/* Operations */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-black tracking-widest text-slate-500 uppercase">
            Operations
          </div>
          <div className="space-y-1 text-sm font-bold">
            <Link 
              to="/operator/dashboard" 
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition ${
                isDashboard 
                  ? "text-white bg-indigo-600/20 border border-indigo-500/30 font-black" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <FiActivity className={isDashboard ? "text-indigo-400" : ""} /> Dashboard
            </Link>
          </div>
        </div>

        {/* Trips */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-black tracking-widest text-slate-500 uppercase">
            Trips
          </div>
          <div className="space-y-1 text-xs font-bold">
            <Link 
              to="/operator/trips?type=personal" 
              className={`flex items-center justify-between px-3 py-2 rounded-lg transition ${
                isPersonal 
                  ? "text-white bg-indigo-600/20 border border-indigo-500/30 font-black" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <span className="flex items-center gap-3"><FiCompass className={isPersonal ? "text-indigo-400" : ""} /> Personal Trips</span>
              {typeof personalCount === "number" && (
                <span className="text-[10px] text-slate-500 font-bold">{personalCount}</span>
              )}
            </Link>
            <Link 
              to="/operator/trips?type=campus" 
              className={`flex items-center justify-between px-3 py-2 rounded-lg transition ${
                isCampus 
                  ? "text-white bg-indigo-600/20 border border-indigo-500/30 font-black" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <span className="flex items-center gap-3"><GraduationCap size={15} className={isCampus ? "text-indigo-400" : ""} /> Campus Trips</span>
              {typeof campusCount === "number" && (
                <span className="text-[10px] text-slate-500 font-bold">{campusCount}</span>
              )}
            </Link>
          </div>
        </div>

        {/* Management */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-black tracking-widest text-slate-500 uppercase">
            Management
          </div>
          <div className="space-y-1 text-xs font-bold">
            <Link 
              to="/operator/trips" 
              className={`flex items-center justify-between px-3 py-2 rounded-lg transition ${
                isAllTrips 
                  ? "text-white bg-indigo-600/20 border border-indigo-500/30 font-black" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <span className="flex items-center gap-3"><FiCheckCircle className={isAllTrips ? "text-indigo-400" : ""} /> Bookings</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800/60 text-[9px] font-bold text-amber-400">
                  {pendingCount}
                </span>
              )}
            </Link>
            <div className="flex items-center justify-between px-3 py-2 text-slate-500">
              <span className="flex items-center gap-3"><FiBriefcase /> Vendors</span>
              <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 uppercase tracking-widest">Soon</span>
            </div>
          </div>
        </div>

        {/* Monitoring */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-black tracking-widest text-slate-500 uppercase">
            Monitoring
          </div>
          <div className="space-y-1 text-xs font-bold">
            <div className="flex items-center justify-between px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition cursor-pointer">
              <span className="flex items-center gap-3"><FiAlertTriangle className="text-emerald-400" /> Disruptions</span>
              <span className="text-[10px] font-bold text-emerald-400">0 Active</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition cursor-pointer">
              <span className="flex items-center gap-3"><FiZap className="text-amber-400" /> SmartShift</span>
              <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 uppercase tracking-widest">Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="p-4 border-t border-slate-800 space-y-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => setIsNotificationPanelOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition text-left cursor-pointer"
        >
          <span className="flex items-center gap-3">
            <FiBell /> Notifications
          </span>
          {unreadNotificationCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-white text-[10px] font-black shadow-xs animate-pulse">
              {unreadNotificationCount}
            </span>
          )}
        </button>
        <div className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white rounded-lg transition cursor-pointer">
          <FiUser /> Profile
        </div>
      </div>

      {/* Notifications Dropdown Panel */}
      <NotificationPanel
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
        onUnreadCountChange={(cnt) => setUnreadNotificationCount(cnt)}
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
          currentRole="operator"
          onClose={() => {
            setIsChatModalOpen(false);
            setActiveChatTripId(null);
          }}
        />
      )}
    </div>
  );
}
