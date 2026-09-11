import { motion, AnimatePresence } from "framer-motion";
import { FiAlertTriangle, FiX, FiCheck } from "react-icons/fi";

export default function ConflictResolutionModal({ pendingAlternatives, onApply, onCancel }) {
  if (!pendingAlternatives) return null;

  const { item, alternatives } = pendingAlternatives;
  
  if (!alternatives || alternatives.length === 0) return null;
  
  const recommended = alternatives[0];
  const others = alternatives.slice(1);

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
          className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                <FiAlertTriangle className="text-xl" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">Schedule Conflict</h3>
                <p className="text-sm text-zinc-400 mt-1">
                  "{item?.name || item?.activity}" cannot fit in the current schedule without adjustment.
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

          {/* Body */}
          <div className="p-6 space-y-6">
            
            {/* Recommended Alternative */}
            <div>
              <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                Recommended Solution
              </h4>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                <p className="text-white font-medium mb-3">{recommended.description}</p>
                
                <div className="space-y-2 mb-4">
                  {recommended.actions?.map((action, idx) => (
                    <div key={idx} className="text-sm text-zinc-300 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      {action.type === 'SHORTEN' && `Shorten to fit: ${action.newStartTime} - ${action.newEndTime}`}
                      {action.type === 'MOVE' && `Reschedule to: ${action.newStartTime} - ${action.newEndTime}`}
                      {action.type === 'MOVE_DAY' && `Move to Day ${action.newDay}`}
                      {action.type === 'KEEP' && `Keep at: ${action.newStartTime} - ${action.newEndTime}`}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => onApply(recommended)}
                  className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  <FiCheck /> Apply Recommended
                </button>
              </div>
            </div>

            {/* Other Alternatives */}
            {others.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                  Other Alternatives
                </h4>
                <div className="space-y-3">
                  {others.map((alt, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-800/50 rounded-xl p-3 border border-zinc-800 hover:border-zinc-700 transition-colors">
                      <p className="text-sm text-zinc-300">{alt.description}</p>
                      <button
                        onClick={() => onApply(alt)}
                        className="px-4 py-1.5 text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-white rounded-md transition-colors whitespace-nowrap"
                      >
                        Apply Alternative
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
