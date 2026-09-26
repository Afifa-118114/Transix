const mongoose = require("mongoose");

const FleetItemSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true,
    },
    capacity: {
      type: Number,
      required: true,
    },
    ac: {
      type: Boolean,
      required: true,
    },
    comfort: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const CapabilitiesSchema = new mongoose.Schema(
  {
    intercity: {
      type: Boolean,
      default: false,
    },
    multiDay: {
      type: Boolean,
      default: false,
    },
    groupTransport: {
      type: Boolean,
      default: false,
    },
    driverIncluded: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const VendorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      default: "CONNECTED",
      trim: true,
    },
    source: {
      type: String,
      default: "DEMO_ONBOARDED_VENDOR",
      trim: true,
    },
    serviceStates: [
      {
        type: String,
        trim: true,
      },
    ],
    fleet: [FleetItemSchema],
    capabilities: CapabilitiesSchema,
  },
  { timestamps: true }
);

VendorSchema.index({ serviceStates: 1 });

module.exports = mongoose.model("Vendor", VendorSchema, "vendors");
