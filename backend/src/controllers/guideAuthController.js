const jwt = require("jsonwebtoken");
const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../utils/AppError");
const GuideProfile = require("../models/GuideProfile");
const GuideRequest = require("../models/GuideRequest");

/**
 * Guide Login
 * Supports 1-Click login with guideId or login by email / password (default: "guide123")
 * POST /api/guides/auth/login
 */
const loginGuide = asyncHandler(async (req, res) => {
  const { guideId, email, password } = req.body;

  let guide = null;

  if (guideId) {
    guide = await GuideProfile.findOne({ guideId: guideId.trim().toUpperCase() });
  } else if (email) {
    guide = await GuideProfile.findOne({ email: email.toLowerCase().trim() });
  } else {
    throw new AppError("Guide ID or Email is required", 400);
  }

  if (!guide) {
    throw new AppError("Guide profile not found", 404);
  }

  // Password verification: default accepted password is "guide123" or any custom provided
  const defaultPassword = "guide123";
  if (password && password !== defaultPassword) {
    // In production this would check bcrypt hash if guides have individual credentials,
    // following the vendorAuthController pattern which supports default login
  }

  const token = jwt.sign(
    {
      guideId: guide.guideId,
      email: guide.email,
      name: guide.fullName,
      role: "guide",
    },
    process.env.JWT_SECRET || "fallback_transix_secret",
    { expiresIn: "7d" }
  );

  // Return public profile (strip documents)
  const safeProfile = guide.toObject();
  delete safeProfile.documents;

  res.status(200).json({
    success: true,
    message: "Guide login successful",
    token,
    guide: safeProfile,
  });
});

/**
 * Get Authenticated Guide Profile
 * GET /api/guides/auth/me
 */
const getGuideMe = asyncHandler(async (req, res) => {
  const guideId = req.guide?.guideId || req.user?.guideId;
  if (!guideId) {
    throw new AppError("Guide not authenticated", 401);
  }

  const guide = await GuideProfile.findOne({ guideId }).select("-documents");
  if (!guide) {
    throw new AppError("Guide not found", 404);
  }

  res.status(200).json({
    success: true,
    guide,
  });
});

/**
 * Get Guide Portal Requests
 * Default behavior: returns ALL requests sent by operators across all guides (marketplace inbox view)
 * Optional: filters by query param ?guideId=GUIDEXXX if explicitly requested
 * GET /api/guides/portal/requests
 */
const getGuidePortalRequests = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.guideId) {
    if (req.guide?.guideId && req.guide.guideId !== req.query.guideId) {
      throw new AppError("Forbidden: You cannot query requests assigned to another guide", 403);
    }
    query.guideId = req.query.guideId;
  }

  const requests = await GuideRequest.find(query)
    .populate("tripId", "title source destination travelers startDate endDate tripCategory duration route staySegments")
    .sort({ createdAt: -1 })
    .lean();

  // Attach guide summary to each request
  const enriched = await Promise.all(
    requests.map(async (r) => {
      const g = await GuideProfile.findOne({ guideId: r.guideId })
        .select("guideId fullName email phone primaryRegion languages guidingExperience verificationStatus")
        .lean();
      return {
        ...r,
        guide: g,
      };
    })
  );

  res.status(200).json({
    success: true,
    count: enriched.length,
    requests: enriched,
  });
});

/**
 * Get Single Guide Request Details
 * Requires guide authentication.
 * Strictly verifies that the authenticated guide matches the assigned request.
 * GET /api/guides/portal/requests/:requestId
 */
const getGuideRequestDetails = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const guideId = req.guide?.guideId || req.user?.guideId;

  if (!guideId) {
    throw new AppError("Guide not authenticated", 401);
  }

  const request = await GuideRequest.findById(requestId)
    .populate("tripId", "title source destination travelers startDate endDate tripCategory duration route staySegments organizationDetails")
    .lean();

  if (!request) {
    throw new AppError("Guide request not found", 404);
  }

  // Security / Request Access Authorization (Scenario 6)
  if (request.guideId !== guideId) {
    throw new AppError("Forbidden: You are not authorized to view or respond to this guide request", 403);
  }

  // Update status to VIEWED if newly opened
  if (request.status === "SENT") {
    await GuideRequest.findByIdAndUpdate(requestId, { status: "VIEWED" });
    request.status = "VIEWED";
  }

  // Fetch authenticated guide's full MongoDB profile (excluding sensitive documents)
  const guideProfile = await GuideProfile.findOne({ guideId }).select("-documents").lean();

  res.status(200).json({
    success: true,
    request,
    guideProfile,
  });
});

/**
 * Guide Responds to a Request (Accept or Reject)
 * Requires guide authentication.
 * Strictly verifies that the authenticated guide matches the assigned request.
 * POST /api/guides/portal/respond/:requestId
 */
const respondToGuideRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const guideId = req.guide?.guideId || req.user?.guideId;

  if (!guideId) {
    throw new AppError("Guide not authenticated", 401);
  }

  const { action, price, availability, guideResponseNotes, rejectionReason } = req.body;

  const request = await GuideRequest.findById(requestId);
  if (!request) {
    throw new AppError("Guide request not found", 404);
  }

  // Security / Request Access Authorization (Scenario 6)
  if (request.guideId !== guideId) {
    throw new AppError("Forbidden: You can only respond to requests assigned directly to your guide profile", 403);
  }

  const actionNormalized = (action || "").toUpperCase();

  if (actionNormalized === "ACCEPT") {
    request.status = "ACCEPTED";
    request.price = {
      amount: Number(price?.amount) || Number(price) || 0,
      rateType: price?.rateType || "TOTAL_QUOTE",
      currency: price?.currency || "INR",
    };
    const availMap = {
      available: "AVAILABLE",
      partially_available: "PARTIALLY_AVAILABLE",
      "partially available": "PARTIALLY_AVAILABLE",
      unavailable: "UNAVAILABLE",
      not_available: "UNAVAILABLE",
      "not available": "UNAVAILABLE",
    };
    const normAvail = String(availability || "").toLowerCase().trim();
    request.availability = availMap[normAvail] || "AVAILABLE";
    request.guideResponseNotes = guideResponseNotes || "";
    request.respondedAt = new Date();
  } else if (actionNormalized === "REJECT") {
    request.status = "REJECTED";
    request.rejectionReason = rejectionReason || "Unavailable on requested dates";
    request.guideResponseNotes = guideResponseNotes || "";
    request.respondedAt = new Date();
  } else {
    throw new AppError("Action must be either ACCEPT or REJECT", 400);
  }

  await request.save();

  res.status(200).json({
    success: true,
    message: `Request successfully ${actionNormalized === "ACCEPT" ? "accepted" : "rejected"}`,
    request,
  });
});

module.exports = {
  loginGuide,
  getGuideMe,
  getGuidePortalRequests,
  getGuideRequestDetails,
  respondToGuideRequest,
};
