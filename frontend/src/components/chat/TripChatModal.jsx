import React, { useState, useEffect, useRef } from "react";
import { 
  FiX, FiSend, FiUser, FiMessageSquare, FiClock, FiCheck, FiCheckCircle, 
  FiAlertCircle, FiRefreshCw 
} from "react-icons/fi";
import { getTripMessages, sendTripMessage, markMessagesRead } from "../../api/tripApi";

export default function TripChatModal({
  isOpen,
  onClose,
  tripId,
  currentRole, // "operator" | "coordinator" | "traveler" (optional, will also derive from API)
  initialRecipient = null,
  onMessageSent = null,
}) {
  const [messages, setMessages] = useState([]);
  const [counterpart, setCounterpart] = useState(initialRecipient);
  const [tripContext, setTripContext] = useState(null);
  const [userRole, setUserRole] = useState(currentRole || "coordinator");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const pollTimerRef = useRef(null);

  const scrollToBottom = (behavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: "nearest" });
    }
  };

  const fetchMessages = async (isPolling = false) => {
    if (!tripId) return;
    const token = localStorage.getItem("token");
    if (!token) {
      if (!isPolling) setLoadError("Please log in to view messages.");
      return;
    }

    try {
      if (!isPolling) {
        setLoading(true);
        setLoadError(null);
      }
      const data = await getTripMessages(tripId, token);
      if (data?.success) {
        setMessages(data.messages || []);
        if (data.counterpart) setCounterpart(data.counterpart);
        if (data.tripContext) setTripContext(data.tripContext);
        if (data.currentUserRole) setUserRole(data.currentUserRole);
      } else {
        if (!isPolling) setLoadError("Unable to load messages. Please try again.");
      }
    } catch (err) {
      console.error("Failed to fetch trip messages:", err);
      if (!isPolling) {
        const msg = err.response?.data?.message || err.message || "Unable to load messages. Please try again.";
        setLoadError(msg);
      }
    } finally {
      if (!isPolling) setLoading(false);
    }
  };

  // Initial load and auto-read on modal open
  useEffect(() => {
    if (isOpen && tripId) {
      setInputValue("");
      setSendError(null);
      fetchMessages(false).then(() => {
        setTimeout(() => scrollToBottom("auto"), 100);
      });

      // Poll every 3.5 seconds for fresh messages while modal is open
      pollTimerRef.current = setInterval(() => {
        fetchMessages(true);
      }, 3500);
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [isOpen, tripId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      scrollToBottom("smooth");
    }
  }, [messages.length, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !sending) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, sending, onClose]);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const cleanMsg = inputValue.trim();
    if (!cleanMsg || sending) return;

    setSending(true);
    setSendError(null);
    const token = localStorage.getItem("token");

    try {
      const res = await sendTripMessage(tripId, { message: cleanMsg }, token);
      if (res.success && res.messageData) {
        setMessages((prev) => [...prev, res.messageData]);
        setInputValue("");
        setTimeout(() => scrollToBottom("smooth"), 50);
        if (typeof onMessageSent === "function") {
          onMessageSent(res.messageData);
        }
      } else {
        setSendError("Message could not be sent. Please try again.");
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      const errMsg = err.response?.data?.message || err.message || "Message could not be sent. Please try again.";
      setSendError(errMsg);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (isToday) return timeStr;
    return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${timeStr}`;
  };

  const isOperatorUser = userRole === "operator";
  const modalTitle = isOperatorUser
    ? (counterpart?.role === "coordinator" ? "CHAT WITH COORDINATOR" : "CHAT WITH TRAVELER")
    : "CHAT WITH OPERATOR";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 font-sans dark">
      {/* Dark backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity" 
        onClick={() => !sending && onClose()} 
      />

      {/* Modal Dialog (Responsive: near-full-screen on mobile, max-w-2xl on desktop) */}
      <div className="relative w-full max-w-2xl h-[92vh] sm:h-[82vh] max-h-[720px] bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl z-10 flex flex-col overflow-hidden text-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* 1. HEADER */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <FiMessageSquare size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white truncate">
                {modalTitle}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 truncate">
                {counterpart?.name && (
                  <span className="font-semibold text-slate-300 truncate">
                    {counterpart.name}
                  </span>
                )}
                {tripContext?.destination && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400 truncate">
                      {tripContext.source ? `${tripContext.source} → ` : ""}{tripContext.destination}
                    </span>
                  </>
                )}
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={sending}
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition shrink-0 ml-2"
            title="Close chat"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* 2. CHAT MESSAGE AREA */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar bg-slate-950/50"
        >
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 py-12">
              <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-semibold">Loading conversation...</span>
            </div>
          ) : loadError ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 py-12 text-center p-4">
              <FiAlertCircle size={32} className="text-rose-400" />
              <div className="text-sm font-bold text-white">{loadError}</div>
              <button
                type="button"
                onClick={() => fetchMessages(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5"
              >
                <FiRefreshCw size={12} />
                <span>Try Again</span>
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
                <FiMessageSquare size={22} />
              </div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                {modalTitle}
              </h4>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                No messages yet.
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs">
                Start a direct operational conversation about bookings, schedules, or logistics.
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.senderRole === userRole;
              const senderLabel = msg.senderName || (msg.senderRole === "operator" ? "Operator" : (userRole === "coordinator" ? "Coordinator" : "Traveler"));

              return (
                <div
                  key={msg._id || `${msg.createdAt}-${index}`}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  {/* Sender Header */}
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400">
                    <span className="font-bold text-slate-300">
                      {isMe ? "You" : senderLabel}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider border ${
                      msg.senderRole === "operator"
                        ? "bg-indigo-950 text-indigo-300 border-indigo-800/60"
                        : "bg-slate-800 text-slate-300 border-slate-700"
                    }`}>
                      {msg.senderRole}
                    </span>
                    <span className="text-slate-500 ml-1">
                      {formatMessageTime(msg.createdAt)}
                    </span>
                  </div>

                  {/* Bubble */}
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl shadow-sm text-xs leading-relaxed break-words whitespace-pre-wrap ${
                      isMe
                        ? "bg-indigo-600 text-white rounded-tr-xs"
                        : "bg-slate-850 border border-slate-750 text-slate-200 rounded-tl-xs"
                    }`}
                  >
                    {msg.subject && (
                      <div className={`font-bold mb-1 pb-1 border-b text-[11px] ${
                        isMe ? "text-indigo-100 border-indigo-500/50" : "text-indigo-400 border-slate-700"
                      }`}>
                        {msg.subject}
                      </div>
                    )}
                    <div>{msg.message}</div>
                  </div>

                  {/* Read Receipt Status for outgoing */}
                  {isMe && (
                    <div className="mt-1 px-1 flex items-center gap-1 text-[9px] text-slate-500 font-medium">
                      {msg.readAt ? (
                        <span className="text-indigo-400 flex items-center gap-0.5">
                          <FiCheckCircle size={10} /> Read
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5">
                          <FiCheck size={10} /> Sent
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 3. SEND ERROR NOTICE */}
        {sendError && (
          <div className="px-5 py-2 bg-rose-950/70 border-t border-rose-800/60 text-rose-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 truncate">
              <FiAlertCircle size={13} className="shrink-0" />
              <span className="truncate">{sendError}</span>
            </div>
            <button
              onClick={() => setSendError(null)}
              className="text-rose-400 hover:text-white text-[10px] font-bold underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 4. COMPOSER */}
        <form 
          onSubmit={handleSend}
          className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 flex items-end gap-2.5 shrink-0"
        >
          <div className="flex-1 min-w-0 relative">
            <textarea
              rows={2}
              value={inputValue}
              disabled={sending || loading}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (sendError) setSendError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Press Enter to send)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 transition resize-none custom-scrollbar"
            />
          </div>

          <button
            type="submit"
            disabled={sending || !inputValue.trim() || loading}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5 shrink-0 h-[42px]"
            title="Send Message"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Send</span>
                <FiSend size={13} />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
