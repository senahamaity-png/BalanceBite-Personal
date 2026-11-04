
const Food = require("../models/Food");
const mongoose = require("mongoose");

// GET ALL FOODS
const getFoods = async (req, res) => {
  try {
    const { search, category } = req.query;

    const filter = { isActive: true };

    if (search) {
      filter.name = {
        $regex: search,
        $options: "i",
      };
    }

    if (category) {
      filter.category = category;
    }

    const foods = await Food.find(filter).sort({
      name: 1,
    });

    res.json({
      success: true,
      count: foods.length,
      foods,
    });
  } catch (error) {
    console.error("Get foods error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch foods",
    });
  }
};

// GET SINGLE FOOD
const getFoodById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid food ID",
      });
    }

    const food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food not found",
      });
    }

    res.json({
      success: true,
      food,
    });
  } catch (error) {
    console.error("Get food by ID error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch food",
    });
  }
};

// CREATE FOOD - ADMIN ONLY
const createFood = async (req, res) => {
  try {
    const food = await Food.create(req.body);

    res.status(201).json({
      success: true,
      message: "Food created successfully",
      food,
    });
  } catch (error) {
    console.error("Create food error:", error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE FOOD - ADMIN ONLY
const updateFood = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid food ID",
      });
    }

    const food = await Food.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food not found",
      });
    }

    res.json({
      success: true,
      message: "Food updated successfully",
      food,
    });
  } catch (error) {
    console.error("Update food error:", error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE FOOD - ADMIN ONLY (SOFT DELETE)
const deleteFood = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid food ID",
      });
    }

    const food = await Food.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food not found",
      });
    }

    res.json({
      success: true,
      message: "Food deleted successfully",
    });
  } catch (error) {
    console.error("Delete food error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete food",
    });
  }
};

module.exports = {
  getFoods,
  getFoodById,
  createFood,
  updateFood,
  deleteFood,
};
