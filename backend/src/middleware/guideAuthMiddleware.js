const jwt = require("jsonwebtoken");

const guideAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Guide access denied. No authentication token provided.",
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Malformed authorization header.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_transix_secret");

    if (!decoded.guideId || decoded.role !== "guide") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Not an authorized guide token.",
      });
    }

    req.guide = {
      guideId: decoded.guideId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired guide token.",
    });
  }
};

const optionalGuideAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_transix_secret");
        if (decoded && decoded.guideId) {
          req.guide = decoded;
        }
      }
    }
  } catch (e) {
    // optional token, ignore error
  }
  next();
};

module.exports = { guideAuthMiddleware, optionalGuideAuth };
