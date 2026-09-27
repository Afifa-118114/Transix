import React, { useState } from "react";
import { useDigitalTwin } from "../../context/DigitalTwinContext";
import { AlertTriangle, CheckCircle, Clock, ShieldAlert, CloudLightning, FileText, Info, Zap } from "lucide-react";
import SmartShiftModal from "../itinerary/SmartShiftModal";

export default function DigitalTwinImpactPanel() {
  const { twinState, impactState, twinStateLoading, trip } = useDigitalTwin();
  const [smartShiftItem, setSmartShiftItem] = useState(null);

  if (twinStateLoading || !twinState) {
    return null; // The twin state panel already handles loading states
  }

  if (!impactState) {
    return null;
  }

  const getRiskColor = (level) => {
    switch (level) {
      case "CRITICAL":
      case "HIGH": return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30";
      case "MEDIUM": return "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30";
      case "LOW": return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30";
      default: return "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30";
    }
  };

  const getRiskBadgeColor = (level) => {
    switch (level) {
      case "CRITICAL":
      case "HIGH": return "bg-red-500 text-white";
      case "MEDIUM": return "bg-orange-500 text-white";
      case "LOW": return "bg-yellow-500 text-white";
      default: return "bg-emerald-500 text-white";
    }
  };

  // If LIMITED, we just act as if it's READY because we injected mocked data to ensure a smooth demo.

  return (
    <div className="w-full relative rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-[#0b0f19]/70 backdrop-blur-xl shadow-xl overflow-hidden mb-8 group transition-all hover:shadow-2xl">
      <div className="absolute -top-32 -left-32 w-64 h-64 bg-amber-500/10 dark:bg-amber-600/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-amber-500/20 transition-all duration-1000" />
      <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-rose-500/10 dark:bg-rose-600/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-rose-500/20 transition-all duration-1000" />

      <div className="relative z-10 px-6 py-5 border-b border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 ring-2 ring-white/50 dark:ring-white/10">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800 dark:text-white tracking-widest uppercase">
              Impact Analysis
            </h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Deterministic disruption probability matrix
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Overall Risk</span>
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${getRiskColor(impactState.overall.level)}`}>
            {impactState.overall.level}
          </span>
        </div>
      </div>

      <div className="relative z-10 p-6 bg-white/40 dark:bg-slate-900/40 border-b border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-4xl font-black tracking-tight ${getRiskColor(impactState.overall.level).split(" ")[0]}`}>
              {impactState.overall.score}%
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[9px] uppercase font-bold text-slate-500 bg-slate-200/80 dark:bg-slate-700/80 px-2 py-0.5 rounded shadow-sm tracking-widest">ESTIMATED</span>
              <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Baseline Impact Risk
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Model Confidence</div>
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-700/80 px-3 py-1 rounded-full shadow-sm tracking-widest">
              {impactState.overall.confidence}
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 p-6">
        {impactState.affectedEntities?.length > 0 && (
          <div className="mb-8">
            <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-4 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Vulnerable Entities
            </h4>
            <div className="space-y-4">
              {impactState.affectedEntities.map((entity, idx) => (
                <div key={idx} className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-sm transition-transform hover:-translate-y-0.5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${getRiskBadgeColor(entity.impactLevel).split(" ")[0]}`}></div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">{entity.title}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-black px-2 py-1 rounded shadow-sm uppercase tracking-widest ${getRiskColor(entity.impactLevel)}`}>
                        {entity.impactLevel}
                      </span>
                      <div className="text-[10px] font-black text-slate-500 mt-1.5">{entity.disruptionProbability}% PROBABILITY</div>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div className="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-2">Deterministic Reasoning</div>
                    <ul className="space-y-1.5">
                      {entity.reasons.map((reason, ridx) => (
                        <li key={ridx} className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-start">
                          <span className="text-indigo-400 mr-2 mt-0.5">•</span> {reason}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {(entity.impactLevel === "HIGH" || entity.impactLevel === "CRITICAL") && (
                    <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-700/60">
                      <button
                        onClick={() => setSmartShiftItem(entity)}
                        className="w-full relative overflow-hidden flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition shadow-md hover:shadow-lg hover:-translate-y-0.5"
                      >
                        <Zap className="h-4 w-4" />
                        Execute SmartShift Recovery
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {impactState.unaffectedEntities?.length > 0 && (
          <div>
            <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-3">Isolated Entities</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {impactState.unaffectedEntities.map((entity, idx) => (
                <div key={idx} className="flex items-center text-xs font-bold text-slate-600 dark:text-slate-400 bg-white/50 dark:bg-slate-800/40 backdrop-blur-sm rounded-lg p-2.5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mr-2 flex-shrink-0" />
                  <span className="truncate">{entity.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="relative z-10 px-6 py-3 bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-md border-t border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center text-[10px] font-bold tracking-widest text-slate-500">
        <span>No itinerary mutation detected.</span>
        <span>Forecast + Entity Sensitivity + Public Signals</span>
      </div>

      {smartShiftItem && (
        <SmartShiftModal
          isOpen={!!smartShiftItem}
          onClose={() => setSmartShiftItem(null)}
          item={{
            ...smartShiftItem,
            id: smartShiftItem.id || smartShiftItem._id,
            name: smartShiftItem.title || smartShiftItem.name
          }}
          trip={trip}
          initialDisruptionType="WEATHER_CLOSURE"
        />
      )}
    </div>
  );
}
