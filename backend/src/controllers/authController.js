const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");

const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      companyName,
      phone,
      licenseNumber,
      city,
      operatorSpecialties,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    let finalRole = "traveler";
    if (role === "operator") {
      finalRole = "operator";
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      name,
      email,
      password: hashedPassword,
      role: finalRole,
    };

    if (finalRole === "operator") {
      userData.companyName = companyName || `${name} Travels`;
      userData.phone = phone || "";
      userData.licenseNumber = licenseNumber || "";
      userData.city = city || "";
      userData.operatorSpecialties = Array.isArray(operatorSpecialties) ? operatorSpecialties : [];
    }

    const user = await User.create(userData);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: user.companyName,
        phone: user.phone,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const loginUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // If operator role is explicitly requested or user role is undefined, assign cleanly
    if (role === "operator" && user.role !== "operator" && user.role !== "admin") {
      user.role = "operator";
      user.companyName = user.companyName || `${user.name} Travels`;
      await user.save();
    } else if (!user.role) {
      user.role = "traveler";
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: user.companyName || user.name,
        phone: user.phone || "",
        licenseNumber: user.licenseNumber || "",
        city: user.city || "",
        avatar: user.avatar || "",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

const googleAuth = async (req, res) => {
  try {
    const { credential, role } = req.body;

    console.log("\n--- [Google Auth Debug: Start] ---");
    console.log("[Google Auth Debug] Configured GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
    console.log(
      "[Google Auth Debug] Credential type:",
      typeof credential,
      "| Non-empty string:",
      Boolean(typeof credential === "string" && credential.trim().length > 0),
      "| JWT parts:",
      typeof credential === "string" ? credential.split(".").length : 0
    );

    if (!credential) {
      console.log("[Google Auth Debug] Rejecting: Credential missing.");
      return res.status(400).json({
        success: false,
        message: "Google credential is required",
      });
    }

    // Safely inspect unverified token metadata without logging any secrets or PII
    try {
      const unverified = jwt.decode(credential, { complete: true });
      if (unverified) {
        console.log("[Google Auth Debug] Token Header:", {
          alg: unverified.header?.alg,
          kid: unverified.header?.kid,
          typ: unverified.header?.typ,
        });
        console.log("[Google Auth Debug] Token Claims:", {
          iss: unverified.payload?.iss,
          aud: unverified.payload?.aud,
          exp: unverified.payload?.exp,
          currentTimeSeconds: Math.floor(Date.now() / 1000),
          isExpired: unverified.payload?.exp ? Math.floor(Date.now() / 1000) > unverified.payload.exp : "unknown",
          audienceMatchesConfigured: unverified.payload?.aud === process.env.GOOGLE_CLIENT_ID,
        });
      } else {
        console.log("[Google Auth Debug] Token could not be parsed as JWT (null).");
      }
    } catch (parseErr) {
      console.error("[Google Auth Debug] JWT parse error:", parseErr.message);
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      console.error("[Google Auth Debug] GOOGLE_CLIENT_ID is missing from environment.");
      return res.status(500).json({
        success: false,
        message: "Google client ID is not configured on the server",
      });
    }

    // Role security allowlist: only 'traveler' or 'operator' permitted from UI context.
    // Client is never permitted to request 'admin'.
    let requestedRole = "traveler";
    if (role === "operator") {
      requestedRole = "operator";
    }

    // Verify token with Google public keys
    const client = new OAuth2Client(googleClientId);
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });
      console.log("[Google Auth Debug] verifyIdToken SUCCESS! Google identity verified.");
    } catch (verifyErr) {
      console.error("[Google Auth Debug] Verification Error Name:", verifyErr.name);
      console.error("[Google Auth Debug] Verification Error Message:", verifyErr.message);
      console.log("--- [Google Auth Debug: End] ---\n");
      return res.status(401).json({
        success: false,
        message: "Google authentication failed: Invalid or expired token",
      });
    }
    console.log("--- [Google Auth Debug: End] ---\n");

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({
        success: false,
        message: "Invalid Google token payload",
      });
    }

    const { sub: googleId, email, email_verified, name, picture } = payload;

    if (!email_verified || !email) {
      return res.status(400).json({
        success: false,
        message: "Google email is not verified",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find existing user by googleId OR normalized email
    let user = await User.findOne({
      $or: [{ googleId }, { email: normalizedEmail }],
    });

    if (user) {
      // Link Google identity if user registered with email/password previously
      let updated = false;
      if (!user.googleId) {
        user.googleId = googleId;
        updated = true;
      }
      if (!user.avatar && picture) {
        user.avatar = picture;
        updated = true;
      }
      if (requestedRole === "operator" && user.role !== "operator" && user.role !== "admin") {
        user.role = "operator";
        user.companyName = user.companyName || `${user.name} Travels`;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    } else {
      // Create new user for first-time Google signin
      user = await User.create({
        name: name || normalizedEmail.split("@")[0] || "Transix Traveler",
        email: normalizedEmail,
        googleId,
        role: requestedRole,
        authProvider: "google",
        avatar: picture || "",
      });
    }

    // Generate canonical Transix JWT with user._id and user.role
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(200).json({
      success: true,
      message: "Google authentication successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || "",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error during Google authentication",
    });
  }
};

/**
 * Public/Traveler Directory of Registered Tour Operators
 * Allows travelers or platform admins to select an operator to manage their trip
 */
const getOperatorsDirectory = async (req, res) => {
  try {
    const operators = await User.find({ role: "operator" })
      .select("name email companyName phone licenseNumber city operatorSpecialties avatar createdAt")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: operators.length,
      operators: operators.map((op) => ({
        id: op._id,
        name: op.name,
        companyName: op.companyName || op.name,
        email: op.email,
        phone: op.phone || "",
        licenseNumber: op.licenseNumber || "",
        city: op.city || "Pan India",
        specialties: op.operatorSpecialties || [],
        avatar: op.avatar || "",
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch operator directory",
    });
  }
};

/**
 * Get current operator's business profile
 */
const getOperatorProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: user.companyName || user.name,
        phone: user.phone || "",
        licenseNumber: user.licenseNumber || "",
        city: user.city || "",
        operatorSpecialties: user.operatorSpecialties || [],
        avatar: user.avatar || "",
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update current operator's business profile
 */
const updateOperatorProfile = async (req, res) => {
  try {
    const { companyName, phone, licenseNumber, city, operatorSpecialties, name } = req.body;
    const user = await User.findById(req.user.id || req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (name) user.name = name;
    if (companyName) user.companyName = companyName;
    if (phone !== undefined) user.phone = phone;
    if (licenseNumber !== undefined) user.licenseNumber = licenseNumber;
    if (city !== undefined) user.city = city;
    if (Array.isArray(operatorSpecialties)) user.operatorSpecialties = operatorSpecialties;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Operator profile updated successfully",
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: user.companyName,
        phone: user.phone,
        licenseNumber: user.licenseNumber,
        city: user.city,
        operatorSpecialties: user.operatorSpecialties,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  googleAuth,
  getOperatorsDirectory,
  getOperatorProfile,
  updateOperatorProfile,
};

