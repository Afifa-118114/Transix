const mongoose = require("mongoose");

const tripMessageSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderName: {
      type: String,
      default: "",
    },
    senderRole: {
      type: String,
      default: "operator",
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipientName: {
      type: String,
      default: "",
    },
    recipientRole: {
      type: String,
      enum: ["traveler", "coordinator", "operator"],
      required: true,
    },
    subject: {
      type: String,
      trim: true,
      default: "",
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["SENT", "DELIVERED", "READ"],
      default: "SENT",
    },
  },
  {
    timestamps: true,
  }
);

// Index for chronological message retrieval per trip
tripMessageSchema.index({ tripId: 1, createdAt: 1 });
tripMessageSchema.index({ tripId: 1, recipientId: 1, readAt: 1 });

module.exports = mongoose.model("TripMessage", tripMessageSchema);
