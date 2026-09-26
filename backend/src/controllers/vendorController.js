const crypto = require("crypto");
const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../utils/AppError");
const Vendor = require("../models/Vendor");
const VendorRequest = require("../models/VendorRequest");
const VendorRequestMessage = require("../models/VendorRequestMessage");
const BookingRequirement = require("../models/BookingRequirement");
const User = require("../models/User");
const Notification = require("../models/Notification");

/**
 * Get vendor requests for the authenticated vendor only.
 * Isolated server-side: vendorId is ALWAYS derived from req.vendor.vendorId.
 */
const getVendorPortalRequests = asyncHandler(async (req, res) => {
  const vendorId = req.vendor.vendorId;
  const { status } = req.query;

  const query = { vendorId };
  if (status) {
    query.status = status;
  }

  const requests = await VendorRequest.find(query)
    .populate("vendorId", "name status fleet capabilities serviceStates")
    .populate("tripId", "source destination startDate endDate tripCategory organizationDetails travelers")
    .sort({ createdAt: -1 });

  // Counts specific to THIS vendor only
  const newRequestsCount = requests.filter((r) => r.status === "SENT" || r.status === "VIEWED").length;
  const awaitingResponseCount = requests.filter((r) => ["SENT", "VIEWED", "ACCEPTED"].includes(r.status)).length;
  const responsesSubmittedCount = requests.filter((r) => ["RESPONDED", "SELECTED", "CONFIRMATION_REQUESTED"].includes(r.status)).length;
  const confirmedWorkCount = requests.filter((r) => r.status === "CONFIRMED").length;

  res.status(200).json({
    success: true,
    count: requests.length,
    stats: {
      newRequests: newRequestsCount,
      awaitingResponse: awaitingResponseCount,
      responsesSubmitted: responsesSubmittedCount,
      confirmedWork: confirmedWorkCount,
    },
    requests,
  });
});

/**
 * Get single vendor request details with strict ownership verification.
 */
const getVendorRequestDetails = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const vendorId = req.vendor.vendorId;

  const request = await VendorRequest.findById(requestId)
    .populate("vendorId", "name status fleet capabilities serviceStates")
    .populate("tripId", "source destination startDate endDate tripCategory organizationDetails travelers");

  if (!request) {
    throw new AppError("Vendor request not found", 404);
  }

  // Security / Isolation Enforcement
  if (request.vendorId._id.toString() !== vendorId.toString()) {
    throw new AppError("Forbidden: You are not authorized to view this vendor request", 403);
  }

  // Mark as VIEWED if newly opened
  if (request.status === "SENT") {
    request.status = "VIEWED";
    await request.save();
  }

  res.status(200).json({
    success: true,
    request,
  });
});

/**
 * Vendor rejects request with structured reason and message.
 */
const rejectVendorRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const vendorId = req.vendor.vendorId;
  const { rejectionReason, rejectionMessage } = req.body;

  const allowedReasons = [
    "No vehicles available",
    "Route not covered",
    "Schedule conflict",
    "Capacity unavailable",
    "Other",
  ];

  if (!rejectionReason || !allowedReasons.includes(rejectionReason)) {
    throw new AppError(`rejectionReason must be one of: ${allowedReasons.join(", ")}`, 400);
  }

  const request = await VendorRequest.findById(requestId);
  if (!request) {
    throw new AppError("Vendor request not found", 404);
  }

  if (request.vendorId.toString() !== vendorId.toString()) {
    throw new AppError("Forbidden: You are not authorized to reject this request", 403);
  }

  if (request.status === "CONFIRMED" || request.status === "CANCELLED") {
    throw new AppError(`Cannot reject a ${request.status} request`, 400);
  }

  const now = new Date();
  request.status = "REJECTED";
  request.respondedAt = now;
  request.response = {
    availability: "UNAVAILABLE",
    rejectionReason,
    rejectionMessage: rejectionMessage ? String(rejectionMessage).trim() : "",
    vehicles: [],
    quotation: {
      baseAmount: 0,
      additionalCharges: 0,
      totalAmount: 0,
      currency: "INR",
    },
    notes: rejectionMessage || rejectionReason,
    respondedAt: now,
  };

  await request.save();

  res.status(200).json({
    success: true,
    message: "Request rejected successfully",
    request,
  });
});

/**
 * Vendor accepts request: indicates intent to provide quote
 */
const acceptVendorRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const vendorId = req.vendor.vendorId;

  const request = await VendorRequest.findById(requestId);
  if (!request) {
    throw new AppError("Vendor request not found", 404);
  }

  if (request.vendorId.toString() !== vendorId.toString()) {
    throw new AppError("Forbidden: You are not authorized to accept this request", 403);
  }

  if (["CONFIRMED", "CANCELLED", "REJECTED"].includes(request.status)) {
    throw new AppError(`Cannot accept a ${request.status} request`, 400);
  }

  request.status = "ACCEPTED";
  await request.save();

  res.status(200).json({
    success: true,
    message: "Request accepted. You may now submit vehicle allocation and quotation.",
    request,
  });
});

/**
 * Vendor submits availability, vehicle allocation, and quotation.
 * BACKEND VALIDATION: strictly validates submitted vehicle configurations against
 * the authenticated vendor's master fleet in MongoDB.
 */
const submitVendorResponse = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const vendorId = req.vendor.vendorId;
  const {
    vehicles, // [{ category, count, seatsPerVehicle }]
    quotation, // { baseAmount, additionalCharges, totalAmount, currency }
    driverIncluded = true,
    notes = "",
  } = req.body;

  const request = await VendorRequest.findById(requestId);
  if (!request) {
    throw new AppError("Vendor request not found", 404);
  }

  // Security / Isolation Verification
  if (request.vendorId.toString() !== vendorId.toString()) {
    throw new AppError("Forbidden: You cannot submit response for another vendor's request", 403);
  }

  if (["CANCELLED", "CONFIRMED"].includes(request.status)) {
    throw new AppError(`Cannot submit response for a ${request.status} request`, 400);
  }

  // Fetch authenticated vendor to validate master fleet
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    throw new AppError("Vendor profile not found", 404);
  }

  if (!Array.isArray(vehicles) || vehicles.length === 0) {
    throw new AppError("Please provide at least one allocated vehicle specification", 400);
  }

  // Validate each vehicle against vendor's actual master fleet
  const masterFleet = vendor.fleet || [];
  const validatedVehicles = [];
  let totalAllocatedCapacity = 0;
  let totalAllocatedVehicles = 0;

  for (const v of vehicles) {
    const count = Number(v.count);
    const seats = Number(v.seatsPerVehicle);
    const category = String(v.category || "").trim();

    if (count <= 0 || isNaN(count)) {
      throw new AppError("Vehicle count must be greater than 0", 400);
    }
    if (seats <= 0 || isNaN(seats)) {
      throw new AppError("Seats per vehicle must be greater than 0", 400);
    }

    // Verify vendor's master fleet supports this category and capacity
    const matchingMasterItem = masterFleet.find((m) => {
      const catMatches =
        m.category.toLowerCase().replace(/[^a-z0-9]/g, "") ===
        category.toLowerCase().replace(/[^a-z0-9]/g, "") ||
        m.category.toLowerCase().includes(category.toLowerCase()) ||
        category.toLowerCase().includes(m.category.toLowerCase());

      // Allow nominal seat match (within reasonable fleet bracket: +/- 5 seats)
      const seatMatches = Math.abs(Number(m.capacity) - seats) <= 5;
      return catMatches && seatMatches;
    });

    if (!matchingMasterItem) {
      throw new AppError(
        `Invalid vehicle allocation: ${vendor.name} master fleet does not contain '${category}' with ~${seats} seats. Available fleet: ${masterFleet.map((f) => `${f.category} (${f.capacity} seats)`).join(", ")}`,
        400
      );
    }

    const totalCapacity = count * seats;
    totalAllocatedCapacity += totalCapacity;
    totalAllocatedVehicles += count;

    validatedVehicles.push({
      category: matchingMasterItem.category,
      count,
      seatsPerVehicle: matchingMasterItem.capacity,
      totalCapacity,
    });
  }

  // Validate Quotation
  const baseAmount = Number(quotation?.baseAmount) || 0;
  const additionalCharges = Number(quotation?.additionalCharges) || 0;
  const calculatedTotal = baseAmount + additionalCharges;
  const providedTotal = Number(quotation?.totalAmount) || calculatedTotal;

  if (baseAmount <= 0) {
    throw new AppError("Base quotation amount must be greater than 0", 400);
  }

  const requiredCapacity = request.fleetRequirement?.totalCapacityRequired || request.travelers?.total || 20;
  const availability = totalAllocatedCapacity >= requiredCapacity ? "AVAILABLE" : "PARTIALLY_AVAILABLE";
  const now = new Date();

  request.response = {
    availability,
    vehicles: validatedVehicles,
    quotation: {
      baseAmount,
      additionalCharges,
      totalAmount: providedTotal > 0 ? providedTotal : calculatedTotal,
      currency: quotation?.currency || "INR",
    },
    driverIncluded: Boolean(driverIncluded),
    notes: String(notes || "").trim(),
    respondedAt: now,
    // Backwards-compat fields
    vehiclesAvailable: totalAllocatedVehicles,
    quote: providedTotal > 0 ? providedTotal : calculatedTotal,
    quoteCurrency: quotation?.currency || "INR",
  };

  request.status = "RESPONDED";
  request.respondedAt = now;

  await request.save();

  // Notify operators of vendor quotation / availability
  try {
    const operators = await User.find({ role: "operator" });
    const formattedAmount = (providedTotal > 0 ? providedTotal : calculatedTotal).toLocaleString("en-IN");
    for (const op of operators) {
      await Notification.create({
        recipientId: op._id,
        senderId: op._id,
        senderName: vendor.name,
        senderRole: "vendor",
        tripId: request.tripId,
        vendorRequestId: request._id,
        vendorId: vendor._id,
        category: "VENDOR",
        type: "VENDOR",
        title: `${vendor.name} submitted quotation`,
        previewText: availability === "AVAILABLE"
          ? `Quotation submitted for group fleet: ₹${formattedAmount}. Availability confirmed.`
          : `Quotation submitted: ₹${formattedAmount} (${availability.replace("_", " ")}).`,
        read: false,
      });
    }
  } catch (notifErr) {
    console.error("Failed to create vendor response notification:", notifErr);
  }

  res.status(200).json({
    success: true,
    message: `Quotation and vehicle allocation submitted successfully (${availability})`,
    request,
  });
});

/**
 * Vendor confirms or declines a booking that has been requested for confirmation.
 */
const confirmVendorRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const vendorId = req.vendor.vendorId;
  const { action } = req.body; // "CONFIRM" or "DECLINE"

  if (!["CONFIRM", "DECLINE"].includes(action)) {
    throw new AppError("Invalid action. Must be CONFIRM or DECLINE", 400);
  }

  const request = await VendorRequest.findById(requestId).populate("vendorId", "name");
  if (!request) {
    throw new AppError("Vendor request not found", 404);
  }

  if (request.vendorId._id.toString() !== vendorId.toString()) {
    throw new AppError("Forbidden: You cannot confirm/decline another vendor's request", 403);
  }

  if (request.status !== "CONFIRMATION_REQUESTED" && request.status !== "SELECTED") {
    throw new AppError(
      `Cannot confirm request in '${request.status}' state. Confirmation must be requested first.`,
      400
    );
  }

  if (action === "CONFIRM") {
    const shortHex = crypto.randomBytes(3).toString("hex").toUpperCase();
    const confirmationReference = `TX-FLT-${shortHex}`;

    request.status = "CONFIRMED";
    request.confirmation = {
      status: "CONFIRMED",
      confirmationReference,
      confirmedAt: new Date(),
    };
    await request.save();

    res.status(200).json({
      success: true,
      message: `Group fleet booking confirmed with reference ${confirmationReference}`,
      confirmationReference,
      request,
    });
  } else {
    request.status = "DECLINED";
    request.confirmation = {
      status: "DECLINED",
      confirmedAt: new Date(),
    };
    await request.save();

    res.status(200).json({
      success: true,
      message: "Confirmation request declined by vendor",
      request,
    });
  }
});

/**
 * Get messages for a specific vendor request (Vendor access)
 */
const getVendorRequestMessages = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const vendorId = req.vendor.vendorId;

  const request = await VendorRequest.findById(requestId);
  if (!request) {
    throw new AppError("Vendor request not found", 404);
  }

  if (request.vendorId.toString() !== vendorId.toString()) {
    throw new AppError("Forbidden: You cannot view messages for another vendor's request", 403);
  }

  const messages = await VendorRequestMessage.find({ vendorRequestId: requestId }).sort({ createdAt: 1 });

  res.status(200).json({
    success: true,
    count: messages.length,
    messages,
  });
});

/**
 * Send a message for a specific vendor request (Vendor perspective)
 */
const sendVendorRequestMessage = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const vendorId = req.vendor.vendorId;
  const { message } = req.body;

  if (!message || !message.trim()) {
    throw new AppError("Message content cannot be empty", 400);
  }

  const request = await VendorRequest.findById(requestId).populate("vendorId", "name");
  if (!request) {
    throw new AppError("Vendor request not found", 404);
  }

  if (request.vendorId._id.toString() !== vendorId.toString()) {
    throw new AppError("Forbidden: You cannot message on another vendor's request", 403);
  }

  const newMsg = await VendorRequestMessage.create({
    vendorRequestId: requestId,
    tripId: request.tripId,
    vendorId: request.vendorId._id,
    senderRole: "vendor",
    senderName: request.vendorId?.name || "Vendor",
    message: message.trim(),
  });

  // Notify operators of new vendor message
  try {
    const operators = await User.find({ role: "operator" });
    for (const op of operators) {
      await Notification.create({
        recipientId: op._id,
        senderId: op._id,
        senderName: request.vendorId?.name || "Vendor",
        senderRole: "vendor",
        tripId: request.tripId,
        vendorRequestId: request._id,
        vendorId: request.vendorId._id,
        vendorMessageId: newMsg._id,
        category: "VENDOR",
        type: "MESSAGE",
        title: `New message from ${request.vendorId?.name || "Vendor"}`,
        previewText: message.trim().slice(0, 120),
        read: false,
      });
    }
  } catch (notifErr) {
    console.error("Failed to create vendor message notification:", notifErr);
  }

  res.status(201).json({
    success: true,
    message: newMsg,
  });
});

module.exports = {
  getVendorPortalRequests,
  getVendorRequestDetails,
  rejectVendorRequest,
  acceptVendorRequest,
  submitVendorResponse,
  confirmVendorRequest,
  getVendorRequestMessages,
  sendVendorRequestMessage,
};
