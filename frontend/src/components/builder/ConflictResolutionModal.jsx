import { motion, AnimatePresence } from "framer-motion";
import { FiAlertTriangle, FiX, FiCheck, FiClock, FiCalendar } from "react-icons/fi";

export default function ConflictResolutionModal({ pendingAlternatives, onApply, onCancel }) {
  if (!pendingAlternatives) return null;

  const { item, requestedTime, conflictInfo, alternatives } = pendingAlternatives;
  
  if (!item) return null;

  const freeSlots = (alternatives || []).filter(alt => alt.actions && alt.actions[0].type === 'FREE_SLOT');
  const rebalances = (alternatives || []).filter(alt => alt.actions && alt.actions[0].type === 'REBALANCE');

  const conflictingItemName = conflictInfo?.conflictingItem?.name || conflictInfo?.conflictingItem?.activity || 'Another activity';
  const conflictingTime = conflictInfo?.conflictingItem?.time || 'Unknown time';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-zinc-800 bg-zinc-900 sticky top-0 z-10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                <FiAlertTriangle className="text-xl" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide">CASCADE IMPACT</h3>
                <p className="text-sm text-zinc-400 mt-1">
                  Schedule conflict detected during insertion.
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
            >
              <FiX />
            </button>
          </div>

          <div className="p-6 space-y-8 overflow-y-auto">
            
            {/* Activity Being Added */}
            <section className="bg-zinc-800/30 rounded-xl p-5 border border-zinc-700/50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Activity Being Added</h4>
                   <p className="text-white font-medium text-base">{item.name || item.activity}</p>
                </div>
                <div>
                   <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Requested Schedule</h4>
                   <p className="text-indigo-300 font-medium text-base flex items-center gap-2">
                     <FiClock className="text-indigo-400" /> {requestedTime}
                   </p>
                </div>
              </div>
            </section>

            {/* CONFLICT */}
            <section>
              <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                Conflict Detected
              </h4>
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-5">
                <p className="text-sm text-rose-200 mb-2">Overlaps with: <span className="text-white font-bold">{conflictingItemName}</span></p>
                <p className="text-sm text-zinc-300 mb-2">{conflictingItemName}: <span className="text-white">{conflictingTime}</span></p>
                {conflictInfo?.overlapMinutes > 0 && (
                  <p className="text-sm text-zinc-300">Overlap: <span className="text-rose-400 font-bold">{conflictInfo.overlapMinutes} minutes</span></p>
                )}
                {conflictInfo?.reason && !conflictInfo.overlapMinutes && (
                  <p className="text-sm text-zinc-300">Reason: {conflictInfo.reason}</p>
                )}
              </div>
            </section>

            {/* POSSIBLE ALTERNATIVES */}
            {freeSlots.length > 0 && (
              <section>
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  Possible Alternatives
                </h4>
                <div className="space-y-3">
                  {freeSlots.map((alt, idx) => {
                    const action = alt.actions[0];
                    return (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-800/40 rounded-xl p-4 border border-indigo-500/20 hover:border-indigo-500/40 transition-colors">
                        <div>
                          <p className="text-sm text-white font-medium mb-1">Option {idx + 1}</p>
                          <div className="flex items-center gap-3 text-xs text-zinc-400">
                             <span className="flex items-center gap-1"><FiCalendar /> Day {action.newDay}</span>
                             <span className="flex items-center gap-1"><FiClock /> {action.newStartTime} - {action.newEndTime}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => onApply(alt)}
                          className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors whitespace-nowrap"
                        >
                          Apply
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* SCHEDULE REBALANCING */}
            {freeSlots.length === 0 && rebalances.length > 0 && (
              <section>
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Schedule Rebalancing
                </h4>
                <div className="space-y-4">
                  {rebalances.map((alt, idx) => {
                    const action = alt.actions[0];
                    return (
                      <div key={idx} className="bg-zinc-800/40 rounded-xl p-5 border border-amber-500/20">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          
                          {/* BEFORE */}
                          <div>
                            <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Before</h5>
                            <div className="space-y-3 relative before:absolute before:inset-y-2 before:left-[5px] before:w-0.5 before:bg-zinc-700">
                              <div className="relative pl-4">
                                <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-zinc-600 border-2 border-zinc-900"></div>
                                <p className="text-sm text-white font-medium">{action.flexibleItemName}</p>
                                <p className="text-xs text-zinc-400">{action.oldStartTime} - {action.oldEndTime}</p>
                                <p className="text-[10px] text-zinc-500 mt-0.5">{action.oldDuration}</p>
                              </div>
                              <div className="relative pl-4 opacity-50">
                                <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-rose-500 border-2 border-zinc-900"></div>
                                <p className="text-sm text-rose-200 font-medium">New Activity</p>
                                <p className="text-xs text-rose-300/70">Cannot fit</p>
                              </div>
                            </div>
                          </div>

                          {/* AFTER */}
                          <div>
                            <h5 className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-3">Proposed Cascade Change</h5>
                            <div className="space-y-3 relative before:absolute before:inset-y-2 before:left-[5px] before:w-0.5 before:bg-amber-900/50">
                              <div className="relative pl-4">
                                <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-amber-500 border-2 border-zinc-900"></div>
                                <p className="text-sm text-white font-medium">{action.flexibleItemName}</p>
                                <p className="text-xs text-amber-200">{action.newStartTime} - {action.newEndTime}</p>
                                <p className="text-[10px] text-amber-400/70 mt-0.5">{action.newDuration}</p>
                              </div>
                              <div className="relative pl-4">
                                <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-zinc-900"></div>
                                <p className="text-sm text-white font-medium">{item.name || item.activity}</p>
                                <p className="text-xs text-indigo-300">{action.targetStartTime} - {action.targetEndTime}</p>
                                <p className="text-[10px] text-indigo-400/70 mt-0.5">{action.targetDuration}</p>
                              </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-zinc-700/50 flex items-center justify-between">
                              <span className="text-[11px] text-zinc-400">Freed Time: <span className="text-white font-medium">{action.freedMinutes} minutes</span></span>
                              <button
                                onClick={() => onApply(alt)}
                                className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
                              >
                                Apply Change
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* NO SAFE CHANGES AVAILABLE */}
            {freeSlots.length === 0 && rebalances.length === 0 && (
               <section className="bg-rose-950/30 rounded-xl p-6 border border-rose-900/50 text-center">
                 <h4 className="text-sm font-bold text-rose-400 uppercase tracking-wider mb-2">
                   No Safe Changes Available
                 </h4>
                 <p className="text-xs text-rose-200/70 max-w-md mx-auto">
                   All checked days have no valid complete slot and no eligible flexible schedule change could be safely proposed without disrupting fixed transport or locked items.
                 </p>
               </section>
            )}

          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex justify-end shrink-0">
            <button
              onClick={onCancel}
              className="px-6 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
