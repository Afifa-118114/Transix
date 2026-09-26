import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  FiBell, FiX, FiMessageSquare, FiBriefcase, FiUser, 
  FiArrowRight, FiCheckCircle, FiCheck, FiRefreshCw,
  FiArrowLeft, FiClock, FiCompass, FiMenu, FiFilter
} from "react-icons/fi";
import { GraduationCap } from "lucide-react";
import { 
  getNotifications, 
  markNotificationRead, 
  markAllNotificationsRead 
} from "../../api/notificationApi";
import { getDashboardStats } from "../../api/operatorApi";
import OperatorSidebar from "../../components/operator/OperatorSidebar";
import toast from "react-hot-toast";

export default function OperatorNotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("all"); // "all" | "travelers" | "vendors" | "unread"
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarStats, setSidebarStats] = useState(null);

  const fetchList = async (isSilent = false) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      if (!isSilent) setLoading(true);
      const [notifData, statsData] = await Promise.all([
        getNotifications(token),
        getDashboardStats(token).catch(() => null),
      ]);

      if (notifData?.success) {
        setNotifications(notifData.notifications || []);
        setUnreadCount(notifData.unreadCount || 0);
      }
      if (statsData?.success && statsData.stats) {
        setSidebarStats(statsData.stats);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchList(false);
    const interval = setInterval(() => fetchList(true), 15000);
    return () => clearInterval(interval);
  }, []);

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
          roleDisplayName: "Vendor Partner",
          routeText: n.tripId?.source && n.tripId?.destination 
            ? `${n.tripId.source} → ${n.tripId.destination}`
            : (n.tripTitle || "Charter Fleet Dispatch"),
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
          messageText: n.previewText || n.messageId?.message || "Traveler inquiry or schedule note",
        };

        if (isCampus) {
          campusCoordinators.push(item);
        } else {
          personalTravelers.push(item);
        }
      }
    });

    const travelers = [...campusCoordinators, ...personalTravelers];
    return {
      campusCoordinators,
      personalTravelers,
      travelers,
      vendors,
      unread: notifications.filter(n => !n.read),
    };
  }, [notifications]);

  const handleNotificationClick = async (notif) => {
    const token = localStorage.getItem("token");
    if (!notif.read && token) {
      try {
        await markNotificationRead(notif._id, token);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, read: true, readAt: new Date() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Failed to mark notification read:", err);
      }
    }

    // Route to appropriate chat context
    const isVendor = notif.senderRole === "vendor" || notif.categoryKey === "VENDOR" || Boolean(notif.vendorRequestId);
    if (isVendor) {
      const vendorReqId = notif.vendorRequestId?._id || notif.vendorRequestId || notif.tripId?._id || notif.tripId;
      navigate(`/operator/chat?category=vendors&id=${vendorReqId}`);
    } else {
      const tripId = notif.tripId?._id || notif.tripId;
      navigate(`/operator/chat?category=travelers&id=${tripId}`);
    }
  };

  const handleMarkAsReadOnly = async (e, notif) => {
    e.stopPropagation();
    const token = localStorage.getItem("token");
    if (!token || notif.read) return;

    try {
      await markNotificationRead(notif._id, token);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notif._id ? { ...n, read: true, readAt: new Date() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      toast.success("Notification marked as read");
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleMarkAllRead = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await markAllNotificationsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, readAt: new Date() })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (err) {
      toast.error("Failed to mark all as read");
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "Just now";
    const diff = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const filteredList = useMemo(() => {
    if (activeCategoryFilter === "travelers") return categorized.travelers;
    if (activeCategoryFilter === "vendors") return categorized.vendors;
    if (activeCategoryFilter === "unread") return notifications.filter(n => !n.read);
    return notifications;
  }, [activeCategoryFilter, categorized, notifications]);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#1A1A1A] flex font-sans">
      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR                                                           */}
      {/* ========================================================================= */}
      <aside className="w-64 flex-shrink-0 hidden lg:block h-screen sticky top-0">
        <OperatorSidebar pendingCount={sidebarStats?.pendingBookings} />
      </aside>

      {/* ========================================================================= */}
      {/* MOBILE DRAWER SIDEBAR                                                     */}
      {/* ========================================================================= */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          <div className="relative w-64 max-w-[80%] h-full z-10 flex flex-col bg-white">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 text-[#666666] hover:text-[#1A1A1A] z-20"
              aria-label="Close sidebar"
            >
              <FiX size={20} />
            </button>
            <OperatorSidebar pendingCount={sidebarStats?.pendingBookings} />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA                                                         */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F5F7FA]">
        {/* Mobile Header Only */}
        <header className="lg:hidden bg-white border-b border-[#EBEBEB] px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-lg border border-[#EBEBEB] text-[#1A1A1A] hover:bg-[#F5F7FA]"
              aria-label="Open sidebar"
            >
              <FiMenu size={18} />
            </button>
            <span className="text-sm font-bold text-[#1A1A1A]">Alerts &amp; Notifications</span>
          </div>
          {unreadCount > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FEECE8] text-[#F5330F] border border-[#FDCFC7]">
              {unreadCount} unread
            </span>
          )}
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 custom-scrollbar max-w-7xl mx-auto w-full">
          
          {/* ========================================================================= */}
          {/* HERO BANNER (TRIP.COM DEEP BLUE GRADIENT)                                */}
          {/* ========================================================================= */}
          <div className="bg-gradient-to-r from-[#1A56DB] via-[#1447B8] to-[#0F3D91] text-white p-5 sm:p-6 rounded-xl shadow-xs relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-end pr-6">
              <FiBell size={130} />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <Link
                    to="/operator/dashboard"
                    className="text-[10px] font-bold uppercase tracking-wider text-white/80 hover:text-white flex items-center gap-1 bg-white/10 px-2.5 py-0.5 rounded-full transition"
                  >
                    <FiArrowLeft size={10} /> Operator Dashboard
                  </Link>
                  <span className="text-white/40">•</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    Operation Center
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                  <span>Alerts &amp; Operational Notifications</span>
                </h1>
                <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-xl">
                  Real-time incoming updates from group coordinators, individual travelers, and connected fleet partners.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-center shrink-0">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="px-3.5 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition flex items-center gap-1.5 border border-white/20 backdrop-blur-xs shadow-xs"
                  >
                    <FiCheckCircle size={13} />
                    <span>Mark All as Read</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => fetchList(false)}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition flex items-center gap-1.5 border border-white/20 backdrop-blur-xs shadow-xs"
                >
                  <FiRefreshCw size={13} className={loading ? "animate-spin" : ""} />
                  <span>Refresh</span>
                </button>

                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/15 text-white border border-white/20 backdrop-blur-xs">
                  <span className="w-2 h-2 rounded-full bg-[#00FF87] animate-pulse"></span>
                  Live Feed
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* STATS OVERVIEW CARDS                                                      */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-xl border border-[#EBEBEB] p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#666666] uppercase block">Total Alerts</span>
                <span className="text-xl font-bold text-[#1A1A1A] mt-0.5 block">{notifications.length}</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-[#EBF3FF] text-[#0064D2] flex items-center justify-center">
                <FiBell size={18} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#EBEBEB] p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#666666] uppercase block">Unread Alerts</span>
                <span className="text-xl font-bold text-[#F5330F] mt-0.5 block">{unreadCount}</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-[#FEECE8] text-[#F5330F] flex items-center justify-center">
                <FiClock size={18} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#EBEBEB] p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#666666] uppercase block">Traveler Updates</span>
                <span className="text-xl font-bold text-[#00A65E] mt-0.5 block">{categorized.travelers.length}</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-[#E6F4EA] text-[#00A65E] flex items-center justify-center">
                <FiUser size={18} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#EBEBEB] p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#666666] uppercase block">Vendor Updates</span>
                <span className="text-xl font-bold text-[#7C3AED] mt-0.5 block">{categorized.vendors.length}</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-[#F5F3FF] text-[#7C3AED] flex items-center justify-center">
                <FiBriefcase size={18} />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* NOTIFICATION FEED & FILTER TABS                                           */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-xl border border-[#EBEBEB] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
            {/* Filter Tabs Header */}
            <div className="p-4 sm:p-5 border-b border-[#EBEBEB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveCategoryFilter("all")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeCategoryFilter === "all"
                      ? "bg-[#0064D2] text-white shadow-xs"
                      : "bg-white text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F5F7FA] border border-[#EBEBEB]"
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategoryFilter("unread")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    activeCategoryFilter === "unread"
                      ? "bg-[#0064D2] text-white shadow-xs"
                      : "bg-white text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F5F7FA] border border-[#EBEBEB]"
                  }`}
                >
                  <span>Unread</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#F5330F] text-white font-bold">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategoryFilter("travelers")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeCategoryFilter === "travelers"
                      ? "bg-[#0064D2] text-white shadow-xs"
                      : "bg-white text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F5F7FA] border border-[#EBEBEB]"
                  }`}
                >
                  Travelers ({categorized.travelers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategoryFilter("vendors")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeCategoryFilter === "vendors"
                      ? "bg-[#0064D2] text-white shadow-xs"
                      : "bg-white text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F5F7FA] border border-[#EBEBEB]"
                  }`}
                >
                  Vendors ({categorized.vendors.length})
                </button>
              </div>

              <span className="text-xs text-[#666666] font-medium self-end sm:self-auto">
                Showing {filteredList.length} notification{filteredList.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Notifications List */}
            <div className="p-4 sm:p-5 space-y-3">
              {loading ? (
                <div className="py-16 text-center text-[#666666] text-xs">
                  <div className="w-7 h-7 border-2 border-[#0064D2] border-t-transparent rounded-full animate-spin mx-auto mb-2.5"></div>
                  Loading operational alerts...
                </div>
              ) : filteredList.length === 0 ? (
                <div className="py-14 text-center text-[#666666] text-xs bg-[#F8FAFC] rounded-xl border border-dashed border-[#D1D5DB] p-8 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#EBF3FF] text-[#0064D2] flex items-center justify-center mx-auto">
                    <FiBell size={22} />
                  </div>
                  <h3 className="font-bold text-[#1A1A1A] text-sm">No Notifications Found</h3>
                  <p className="max-w-md mx-auto text-[#666666] text-xs">
                    {activeCategoryFilter === "unread"
                      ? "You are all caught up! There are no unread operational alerts right now."
                      : "No operational alerts match the selected filter category."}
                  </p>
                </div>
              ) : (
                filteredList.map((notif) => {
                  const isVendor = notif.senderRole === "vendor" || notif.categoryKey === "VENDOR" || Boolean(notif.vendorRequestId);
                  const isCampus = notif.senderRole === "coordinator" || notif.roleDisplayName === "Campus Coordinator";

                  return (
                    <div
                      key={notif._id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-4 rounded-xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        notif.read
                          ? "bg-white border-[#EBEBEB] hover:border-[#0064D2]/40 hover:bg-[#F8FAFC] shadow-2xs"
                          : "bg-[#F8FAFC] border-[#BFDBFE] hover:border-[#0064D2] shadow-xs"
                      }`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        {/* Icon / Role Avatar */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                            isVendor
                              ? "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]"
                              : isCampus
                              ? "bg-[#EBF3FF] text-[#0064D2] border-[#BFDBFE]"
                              : "bg-[#E6F4EA] text-[#00A65E] border-[#CEEAD6]"
                          }`}
                        >
                          {isVendor ? (
                            <FiBriefcase size={16} />
                          ) : isCampus ? (
                            <GraduationCap size={16} />
                          ) : (
                            <FiUser size={16} />
                          )}
                        </div>

                        {/* Text Block */}
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-[#1A1A1A]">
                              {notif.senderDisplayName || notif.senderName || "Operational Partner"}
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                isVendor
                                  ? "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]"
                                  : isCampus
                                  ? "bg-[#EBF3FF] text-[#0064D2] border-[#BFDBFE]"
                                  : "bg-[#E6F4EA] text-[#00A65E] border-[#CEEAD6]"
                              }`}
                            >
                              {notif.roleDisplayName || (isVendor ? "Vendor" : "Traveler")}
                            </span>

                            {!notif.read && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEECE8] text-[#F5330F] border border-[#FDCFC7]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#F5330F] animate-pulse"></span>
                                New
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-[#1A1A1A] font-medium leading-relaxed bg-white border border-[#EBEBEB] rounded-lg p-2.5 mt-1">
                            "{notif.messageText || notif.previewText || notif.messageId?.message || "Operational message"}"
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-[#666666] pt-0.5">
                            <span className="font-semibold text-[#0064D2]">
                              {notif.routeText || "Active Journey"}
                            </span>
                            <span>•</span>
                            <span>{formatTimeAgo(notif.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {!notif.read && (
                          <button
                            type="button"
                            onClick={(e) => handleMarkAsReadOnly(e, notif)}
                            className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#F8FAFC] text-[#666666] hover:text-[#1A1A1A] border border-[#EBEBEB] text-xs font-semibold transition"
                            title="Mark as read"
                          >
                            Mark Read
                          </button>
                        )}

                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0064D2] hover:bg-[#0052B4] text-white rounded-lg text-xs font-semibold transition shadow-2xs"
                        >
                          <span>Open Chat</span>
                          <FiArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
