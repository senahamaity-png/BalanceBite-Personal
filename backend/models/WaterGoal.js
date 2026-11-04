const mongoose = require("mongoose");

const waterGoalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    dailyGoalMl: {
      type: Number,
      required: true,
      default: 2500,
      min: 500,
      max: 10000,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("WaterGoal", waterGoalSchema);