
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verify user token
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token required",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token missing",
      });
    }

    const secret = process.env.JWT_SECRET;

if (!secret) {
  console.error("JWT_SECRET is missing");

  return res.status(500).json({
    success: false,
    message: "Server authentication configuration error",
  });
}

console.log("JWT DEBUG:", {
  tokenPresent: Boolean(token),
  tokenParts: token.split(".").length,
  secretLoaded: Boolean(secret),
  secretLength: secret.length,
});

const decoded = jwt.verify(token, secret);

    // Get latest user information from database
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = user;
    next();

  } catch (error) {
    console.error("AUTH ERROR:", {
  name: error.name,
  message: error.message,
});

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// Allow only admin users
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Please login first",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin permission required.",
    });
  }

  next();
};

module.exports = {
  protect,
  adminOnly,
};
