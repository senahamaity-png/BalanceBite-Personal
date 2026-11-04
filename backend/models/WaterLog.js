const mongoose = require("mongoose");

const waterLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    amountMl: {
      type: Number,
      required: true,
      min: 1,
      max: 5000,
    },

    dateKey: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

waterLogSchema.index({ user: 1, dateKey: 1 });

module.exports = mongoose.model("WaterLog", waterLogSchema);