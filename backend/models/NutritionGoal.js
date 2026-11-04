
const mongoose = require("mongoose");

const nutritionGoalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    calories: {
      type: Number,
      default: 2000,
      min: 0,
    },

    protein: {
      type: Number,
      default: 50,
      min: 0,
    },

    carbohydrates: {
      type: Number,
      default: 275,
      min: 0,
    },

    fat: {
      type: Number,
      default: 65,
      min: 0,
    },

    fiber: {
      type: Number,
      default: 28,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "NutritionGoal",
  nutritionGoalSchema
);
