import {
  detectConflicts,
  getDayConstraints,
  findExistingTrainRecord,
  scheduleTrainJourneyIntoTrip,
  buildProposedTrainAdaptation,
  getActivityLogicalWindow,
} from "../src/utils/schedulingEngine.js";

console.log("=== DIAGNOSTIC 1: HOTEL CHECK-OUT LOGICAL WINDOW ===");
const checkoutItem = {
  id: "sync-checkout-final-day",
  name: "Hotel Check-out",
  category: "hotel",
  startTime: "05:00",
  endTime: "05:30"
};
const win = getActivityLogicalWindow(checkoutItem);
console.log("Hotel Check-out logical window:", { start: win.start / 60, end: win.end / 60 });
console.log("Is 05:00 valid?", 5 * 60 >= win.start && 5 * 60 <= win.end);

console.log("\n=== DIAGNOSTIC 2: HOTEL CHECK-OUT DETECTION IN RETURN ADAPTATION ===");
const testItems = [
  { id: "1", name: "Hotel Check-out", category: "hotel" },
  { id: "2", name: "Hotel Checkout", category: "operational" },
  { id: "3", name: "Check-out from Hotel", category: "stay" },
  { id: "4", name: "Hotel Checkout Buffer & Checkout", category: "accommodation" },
];

testItems.forEach(item => {
  const cat = String(item.category || "").toLowerCase();
  const act = String(item.activity || item.name || "").toLowerCase();
  const oldIsCheckout = (cat === "operational" || cat === "accommodation" || cat === "stay") &&
    (act.includes("checkout") || act.includes("check-out") || act.includes("check out"));
  const newIsCheckout = (cat === "hotel" || cat === "operational" || cat === "accommodation" || cat === "stay") &&
    (act.includes("checkout") || act.includes("check-out") || act.includes("check out") || act.includes("check out"));
  console.log(`Item "${item.name}" (cat: ${item.category}) -> Old regex match: ${oldIsCheckout}, New regex match: ${newIsCheckout}`);
});

console.log("\n=== DIAGNOSTIC 3: ARRIVAL DAY COMPUTATION FOR SAME-DAY vs OVERNIGHT ===");
function getArrivalDay(depMin, durationMins, depDay = 1) {
  return depDay + Math.floor((depMin + durationMins) / 1440);
}

console.log("5h train (13:00 dep, 300m dur): depDay 1 -> arrDay:", getArrivalDay(13 * 60, 300, 1));
console.log("4h train (09:00 dep, 240m dur): depDay 1 -> arrDay:", getArrivalDay(9 * 60, 240, 1));
console.log("26h train (13:00 dep, 1560m dur): depDay 1 -> arrDay:", getArrivalDay(13 * 60, 1560, 1));
console.log("21h return train (17:45 dep, 1275m dur): depDay 7 -> arrDay:", getArrivalDay(17 * 60 + 45, 1275, 7));
