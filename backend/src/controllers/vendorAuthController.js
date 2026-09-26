const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../utils/AppError");
const Vendor = require("../models/Vendor");
const VendorAccount = require("../models/VendorAccount");
const VendorRequest = require("../models/VendorRequest");

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);
};

/**
 * Vendor Login (Email/Password or Demo Vendor ID selection)
 */
const loginVendor = asyncHandler(async (req, res) => {
  const { email, password, vendorId } = req.body;

  let vendor = null;
  let account = null;

  if (vendorId) {
    // 1-Click Login / Direct Vendor Selection
    vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      throw new AppError("Vendor not found", 404);
    }
  } else if (email) {
    account = await VendorAccount.findOne({ email: email.toLowerCase().trim() });
    if (account) {
      vendor = await Vendor.findById(account.vendorId);
    } else {
      // Check if email belongs to a known vendor pattern or search by name prefix
      const vendors = await Vendor.find({ status: "CONNECTED" });
      const slug = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
      vendor = vendors.find((v) => generateSlug(v.name) === slug);
    }
  } else {
    throw new AppError("Email or Vendor ID is required", 400);
  }

  if (!vendor) {
    throw new AppError("Vendor not found or not connected", 404);
  }

  // Find or auto-initialize VendorAccount for this connected vendor
  if (!account) {
    account = await VendorAccount.findOne({ vendorId: vendor._id });
  }

  const defaultPassword = "vendor123";
  if (!account) {
    const slug = generateSlug(vendor.name);
    const vendorEmail = email && email.includes("@") ? email.toLowerCase().trim() : `${slug}@transix-fleet.in`;
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    account = await VendorAccount.create({
      vendorId: vendor._id,
      email: vendorEmail,
      password: hashedPassword,
      name: vendor.name,
    });
  }

  // If password was explicitly provided, verify
  if (password && password !== defaultPassword) {
    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      throw new AppError("Invalid credentials", 401);
    }
  }

  const token = jwt.sign(
    {
      vendorAccountId: account._id,
      vendorId: vendor._id,
      email: account.email,
      role: "vendor",
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.status(200).json({
    success: true,
    message: "Vendor login successful",
    token,
    vendor: {
      id: vendor._id,
      name: vendor.name,
      email: account.email,
      status: vendor.status,
      fleet: vendor.fleet || [],
      capabilities: vendor.capabilities || {},
      serviceStates: vendor.serviceStates || [],
    },
  });
});

/**
 * Get authenticated vendor profile
 */
const getVendorMe = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.vendor.vendorId);
  if (!vendor) {
    throw new AppError("Vendor not found", 404);
  }

  res.status(200).json({
    success: true,
    vendor: {
      id: vendor._id,
      name: vendor.name,
      status: vendor.status,
      fleet: vendor.fleet || [],
      capabilities: vendor.capabilities || {},
      serviceStates: vendor.serviceStates || [],
    },
  });
});

/**
 * Search canonical connected vendors (for Search Vendors feature)
 */
const searchConnectedVendors = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const filter = { status: "CONNECTED" };

  if (q && q.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.name = { $regex: escaped, $options: "i" };
  }

  const vendors = await Vendor.find(filter)
    .select("name status source serviceStates fleet capabilities")
    .limit(50)
    .sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: vendors.length,
    vendors,
  });
});

/**
 * Get vendors that currently have active/pending requests
 * (Strict requirement: DO NOT display all 100 vendors on dashboard, only vendors with requests)
 */
const getVendorsWithActiveRequests = asyncHandler(async (req, res) => {
  // Aggregate vendor requests to get distinct vendors and their latest request info
  const activeRequests = await VendorRequest.find({
    status: { $in: ["SENT", "VIEWED", "ACCEPTED", "RESPONDED", "AWAITING_OPERATOR_REVIEW", "SELECTED", "CONFIRMATION_REQUESTED", "CONFIRMED"] },
  })
    .populate("vendorId", "name status fleet capabilities")
    .populate("tripId", "source destination travelers startDate endDate tripCategory")
    .sort({ createdAt: -1 });

  const vendorMap = new Map();

  for (const reqItem of activeRequests) {
    if (!reqItem.vendorId) continue;
    const vId = reqItem.vendorId._id.toString();

    if (!vendorMap.has(vId)) {
      vendorMap.set(vId, {
        vendorId: reqItem.vendorId._id,
        name: reqItem.vendorId.name,
        fleet: reqItem.vendorId.fleet,
        totalRequests: 0,
        newRequestsCount: 0,
        latestRequest: {
          requestId: reqItem._id,
          tripId: reqItem.tripId?._id,
          originCity: reqItem.route?.originCity || reqItem.tripId?.source || reqItem.requestSnapshot?.originCity,
          originState: reqItem.route?.originState || reqItem.requestSnapshot?.originState,
          destinationCity: reqItem.route?.destinationCity || reqItem.tripId?.destination || reqItem.requestSnapshot?.destinationCity,
          destinationState: reqItem.route?.destinationState || reqItem.requestSnapshot?.destinationState,
          travelers: reqItem.travelers?.total || reqItem.tripId?.travelers || reqItem.requestSnapshot?.totalTravelers || 0,
          vehicleSummary: `${reqItem.fleetRequirement?.vehicleCount || reqItem.requestSnapshot?.vehiclesRequired || 1} × ${reqItem.fleetRequirement?.vehicleCategory || reqItem.requestSnapshot?.vehicleType || "Coach"}`,
          status: reqItem.status,
          requestedAt: reqItem.requestedAt || reqItem.createdAt,
        },
      });
    }

    const entry = vendorMap.get(vId);
    entry.totalRequests += 1;
    if (reqItem.status === "SENT" || reqItem.status === "VIEWED") {
      entry.newRequestsCount += 1;
    }
  }

  const vendors = Array.from(vendorMap.values());

  res.status(200).json({
    success: true,
    count: vendors.length,
    vendors,
  });
});

module.exports = {
  loginVendor,
  getVendorMe,
  searchConnectedVendors,
  getVendorsWithActiveRequests,
};
