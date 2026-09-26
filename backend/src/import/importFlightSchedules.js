require("dotenv").config();

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const crypto = require("crypto");
const mongoose = require("mongoose");

const connectDB = require("../config/db");
const FlightSchedule = require("../models/FlightSchedule");
const { resolveAirport } = require("../utils/airportCodes");

/**
 * Robust CSV line parser that handles quoted cells containing commas.
 */
function parseCSVLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  values.push(current);
  return values;
}

/**
 * Generate deterministic schedule key to guarantee idempotency.
 */
function createScheduleKey(data) {
  const rawKey = [
    data.airline,
    data.flightNumber,
    data.origin.code,
    data.destination.code,
    (data.daysOfWeek || []).join(","),
    data.scheduledDepartureTime,
    data.scheduledArrivalTime,
    data.validFrom ? data.validFrom.toISOString().split("T")[0] : "",
    data.validTo ? data.validTo.toISOString().split("T")[0] : "",
    data.timezone || "",
  ].join("|");

  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

async function importFlightSchedules() {
  const csvRelativePath = "data/flight-schedules/Air-Clean.csv";
  // Check paths relative to project root or current working dir
  let csvPath = path.resolve(process.cwd(), csvRelativePath);
  if (!fs.existsSync(csvPath)) {
    csvPath = path.resolve(process.cwd(), "..", csvRelativePath);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`[Import Error] Source file not found: ${csvPath}`);
    process.exit(1);
  }

  console.log("==================================================");
  console.log("TRANSIX FLIGHT SCHEDULE ENGINE — DATASET IMPORT");
  console.log("==================================================");
  console.log(`Source file: ${csvPath}`);

  await connectDB();

  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let totalSourceRows = 0;
  let validRowsCount = 0;
  let invalidRowsCount = 0;
  let duplicateCount = 0;
  let header = null;

  const seenKeys = new Set();
  const batchSize = 1000;
  let bulkOps = [];
  let totalProcessed = 0;

  for await (const line of rl) {
    totalSourceRows++;
    if (totalSourceRows === 1) {
      header = parseCSVLine(line);
      continue;
    }

    if (!line || line.trim() === "") continue;

    const cols = parseCSVLine(line);
    if (cols.length < 10) {
      invalidRowsCount++;
      continue;
    }

    const [
      airlineRaw,
      flightNumRaw,
      originRaw,
      destRaw,
      daysRaw,
      depRaw,
      arrRaw,
      timezoneRaw,
      validFromRaw,
      validToRaw,
      lastUpdatedRaw,
    ] = cols;

    const airline = (airlineRaw || "").trim();
    // Normalize flight numbers e.g. "265.0" -> "265", "228" -> "228"
    let flightNumber = (flightNumRaw || "").trim();
    if (flightNumber.endsWith(".0")) {
      flightNumber = flightNumber.slice(0, -2);
    }

    const originResolved = resolveAirport(originRaw);
    const destResolved = resolveAirport(destRaw);

    const scheduledDepartureTime = (depRaw || "").trim();
    const scheduledArrivalTime = (arrRaw || "").trim();

    if (!airline || !flightNumber || !scheduledDepartureTime || !scheduledArrivalTime) {
      invalidRowsCount++;
      continue;
    }

    // Days of week
    const daysOfWeek = (daysRaw || "")
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);

    // Dates
    const validFrom = validFromRaw ? new Date(validFromRaw) : null;
    const validTo = validToRaw ? new Date(validToRaw) : null;
    const lastUpdated = lastUpdatedRaw ? new Date(lastUpdatedRaw) : null;

    if (!validFrom || isNaN(validFrom.getTime()) || !validTo || isNaN(validTo.getTime())) {
      invalidRowsCount++;
      continue;
    }

    validRowsCount++;

    const doc = {
      airline,
      flightNumber,
      origin: originResolved,
      destination: destResolved,
      daysOfWeek,
      scheduledDepartureTime,
      scheduledArrivalTime,
      timezone: (timezoneRaw || "").trim(),
      validFrom,
      validTo,
      lastUpdated: lastUpdated && !isNaN(lastUpdated.getTime()) ? lastUpdated : null,
      sourceDataset: "Air-Clean.csv",
      rawData: {
        airline: airlineRaw,
        flightNumber: flightNumRaw,
        origin: originRaw,
        destination: destRaw,
        daysOfWeek: daysRaw,
        scheduledDepartureTime: depRaw,
        scheduledArrivalTime: arrRaw,
        timezone: timezoneRaw,
        validFrom: validFromRaw,
        validTo: validToRaw,
        lastUpdated: lastUpdatedRaw,
      },
    };

    const scheduleKey = createScheduleKey(doc);
    doc.scheduleKey = scheduleKey;

    if (seenKeys.has(scheduleKey)) {
      duplicateCount++;
      continue;
    }
    seenKeys.add(scheduleKey);

    bulkOps.push({
      updateOne: {
        filter: { scheduleKey },
        update: { $setOnInsert: doc },
        upsert: true,
      },
    });

    if (bulkOps.length >= batchSize) {
      await FlightSchedule.bulkWrite(bulkOps, { ordered: false });
      totalProcessed += bulkOps.length;
      process.stdout.write(`Processed ${totalProcessed} records...\r`);
      bulkOps = [];
    }
  }

  if (bulkOps.length > 0) {
    await FlightSchedule.bulkWrite(bulkOps, { ordered: false });
    totalProcessed += bulkOps.length;
    bulkOps = [];
  }

  const finalCount = await FlightSchedule.countDocuments();

  // Audit Mumbai -> Guwahati in MongoDB
  const bomGauCount = await FlightSchedule.countDocuments({
    $and: [
      { $or: [{ "origin.name": /mumbai/i }, { "origin.code": "BOM" }] },
      { $or: [{ "destination.name": /guwahati/i }, { "destination.code": "GAU" }] },
    ],
  });

  const bomGauSample = await FlightSchedule.find({
    $and: [
      { $or: [{ "origin.name": /mumbai/i }, { "origin.code": "BOM" }] },
      { $or: [{ "destination.name": /guwahati/i }, { "destination.code": "GAU" }] },
    ],
  })
    .limit(3)
    .lean();

  console.log("\n================ IMPORT REPORT ================");
  console.log(`Source file:           Air-Clean.csv`);
  console.log(`Source total lines:    ${totalSourceRows}`);
  console.log(`Source data rows:      ${totalSourceRows - 1}`);
  console.log(`Valid rows:            ${validRowsCount}`);
  console.log(`Invalid rows:          ${invalidRowsCount}`);
  console.log(`True duplicates skipped: ${duplicateCount}`);
  console.log(`Unique records staged: ${seenKeys.size}`);
  console.log(`Final MongoDB count:   ${finalCount}`);
  console.log(`Mumbai → Guwahati records in MongoDB: ${bomGauCount}`);
  if (bomGauSample.length > 0) {
    console.log("Sample Mumbai → Guwahati schedules in DB:");
    bomGauSample.forEach((s, idx) => {
      console.log(
        `  ${idx + 1}. ${s.airline} ${s.flightNumber} | ${s.origin.name} (${s.origin.code}) → ${s.destination.name} (${s.destination.code}) | ${s.scheduledDepartureTime} → ${s.scheduledArrivalTime} | Valid: ${s.validFrom.toISOString().split("T")[0]} to ${s.validTo.toISOString().split("T")[0]}`
      );
    });
  }
  console.log("================================================");

  process.exit(0);
}

importFlightSchedules().catch((err) => {
  console.error("Import failed with error:", err);
  process.exit(1);
});
