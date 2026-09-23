import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { 
  getOperatorConversations, 
  getTripMessages, 
  sendTripMessage, 
  getOperatorVendorRequestMessages, 
  sendOperatorVendorRequestMessage, 
  getDashboardStats 
} from "../../api/operatorApi";
import { formatDate } from "../../utils/formatTrip";
import OperatorSidebar from "../../components/operator/OperatorSidebar";
import { 
  FiMessageSquare, FiSend, FiClock, FiCheckCircle, 
  FiMenu, FiX, FiUser, FiBriefcase, FiCompass, FiArrowRight
} from "react-icons/fi";
import { GraduationCap } from "lucide-react";
import toast from "react-hot-toast";

export default function OperatorChatPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "travelers"; // "travelers" | "vendors"
  const initialSelectedId = searchParams.get("id") || "";

  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [conversations, setConversations] = useState({ travelers: [], vendors: [] });
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const isFetchingRef = useRef(false);

  // Auto-scroll to bottom of conversation thread
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load all operator conversations and stats
  const fetchAllConversations = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const [convData, statsData] = await Promise.all([
        getOperatorConversations(token),
        getDashboardStats(token).catch(() => null),
      ]);

      if (convData?.success && convData.conversations) {
        setConversations(convData.conversations);

        // If no conversation currently selected, pick first or match initialSelectedId
        if (!selectedConversation) {
          const list = initialCategory === "vendors" 
            ? convData.conversations.vendors 
            : convData.conversations.travelers;
          
          const matched = initialSelectedId 
            ? list.find(c => c.id === initialSelectedId) || list[0]
            : list[0];

          if (matched) {
            setSelectedConversation(matched);
          }
        }
      }

      if (statsData?.success) {
        setStats(statsData.stats);
      }
    } catch (err) {
      console.error("Failed to load operator conversations", err);
    } finally {
      isFetchingRef.current = false;
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    fetchAllConversations();
    const interval = setInterval(fetchAllConversations, 20000);
    return () => clearInterval(interval);
  }, []);

  // Synchronize category and selected conversation with URL search parameters
  useEffect(() => {
    const cat = searchParams.get("category");
    const id = searchParams.get("id");
    if (cat && ["travelers", "vendors"].includes(cat)) {
      setActiveCategory(cat);
      const list = cat === "vendors" ? (conversations.vendors || []) : (conversations.travelers || []);
      if (id && list.length > 0) {
        const matched = list.find(
          c => c.id === id || c.tripId === id || c.requestId === id
        );
        if (matched) {
          setSelectedConversation(matched);
        }
      }
    }
  }, [searchParams, conversations]);

  // Fetch message thread when selected conversation changes
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    const fetchThread = async () => {
      setLoadingMessages(true);
      try {
        const token = localStorage.getItem("token");
        if (selectedConversation.type === "TRAVELER") {
          const res = await getTripMessages(selectedConversation.tripId, token);
          if (res?.success) {
            setMessages(res.messages || []);
          }
        } else if (selectedConversation.type === "VENDOR") {
          const res = await getOperatorVendorRequestMessages(selectedConversation.requestId, token);
          if (res?.success) {
            setMessages(res.messages || []);
          }
        }
      } catch (err) {
        console.error("Failed to load message thread", err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchThread();
    const threadInterval = setInterval(fetchThread, 8000);
    return () => clearInterval(threadInterval);
  }, [selectedConversation]);

  // Handle category switch (Travelers vs Vendors)
  const handleSelectCategory = (cat) => {
    setActiveCategory(cat);
    const list = cat === "vendors" ? conversations.vendors : conversations.travelers;
    if (list.length > 0) {
      setSelectedConversation(list[0]);
      setSearchParams({ category: cat, id: list[0].id });
    } else {
      setSelectedConversation(null);
      setSearchParams({ category: cat });
    }
  };

  // Handle selecting a specific conversation
  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
    setSearchParams({ category: activeCategory, id: conv.id });
  };

  // Send message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!messageInput.trim() || !selectedConversation || sending) return;

    setSending(true);
    const text = messageInput.trim();
    setMessageInput("");

    try {
      const token = localStorage.getItem("token");
      if (selectedConversation.type === "TRAVELER") {
        const res = await sendTripMessage(selectedConversation.tripId, { message: text }, token);
        if (res?.success && res.message) {
          setMessages(prev => [...prev, res.message]);
        }
      } else if (selectedConversation.type === "VENDOR") {
        const res = await sendOperatorVendorRequestMessage(selectedConversation.requestId, text, token);
        if (res?.success && res.message) {
          setMessages(prev => [...prev, res.message]);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send message");
      setMessageInput(text); // restore on error
    } finally {
      setSending(false);
    }
  };

  // Group travelers into Personal Trips and Campus Trips
  const personalTravelers = useMemo(() => {
    return (conversations.travelers || []).filter(c => c.tripCategory === "PERSONAL");
  }, [conversations.travelers]);

  const campusTravelers = useMemo(() => {
    return (conversations.travelers || []).filter(c => c.tripCategory === "CAMPUS");
  }, [conversations.travelers]);

  if (loadingConversations) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3 font-sans">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Loading Tour Operation Center Chat...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans">
      {/* Desktop Sidebar */}
      <aside className="w-64 flex-shrink-0 hidden lg:block h-screen sticky top-0">
        <OperatorSidebar 
          personalCount={stats?.personalTrips} 
          campusCount={stats?.campusTrips} 
          pendingCount={stats?.pendingBookings} 
        />
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/80" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative w-64 max-w-[80%] h-full z-10 flex flex-col">
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white z-20"
            >
              <FiX size={20} />
            </button>
            <OperatorSidebar 
              personalCount={stats?.personalTrips} 
              campusCount={stats?.campusTrips} 
              pendingCount={stats?.pendingBookings} 
            />
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shrink-0 z-20">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 text-slate-400 hover:text-white"
              >
                <FiMenu size={20} />
              </button>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-0.5">
                  TRANSIX • COMMUNICATION
                </div>
                <h1 className="text-lg font-black text-white">
                  Tour Operation Center Chat
                </h1>
                <p className="text-xs text-slate-400">
                  Direct operational messaging with Trip Travelers, Coordinators, and Connected Vendors
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* 2-Pane Chat Workspace */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* ========================================================================= */}
          {/* LEFT PANE: CONVERSATIONS LIST (Travelers / Vendors)                       */}
          {/* ========================================================================= */}
          <div className="w-80 sm:w-96 border-r border-slate-800 bg-slate-900/60 flex flex-col shrink-0">
            {/* Category Toggle Tabs */}
            <div className="p-4 border-b border-slate-800 flex gap-2">
              <button
                onClick={() => handleSelectCategory("travelers")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  activeCategory === "travelers"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <FiUser size={13} />
                <span>Travelers</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                  activeCategory === "travelers" ? "bg-indigo-700 text-white" : "bg-slate-800 text-slate-400"
                }`}>
                  {conversations.travelers?.length || 0}
                </span>
              </button>

              <button
                onClick={() => handleSelectCategory("vendors")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  activeCategory === "vendors"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <FiBriefcase size={13} />
                <span>Vendors</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                  activeCategory === "vendors" ? "bg-indigo-700 text-white" : "bg-slate-800 text-slate-400"
                }`}>
                  {conversations.vendors?.length || 0}
                </span>
              </button>
            </div>

            {/* Conversation Items List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
              {activeCategory === "travelers" ? (
                // TRAVELERS LIST (Separated into Personal Trips vs Campus Trips)
                <div className="space-y-4 p-3">
                  {/* Personal Trips */}
                  {personalTravelers.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <FiCompass size={12} className="text-indigo-400" />
                        <span>Personal Trips</span>
                      </div>
                      {personalTravelers.map(conv => {
                        const isSelected = selectedConversation?.id === conv.id;
                        return (
                          <div
                            key={conv.id}
                            onClick={() => handleSelectConversation(conv)}
                            className={`p-3 rounded-xl cursor-pointer transition border ${
                              isSelected
                                ? "bg-indigo-600/20 border-indigo-500/50 text-white"
                                : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700 text-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-xs text-white truncate">
                                {conv.contactName}
                              </div>
                              <span className="text-[10px] text-slate-500">{conv.contactRole}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                              {conv.route}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                              <span>{conv.dates}</span>
                              {conv.unreadCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-white font-bold text-[9px]">
                                  {conv.unreadCount} new
                                </span>
                              )}
                            </div>
                            {conv.lastMessage && (
                              <div className="text-[11px] text-slate-400 mt-1.5 line-clamp-1 italic">
                                "{conv.lastMessage.text}"
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Campus Trips */}
                  {campusTravelers.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <div className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <GraduationCap size={13} className="text-indigo-400" />
                        <span>Campus Trips</span>
                      </div>
                      {campusTravelers.map(conv => {
                        const isSelected = selectedConversation?.id === conv.id;
                        return (
                          <div
                            key={conv.id}
                            onClick={() => handleSelectConversation(conv)}
                            className={`p-3 rounded-xl cursor-pointer transition border ${
                              isSelected
                                ? "bg-indigo-600/20 border-indigo-500/50 text-white"
                                : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700 text-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-xs text-white truncate">
                                {conv.contactName}
                              </div>
                              <span className="text-[10px] text-indigo-400 font-bold">Coordinator</span>
                            </div>
                            {conv.organizationName && (
                              <div className="text-[11px] font-semibold text-slate-300 mt-0.5 truncate">
                                {conv.organizationName}
                              </div>
                            )}
                            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                              {conv.route}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                              <span>{conv.dates}</span>
                              {conv.unreadCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-white font-bold text-[9px]">
                                  {conv.unreadCount} new
                                </span>
                              )}
                            </div>
                            {conv.lastMessage && (
                              <div className="text-[11px] text-slate-400 mt-1.5 line-clamp-1 italic">
                                "{conv.lastMessage.text}"
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                // VENDORS LIST
                <div className="space-y-2 p-3">
                  {conversations.vendors?.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No active vendor conversations.
                    </div>
                  ) : (
                    conversations.vendors.map(conv => {
                      const isSelected = selectedConversation?.id === conv.id;
                      return (
                        <div
                          key={conv.id}
                          onClick={() => handleSelectConversation(conv)}
                          className={`p-3 rounded-xl cursor-pointer transition border ${
                            isSelected
                              ? "bg-indigo-600/20 border-indigo-500/50 text-white"
                              : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700 text-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-xs text-white truncate">
                              {conv.vendorName}
                            </div>
                            <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-slate-800 text-slate-300">
                              {conv.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                            {conv.route}
                          </div>
                          <div className="text-[10px] text-indigo-400 font-semibold mt-0.5">
                            {conv.operationalRequirement}
                          </div>
                          {conv.lastMessage && (
                            <div className="text-[11px] text-slate-400 mt-1.5 line-clamp-1 italic">
                              "{conv.lastMessage.text}"
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT PANE: ACTIVE CONVERSATION PANEL                                     */}
          {/* ========================================================================= */}
          <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
            {selectedConversation ? (
              <>
                {/* Conversation Header */}
                <div className="px-6 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black text-white truncate">
                        {selectedConversation.type === "TRAVELER"
                          ? selectedConversation.contactName
                          : selectedConversation.vendorName}
                      </h2>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                        {selectedConversation.type === "TRAVELER"
                          ? (selectedConversation.organizationName || selectedConversation.contactRole)
                          : "Connected Vendor"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                      <span>{selectedConversation.route}</span>
                      {selectedConversation.dates && (
                        <>
                          <span>•</span>
                          <span>{selectedConversation.dates}</span>
                        </>
                      )}
                      {selectedConversation.operationalRequirement && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-400 font-bold">{selectedConversation.operationalRequirement}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <Link
                    to={`/operator/trips/${selectedConversation.tripId}`}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition shrink-0"
                  >
                    View Trip Details
                  </Link>
                </div>

                {/* Message History Thread */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar">
                  {loadingMessages ? (
                    <div className="py-12 text-center text-slate-500 text-xs">
                      Loading conversation messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-16 text-center text-slate-500 text-xs">
                      <FiMessageSquare size={24} className="mx-auto text-slate-600 mb-2" />
                      No messages yet in this conversation. Send a message to start coordination.
                    </div>
                  ) : (
                    messages.map((m, idx) => {
                      const isOperator = m.senderRole === "operator" || m.senderName?.includes("Operations");
                      return (
                        <div
                          key={m._id || idx}
                          className={`flex flex-col ${isOperator ? "items-end" : "items-start"}`}
                        >
                          <div className="text-[10px] text-slate-400 mb-1 px-1">
                            {isOperator ? "Transix Operations" : (m.senderName || selectedConversation.contactName || "Contact")}
                          </div>
                          <div
                            className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                              isOperator
                                ? "bg-indigo-600 text-white rounded-br-xs shadow-xs"
                                : "bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-xs"
                            }`}
                          >
                            {m.message}
                          </div>
                          <div className="text-[9px] text-slate-500 mt-1 px-1">
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-4 bg-slate-900 border-t border-slate-800 flex items-center gap-3 shrink-0"
                >
                  <input
                    type="text"
                    placeholder={`Type message to ${selectedConversation.type === "TRAVELER" ? selectedConversation.contactName : selectedConversation.vendorName}...`}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim() || sending}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <FiSend size={13} />
                    <span>Send</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center text-xs">
                <FiMessageSquare size={36} className="text-slate-700 mb-3" />
                <div className="text-sm font-bold text-slate-300">No conversation selected</div>
                <p className="max-w-xs mt-1 text-slate-500">
                  Select a traveler or vendor conversation from the left pane to view the thread and message them.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
