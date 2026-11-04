
const NutritionGoal = require("../models/NutritionGoal");

const DEFAULT_GOALS = {
  calories: 2000,
  protein: 50,
  carbohydrates: 275,
  fat: 65,
  fiber: 28,
};

// Get the current user's nutrition goals
exports.getNutritionGoals = async (req, res) => {
  try {
    let goals = await NutritionGoal.findOne({
      user: req.user._id,
    });

    if (!goals) {
      goals = await NutritionGoal.create({
        user: req.user._id,
        ...DEFAULT_GOALS,
      });
    }

    res.status(200).json({
      success: true,
      goals,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch nutrition goals",
    });
  }
};

// Update the current user's nutrition goals
exports.updateNutritionGoals = async (req, res) => {
  try {
    const fields = [
      "calories",
      "protein",
      "carbohydrates",
      "fat",
      "fiber",
    ];

    const updates = {};

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        const value = req.body[field];

        if (
          typeof value !== "number" ||
          !Number.isFinite(value) ||
          value < 0
        ) {
          return res.status(400).json({
            success: false,
            message: `${field} must be a non-negative number`,
          });
        }

        updates[field] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one nutrition goal",
      });
    }

    const goals = await NutritionGoal.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: updates,
        $setOnInsert: { user: req.user._id },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Nutrition goals updated successfully",
      goals,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update nutrition goals",
    });
  }
};
