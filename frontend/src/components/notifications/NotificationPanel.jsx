import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FiBell, FiX, FiMessageSquare, FiBriefcase, FiUser, 
  FiArrowRight, FiCheckCircle
} from "react-icons/fi";
import { GraduationCap } from "lucide-react";
import { 
  getNotifications, 
  markNotificationRead, 
  markAllNotificationsRead 
} from "../../api/notificationApi";

export default function NotificationPanel({
  isOpen,
  onClose,
  onOpenTripChat, // Legacy callback kept for backwards compatibility
  onUnreadCountChange = null,
}) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("all"); // "all" | "travelers" | "vendors"

  const fetchList = async (isSilent = false) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      if (!isSilent) setLoading(true);
      const data = await getNotifications(token);
      if (data?.success) {
        setNotifications(data.notifications || []);
        const count = data.unreadCount || 0;
        setUnreadCount(count);
        if (typeof onUnreadCountChange === "function") {
          onUnreadCountChange(count);
        }
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchList(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Categorize notifications into TRAVELERS (Campus Coordinators & Personal Travelers) and VENDORS (Vendors)
  const categorized = useMemo(() => {
    const campusCoordinators = [];
    const personalTravelers = [];
    const vendors = [];

    notifications.forEach((n) => {
      const isVendor = n.senderRole === "vendor" || n.category === "VENDOR" || n.type === "VENDOR" || Boolean(n.vendorRequestId);
      if (isVendor) {
        vendors.push({
          ...n,
          categoryKey: "VENDOR",
          senderDisplayName: n.senderName || n.vendorId?.name || "Connected Vendor",
          roleDisplayName: "Vendor",
          routeText: n.tripId?.source && n.tripId?.destination 
            ? `${n.tripId.source} → ${n.tripId.destination}`
            : (n.tripTitle || "Mumbai → Kerala"),
          messageText: n.previewText || n.messageId?.message || "Operational fleet update",
        });
      } else {
        const isCampus = n.senderRole === "coordinator" || n.tripId?.tripCategory === "CAMPUS" || (n.tripTitle && n.tripTitle.toLowerCase().includes("sies"));
        const item = {
          ...n,
          categoryKey: "TRAVELER",
          senderDisplayName: n.senderId?.name || n.senderName || (isCampus ? "Campus Coordinator" : "Personal Traveler"),
          roleDisplayName: isCampus ? "Campus Coordinator" : "Personal Traveler",
          routeText: n.tripId?.source && n.tripId?.destination 
            ? `${n.tripId.source} → ${n.tripId.destination}`
            : (n.tripTitle || "Trip Route"),
          messageText: n.previewText || n.messageId?.message || "Operational message",
        };

        if (isCampus) {
          campusCoordinators.push(item);
        } else {
          personalTravelers.push(item);
        }
      }
    });

    return {
      campusCoordinators,
      personalTravelers,
      travelers: [...campusCoordinators, ...personalTravelers],
      vendors,
    };
  }, [notifications]);

  if (!isOpen) return null;

  const handleNotificationClick = async (notif) => {
    const token = localStorage.getItem("token");
    if (!notif.read && token) {
      try {
        await markNotificationRead(notif._id, token);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, read: true, readAt: new Date() } : n))
        );
        const newCount = Math.max(0, unreadCount - 1);
        setUnreadCount(newCount);
        if (typeof onUnreadCountChange === "function") {
          onUnreadCountChange(newCount);
        }
      } catch (err) {
        console.error("Failed to mark notification read:", err);
      }
    }

    onClose();

    // Deep link into Tour Operation Center in-layout Chat page
    const isVendor = notif.senderRole === "vendor" || notif.categoryKey === "VENDOR" || Boolean(notif.vendorRequestId);
    if (isVendor) {
      const vendorReqId = notif.vendorRequestId?._id || notif.vendorRequestId || notif.tripId?._id || notif.tripId;
      navigate(`/operator/chat?category=vendors&id=${vendorReqId}`);
    } else {
      const tripId = notif.tripId?._id || notif.tripId;
      navigate(`/operator/chat?category=travelers&id=${tripId}`);
    }

    if (typeof onOpenTripChat === "function") {
      onOpenTripChat(notif.tripId?._id || notif.tripId, notif);
    }
  };

  const handleMarkAllRead = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await markAllNotificationsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, readAt: new Date() })));
      setUnreadCount(0);
      if (typeof onUnreadCountChange === "function") {
        onUnreadCountChange(0);
      }
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const renderCard = (notif) => {
    const isVendor = notif.categoryKey === "VENDOR";

    return (
      <div
        key={notif._id}
        onClick={() => handleNotificationClick(notif)}
        className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col gap-2 ${
          notif.read
            ? "bg-slate-900/60 border-slate-800 hover:bg-slate-850/70 opacity-80"
            : "bg-slate-850 border-indigo-900/50 hover:bg-slate-800 shadow-xs"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`p-1 rounded shrink-0 border ${
                isVendor
                  ? "bg-purple-950 text-purple-400 border-purple-800/60"
                  : notif.roleDisplayName === "Campus Coordinator"
                  ? "bg-indigo-950 text-indigo-400 border-indigo-800/60"
                  : "bg-emerald-950 text-emerald-400 border-emerald-800/60"
              }`}
            >
              {isVendor ? (
                <FiBriefcase size={11} />
              ) : notif.roleDisplayName === "Campus Coordinator" ? (
                <GraduationCap size={11} />
              ) : (
                <FiUser size={11} />
              )}
            </span>
            <span
              className={`text-[10px] font-black uppercase tracking-wider truncate ${
                isVendor ? "text-purple-400" : "text-indigo-400"
              }`}
            >
              {isVendor ? "VENDOR UPDATE" : "TRAVELER UPDATE"}
            </span>
            {!notif.read && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 animate-pulse"></span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 shrink-0 font-medium">
            {formatTimeAgo(notif.createdAt)}
          </span>
        </div>

        {/* Sender Name & Role Subtitle */}
        <div>
          <div className="text-xs font-black text-white">{notif.senderDisplayName}</div>
          <div className="text-[11px] font-semibold text-slate-400 mt-0.5 flex items-center gap-1.5">
            <span>{notif.roleDisplayName}</span>
            <span className="text-slate-600">•</span>
            <span className="text-indigo-300 font-bold">{notif.routeText}</span>
          </div>
        </div>

        {/* Message / Update Body */}
        <div className="text-xs text-slate-300 italic bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5 leading-relaxed">
          "{notif.messageText}"
        </div>

        {/* Click to open in chat */}
        <div className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center justify-end gap-1 pt-1">
          <span>Open in Chat</span>
          <FiArrowRight size={11} />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-3 sm:p-6 font-sans dark">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Notification Dropdown Panel */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl z-10 flex flex-col overflow-hidden text-slate-200 mt-14 sm:mt-16 animate-in fade-in slide-in-from-top-4 duration-150 max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2">
            <FiBell className="text-indigo-400" size={16} />
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Operational Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-white text-[10px] font-black shadow-xs">
                {unreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold transition hover:underline"
              >
                Mark all read
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Close"
            >
              <FiX size={16} />
            </button>
          </div>
        </div>

        {/* Categories Bar: [ All ] [ TRAVELERS ] [ VENDORS ] */}
        <div className="flex items-center gap-1.5 p-2 bg-slate-950/90 border-b border-slate-800 shrink-0 text-xs">
          <button
            type="button"
            onClick={() => setActiveCategoryFilter("all")}
            className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-center transition ${
              activeCategoryFilter === "all"
                ? "bg-slate-800 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategoryFilter("travelers")}
            className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-center transition flex items-center justify-center gap-1 ${
              activeCategoryFilter === "travelers"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>TRAVELERS</span>
            <span className="text-[10px] opacity-80 font-normal">
              ({categorized.travelers.length})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCategoryFilter("vendors")}
            className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-center transition flex items-center justify-center gap-1 ${
              activeCategoryFilter === "vendors"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>VENDORS</span>
            <span className="text-[10px] opacity-80 font-normal">
              ({categorized.vendors.length})
            </span>
          </button>
        </div>

        {/* List Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar bg-slate-950/40">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-semibold">Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 px-4">
              <FiBell className="mx-auto text-slate-600 mb-2" size={24} />
              <p className="text-xs font-bold text-slate-300">No new notifications.</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                When operational updates arrive, they will appear here.
              </p>
            </div>
          ) : (
            <>
              {/* SECTION: TRAVELERS */}
              {(activeCategoryFilter === "all" || activeCategoryFilter === "travelers") && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                      <FiUser size={12} />
                      <span>TRAVELERS</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      {categorized.travelers.length} update{categorized.travelers.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {categorized.travelers.length === 0 ? (
                    <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800 text-center text-xs text-slate-500 italic">
                      No traveler notifications.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {categorized.travelers.map((notif) => renderCard(notif))}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION: VENDORS */}
              {(activeCategoryFilter === "all" || activeCategoryFilter === "vendors") && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
                    <div className="text-[10px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-1.5">
                      <FiBriefcase size={12} />
                      <span>VENDORS</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      {categorized.vendors.length} update{categorized.vendors.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {categorized.vendors.length === 0 ? (
                    <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800 text-center text-xs text-slate-500 italic">
                      No vendor notifications.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {categorized.vendors.map((notif) => renderCard(notif))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
