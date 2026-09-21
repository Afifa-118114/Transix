const mongoose = require("mongoose");

const GuideRequestSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true,
    },
    operatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    guideId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    tripType: {
      type: String,
      enum: ["Personal", "Campus"],
      default: "Personal",
    },

    // Snapshot of relevant trip details for the guide to evaluate
    tripSummary: {
      title: { type: String, trim: true },
      source: { type: String, trim: true },
      destination: { type: String, trim: true },
      startDate: { type: Date },
      endDate: { type: Date },
      duration: { type: String, trim: true },
      travelers: { type: Number, default: 1 },
      route: [{ type: String }],
      states: [{ type: String }],
    },

    // Traveler's requirement specifications
    requirement: {
      numberOfGuides: { type: String, default: "1" },
      genderPreference: {
        type: String,
        enum: ["Male", "Female", "Either"],
        default: "Either",
      },
      preferredLanguages: [{ type: String }],
      specialNotes: { type: String, default: "" },
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "SENT",
        "VIEWED",
        "ACCEPTED",
        "REJECTED",
        "OPERATOR_SELECTED",
        "CONFIRMED",
        "CANCELLED",
      ],
      default: "PENDING",
      index: true,
    },

    // Guide's quotation & response
    price: {
      amount: { type: Number, default: 0 },
      rateType: { type: String, default: "TOTAL_QUOTE" }, // e.g. "TOTAL_QUOTE", "PER_DAY"
      currency: { type: String, default: "INR" },
    },
    availability: {
      type: String,
      enum: ["AVAILABLE", "PARTIALLY_AVAILABLE", "UNAVAILABLE"],
      default: "AVAILABLE",
    },
    guideResponseNotes: {
      type: String,
      trim: true,
      default: "",
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },

    sentAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
    },
    selectedAt: {
      type: Date,
    },
    confirmedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Prevent duplicate active requests to the same guide for the same trip
GuideRequestSchema.index({ tripId: 1, guideId: 1 }, { unique: true });

module.exports = mongoose.model("GuideRequest", GuideRequestSchema, "guiderequests");
