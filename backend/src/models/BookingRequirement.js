const mongoose = require("mongoose");

const bookingRequirementSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },
    travelerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    staySegmentId: {
      type: String, // from staySegments[].id
    },
    itemId: {
      type: String, // from itinerary[].plan[].id
    },
    type: {
      type: String,
      enum: ["ACCOMMODATION", "TRANSPORT"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    location: {
      type: String,
    },
    vendorName: {
      type: String,
    },
    externalUrl: {
      type: String,
    },
    externalReferenceId: {
      type: String,
    },
    status: {
      type: String,
      enum: ["NOT_BOOKED", "PROCESSING", "ACTION_REQUIRED", "CONFIRMED", "CANCELLED"],
      default: "NOT_BOOKED",
    },
    notes: {
      type: String,
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        operatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Prevent duplicates: one accommodation booking per stay segment
bookingRequirementSchema.index({ tripId: 1, staySegmentId: 1, type: 1 }, { unique: true, partialFilterExpression: { type: "ACCOMMODATION" } });
// Prevent duplicates: one transport booking per item
bookingRequirementSchema.index({ tripId: 1, itemId: 1, type: 1 }, { unique: true, partialFilterExpression: { type: "TRANSPORT" } });

module.exports = mongoose.model("BookingRequirement", bookingRequirementSchema);
