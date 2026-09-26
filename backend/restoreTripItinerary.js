const mongoose = require("mongoose");
require("dotenv").config();

async function restore() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const Trip = mongoose.model("Trip", new mongoose.Schema({}, { strict: false }));
  const trip = await Trip.findById("6aacae0d7574a4c7c992cb40");

  if (!trip) {
    console.error("Trip not found");
    process.exit(1);
  }

  console.log("Found trip:", trip._id, "Destination:", trip.destination);

  // Extract all existing items across all current days
  const rawItems = [];
  (trip.itinerary || []).forEach((d, dIdx) => {
    (d.plan || []).forEach(p => {
      rawItems.push({
        ...p,
        _originDay: d.day || (dIdx + 1),
      });
    });
  });

  console.log(`Total raw items in trip: ${rawItems.length}`);

  // Canonical 10-day template based on original trip definitions
  const dayTitles = [
    "Departure from Mumbai",
    "Train Journey & Arrival in Thiruvananthapuram",
    "Educational Visit: Space Technology (VSSC)",
    "Coastal Science & Exploration",
    "Transfer to Kochi & Heritage Architecture Study",
    "Maritime History & Group Synthesis",
    "Transfer to Munnar & Tea Industry Visit",
    "Ecological & Environmental Studies",
    "Agricultural Science & Botanical Exploration",
    "Cultural Assembly & Trip Conclusion",
  ];

  const restoredItinerary = dayTitles.map((title, idx) => ({
    day: idx + 1,
    title,
    date: `Day ${idx + 1}`,
    plan: [],
  }));

  // Distribute items to their genuine assigned days
  rawItems.forEach(item => {
    const idStr = String(item.id || item._id || "");
    const actStr = String(item.activity || item.name || "").toLowerCase();
    const trainNum = item.trainNumber ? String(item.trainNumber) : "";

    // Skip stale/duplicate generic trains
    if (idStr === "train-02198" || actStr.includes("mumbai → kerala")) {
      console.log(`Filtering out generic train: ${item.name}`);
      return;
    }
    if (idStr === "itin_3a395015-4dff-4f46-82ca-8b745191eb7a" || trainNum === "22660") {
      console.log(`Filtering out duplicate train 22660: ${item.name}`);
      return;
    }
    // Filter out wrongly placed return train 12483 from Day 6 (we will keep it canonical on Day 10)
    if (trainNum === "12483" && item._originDay === 6) {
      console.log(`Moving return train 12483 from Day 6 to Day 10`);
      item.journeyDirection = "return";
      restoredItinerary[9].plan.push(item);
      return;
    }

    // Determine target day from temp_id or specific operational sync tags
    let targetDay = null;

    const tempMatch = idStr.match(/^temp_id_(\d+)_\d+$/);
    if (tempMatch) {
      const parsedDay = parseInt(tempMatch[1], 10);
      targetDay = parsedDay;
    } else if (idStr === "sync-checkin-stay-1") {
      targetDay = 3; // The Leela Kovalam check-in on Day 3
    } else if (idStr === "sync-checkout-stay-1") {
      targetDay = 5; // The Leela Kovalam checkout on Day 5
    } else if (idStr === "sync-checkin-stay-3") {
      targetDay = 5; // Grand Hyatt Kochi check-in on Day 5
    } else if (idStr === "sync-checkout-stay-3") {
      targetDay = 7; // Grand Hyatt Kochi checkout on Day 7
    } else if (idStr === "sync-checkin-stay-2") {
      targetDay = 7; // Blanket Hotel Munnar check-in on Day 7
    } else if (idStr === "sync-checkout-stay-2") {
      targetDay = 10; // Blanket Hotel Munnar checkout on Day 10
    } else if (idStr.startsWith("train-outbound-") || trainNum === "12618") {
      targetDay = 1; // Outbound train departure on Day 1
    } else if (idStr.includes("846e1f80") || actStr.includes("thiruvananthapuram to kochi")) {
      targetDay = 5; // Travel: Trivandrum to Kochi on Day 5
    } else if (idStr.includes("9e1aa970") || actStr.includes("kochi to munnar")) {
      targetDay = 7; // Travel: Kochi to Munnar on Day 7
    } else if (idStr.includes("7c3a11de") || actStr.includes("munnar to mumbai")) {
      targetDay = 10; // Return: Munnar to Mumbai on Day 10
    } else {
      targetDay = item._originDay;
    }

    // Some specific activities might have special placement based on itinerary structure
    if (actStr.includes("bus transit to kochi")) {
      targetDay = 5;
    } else if (actStr.includes("chartered bus transit to munnar")) {
      targetDay = 7;
    } else if (actStr.includes("colonial heritage walk")) {
      targetDay = 5;
    } else if (actStr.includes("naval & maritime")) {
      targetDay = 6;
    } else if (actStr.includes("proposed tea factory")) {
      targetDay = 8;
    } else if (actStr.includes("spice agriculture")) {
      targetDay = 8;
    } else if (actStr.includes("botanical research")) {
      targetDay = 9;
    } else if (actStr.includes("academic workshop")) {
      targetDay = 9;
    } else if (actStr.includes("local crafts")) {
      targetDay = 10;
    } else if (actStr.includes("final trip conclusion")) {
      targetDay = 10;
    }

    if (targetDay >= 1 && targetDay <= 10) {
      delete item._originDay;
      restoredItinerary[targetDay - 1].plan.push(item);
    }
  });

  // Sort each day's plan chronologically
  function timeToMin(t) {
    if (!t) return 0;
    const s = String(t).trim();
    const match = s.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) return 0;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const p = match[3] ? match[3].toUpperCase() : null;
    if (p === "PM" && h < 12) h += 12;
    if (p === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }

  restoredItinerary.forEach(d => {
    d.plan.sort((a, b) => {
      const aStart = timeToMin(a.startTime || (a.time ? String(a.time).split("-")[0] : null));
      const bStart = timeToMin(b.startTime || (b.time ? String(b.time).split("-")[0] : null));
      return aStart - bStart;
    });
  });

  console.log("\n================ RESTORED ITINERARY SUMMARY ================");
  restoredItinerary.forEach(d => {
    console.log(`Day ${d.day} (${d.title}): ${d.plan.length} items`);
    d.plan.forEach((p, idx) => {
      console.log(`  [${idx + 1}] (${p.category}) ${p.activity || p.name} | ${p.time} | train: ${p.trainNumber || '-'}`);
    });
  });

  // Update travelLegs to have clean single outbound (12618) and return (12483)
  const cleanTravelLegs = [
    {
      id: "leg-outbound-train",
      journeyDirection: "outbound",
      mode: "train",
      type: "train",
      operator: "MNGLA LKSDP",
      trainName: "MNGLA LKSDP",
      trainNumber: "12618",
      from: "KALYAN JN",
      to: "ERNAKULAM JN",
      source: "KALYAN JN",
      destination: "ERNAKULAM JN",
      departure: "05:20",
      arrival: "08:00",
      startTime: "05:20",
      endTime: "08:00",
      duration: "26h 40m",
      durationMinutes: 1600,
      fare: 1819,
      price: 1819,
      estimatedCost: 1819,
      departureDay: 1,
      arrivalDay: 2,
    },
    {
      id: "leg-return-train",
      journeyDirection: "return",
      mode: "train",
      type: "train",
      operator: "AMRITSAR EXP",
      trainName: "AMRITSAR EXP",
      trainNumber: "12483",
      from: "TRIVANDRUM NORTH",
      to: "VASAI ROAD",
      source: "TRIVANDRUM NORTH",
      destination: "VASAI ROAD",
      departure: "04:50",
      arrival: "12:35",
      startTime: "04:50",
      endTime: "12:35",
      duration: "31h 45m",
      durationMinutes: 1905,
      fare: 2080,
      price: 2080,
      estimatedCost: 2080,
      departureDay: 10,
      arrivalDay: 11,
    }
  ];

  const res = await Trip.updateOne(
    { _id: trip._id },
    { $set: { itinerary: restoredItinerary, travelLegs: cleanTravelLegs } }
  );
  console.log("\nTrip update result:", res);
  console.log("Trip successfully restored in MongoDB!");

  await mongoose.disconnect();
}

restore().catch(err => {
  console.error("Restore error:", err);
  process.exit(1);
});
