
const express = require("express");

const {
  getFoods,
  getFoodById,
  createFood,
  updateFood,
  deleteFood,
} = require("../controllers/foodController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Public: Get all active foods
router.get("/", getFoods);

// Public: Get single food
router.get("/:id", getFoodById);

// Admin only: Create food
router.post("/", protect, adminOnly, createFood);

// Admin only: Update food
router.put("/:id", protect, adminOnly, updateFood);

// Admin only: Delete food (soft delete)
router.delete("/:id", protect, adminOnly, deleteFood);

module.exports = router;
