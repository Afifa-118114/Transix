require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Location = require("../models/Location");
const Vendor = require("../models/Vendor");

const DATA_DIR = path.resolve(__dirname, "../../../data");
const CITIES_CSV_PATH = path.join(DATA_DIR, "Indian_Cities_Database.normalized.csv");
const VENDORS_JSON_PATH = path.join(DATA_DIR, "transix_vendors.normalized.json");

async function runImport() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI not defined in environment");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB successfully.");

    const db = mongoose.connection.db;

    // 1. IMPORT LOCATIONS
    console.log("\n--- IMPORTING LOCATIONS ---");
    if (!fs.existsSync(CITIES_CSV_PATH)) {
      throw new Error(`Normalized cities CSV not found at: ${CITIES_CSV_PATH}`);
    }

    const csvContent = fs.readFileSync(CITIES_CSV_PATH, "utf8");
    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const header = lines[0].split(",");
    console.log(`Read ${lines.length - 1} location records from ${CITIES_CSV_PATH}`);

    const locationOps = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",");
      const city = parts[0].trim();
      const latitude = parseFloat(parts[1].trim());
      const longitude = parseFloat(parts[2].trim());
      const country = parts[3].trim();
      const iso2 = parts[4].trim();
      const state = parts[5].trim();
      const formerState = parts[6] ? parts[6].trim() : state;

      locationOps.push({
        updateOne: {
          filter: { city, state },
          update: {
            $set: {
              city,
              state,
              latitude,
              longitude,
              country,
              iso2,
              formerState,
            },
          },
          upsert: true,
        },
      });
    }

    const locationResult = await Location.bulkWrite(locationOps, { ordered: false });
    console.log("Locations bulkWrite result:", {
      matchedCount: locationResult.matchedCount,
      modifiedCount: locationResult.modifiedCount,
      upsertedCount: locationResult.upsertedCount,
    });

    const totalLocationsInDb = await Location.countDocuments();
    console.log(`Total documents in 'locations' collection: ${totalLocationsInDb}`);

    // 2. IMPORT VENDORS
    console.log("\n--- IMPORTING VENDORS (INTO EXISTING 'vendors' COLLECTION) ---");
    if (!fs.existsSync(VENDORS_JSON_PATH)) {
      throw new Error(`Normalized vendors JSON not found at: ${VENDORS_JSON_PATH}`);
    }

    const vendorsRaw = fs.readFileSync(VENDORS_JSON_PATH, "utf8");
    const vendors = JSON.parse(vendorsRaw);
    console.log(`Read ${vendors.length} vendor records from ${VENDORS_JSON_PATH}`);

    const vendorOps = vendors.map((v) => ({
      updateOne: {
        filter: { name: v.name },
        update: {
          $set: {
            name: v.name,
            status: v.status,
            source: v.source,
            serviceStates: v.serviceStates,
            fleet: v.fleet,
            capabilities: v.capabilities,
          },
        },
        upsert: true,
      },
    }));

    const vendorResult = await Vendor.bulkWrite(vendorOps, { ordered: false });
    console.log("Vendors bulkWrite result:", {
      matchedCount: vendorResult.matchedCount,
      modifiedCount: vendorResult.modifiedCount,
      upsertedCount: vendorResult.upsertedCount,
    });

    const totalVendorsInDb = await Vendor.countDocuments();
    console.log(`Total documents in 'vendors' collection: ${totalVendorsInDb}`);

    // Verify collections in database
    const collections = await db.listCollections().toArray();
    const vendorCols = collections.filter((c) => c.name.toLowerCase().includes("vendor"));
    console.log("\nCollections containing 'vendor':", vendorCols.map((c) => c.name));
    if (vendorCols.length !== 1 || vendorCols[0].name !== "vendors") {
      console.warn("WARNING: Unexpected vendor collections found!", vendorCols);
    } else {
      console.log("CONFIRMED: Exactly ONE vendor collection exists: 'vendors'");
    }

    console.log("\nImport completed successfully.");
    await mongoose.disconnect();
  } catch (err) {
    console.error("Import failed:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  runImport();
}

module.exports = { runImport };
