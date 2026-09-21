const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
      enum: ["operator", "coordinator", "traveler", "vendor"],
      required: true,
    },
    category: {
      type: String,
      enum: ["TRAVELER", "VENDOR"],
      default: "TRAVELER",
      index: true,
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true,
    },
    tripTitle: {
      type: String,
      default: "",
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TripMessage",
      required: false,
      index: true,
    },
    vendorMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorRequestMessage",
      index: true,
    },
    vendorRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorRequest",
      index: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      index: true,
    },
    type: {
      type: String,
      enum: ["MESSAGE", "SYSTEM", "BOOKING", "VENDOR"],
      default: "MESSAGE",
    },
    title: {
      type: String,
      default: "",
    },
    previewText: {
      type: String,
      default: "",
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast user unread queries
notificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
