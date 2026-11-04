
const adminOnly = (req, res, next) => {
  try {
    // Check whether user is logged in
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    // Check whether logged-in user is an admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin permission required.",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Admin authorization failed.",
    });
  }
};

module.exports = adminOnly;
