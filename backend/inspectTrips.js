const mongoose = require("mongoose");
require("dotenv").config();

async function inspect() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const Trip = mongoose.model("Trip", new mongoose.Schema({}, { strict: false }));
  const trips = await Trip.find({}).sort({ updatedAt: -1 }).limit(1);

  console.log(`Found ${trips.length} recent trips.`);
  trips.forEach((t, idx) => {
    console.log(`\n================== TRIP ${idx + 1}: ${t._id} ==================`);
    console.log(`Destination: ${t.destination}, Category: ${t.tripCategory}, Duration: ${t.duration}`);
    console.log(`itinerary length: ${Array.isArray(t.itinerary) ? t.itinerary.length : 'not array'}`);

    if (Array.isArray(t.itinerary)) {
      t.itinerary.forEach((d, dIdx) => {
        const plan = d.plan || [];
        console.log(`  Day ${d.day || (dIdx + 1)} (${d.title || d.date}): ${plan.length} items`);
        plan.forEach((item, pIdx) => {
          console.log(`    [${pIdx + 1}] (${item.category || item.type || '-'}) ${item.name || item.activity || item.title} | time: "${item.time}" | start: "${item.startTime}" | end: "${item.endTime}" | legType: ${item.legType || '-'}`);
        });
      });
    }
  });

  await mongoose.disconnect();
}

inspect().catch(err => {
  console.error("Inspect error:", err);
  process.exit(1);
});
