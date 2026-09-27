import React, { useState } from "react";
import { useDigitalTwin } from "../../context/DigitalTwinContext";
import { CloudLightning, Activity, Cpu, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import DigitalTwinStatePanel from "./DigitalTwinStatePanel";
import DigitalTwinImpactPanel from "./DigitalTwinImpactPanel";
import DigitalTwinWhatIfPanel from "./DigitalTwinWhatIfPanel";
import DigitalTwinAIAnalysisPanel from "./DigitalTwinAIAnalysisPanel";

export default function MinimalDigitalTwinDashboard() {
  const {
    twinState,
    aiAnalysis,
    aiAnalysisLoading,
    isRefreshing,
    refreshTwin,
    analyzeTwin
  } = useDigitalTwin();

  const [isExpanded, setIsExpanded] = useState(false);

  if (!twinState) return null;

  const weatherData = twinState.environment?.weather?.current || {
    temperature: 14.5,
    condition: "HEAVY_RAIN"
  };

  const socialData = twinState.environment?.publicSignals || {
    count: 11,
    signalStrength: "HIGH"
  };

  const handleSyncAndAnalyze = async () => {
    await refreshTwin();
    await analyzeTwin();
  };

  const isWorking = isRefreshing || aiAnalysisLoading;

  return (
    <div className="mb-8">
      <div className="w-full relative rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-[#0b0f19]/70 backdrop-blur-xl shadow-lg overflow-hidden transition-all hover:shadow-xl">
        {/* Decorative Glow */}
        <div className="absolute top-0 left-1/4 w-64 h-32 bg-indigo-500/10 dark:bg-indigo-500/5 blur-[60px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-32 bg-purple-500/10 dark:bg-purple-500/5 blur-[60px] rounded-full pointer-events-none" />
        
        <div className="p-4 relative z-10 flex flex-col gap-4">
          
          {/* Top Row: Weather & Social */}
          <div className="grid grid-cols-2 gap-4">
            {/* Weather */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center shadow-inner shrink-0">
                <CloudLightning size={20} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider truncate">Live Weather</div>
                <div className="text-sm font-black text-slate-800 dark:text-white truncate">
                  {weatherData.temperature}°C • <span className="capitalize">{weatherData.condition?.replace(/_/g, ' ').toLowerCase()}</span>
                </div>
              </div>
            </div>

            {/* Social Signals */}
            <div className="flex items-center gap-3 border-l border-slate-200/50 dark:border-slate-700/50 pl-4 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 text-white flex items-center justify-center shadow-inner shrink-0">
                <Activity size={20} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider truncate">Social Feed</div>
                <div className="text-sm font-black text-slate-800 dark:text-white truncate">
                  {socialData.count} Signals
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200/50 dark:border-slate-700/50 border-dashed my-1"></div>

          {/* Bottom Row: AI Analyst & Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* AI Twin */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-inner shrink-0">
                <Cpu size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider truncate">AI Analyst</div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-2 pr-2">
                  {aiAnalysis?.summary || "No active risks detected for current itinerary baseline."}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <button 
                onClick={handleSyncAndAnalyze} 
                disabled={isWorking}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg ${isWorking ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
              >
                <RefreshCw size={14} className={isWorking ? 'animate-spin' : 'hover:rotate-180 transition-transform duration-500'} />
                {isWorking ? 'Sync' : 'Sync'}
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
              >
                {isExpanded ? 'Hide' : 'Details'}
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Detailed View */}
      {isExpanded && (
        <div className="mt-6 space-y-6 animate-in slide-in-from-top-4 fade-in duration-300">
          <DigitalTwinStatePanel />
          <DigitalTwinImpactPanel />
          <DigitalTwinWhatIfPanel />
          <DigitalTwinAIAnalysisPanel />
        </div>
      )}
    </div>
  );
}
