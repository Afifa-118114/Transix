import { motion, AnimatePresence } from "framer-motion";
import { FiAlertTriangle, FiX, FiCheck } from "react-icons/fi";

export default function ConflictResolutionModal({ pendingAlternatives, onApply, onCancel }) {
  if (!pendingAlternatives) return null;

  const { item, alternatives, conflicts } = pendingAlternatives;
  
  const hasAlternatives = alternatives && alternatives.length > 0;
  const recommended = hasAlternatives ? alternatives[0] : null;
  const others = hasAlternatives ? alternatives.slice(1) : [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-zinc-800 shrink-0">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 shrink-0 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mt-1">
                <FiAlertTriangle className="text-xl" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">CASCADE IMPACT</h3>
                <p className="text-sm text-zinc-400 mt-1">
                  Can't add this activity at this time.
                </p>
                
                <div className="mt-4 p-3 bg-zinc-800/50 rounded-xl border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Activity</p>
                  <p className="text-sm font-medium text-white">{item?.name || item?.activity}</p>
                  <p className="text-xs text-zinc-400">{item?.startTime} - {item?.endTime}</p>
                </div>
                
                {conflicts && conflicts.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Overlaps with:</p>
                    {conflicts.map((c, i) => (
                      <div key={i} className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <p className="text-sm font-medium text-red-400">{c.reason}</p>
                        {c.type === "TRANSPORT_CONSTRAINT" && (
                          <p className="text-xs text-red-400/80 mt-1">This is a fixed transport slot and cannot be displaced.</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 shrink-0 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
            >
              <FiX />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto custom-scrollbar">
            {!hasAlternatives ? (
               <div className="text-center py-6">
                 <h4 className="text-sm font-semibold text-zinc-300 mb-2">NO SAFE CHANGES AVAILABLE</h4>
                 <p className="text-xs text-zinc-500 mb-6">There's no conflict-free time slot available for this activity within the current itinerary.</p>
                 <button
                    onClick={onCancel}
                    className="w-full sm:w-auto px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
               </div>
            ) : (
              <div className="space-y-6">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  Possible Safe Alternatives
                </h4>
                
                {/* Recommended Alternative */}
                <div>
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                    <p className="text-white font-medium mb-3">Option 1</p>
                    <p className="text-sm text-zinc-300 mb-3">{recommended.description}</p>
                    
                    <div className="space-y-1 mb-4 text-xs font-medium text-emerald-400">
                      <div className="flex items-center gap-1.5"><FiCheck /> No schedule conflicts</div>
                      <div className="flex items-center gap-1.5"><FiCheck /> Transport unchanged</div>
                      <div className="flex items-center gap-1.5"><FiCheck /> Stay unchanged</div>
                    </div>

                    <button
                      onClick={() => onApply(recommended)}
                      className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      <FiCheck /> Apply Option 1
                    </button>
                  </div>
                </div>

                {/* Other Alternatives */}
                {others.length > 0 && (
                  <div className="space-y-3">
                    {others.map((alt, idx) => (
                      <div key={idx} className="flex flex-col gap-3 bg-zinc-800/50 rounded-xl p-4 border border-zinc-800 hover:border-zinc-700 transition-colors">
                        <div>
                          <p className="text-white font-medium mb-1">Option {idx + 2}</p>
                          <p className="text-sm text-zinc-300">{alt.description}</p>
                        </div>
                        <button
                          onClick={() => onApply(alt)}
                          className="w-full py-2 text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
                        >
                          Apply Option {idx + 2}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
