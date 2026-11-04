
const express = require("express");
const router = express.Router();

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const {
  getAdminDashboard,
  getAllUsers,
  updateUserRole,
} = require("../controllers/adminController");

// All routes below require Admin authentication
router.use(protect, adminOnly);

// GET dashboard statistics
router.get("/dashboard", getAdminDashboard);

// GET all users
router.get("/users", getAllUsers);

// Update a user's role
router.put("/users/:id/role", updateUserRole);

module.exports = router;
