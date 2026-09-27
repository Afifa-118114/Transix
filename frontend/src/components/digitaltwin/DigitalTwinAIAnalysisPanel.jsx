import React from "react";
import { FiCpu, FiAlertTriangle, FiLayers, FiRefreshCw, FiInfo } from "react-icons/fi";
import { useDigitalTwin } from "../../context/DigitalTwinContext";

export default function DigitalTwinAIAnalysisPanel() {
  const {
    twinState,
    impactState,
    aiAnalysis,
    aiAnalysisLoading,
    aiAnalysisError,
    analyzeTwin,
  } = useDigitalTwin();

  if (!twinState || !impactState) return null;

  const getEntityTitle = (id) => {
    const found = twinState.entities?.find(e => e.id === id);
    return found ? found.title : id;
  };

  const renderBadge = (priority) => {
    switch (priority) {
      case "HIGH":
        return <span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded uppercase tracking-wider">HIGH</span>;
      case "MEDIUM":
        return <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded uppercase tracking-wider">MEDIUM</span>;
      default:
        return <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded uppercase tracking-wider">LOW</span>;
    }
  };

  return (
    <div className="w-full relative rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-[#0b0f19]/70 backdrop-blur-xl shadow-xl overflow-hidden mt-8 group transition-all hover:shadow-2xl hover:border-indigo-300/50 dark:hover:border-indigo-700/50">
      {/* Background glow effects */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 dark:bg-indigo-600/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-indigo-500/30 transition-all duration-1000" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-violet-500/20 dark:bg-violet-600/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-violet-500/30 transition-all duration-1000" />
      
      {/* Header */}
      <div className="relative z-10 bg-gradient-to-r from-indigo-50/50 to-violet-50/50 dark:from-indigo-950/20 dark:to-violet-950/20 px-6 py-5 border-b border-white/30 dark:border-white/5 flex flex-wrap gap-4 items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-2 ring-white/50 dark:ring-white/10">
            <FiCpu className="text-xl" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800 dark:text-white tracking-widest uppercase">
              AI Twin Analyst
            </h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Deep reasoning engine over cascading trip risks
            </p>
          </div>
        </div>

        <button
          onClick={analyzeTwin}
          disabled={aiAnalysisLoading}
          className="relative overflow-hidden flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 text-white dark:text-slate-900 text-xs font-bold rounded-full transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          <FiRefreshCw className={`text-sm ${aiAnalysisLoading ? "animate-spin" : ""}`} />
          {aiAnalysis ? "Re-evaluate Twin" : "Initialize AI Analyst"}
        </button>
      </div>

      <div className="p-6 relative z-10">
        {aiAnalysisLoading && !aiAnalysis ? (
          <div className="py-16 flex flex-col items-center justify-center text-indigo-600 dark:text-indigo-400">
            <div className="relative w-16 h-16 flex items-center justify-center mb-4">
              <div className="absolute inset-0 border-4 border-indigo-200 dark:border-indigo-900 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-indigo-600 dark:border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
              <FiCpu className="text-xl animate-pulse" />
            </div>
            <p className="text-sm font-bold tracking-widest uppercase">Deep AI Analysis in Progress...</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">Cross-referencing entities and environment vectors</p>
          </div>
        ) : aiAnalysisError ? (
          <div className="p-5 bg-rose-50/50 dark:bg-rose-950/20 backdrop-blur-sm border border-rose-200 dark:border-rose-900/30 rounded-xl flex items-start gap-4">
            <div className="p-2 bg-rose-100 dark:bg-rose-900/50 rounded-lg">
              <FiAlertTriangle className="text-rose-600 dark:text-rose-400 text-xl" />
            </div>
            <div>
              <p className="text-sm font-black tracking-widest text-rose-800 dark:text-rose-300 uppercase">AI Analysis Unavailable</p>
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400 mt-1">{aiAnalysisError}</p>
            </div>
          </div>
        ) : !aiAnalysis ? (
          <div className="py-16 text-center flex flex-col items-center justify-center">
            <div className="relative w-20 h-20 mb-6 group-hover:scale-110 transition-transform duration-700">
              <div className="absolute inset-0 bg-indigo-100 dark:bg-indigo-900/40 rounded-full animate-ping opacity-20"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700 rounded-full border border-slate-200 dark:border-slate-600 shadow-inner flex items-center justify-center z-10">
                <FiCpu className="text-3xl text-slate-400 dark:text-slate-500" />
              </div>
            </div>
            <p className="text-sm font-black tracking-widest uppercase text-slate-700 dark:text-slate-300 mb-2">Awaiting AI Initialization</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium leading-relaxed">
              Launch the AI Analyst to synthesize the deterministic risk state into actionable operational intelligence.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Block */}
            <div className="p-5 bg-white/50 dark:bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
              <h4 className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <FiInfo className="text-sm" /> Current Situation Assessment
              </h4>
              <p className="text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                {aiAnalysis.summary}
              </p>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-3 pl-3 border-l-2 border-indigo-200 dark:border-indigo-800">
                {aiAnalysis.overallRiskExplanation}
              </p>
              {aiAnalysis.whatIfComparison?.summary && (
                <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                  <p className="text-[10px] font-black text-violet-600 dark:text-violet-400 tracking-widest uppercase flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"></span>
                    Forecast Delta
                  </p>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 bg-violet-50/50 dark:bg-violet-900/10 p-3 rounded-lg border border-violet-100/50 dark:border-violet-800/30">
                    {aiAnalysis.whatIfComparison.summary}
                  </p>
                </div>
              )}
            </div>

            {/* Effects & Relationships Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Primary Effects */}
              <div>
                <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <FiAlertTriangle className="text-amber-500" /> Primary Affected Entities
                </h4>
                {aiAnalysis.affectedEntities?.length > 0 ? (
                  <div className="space-y-3">
                    {aiAnalysis.affectedEntities.map((entity, i) => (
                      <div key={i} className="text-sm bg-white/40 dark:bg-[#0f172a]/40 border border-slate-200/50 dark:border-slate-700/50 p-3 rounded-lg border-l-4 border-l-indigo-500 shadow-sm transition-transform hover:-translate-y-0.5">
                        <p className="font-bold text-slate-900 dark:text-white">{getEntityTitle(entity.entityId)}</p>
                        <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mt-1">{entity.explanation || entity.reasoning}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-24 flex items-center justify-center bg-slate-50/50 dark:bg-slate-800/20 rounded-lg border border-slate-200/50 dark:border-slate-700/50 border-dashed">
                    <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">No primary impacts detected.</p>
                  </div>
                )}
              </div>

              {/* Secondary/Cascading Effects */}
              <div>
                <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <FiLayers className="text-teal-500" /> Cascading Network Effects
                </h4>
                {aiAnalysis.cascadingEffects?.length > 0 ? (
                  <div className="space-y-3 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-700 before:to-transparent">
                    {aiAnalysis.cascadingEffects.map((effect, i) => (
                      <div key={i} className="relative z-10 text-sm bg-white/50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm backdrop-blur-md">
                        {effect.from && effect.to && (
                          <div className="flex items-center gap-1.5 mb-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                            <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 truncate max-w-[40%]">
                              {getEntityTitle(effect.from)}
                            </span>
                            <span className="text-slate-400 text-xs">→</span>
                            <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 truncate max-w-[40%]">
                              {getEntityTitle(effect.to)}
                            </span>
                          </div>
                        )}
                        <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                          {effect.effect}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-24 flex items-center justify-center bg-slate-50/50 dark:bg-slate-800/20 rounded-lg border border-slate-200/50 dark:border-slate-700/50 border-dashed">
                    <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">No cascading risks predicted.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Recommendations */}
              <div className="bg-gradient-to-br from-indigo-50/80 to-blue-50/50 dark:from-indigo-950/30 dark:to-blue-900/10 rounded-xl p-5 border border-indigo-100 dark:border-indigo-800/30 shadow-sm">
                <h4 className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-4">
                  Recommended Interventions
                </h4>
                {aiAnalysis.recommendedActions?.length > 0 ? (
                  <ul className="space-y-4">
                    {aiAnalysis.recommendedActions.map((rec, i) => (
                      <li key={i} className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-3">
                          {renderBadge(rec.priority)}
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wide">{rec.action}</span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 pl-14">{rec.reason}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs font-medium text-slate-500">No interventions required at this time.</p>
                )}
              </div>

              {/* Uncertainty */}
              <div className="bg-slate-50/80 dark:bg-[#0b0f19]/50 backdrop-blur-md rounded-xl p-5 border border-slate-200/80 dark:border-slate-700/50 shadow-sm">
                <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
                  Confidence Interval & Uncertainty
                </h4>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                  {aiAnalysis.uncertaintyExplanation || "The system holds high confidence in the current deterministic output vectors."}
                </p>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
