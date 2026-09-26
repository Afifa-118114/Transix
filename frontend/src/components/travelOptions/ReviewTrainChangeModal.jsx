import React, { useState } from "react";
import { FiX, FiCheckCircle, FiClock, FiAlertTriangle, FiArrowRight, FiShield } from "react-icons/fi";
import { FaTrain, FaPlane } from "react-icons/fa";

export default function ReviewTrainChangeModal({
  isOpen,
  diff,
  isApproving = false,
  onCancel,
  onApprove,
}) {
  const [activeTab, setActiveTab] = useState("summary"); // "summary" | "comparison"
  const [selectedCompDay, setSelectedCompDay] = useState(0);

  if (!isOpen || !diff) return null;

  const {
    outboundChanged = false,
    returnChanged = false,
    trainChanges = [],
    transportChanges = trainChanges,
    timeShifted = [],
    removed = [],
    unchangedDays = [],
    unchangedSummaryText = "",
    dayComparisons = [],
  } = diff;

  const changesList = transportChanges.length > 0 ? transportChanges : trainChanges;
  const outboundChange = changesList.find((tc) => tc.direction === "outbound");
  const returnChange = changesList.find((tc) => tc.direction === "return");

  const anyFlight = changesList.some((tc) => tc.mode === "flight" || tc.newTransport?.flightNumber);
  const allFlight = changesList.length > 0 && changesList.every((tc) => tc.mode === "flight" || tc.newTransport?.flightNumber);
  const modalTitle = allFlight ? "Review Flight Change" : anyFlight ? "Review Transport Change" : "Review Train Change";
  const modalSubtitle = allFlight
    ? "Your selected flight schedule changes may affect activities and airport buffer timings. Review the proposed changes before applying them."
    : anyFlight
      ? "Your multimodal transport changes may affect activities and transfer timings. Review the proposed changes before applying them."
      : "Your selected train changes may affect activities and timing. Review the proposed changes before applying them.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111726] shadow-2xl overflow-hidden transition-all my-auto">
        
        {/* ================= MODAL HEADER ================= */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800/80 px-6 py-4 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
              {anyFlight ? <FaPlane className="text-xl" /> : <FaTrain className="text-xl" />}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-snug">
                {modalTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {modalSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isApproving}
            onClick={onCancel}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {/* ================= VIEW SWITCHER TABS ================= */}
        <div className="flex items-center justify-between px-6 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111726]">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("summary")}
              className={`px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                activeTab === "summary"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Changes Overview
            </button>
            {dayComparisons.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("comparison")}
                className={`px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === "comparison"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>Original vs Proposed Schedule</span>
                <span className="rounded-md bg-indigo-500/20 px-1.5 py-0.2 text-[10px] font-bold text-indigo-400">
                  {dayComparisons.length} {dayComparisons.length === 1 ? "day" : "days"}
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            <FiShield className="text-emerald-500" />
            <span>Non-destructive preview</span>
          </div>
        </div>

        {/* ================= MODAL SCROLLABLE CONTENT ================= */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          
          {/* TAB 1: SUMMARY & IMPACT BREAKDOWN */}
          {activeTab === "summary" && (
            <>
              {/* Section 4: Train Cards (Outbound & Return) */}
              <div className="space-y-3.5">
                {/* Outbound Train Comparison */}
                {outboundChanged && outboundChange && (
                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                          Outbound Journey
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {outboundChange.route}
                        </span>
                      </div>
                      <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400">
                        {outboundChange.timingChanges?.trainChanged}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Original */}
                      <div className="rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-[#151d30] p-3 text-xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                          Original Outbound Transport
                        </div>
                        <div className="font-extrabold text-slate-800 dark:text-slate-200">
                          {outboundChange.oldTransport?.flightNumber
                            ? `${outboundChange.oldTransport?.airline || "Flight"} #${outboundChange.oldTransport?.flightNumber}`
                            : (outboundChange.oldTrain?.name || outboundChange.oldTrain?.trainName || "Existing Default Transport")}
                        </div>
                        <div className="mt-1 text-slate-600 dark:text-slate-400 flex items-center justify-between text-[11px]">
                          <span>
                            {outboundChange.oldTransport?.flightNumber
                              ? `Flight: #${outboundChange.oldTransport?.flightNumber}`
                              : `Train: #${outboundChange.oldTrain?.trainNumber || "DEFAULT"}`}
                          </span>
                          <span>Dep: {outboundChange.oldTransport?.departure || outboundChange.oldTrain?.departure || "Scheduled"}</span>
                        </div>
                      </div>

                      {/* Proposed */}
                      <div className="rounded-lg border border-indigo-200/70 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/30 p-3 text-xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
                          {outboundChange.mode === "flight" || outboundChange.newTransport?.flightNumber ? "Proposed Outbound Flight" : "Proposed Outbound Train"}
                        </div>
                        <div className="font-extrabold text-slate-900 dark:text-white">
                          {outboundChange.newTransport?.flightNumber
                            ? `${outboundChange.newTransport?.airline} (${outboundChange.newTransport?.flightNumber})`
                            : (outboundChange.newTrain?.trainName || outboundChange.newTrain?.name)}
                        </div>
                        <div className="mt-1 text-slate-700 dark:text-slate-300 flex items-center justify-between text-[11px]">
                          <span>
                            {outboundChange.newTransport?.flightNumber
                              ? `Flight: #${outboundChange.newTransport?.flightNumber}`
                              : `Train: #${outboundChange.newTrain?.trainNumber}`}
                          </span>
                          <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                            Dep: {outboundChange.newTransport?.departure || outboundChange.newTrain?.departure}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Return Transport Comparison (only if return changed) */}
                {returnChanged && returnChange && (
                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                          Return Journey
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {returnChange.route}
                        </span>
                      </div>
                      <span className="text-[11px] font-extrabold text-purple-600 dark:text-purple-400">
                        {returnChange.timingChanges?.transportChanged || returnChange.timingChanges?.trainChanged}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Original */}
                      <div className="rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-[#151d30] p-3 text-xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                          Original Return Transport
                        </div>
                        <div className="font-extrabold text-slate-800 dark:text-slate-200">
                          {returnChange.oldTransport?.flightNumber
                            ? `${returnChange.oldTransport?.airline || "Flight"} #${returnChange.oldTransport?.flightNumber}`
                            : (returnChange.oldTrain?.name || returnChange.oldTrain?.trainName || "Existing Default Transport")}
                        </div>
                        <div className="mt-1 text-slate-600 dark:text-slate-400 flex items-center justify-between text-[11px]">
                          <span>
                            {returnChange.oldTransport?.flightNumber
                              ? `Flight: #${returnChange.oldTransport?.flightNumber}`
                              : `Train: #${returnChange.oldTrain?.trainNumber || "DEFAULT"}`}
                          </span>
                          <span>Dep: {returnChange.oldTransport?.departure || returnChange.oldTrain?.departure || "Scheduled"}</span>
                        </div>
                      </div>

                      {/* Proposed */}
                      <div className="rounded-lg border border-purple-200/70 dark:border-purple-800/80 bg-purple-50/40 dark:bg-purple-950/30 p-3 text-xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">
                          {returnChange.mode === "flight" || returnChange.newTransport?.flightNumber ? "Proposed Return Flight" : "Proposed Return Train"}
                        </div>
                        <div className="font-extrabold text-slate-900 dark:text-white">
                          {returnChange.newTransport?.flightNumber
                            ? `${returnChange.newTransport?.airline} (${returnChange.newTransport?.flightNumber})`
                            : (returnChange.newTrain?.trainName || returnChange.newTrain?.name)}
                        </div>
                        <div className="mt-1 text-slate-700 dark:text-slate-300 flex items-center justify-between text-[11px]">
                          <span>
                            {returnChange.newTransport?.flightNumber
                              ? `Flight: #${returnChange.newTransport?.flightNumber}`
                              : `Train: #${returnChange.newTrain?.trainNumber}`}
                          </span>
                          <span className="font-extrabold text-purple-600 dark:text-purple-400">
                            Dep: {returnChange.newTransport?.departure || returnChange.newTrain?.departure}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Overall Changes Section (Compact, only modified legs) */}
                {(outboundChanged || returnChanged) && (
                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/50 p-3.5">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                      Overall Changes
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {outboundChanged && outboundChange && (
                        <div className="flex items-center justify-between rounded-lg bg-white dark:bg-[#131b2e] border border-slate-200/60 dark:border-slate-800 p-2.5 shadow-2xs">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Outbound:</span>
                          <span className="font-black text-indigo-600 dark:text-indigo-400">
                            {outboundChange.oldTransport?.flightNumber ? "Flight" : "Train"} →{" "}
                            {outboundChange.mode === "flight" || outboundChange.newTransport?.flightNumber ? "Flight" : "Train"}
                          </span>
                        </div>
                      )}

                      {returnChanged && returnChange && (
                        <div className="flex items-center justify-between rounded-lg bg-white dark:bg-[#131b2e] border border-slate-200/60 dark:border-slate-800 p-2.5 shadow-2xs">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Return:</span>
                          <span className="font-black text-purple-600 dark:text-purple-400">
                            {returnChange.oldTransport?.flightNumber ? "Flight" : "Train"} →{" "}
                            {returnChange.mode === "flight" || returnChange.newTransport?.flightNumber ? "Flight" : "Train"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Section 5: Grouped Itinerary Impact Breakdown */}
              <div className="space-y-4 pt-1">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Exact Itinerary Impact
                </h3>

                {/* 1. TRAIN CHANGE */}
                {trainChanges.length > 0 && (
                  <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 p-3.5">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-2">
                      <FaTrain className="text-xs" />
                      <span>TRAIN CHANGE</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {trainChanges.map((tc, idx) => (
                        <div key={idx} className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                          <span className="font-bold">{tc.directionLabel} ({tc.route}):</span>
                          <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                            {tc.timingChanges?.trainChanged}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. TIME SHIFTED */}
                {timeShifted.length > 0 ? (
                  <div className="rounded-xl border border-amber-200/70 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 p-3.5">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2">
                      <FiClock className="text-xs" />
                      <span>TIME SHIFTED ({timeShifted.length} items)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {timeShifted.map((item, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-amber-200/50 dark:border-amber-800/40 bg-white dark:bg-[#151c2e] p-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                            <span>{item.name}</span>
                            <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                              Day {item.day}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>Original: <strong className="text-slate-700 dark:text-slate-300">{item.originalTime}</strong></span>
                            <FiArrowRight className="text-[10px] text-amber-500 shrink-0" />
                            <span>Proposed: <strong className="text-indigo-600 dark:text-indigo-400">{item.proposedTime}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 p-3 text-xs text-slate-500 dark:text-slate-400">
                    No activity time shifts required.
                  </div>
                )}

                {/* 3. REMOVED / CANCELLED */}
                {removed.length > 0 ? (
                  <div className="rounded-xl border border-rose-200/70 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 p-3.5">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 mb-2">
                      <FiAlertTriangle className="text-xs" />
                      <span>REMOVED / CANCELLED ({removed.length} items)</span>
                    </div>
                    <div className="space-y-2">
                      {removed.map((item, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-rose-200/50 dark:border-rose-800/40 bg-white dark:bg-[#151c2e] p-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between font-bold text-rose-700 dark:text-rose-300">
                            <span>Day {item.day}: {item.name}</span>
                            <span className="text-[10px] text-slate-400">Was at {item.time}</span>
                          </div>
                          <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                            <span className="font-semibold text-slate-500 dark:text-slate-400">Reason: </span>
                            {item.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <FiCheckCircle className="text-emerald-500 shrink-0" />
                    <span>All existing activities remain intact. Zero activities removed.</span>
                  </div>
                )}

                {/* 4. UNCHANGED */}
                <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 p-3.5">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    <FiCheckCircle className="text-slate-400 dark:text-slate-500 text-xs" />
                    <span>UNCHANGED DAYS</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {unchangedSummaryText || "All other days and unaffected activities remain unchanged."}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: ORIGINAL VS PROPOSED DAY COMPARISON */}
          {activeTab === "comparison" && (
            <div className="space-y-4">
              {/* Day Selector Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">
                  Affected Days:
                </span>
                {dayComparisons.map((dc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedCompDay(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                      selectedCompDay === idx
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    Day {dc.dayNum}
                  </button>
                ))}
              </div>

              {dayComparisons[selectedCompDay] && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Original Plan */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-3.5">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        ORIGINAL DAY {dayComparisons[selectedCompDay].dayNum}
                      </span>
                      <span className="text-[10px] text-slate-400">Baseline</span>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {dayComparisons[selectedCompDay].originalPlan.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-start justify-between rounded-lg border border-slate-100 dark:border-slate-800/70 bg-slate-50/50 dark:bg-slate-900/30 p-2 text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {item.name || item.activity}
                            </div>
                            <div className="text-[10px] text-slate-400">{item.category}</div>
                          </div>
                          <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0 ml-2">
                            {item.time || item.startTime}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Proposed Plan */}
                  <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-800/80 bg-indigo-50/20 dark:bg-indigo-950/20 p-3.5">
                    <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900 pb-2 mb-3">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        PROPOSED DAY {dayComparisons[selectedCompDay].dayNum}
                      </span>
                      <span className="text-[10px] font-bold text-indigo-500">Adapted</span>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {dayComparisons[selectedCompDay].proposedPlan.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-start justify-between rounded-lg border border-indigo-100 dark:border-indigo-900/50 bg-white dark:bg-[#151c2e] p-2 text-xs shadow-2xs"
                        >
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-white">
                              {item.name || item.activity}
                            </div>
                            <div className="text-[10px] text-indigo-600 dark:text-indigo-400">{item.category}</div>
                          </div>
                          <span className="font-extrabold text-indigo-600 dark:text-indigo-400 shrink-0 ml-2">
                            {item.time || item.startTime}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ================= MODAL FOOTER WITH EXPLICIT APPROVAL ================= */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/70 dark:bg-slate-900/50">
          <button
            type="button"
            disabled={isApproving}
            onClick={onCancel}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isApproving}
            onClick={onApprove}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-6 py-2.5 text-xs font-black text-white shadow-md hover:shadow-indigo-500/25 transition-all flex items-center gap-2"
          >
            {isApproving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Applying Changes...</span>
              </>
            ) : (
              <>
                <FiCheckCircle className="text-sm" />
                <span>Confirm &amp; Update Itinerary</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
