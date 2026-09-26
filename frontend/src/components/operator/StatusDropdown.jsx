import React, { useState, useRef, useEffect } from "react";
import { FiChevronDown, FiCheck, FiLoader } from "react-icons/fi";

export const DEFAULT_VALID_TRANSITIONS = {
  NOT_BOOKED: ["PROCESSING", "ACTION_REQUIRED", "CONFIRMED"],
  PROCESSING: ["ACTION_REQUIRED", "CONFIRMED", "CANCELLED", "NOT_BOOKED"],
  ACTION_REQUIRED: ["PROCESSING", "CONFIRMED", "CANCELLED", "NOT_BOOKED"],
  CONFIRMED: ["PROCESSING", "ACTION_REQUIRED", "CANCELLED"],
  CANCELLED: ["NOT_BOOKED", "PROCESSING"],
};

const STATUS_CONFIG = {
  NOT_BOOKED: {
    label: "Not Booked",
    badgeClass: "bg-slate-850 text-slate-300 border-slate-750",
    dotClass: "bg-slate-400",
  },
  PROCESSING: {
    label: "Processing",
    badgeClass: "bg-blue-950/70 text-blue-300 border-blue-800/60",
    dotClass: "bg-blue-400",
  },
  ACTION_REQUIRED: {
    label: "Action Required",
    badgeClass: "bg-amber-950/70 text-amber-300 border-amber-800/60",
    dotClass: "bg-amber-400",
  },
  CONFIRMED: {
    label: "Confirmed",
    badgeClass: "bg-emerald-950/70 text-emerald-300 border-emerald-800/60",
    dotClass: "bg-emerald-400",
  },
  CANCELLED: {
    label: "Cancelled",
    badgeClass: "bg-rose-950/70 text-rose-300 border-rose-800/60",
    dotClass: "bg-rose-400",
  },
};

export default function StatusDropdown({
  currentStatus = "NOT_BOOKED",
  onStatusChange,
  disabled = false,
  validTransitions = null,
  compact = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const transitionsMap = validTransitions || DEFAULT_VALID_TRANSITIONS;
  const allowedNextStatuses = transitionsMap[currentStatus] || [];
  const currentConfig = STATUS_CONFIG[currentStatus] || {
    label: currentStatus.replace("_", " "),
    badgeClass: "bg-slate-800 text-slate-300 border-slate-700",
    dotClass: "bg-slate-400",
  };

  const handleSelect = (nextStatus) => {
    if (nextStatus === currentStatus || disabled) return;
    setIsOpen(false);
    if (onStatusChange) {
      onStatusChange(nextStatus);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center justify-between gap-2 rounded-lg border font-semibold transition shadow-xs outline-none focus:ring-1 focus:ring-indigo-500/50 ${
          compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs"
        } ${currentConfig.badgeClass} ${
          disabled ? "opacity-60 cursor-not-allowed" : "hover:brightness-110 cursor-pointer"
        }`}
        title={`Current status: ${currentConfig.label}. Click to update.`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentConfig.dotClass}`} />
          <span className="truncate">{currentConfig.label}</span>
        </div>
        {disabled ? (
          <FiLoader size={12} className="animate-spin text-slate-400 shrink-0" />
        ) : (
          <FiChevronDown
            size={13}
            className={`transition-transform duration-150 text-slate-400 shrink-0 ${
              isOpen ? "rotate-180 text-white" : ""
            }`}
          />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-slate-900 border border-slate-750 shadow-2xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-100 backdrop-blur-md">
          <div className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-800/80 mb-1 flex items-center justify-between">
            <span>Change Status</span>
            <span className="text-[9px] lowercase font-normal text-slate-400">
              {allowedNextStatuses.length} option{allowedNextStatuses.length === 1 ? "" : "s"}
            </span>
          </div>

          {/* Current Status (Read-Only indicator) */}
          <div className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-950/60 border border-slate-800/70 mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${currentConfig.dotClass}`} />
              <span>{currentConfig.label}</span>
            </div>
            <span className="text-[10px] text-indigo-400 font-bold flex items-center gap-1">
              <FiCheck size={11} /> Active
            </span>
          </div>

          {/* Valid Next Status Options */}
          {allowedNextStatuses.length === 0 ? (
            <div className="px-2.5 py-2 text-center text-xs text-slate-400">
              No further transitions available
            </div>
          ) : (
            <div className="space-y-0.5">
              {allowedNextStatuses.map((statusKey) => {
                const config = STATUS_CONFIG[statusKey] || {
                  label: statusKey.replace("_", " "),
                  dotClass: "bg-slate-400",
                };
                return (
                  <button
                    key={statusKey}
                    type="button"
                    onClick={() => handleSelect(statusKey)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/90 transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full transition-transform group-hover:scale-125 ${config.dotClass}`} />
                      <span>{config.label}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-300 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition">
                      Set
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
