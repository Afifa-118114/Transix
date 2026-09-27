import React, { useState } from "react";
import { useDigitalTwin } from "../../context/DigitalTwinContext";
import { RefreshCw, Users, AlertCircle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

export default function SocialSignalsPanel({ destination }) {
  const { socialSignals, socialSignalsLoading, socialSignalsError, refreshSocialSignals, socialSignalsLastUpdated } = useDigitalTwin();
  const [showRaw, setShowRaw] = useState(false);

  if (socialSignalsLoading && !socialSignals) {
    return (
      <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white/50 dark:bg-[#131b2e]/50 p-4 shadow-sm animate-pulse flex items-center justify-center min-h-[140px]">
        <div className="flex flex-col items-center text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin mb-2" />
          <span className="text-xs font-medium">Scanning public web signals...</span>
        </div>
      </div>
    );
  }

  if (socialSignalsError) {
    return (
      <div className="rounded-xl border border-red-200/90 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 p-4 shadow-sm">
        <div className="flex items-center text-red-500 mb-2">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span className="text-xs font-bold uppercase tracking-wider">{socialSignalsError}</span>
        </div>
        <button
          onClick={refreshSocialSignals}
          className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center"
        >
          <RefreshCw className="h-3 w-3 mr-1" /> Try again
        </button>
      </div>
    );
  }

  if (!socialSignals) return null;

  const getStrengthColor = (strength) => {
    switch (strength) {
      case "HIGH": return "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30";
      case "MEDIUM": return "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30";
      case "MIXED": return "text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30";
      default: return "text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-800";
    }
  };

  const getTopicColor = (type) => {
    switch (type) {
      case "HEAVY_RAIN":
      case "FLOODING":
      case "STORM":
        return "text-red-600 dark:text-red-400 font-bold";
      case "ROAD_DISRUPTION":
      case "CLOSURE":
        return "text-orange-600 dark:text-orange-400 font-bold";
      default:
        return "text-slate-700 dark:text-slate-300";
    }
  };

  return (
    <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131b2e] shadow-xs overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/50 dark:bg-[#0b0f19]/30">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Real-World Signals</h3>
        </div>
        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full uppercase tracking-wide">
          {destination || "Unknown Location"}
        </span>
      </div>

      <div className="p-4">
        {socialSignals.count === 0 ? (
          <div className="text-center py-4">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">No recent public signals found.</span>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-2xl font-black text-slate-800 dark:text-white leading-none">
                  {socialSignals.count}
                </div>
                <div className="text-xs font-medium text-slate-500 mt-1">
                  recent public reports
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Signal Strength</div>
                <span className={`text-xs font-bold px-2 py-1 rounded ${getStrengthColor(socialSignals.signalStrength)}`}>
                  {socialSignals.signalStrength}
                </span>
              </div>
            </div>

            {socialSignals.topTopics && socialSignals.topTopics.length > 0 && (
              <div className="space-y-2 mb-4">
                {socialSignals.topTopics.map((topic, i) => (
                  <div key={i} className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-800/50 pb-1 last:border-0 last:pb-0">
                    <span className={`capitalize ${getTopicColor(topic.type)}`}>
                      {topic.type.replace(/_/g, " ")}
                    </span>
                    <span className="font-bold text-slate-600 dark:text-slate-400">{topic.count}</span>
                  </div>
                ))}
              </div>
            )}

            <button 
              onClick={() => setShowRaw(!showRaw)}
              className="w-full flex items-center justify-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 py-2 border-t border-slate-100 dark:border-slate-800/50 mt-2"
            >
              {showRaw ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showRaw ? "Hide Signals" : "View Signals"}
            </button>

            {showRaw && socialSignals.recent && (
              <div className="mt-3 space-y-3 bg-slate-50 dark:bg-[#0b0f19]/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                {socialSignals.recent.map((signal, idx) => (
                  <div key={idx} className="text-xs">
                    <p className="text-slate-700 dark:text-slate-300 italic mb-1">"{signal.text}"</p>
                    <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase font-medium">
                      <span>Public report &middot; {new Date(signal.createdAt).toLocaleDateString()}</span>
                      {signal.sourceUrl && (
                        <a href={signal.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-blue-500">
                          Source <ExternalLink className="h-2 w-2 ml-1" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-4 py-2 bg-slate-50 dark:bg-[#0b0f19]/50 border-t border-slate-100 dark:border-slate-800/50 flex justify-between items-center">
        <div className="text-[10px] font-medium text-slate-400 flex items-center">
          Source: Aggregated Web Intelligence
        </div>
        <div className="flex items-center gap-2">
          {socialSignalsLastUpdated && (
            <span className="text-[10px] text-slate-400">
              Updated: {socialSignalsLastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button 
            onClick={refreshSocialSignals}
            disabled={socialSignalsLoading}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
            title="Refresh signals"
          >
            <RefreshCw className={`h-3 w-3 ${socialSignalsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
