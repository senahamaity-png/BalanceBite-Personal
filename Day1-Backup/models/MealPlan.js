
const mongoose = require("mongoose");

const mealItemSchema = new mongoose.Schema(
  {
    food: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Food",
      required: true,
    },

    quantityGrams: {
      type: Number,
      required: true,
      min: 1,
    },

    // Nutrition snapshot calculated when the plan is saved
    nutrients: {
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbohydrates: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
      fiber: { type: Number, default: 0 },
      sugar: { type: Number, default: 0 },
      calcium: { type: Number, default: 0 },
      iron: { type: Number, default: 0 },
    },
  },
  { _id: true }
);

const plannedMealSchema = new mongoose.Schema(
  {
    dateKey: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    mealType: {
      type: String,
      enum: ["Breakfast", "Lunch", "Dinner", "Snacks"],
      required: true,
    },

    items: {
      type: [mealItemSchema],
      default: [],
    },
  },
  { _id: true }
);

const mealPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Monday of the selected week (YYYY-MM-DD)
    weekStart: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    meals: {
      type: [plannedMealSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// One weekly plan per user
mealPlanSchema.index(
  { user: 1, weekStart: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "MealPlan",
  mealPlanSchema
);
