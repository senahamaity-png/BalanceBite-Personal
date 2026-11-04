const mongoose = require("mongoose");

const pendingActionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    food: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Food",
      required: true,
    },

    foodName: {
      type: String,
      required: true,
      trim: true,
    },

    quantityGrams: {
      type: Number,
      required: true,
      min: 1,
    },

    mealType: {
      type: String,
      enum: ["Breakfast", "Lunch", "Dinner", "Snacks"],
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "processing", "confirmed", "cancelled"],
      default: "pending",
      required: true,
      index: true,
    },

    confirmedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Helps find a user's active pending actions.
pendingActionSchema.index({
  user: 1,
  status: 1,
  expiresAt: 1,
});

module.exports = mongoose.model("PendingAction", pendingActionSchema);