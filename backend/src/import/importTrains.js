require("dotenv").config();

const connectDB = require("../config/db");
const Train = require("../models/Train");

const expressTrains = require("./EXP-TRAINS.json");
const passengerTrains = require("./PASS-TRAINS.json");
const superfastTrains = require("./SF-TRAINS.json");

async function importTrains() {
  try {
    await connectDB();

    console.log("Clearing existing train collection...");
    await Train.deleteMany();

    const trains = [
      ...expressTrains.map((train) => ({
        ...train,
        type: "Express",
      })),
      ...passengerTrains.map((train) => ({
        ...train,
        type: "Passenger",
      })),
      ...superfastTrains.map((train) => ({
        ...train,
        type: "Superfast",
      })),
    ];

    console.log(`Importing ${trains.length} trains...`);

    await Train.insertMany(trains);

    console.log("Train data imported successfully.");

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

importTrains();
