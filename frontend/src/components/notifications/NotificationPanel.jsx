import React, { useEffect, useState } from "react";
import { 
  FiBell, FiX, FiCheck, FiMessageSquare, FiClock, FiCheckCircle, 
  FiAlertCircle, FiChevronRight 
} from "react-icons/fi";
import { 
  getNotifications, 
  markNotificationRead, 
  markAllNotificationsRead 
} from "../../api/notificationApi";

export default function NotificationPanel({
  isOpen,
  onClose,
  onOpenTripChat, // Callback: (tripId, notification) => void
  onUnreadCountChange = null,
}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

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

  if (!isOpen) return null;

  const handleNotificationClick = async (notif) => {
    const token = localStorage.getItem("token");
    if (!notif.read && token) {
      try {
        await markNotificationRead(notif._id, token);
        setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true, readAt: new Date() } : n));
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

    // Trigger existing one-to-one trip chat modal
    if (typeof onOpenTripChat === "function") {
      const tripId = notif.tripId?._id || notif.tripId;
      onOpenTripChat(tripId, notif);
    }
  };

  const handleMarkAllRead = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await markAllNotificationsRead(token);
      setNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: new Date() })));
      setUnreadCount(0);
      if (typeof onUnreadCountChange === "function") {
        onUnreadCountChange(0);
      }
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (isToday) return `Today, ${timeStr}`;
    return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${timeStr}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-3 sm:p-6 font-sans dark">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Notification Dropdown Panel */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl z-10 flex flex-col overflow-hidden text-slate-200 mt-14 sm:mt-16 animate-in fade-in slide-in-from-top-4 duration-150 max-h-[80vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2">
            <FiBell className="text-indigo-400" size={16} />
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Notifications
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
                Mark all as read
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

        {/* List Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar bg-slate-950/40">
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
                When new operational messages arrive, they will appear here.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const messageBody = notif.messageId?.message || notif.previewText;
              const senderDisplay = notif.senderId?.name || notif.senderName || (notif.senderRole === "operator" ? "Tour Operator" : "Coordinator");
              const senderRoleDisplay = notif.senderRole === "operator" ? "Operator" : (notif.senderRole === "coordinator" ? "Coordinator" : "Traveler");
              const tripDisplayName = notif.tripTitle || notif.tripId?.organizationDetails?.name || notif.tripId?.destination || "Trip Conversation";

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
                      <span className="p-1 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/60 shrink-0">
                        <FiMessageSquare size={11} />
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 truncate">
                        NEW MESSAGE
                      </span>
                      {!notif.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 animate-pulse"></span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0 font-medium">
                      {formatTime(notif.createdAt)}
                    </span>
                  </div>

                  {/* Sender & Role */}
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{senderDisplay}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                      {senderRoleDisplay}
                    </span>
                  </div>

                  {/* Trip Context */}
                  <div className="text-[11px] font-semibold text-indigo-300 flex items-center gap-1 truncate">
                    <span className="text-slate-500 font-normal">Trip:</span>
                    <span className="truncate">{tripDisplayName}</span>
                  </div>

                  {/* Actual Message Body / Preview */}
                  <div className="text-xs text-slate-300 italic line-clamp-2 bg-slate-950/60 border border-slate-800/80 rounded-lg p-2 leading-relaxed">
                    "{messageBody}"
                  </div>

                  {/* Click to open action hint */}
                  <div className="text-[10px] text-indigo-400 font-bold flex items-center justify-end gap-1 pt-1">
                    <span>Open Chat</span>
                    <FiChevronRight size={12} />
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
