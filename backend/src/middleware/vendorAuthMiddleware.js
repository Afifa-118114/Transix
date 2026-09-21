const jwt = require("jsonwebtoken");

const vendorAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Vendor access denied. No authentication token provided.",
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Malformed authorization header.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.vendorId || decoded.role !== "vendor") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Not an authorized vendor token.",
      });
    }

    req.vendor = {
      vendorAccountId: decoded.vendorAccountId,
      vendorId: decoded.vendorId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired vendor token.",
    });
  }
};

module.exports = { vendorAuthMiddleware };
