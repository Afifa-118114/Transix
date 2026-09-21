const mongoose = require("mongoose");

const VendorRequestMessageSchema = new mongoose.Schema(
  {
    vendorRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorRequest",
      required: true,
      index: true,
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    senderRole: {
      type: String,
      enum: ["operator", "vendor"],
      required: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
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
  },
  { timestamps: true }
);

VendorRequestMessageSchema.index({ vendorRequestId: 1, createdAt: 1 });

module.exports = mongoose.model("VendorRequestMessage", VendorRequestMessageSchema, "vendorrequestmessages");
