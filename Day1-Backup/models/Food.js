const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      enum: [
        "Fruits",
        "Vegetables",
        "Grains",
        "Protein",
        "Dairy",
        "Nuts & Seeds",
        "Beverages",
        "Other",
      ],
    },

    description: {
      type: String,
      default: "",
    },

    servingSize: {
      type: String,
      default: "100g",
    },

    nutrients: {
      calories: {
        type: Number,
        default: 0,
      },

      protein: {
        type: Number,
        default: 0,
      },

      carbohydrates: {
        type: Number,
        default: 0,
      },

      fat: {
        type: Number,
        default: 0,
      },

      fiber: {
        type: Number,
        default: 0,
      },

      sugar: {
        type: Number,
        default: 0,
      },

      calcium: {
        type: Number,
        default: 0,
      },

      iron: {
        type: Number,
        default: 0,
      },
    },

    image: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Food", foodSchema);