const mongoose = require("mongoose");

const weightLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    weightKg: {
      type: Number,
      required: true,
      min: 2,
      max: 500,
    },

    dateKey: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    note: {
      type: String,
      trim: true,
      maxlength: 250,
      default: "",
    },
  },
  { timestamps: true }
);

// One weight record per user per date.
weightLogSchema.index(
  { user: 1, dateKey: 1 },
  { unique: true }
);

module.exports = mongoose.model("WeightLog", weightLogSchema);