
const mongoose = require("mongoose");
const User = require("../models/User");
const Food = require("../models/Food");
const FoodLog = require("../models/FoodLog");

// GET /api/admin/dashboard
const getAdminDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      totalFoods,
      totalDiaryLogs,
      recentUsers,
      totalAdmins,
    ] = await Promise.all([
      User.countDocuments(),
      Food.countDocuments({ isActive: true }),
      FoodLog.countDocuments(),
      User.find()
        .select("name email role createdAt")
        .sort({ createdAt: -1 })
        .limit(5),
      User.countDocuments({ role: "admin" }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Admin dashboard data fetched successfully",
      stats: {
        totalUsers,
        totalFoods,
        totalDiaryLogs,
        totalAdmins,
      },
      recentUsers,
    });
  } catch (error) {
    console.error("Admin Dashboard Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin dashboard data",
    });
  }
};

// GET /api/admin/users
const getAllUsers = async (req, res) => {
  try {
    const { search, role } = req.query;

    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (role && ["user", "admin"].includes(role)) {
      filter.role = role;
    }

    const users = await User.find(filter)
      .select("name email role createdAt")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get all users error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

// PUT /api/admin/users/:id/role
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be either user or admin",
      });
    }

    // Prevent an admin from changing their own role
    if (id === req.user.id || id === req.user._id?.toString()) {
      return res.status(403).json({
        success: false,
        message: "You cannot change your own role",
      });
    }

    const targetUser = await User.findById(id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent removing the last administrator
    if (targetUser.role === "admin" && role === "user") {
      const adminCount = await User.countDocuments({
        role: "admin",
      });

      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: "At least one administrator must remain",
        });
      }
    }

    targetUser.role = role;
    await targetUser.save();

    return res.status(200).json({
      success: true,
      message: "User role updated successfully",
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
    });
  } catch (error) {
    console.error("Update user role error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update user role",
    });
  }
};

module.exports = {
  getAdminDashboard,
  getAllUsers,
  updateUserRole,
};
