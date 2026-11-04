
const mongoose = require("mongoose");

const foodLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    food: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Food",
      required: true,
    },

    mealType: {
      type: String,
      enum: ["Breakfast", "Lunch", "Dinner", "Snacks"],
      required: true,
    },

    quantityGrams: {
      type: Number,
      required: true,
      min: 1,
    },

    // The date selected by the user, in YYYY-MM-DD format.
    dateKey: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },

    // Nutrients calculated and saved when the food is logged.
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
  {
    timestamps: true,
  }
);

foodLogSchema.index({ user: 1, dateKey: 1 });

module.exports = mongoose.model("FoodLog", foodLogSchema);
