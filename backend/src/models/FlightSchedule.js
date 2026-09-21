const mongoose = require("mongoose");

const flightScheduleSchema = new mongoose.Schema(
  {
    airline: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    flightNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    origin: {
      code: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        index: true,
      },
      name: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },
    },
    destination: {
      code: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        index: true,
      },
      name: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },
    },
    daysOfWeek: [
      {
        type: String,
        trim: true,
      },
    ],
    scheduledDepartureTime: {
      type: String,
      required: true,
      trim: true,
    },
    scheduledArrivalTime: {
      type: String,
      required: true,
      trim: true,
    },
    timezone: {
      type: String,
      trim: true,
    },
    validFrom: {
      type: Date,
      required: true,
      index: true,
    },
    validTo: {
      type: Date,
      required: true,
      index: true,
    },
    lastUpdated: {
      type: Date,
    },
    sourceDataset: {
      type: String,
      default: "Air-Clean.csv",
    },
    scheduleKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    rawData: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for performant search queries
flightScheduleSchema.index({
  "origin.name": 1,
  "destination.name": 1,
  validFrom: 1,
  validTo: 1,
});

flightScheduleSchema.index({
  "origin.code": 1,
  "destination.code": 1,
  validFrom: 1,
  validTo: 1,
});

flightScheduleSchema.index({
  airline: 1,
  flightNumber: 1,
});

module.exports = mongoose.model("FlightSchedule", flightScheduleSchema);
