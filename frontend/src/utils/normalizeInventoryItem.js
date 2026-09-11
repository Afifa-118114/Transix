import { parseDurationMinutes, parsePrice } from "./formatTrip.js";

/**
 * Transforms a raw inventory item from the sidebar into a safe, normalized
 * object ready for scheduling.
 * Preserves all existing metadata while strictly parsing scheduling constraints.
 */
export function normalizeInventoryItem(rawItem) {
  if (!rawItem) throw new Error("Item payload is missing.");

  const name = rawItem.name || rawItem.title || rawItem.activity || "Activity";
  
  // Parse duration gracefully. If it fails, parseDurationMinutes defaults to fallback.
  // We use 120 (2 hours) as a sensible default for general activities if totally missing.
  const durationMinutes = parseDurationMinutes(rawItem.duration || rawItem.durationMinutes, 120); 
  
  const estimatedCost = rawItem.estimatedCost !== undefined 
    ? rawItem.estimatedCost 
    : parsePrice(rawItem.price || rawItem.fare);

  // Generate a safe persistent ID if missing
  const id = rawItem.id || `inv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

  // Preserve all properties, but standardize scheduling/domain ones
  return {
    ...rawItem,
    id,
    name,
    activity: name,
    durationMinutes,
    duration: rawItem.duration || `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
    estimatedCost,
    price: estimatedCost,
    displayPrice: rawItem.displayPrice || (estimatedCost > 0 ? `₹${estimatedCost.toLocaleString("en-IN")}` : null),
    isFlexible: true,
    
    // Explicitly remove any invalid/residual timing fields that might confuse the scheduler
    startTime: undefined,
    endTime: undefined,
    time: undefined,
    scheduledStart: undefined,
    scheduledEnd: undefined,
  };
}
