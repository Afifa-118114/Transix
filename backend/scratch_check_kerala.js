const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const FlightSchedule = require("./src/models/FlightSchedule");

async function check() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(uri);

  const bomToKerala = await FlightSchedule.find({
    $or: [{ "origin.code": "BOM" }, { "origin.name": /mumbai/i }],
    $or: [
      { "destination.code": { $in: ["COK", "TRV", "CCJ", "CNN"] } },
      { "destination.name": { $in: [/kochi/i, /calicut/i, /trivandrum/i, /kannur/i] } }
    ]
  }).lean();
  console.log("Total BOM -> Kerala flights in DB:", bomToKerala.length);
  const byDest = {};
  bomToKerala.forEach(s => {
    const k = `${s.destination.name} (${s.destination.code})`;
    byDest[k] = (byDest[k] || 0) + 1;
  });
  console.log("BOM to Kerala breakdown:", byDest);

  // Check unique daysOfWeek across these
  const daysFound = new Set();
  bomToKerala.forEach(s => s.daysOfWeek.forEach(d => daysFound.add(d)));
  console.log("Days of week in BOM -> Kerala:", [...daysFound]);

  process.exit(0);
}
check();
