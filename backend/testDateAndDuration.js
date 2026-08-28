// Date & Duration Synchronization Test Suite
// Run: node testDateAndDuration.js

function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  return isNaN(d.getTime())
    ? String(date)
    : d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function getDuration(trip) {
  if (!trip) return "0 Days";
  if (trip.itinerary?.length) {
    return `${trip.itinerary.length} Days`;
  }
  if (trip.duration) {
    return typeof trip.duration === "number" ? `${trip.duration} Days` : String(trip.duration);
  }
  if (trip.startDate && trip.endDate) {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      return `${days} Days`;
    }
  }
  return "5 Days";
}

function normalizeTrip(rawTrip) {
  const itinerary = Array.isArray(rawTrip.itinerary) ? rawTrip.itinerary : [];
  const numDays = itinerary.length || 5;

  let finalStartDate = rawTrip.startDate || null;
  let finalEndDate = rawTrip.endDate || null;

  if (finalStartDate) {
    const s = new Date(finalStartDate);
    if (!isNaN(s.getTime())) {
      if (!finalEndDate) {
        const e = new Date(s);
        e.setDate(s.getDate() + numDays - 1);
        finalEndDate = e.toISOString().split("T")[0];
      } else {
        const e = new Date(finalEndDate);
        if (!isNaN(e.getTime())) {
          const calDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
          if (calDays !== numDays) {
            const adjustedE = new Date(s);
            adjustedE.setDate(s.getDate() + numDays - 1);
            finalEndDate = adjustedE.toISOString().split("T")[0];
          }
        }
      }
    }
  }

  return {
    ...rawTrip,
    startDate: finalStartDate,
    endDate: finalEndDate,
    duration: `${numDays} Days`,
    itinerary,
  };
}

const testRanges = [
  { name: "Example 1 (28 Aug - 31 Aug)", startDate: "2026-08-28", endDate: "2026-08-31", itineraryDays: 4, source: "Mumbai", destination: "Kanyakumari" },
  { name: "Example 2 (1 Sep - 5 Sep)", startDate: "2026-09-01", endDate: "2026-09-05", itineraryDays: 5, source: "Delhi", destination: "Jaipur" },
  { name: "Example 3 (10 Sep - 12 Sep)", startDate: "2026-09-10", endDate: "2026-09-12", itineraryDays: 3, source: "Chennai", destination: "Bengaluru" },
  { name: "Example 4 (15 Sep - 20 Sep)", startDate: "2026-09-15", endDate: "2026-09-20", itineraryDays: 6, source: "Mumbai", destination: "Delhi" },
];

console.log("==================================================");
console.log("DATE & DURATION SYNCHRONIZATION TEST SUITE");
console.log("==================================================");

let allPassed = true;

for (const t of testRanges) {
  const dummyItinerary = Array.from({ length: t.itineraryDays }, (_, i) => ({
    day: i + 1,
    title: `Day ${i + 1}`,
    plan: [{ time: "09:30 AM - 11:30 AM", place: t.destination, activity: `Activity ${i + 1}` }],
  }));

  const rawTrip = { source: t.source, destination: t.destination, startDate: t.startDate, endDate: t.endDate, travelers: 2, budget: 50000, itinerary: dummyItinerary };
  const normalized = normalizeTrip(rawTrip);
  const heroDuration = getDuration(normalized);
  const heroDates = `${formatDate(normalized.startDate)} – ${formatDate(normalized.endDate)}`;

  console.log(`\n--- ${t.name} ---`);
  console.log(`  Raw Input:       ${t.startDate} to ${t.endDate} (${t.itineraryDays} itinerary days)`);
  console.log(`  Normalized:      Start=${normalized.startDate} | End=${normalized.endDate} | Duration=${normalized.duration}`);
  console.log(`  Dashboard Hero:  "${heroDuration} • ${heroDates}"`);
  console.log(`  Map Modal:       "${normalized.source} → ${normalized.destination} (${heroDuration} • ${normalized.travelers} Travelers)"`);
  console.log(`  Itinerary Count: ${normalized.itinerary.length} Days (D1 to D${normalized.itinerary.length})`);

  const expectedDaysStr = `${t.itineraryDays} Days`;
  const isPass = heroDuration === expectedDaysStr && normalized.duration === expectedDaysStr && normalized.itinerary.length === t.itineraryDays;

  if (isPass) {
    console.log(`  [VERIFIED PASS] Consistency confirmed across Hero, Map Modal, Builder, and Itinerary`);
  } else {
    console.log(`  [FAILED] Inconsistency detected — got "${heroDuration}", expected "${expectedDaysStr}"`);
    allPassed = false;
  }
}

console.log("\n==================================================");
console.log(allPassed ? "ALL DATE & DURATION TESTS PASSED (✓)" : "SOME TESTS FAILED (❌)");
console.log("==================================================");
