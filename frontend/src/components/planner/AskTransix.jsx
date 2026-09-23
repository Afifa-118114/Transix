import { useState, useRef, useEffect } from "react";
import { Sparkles, ArrowUp, X } from "lucide-react";
import { generateAITrip } from "../../api/tripApi";
import { normalizeTrip } from "../../utils/formatTrip";
import { clearInventoryCache } from "../../services/inventoryService";
import toast from "react-hot-toast";

import axios from "axios";

export default function AskTransix({ trip, setTrip }) {
  const [expanded, setExpanded] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [clarification, setClarification] = useState(null);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);
  const currentOpIdRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  const handleSuggestionClick = (sug) => {
    setInputValue(sug);
    textareaRef.current?.focus();
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setLoading(false);
    currentOpIdRef.current = null; // Invalidate operation
    setClarification({ msg: "Modification cancelled.", suggestions: [] });
  };

  const processModification = async () => {
    if (loading || !inputValue.trim() || !trip) return;
    const tStart = performance.now();
    const val = inputValue.trim().toLowerCase();

    // 1. Normalization Engine (Change Budget ONLY for now)
    let newBudget = null;
    let needsClarification = false;
    let clarMsg = null;
    let clarSuggestions = [];

    // Check if intent is "budget"
    if (val.includes("budget") || val.includes("cheaper") || val.includes("expensive") || val.match(/\d/)) {
      const numMatch = val.match(/\d+/g);
      if (val.includes("cheaper") && !numMatch) {
        needsClarification = true;
        clarMsg = "Sure. What total budget would you like to target?";
        clarSuggestions = ["₹30,000", "₹40,000", "₹50,000"];
      } else if (numMatch) {
        let numStr = numMatch.join("");
        if (val.includes("k")) numStr += "000";
        if (val.includes("lakh")) numStr += "00000";
        const numeric = parseInt(numStr, 10);
        if (numeric > 0) {
          newBudget = numeric;
        } else {
          needsClarification = true;
          clarMsg = "I couldn't quite catch the amount. What budget should I use?";
        }
      } else if (val.includes("budget") && !numMatch) {
        needsClarification = true;
        clarMsg = "What new budget would you like to set?";
        clarSuggestions = ["₹30,000", "₹50,000", "₹80,000"];
      } else {
        needsClarification = true;
        clarMsg = "I can change your budget. Please specify an amount.";
      }
    } else {
      needsClarification = true;
      clarMsg = "For now, I can only change your budget. Try saying 'reduce budget to 30000'.";
    }

    if (needsClarification) {
      setClarification({ msg: clarMsg, suggestions: clarSuggestions });
      return;
    }

    if (newBudget !== null) {
      // Execute the modification
      try {
        const tParsed = performance.now();
        console.log(`[AskTransix] Modification parsing: ${(tParsed - tStart).toFixed(2)}ms`);
        
        setLoading(true);
        setClarification(null);
        
        const token = localStorage.getItem("token");
        const opId = Date.now().toString();
        currentOpIdRef.current = opId;

        const controller = new AbortController();
        abortControllerRef.current = controller;
        
        // Reconstruct exact payload from existing trip
        const payload = {
          source: trip.source,
          destination: trip.destination,
          heroImage: trip.heroImage, // Pass heroImage to bypass Unsplash
          startDate: trip.startDate.split("T")[0],
          endDate: trip.endDate.split("T")[0],
          travelers: trip.travelers,
          roomArrangement: trip.roomArrangement || [],
          budget: newBudget, // MODIFIED FIELD
          currency: trip.currency || "INR",
          travelMode: trip.travelMode,
          hotelType: trip.hotelType,
          foodPreference: trip.foodPreference,
          tripType: trip.tripType,
          interests: trip.interests,
          priority: trip.priority,
          purpose: trip.purpose,
        };

        const tApiStart = performance.now();
        const res = await generateAITrip(payload, token, controller.signal);
        const tApiEnd = performance.now();
        console.log(`[AskTransix] API request & Backend processing: ${(tApiEnd - tApiStart).toFixed(2)}ms`);

        // Check if operation was cancelled while waiting
        if (currentOpIdRef.current !== opId) {
          console.log("[AskTransix] Discarding late response because operation was cancelled.");
          return;
        }

        if (res?.trip) {
          clearInventoryCache();
          const normalized = normalizeTrip(res.trip);
          localStorage.setItem("currentTrip", JSON.stringify(normalized));
          localStorage.removeItem("transix_builder_trip");
          
          const tDashStart = performance.now();
          if (setTrip) setTrip(normalized);
          window.dispatchEvent(new CustomEvent("transix_trip_updated", { detail: normalized }));
          
          const tEnd = performance.now();
          console.log(`[AskTransix] Local store & Dashboard update: ${(tEnd - tDashStart).toFixed(2)}ms`);
          console.log(`[AskTransix] Total frontend operation: ${(tEnd - tStart).toFixed(2)}ms`);
          
          setInputValue("");
          setExpanded(false);
          currentOpIdRef.current = null;
          toast.success(`Your itinerary has been updated for a ₹${newBudget.toLocaleString()} budget.`, { icon: "✨" });
        }
      } catch (err) {
        if (axios.isCancel(err) || err.name === 'CanceledError') {
          console.log("[AskTransix] Request aborted.");
          return; // Handled in handleStop
        }
        console.error("Modification generation error:", err);
        toast.error(err.response?.data?.message || "Failed to modify itinerary. Please try again.");
        setLoading(false);
      } finally {
        if (currentOpIdRef.current) {
          setLoading(false);
        }
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      processModification();
    }
  };

  if (!expanded) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300 w-[calc(100%-24px)] sm:w-[560px]">
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center justify-between px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full shadow-xl shadow-slate-900/20 hover:scale-[1.01] active:scale-[0.99] transition-all w-full"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="font-bold text-sm">Ask Transix</span>
          </div>
          <ArrowUp className="w-4 h-4 opacity-50" />
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Optional backdrop to softly focus the composer without blocking interaction */}
      <div className="fixed inset-0 bg-slate-900/5 dark:bg-black/20 z-40 backdrop-blur-[1px] pointer-events-none transition-opacity duration-300" />
      
      <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] sm:w-[580px] z-50 animate-in slide-in-from-bottom-8 duration-300">
        <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-[1.5rem] shadow-2xl p-4 relative">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="font-bold text-slate-900 dark:text-white">Transix Assistant</span>
            </div>
            <button 
              onClick={() => { setExpanded(false); setClarification(null); }}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Assistant Message */}
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-3 px-1">
            {clarification?.msg || "What would you like to change about your trip?"}
          </p>

          {/* Suggestions */}
          {!loading && (
            <div className="flex flex-wrap gap-2 mb-3 px-1">
              {(clarification?.suggestions || ["Reduce budget to ₹30,000", "Add activities"]).map((sug) => (
                <button
                  key={sug}
                  onClick={() => handleSuggestionClick(sug)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          {/* Compact Composer or Loading State */}
          {loading ? (
            <div className="flex items-center justify-between h-[56px] px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.25rem]">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Reworking your itinerary...</span>
              </div>
              <button onClick={handleStop} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                Stop
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.25rem] p-2 focus-within:border-indigo-500 transition-colors min-h-[56px]">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tell me what you'd like to change..."
                className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-slate-400 resize-none text-sm px-2 py-2 min-h-[40px] max-h-[120px]"
                rows={1}
                autoFocus
              />
              <button 
                onClick={processModification}
                disabled={!inputValue.trim()}
                className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all ${
                  inputValue.trim() 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md' 
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
