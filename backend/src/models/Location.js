const mongoose = require("mongoose");

const LocationSchema = new mongoose.Schema(
  {
    city: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    country: {
      type: String,
      default: "India",
      trim: true,
    },
    iso2: {
      type: String,
      default: "IN",
      trim: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    formerState: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Enforce unique City + State combination
LocationSchema.index({ city: 1, state: 1 }, { unique: true });

module.exports = mongoose.model("Location", LocationSchema, "locations");
