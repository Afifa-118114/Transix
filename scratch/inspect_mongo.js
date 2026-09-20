require("dotenv").config({ path: require("path").resolve(__dirname, "backend/.env") });
const mongoose = require("mongoose");

async function checkCollections() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB at:", process.env.MONGO_URI?.replace(/:([^:@]+)@/, ":****@"));
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log("\nExisting collections:");
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`- ${col.name}: ${count} documents`);
    }

    // Check if 'vendors' collection exists and has sample doc
    const hasVendors = collections.some(c => c.name === 'vendors');
    if (hasVendors) {
      const sampleVendor = await db.collection('vendors').findOne();
      console.log("\nSample vendor from 'vendors':", JSON.stringify(sampleVendor, null, 2));
      const indexes = await db.collection('vendors').indexes();
      console.log("Indexes on 'vendors':", indexes);
    } else {
      console.log("\n'vendors' collection does NOT exist yet.");
    }

    // Check if 'locations' or similar exists
    const hasLocations = collections.some(c => c.name === 'locations');
    if (hasLocations) {
      const sampleLocation = await db.collection('locations').findOne();
      console.log("\nSample location from 'locations':", JSON.stringify(sampleLocation, null, 2));
      const indexes = await db.collection('locations').indexes();
      console.log("Indexes on 'locations':", indexes);
    } else {
      console.log("\n'locations' collection does NOT exist yet.");
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error inspecting database:", err);
  }
}

checkCollections();
