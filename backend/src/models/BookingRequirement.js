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
      enum: ["ACCOMMODATION", "TRANSPORT", "ACTIVITY", "VISIT", "PERMISSION"],
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
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
    },
    externalUrl: {
      type: String,
    },
    externalReferenceId: {
      type: String,
    },
    status: {
      type: String,
      enum: ["NOT_BOOKED", "PROCESSING", "ACTION_REQUIRED", "CONFIRMED", "CANCELLED", "PENDING"],
      default: "NOT_BOOKED",
    },
    notes: {
      type: String,
    },
    transportDetails: {
      mode: { type: String, default: "BUS" },
      requirementType: {
        type: String,
        enum: ["LOCAL_TRANSPORT", "OUTSTATION_TRANSPORT", "GROUP_TRANSPORT"],
        default: "LOCAL_TRANSPORT",
      },
      arrangement: {
        type: String,
        enum: ["TRANSIX_COORDINATED", "TRAVELER_ARRANGED"],
        default: "TRANSIX_COORDINATED",
      },
      from: String,
      to: String,
      date: String,
      requiredDepartureTime: String,
      pickupTime: String,
      requiredArrivalTime: String,
      travelers: Number,
      preferences: {
        vehicleType: String,
        comfort: String,
        seatCount: Number,
        luggageCount: Number,
        notes: String,
      },
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
// Prevent duplicates: one booking per item
bookingRequirementSchema.index({ tripId: 1, itemId: 1, type: 1 }, { unique: true, partialFilterExpression: { itemId: { $exists: true } } });

// General operator retrieval indexes
bookingRequirementSchema.index({ tripId: 1 });
bookingRequirementSchema.index({ tripId: 1, type: 1 });
bookingRequirementSchema.index({ tripId: 1, status: 1 });

module.exports = mongoose.model("BookingRequirement", bookingRequirementSchema);
