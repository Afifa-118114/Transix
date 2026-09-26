require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const GuideProfile = require("../models/GuideProfile");

const GUIDE_PROFILES_PATH = path.resolve(__dirname, "../../guideProfiles.json");

async function seedGuides() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI not defined in environment");
    }

    if (!fs.existsSync(GUIDE_PROFILES_PATH)) {
      throw new Error(`guideProfiles.json not found at: ${GUIDE_PROFILES_PATH}`);
    }

    const rawData = fs.readFileSync(GUIDE_PROFILES_PATH, "utf8");
    const guideProfiles = JSON.parse(rawData);

    console.log(`Loaded ${guideProfiles.length} guide profiles from ${GUIDE_PROFILES_PATH}`);
    if (guideProfiles.length !== 100) {
      console.warn(`Warning: Expected 100 profiles, found ${guideProfiles.length}`);
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB successfully.");

    // Perform idempotent bulk upsert keyed by guideId
    const bulkOps = guideProfiles.map((guide) => ({
      updateOne: {
        filter: { guideId: guide.guideId },
        update: { $set: guide },
        upsert: true,
      },
    }));

    console.log(`Executing idempotent bulkWrite for ${bulkOps.length} guides...`);
    const result = await GuideProfile.bulkWrite(bulkOps);

    const totalInDb = await GuideProfile.countDocuments();
    console.log("--- SEED OPERATION COMPLETE ---");
    console.log(`Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount}, Matched: ${result.matchedCount}`);
    console.log(`Total Guide Profiles in MongoDB: ${totalInDb}`);

    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
  } catch (err) {
    console.error("Error during guide seeding:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  seedGuides();
}

module.exports = seedGuides;
