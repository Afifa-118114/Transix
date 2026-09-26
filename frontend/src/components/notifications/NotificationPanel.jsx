import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  FiBell, FiX, FiMessageSquare, FiBriefcase, FiUser, 
  FiArrowRight, FiCheckCircle, FiCheck, FiExternalLink
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

  // Categorize notifications
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
            : (n.tripTitle || "Charter Fleet Route"),
          messageText: n.previewText || n.messageId?.message || "Operational fleet quotation update",
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
            : (n.tripTitle || "Active Journey"),
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
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
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
            ? "bg-white border-[#EBEBEB] hover:bg-[#F8FAFC] opacity-90 shadow-2xs"
            : "bg-[#F8FAFC] border-[#BFDBFE] hover:border-[#0064D2] shadow-xs"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`p-1 rounded shrink-0 border ${
                isVendor
                  ? "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]"
                  : notif.roleDisplayName === "Campus Coordinator"
                  ? "bg-[#EBF3FF] text-[#0064D2] border-[#BFDBFE]"
                  : "bg-[#E6F4EA] text-[#00A65E] border-[#CEEAD6]"
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
              className={`text-[10px] font-bold uppercase tracking-wider truncate ${
                isVendor ? "text-[#7C3AED]" : "text-[#0064D2]"
              }`}
            >
              {isVendor ? "VENDOR UPDATE" : "TRAVELER UPDATE"}
            </span>
            {!notif.read && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#0064D2] shrink-0 animate-pulse"></span>
            )}
          </div>
          <span className="text-[10px] text-[#666666] shrink-0 font-medium">
            {formatTimeAgo(notif.createdAt)}
          </span>
        </div>

        {/* Sender Name & Role Subtitle */}
        <div>
          <div className="text-xs font-bold text-[#1A1A1A]">{notif.senderDisplayName}</div>
          <div className="text-[11px] font-medium text-[#666666] mt-0.5 flex items-center gap-1.5">
            <span>{notif.roleDisplayName}</span>
            <span className="text-[#D1D5DB]">•</span>
            <span className="text-[#0064D2] font-semibold">{notif.routeText}</span>
          </div>
        </div>

        {/* Message / Update Body */}
        <div className="text-xs text-[#1A1A1A] bg-white border border-[#EBEBEB] rounded-lg p-2.5 leading-relaxed font-medium">
          "{notif.messageText}"
        </div>

        {/* Click to open in chat */}
        <div className="text-[10px] text-[#0064D2] hover:text-[#0052B4] font-semibold flex items-center justify-end gap-1 pt-0.5">
          <span>Open in Chat</span>
          <FiArrowRight size={11} />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-3 sm:p-6 font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Notification Dropdown Panel */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-white border border-[#EBEBEB] rounded-2xl shadow-2xl z-10 flex flex-col overflow-hidden text-[#1A1A1A] mt-14 sm:mt-16 animate-in fade-in slide-in-from-top-4 duration-150 max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#EBEBEB] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <FiBell className="text-[#0064D2]" size={16} />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
              Operational Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#F5330F] text-white text-[10px] font-bold shadow-xs">
                {unreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[10px] text-[#0064D2] hover:text-[#0052B4] font-semibold transition hover:underline"
              >
                Mark all read
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-[#666666] hover:text-[#1A1A1A] rounded-lg hover:bg-[#F5F7FA] transition"
              title="Close"
            >
              <FiX size={16} />
            </button>
          </div>
        </div>

        {/* Categories Bar: [ All ] [ TRAVELERS ] [ VENDORS ] */}
        <div className="flex items-center gap-1.5 p-2 bg-[#F8FAFC] border-b border-[#EBEBEB] shrink-0 text-xs">
          <button
            type="button"
            onClick={() => setActiveCategoryFilter("all")}
            className={`flex-1 py-1.5 px-2 rounded-lg font-semibold text-center transition ${
              activeCategoryFilter === "all"
                ? "bg-[#0064D2] text-white shadow-xs"
                : "text-[#666666] hover:text-[#1A1A1A] hover:bg-white"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategoryFilter("travelers")}
            className={`flex-1 py-1.5 px-2 rounded-lg font-semibold text-center transition flex items-center justify-center gap-1 ${
              activeCategoryFilter === "travelers"
                ? "bg-[#0064D2] text-white shadow-xs"
                : "text-[#666666] hover:text-[#1A1A1A] hover:bg-white"
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
            className={`flex-1 py-1.5 px-2 rounded-lg font-semibold text-center transition flex items-center justify-center gap-1 ${
              activeCategoryFilter === "vendors"
                ? "bg-[#0064D2] text-white shadow-xs"
                : "text-[#666666] hover:text-[#1A1A1A] hover:bg-white"
            }`}
          >
            <span>VENDORS</span>
            <span className="text-[10px] opacity-80 font-normal">
              ({categorized.vendors.length})
            </span>
          </button>
        </div>

        {/* List Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar bg-[#F5F7FA]">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-[#666666] gap-2">
              <div className="w-6 h-6 border-2 border-[#0064D2] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-semibold">Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-[#666666] px-4">
              <FiBell className="mx-auto text-[#9CA3AF] mb-2" size={24} />
              <p className="text-xs font-bold text-[#1A1A1A]">No new notifications.</p>
              <p className="text-[11px] text-[#666666] mt-0.5">
                When operational updates arrive, they will appear here.
              </p>
            </div>
          ) : (
            <>
              {/* SECTION: TRAVELERS */}
              {(activeCategoryFilter === "all" || activeCategoryFilter === "travelers") && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-[#EBEBEB]">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#0064D2] flex items-center gap-1.5">
                      <FiUser size={12} />
                      <span>TRAVELERS</span>
                    </div>
                    <span className="text-[10px] text-[#666666] font-semibold">
                      {categorized.travelers.length} update{categorized.travelers.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {categorized.travelers.length === 0 ? (
                    <div className="p-4 bg-white rounded-xl border border-[#EBEBEB] text-center text-xs text-[#666666] italic">
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
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between pb-1 border-b border-[#EBEBEB]">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#7C3AED] flex items-center gap-1.5">
                      <FiBriefcase size={12} />
                      <span>VENDORS</span>
                    </div>
                    <span className="text-[10px] text-[#666666] font-semibold">
                      {categorized.vendors.length} update{categorized.vendors.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {categorized.vendors.length === 0 ? (
                    <div className="p-4 bg-white rounded-xl border border-[#EBEBEB] text-center text-xs text-[#666666] italic">
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

        {/* Footer Link to Dedicated Page */}
        <div className="p-3 bg-white border-t border-[#EBEBEB] text-center">
          <Link
            to="/operator/notifications"
            onClick={onClose}
            className="text-xs font-semibold text-[#0064D2] hover:text-[#0052B4] inline-flex items-center gap-1 transition"
          >
            <span>Open Full Notifications Dashboard</span>
            <FiExternalLink size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
