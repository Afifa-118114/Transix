require("dotenv").config({ path: require("path").resolve(__dirname, "../backend/.env") });
const mongoose = require("mongoose");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;

  const tripIdStr = "6aacae0d7574a4c7c992cb40";
  // Trip ID might be ObjectId or string
  let trip = null;
  try {
    trip = await db.collection("trips").findOne({ _id: new mongoose.Types.ObjectId(tripIdStr) });
  } catch (e) {
    // maybe string
  }
  if (!trip) {
    trip = await db.collection("trips").findOne({ _id: tripIdStr });
  }

  console.log("Trip found:", trip ? {
    _id: trip._id,
    title: trip.title,
    source: trip.source,
    destination: trip.destination,
    tripCategory: trip.tripCategory,
    status: trip.status,
    operationalStatus: trip.operationalStatus,
    travelers: trip.travelers,
    campusConfig: trip.campusConfig,
    campusTransportPlan: trip.campusTransportPlan,
    itineraryDays: trip.itinerary?.length,
  } : "NOT FOUND");

  // Booking requirements
  const bookings = await db.collection("bookingrequirements").find({
    $or: [{ tripId: trip?._id }, { tripId: tripIdStr }, { tripId: new mongoose.Types.ObjectId(tripIdStr) }]
  }).toArray();
  console.log(`Found ${bookings.length} booking requirements:`);
  for (const b of bookings) {
    console.log(`- [${b.type}] itemId: ${b.itemId}, title: ${b.title || b.itemName}, status: ${b.status}, _id: ${b._id}`);
  }

  // Vendor requests
  const vendorReqs = await db.collection("vendorrequests").find({
    $or: [{ tripId: trip?._id }, { tripId: tripIdStr }, { tripId: new mongoose.Types.ObjectId(tripIdStr) }]
  }).toArray();
  console.log(`Found ${vendorReqs.length} vendor requests:`);
  for (const vr of vendorReqs) {
    console.log(`- vendorId: ${vr.vendorId}, status: ${vr.status}, type: ${vr.requestType}`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
