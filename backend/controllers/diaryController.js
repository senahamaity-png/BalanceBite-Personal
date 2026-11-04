
const Food = require("../models/Food");
const FoodLog = require("../models/FoodLog");

const nutrientFields = [
  "calories",
  "protein",
  "carbohydrates",
  "fat",
  "fiber",
  "sugar",
  "calcium",
  "iron",
];

function calculateNutrients(food, quantityGrams) {
  const multiplier = quantityGrams / 100;
  const totals = {};

  for (const field of nutrientFields) {
    const value = Number(food.nutrients?.[field] ?? 0);
    totals[field] = Number((value * multiplier).toFixed(2));
  }

  return totals;
}

// Add a food to the user's diary.
exports.addFoodToDiary = async (req, res) => {
  try {
    const { foodId, mealType, quantityGrams, dateKey } = req.body;

    if (!foodId || !mealType || !dateKey) {
      return res.status(400).json({
        success: false,
        message: "Food, meal type and date are required.",
      });
    }

    const quantity = Number(quantityGrams);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than zero.",
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return res.status(400).json({
        success: false,
        message: "Date must use YYYY-MM-DD format.",
      });
    }

    const validMeals = ["Breakfast", "Lunch", "Dinner", "Snacks"];

    if (!validMeals.includes(mealType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid meal type.",
      });
    }

    if (!/^[a-f\d]{24}$/i.test(foodId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid food ID.",
      });
    }

    const food = await Food.findOne({
      _id: foodId,
      isActive: true,
    });

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food not found.",
      });
    }

    const nutrients = calculateNutrients(food, quantity);

    const entry = await FoodLog.create({
      user: req.user._id,
      food: food._id,
      mealType,
      quantityGrams: quantity,
      dateKey,
      nutrients,
    });

    const populatedEntry = await FoodLog.findById(entry._id)
      .populate("food", "name category servingSize image nutrients");

    return res.status(201).json({
      success: true,
      message: "Food added to diary successfully.",
      entry: populatedEntry,
    });
  } catch (error) {
    console.error("Add diary food error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to add food to diary.",
    });
  }
};

// Get diary entries and nutrient totals for a selected date.
exports.getDailyDiary = async (req, res) => {
  try {
    const dateKey = req.query.date;

    if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return res.status(400).json({
        success: false,
        message: "Provide a date using YYYY-MM-DD format.",
      });
    }

    const entries = await FoodLog.find({
      user: req.user._id,
      dateKey,
    })
      .populate("food", "name category servingSize image")
      .sort({ createdAt: -1 });

    const totals = Object.fromEntries(
      nutrientFields.map((field) => [field, 0])
    );

    for (const entry of entries) {
      for (const field of nutrientFields) {
        totals[field] += Number(entry.nutrients?.[field] ?? 0);
      }
    }

    for (const field of nutrientFields) {
      totals[field] = Number(totals[field].toFixed(2));
    }

    return res.json({
      success: true,
      date: dateKey,
      entries,
      totals,
      entryCount: entries.length,
    });
  } catch (error) {
    console.error("Get diary error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to load food diary.",
    });
  }
};

// Delete only the logged-in user's own entry.
exports.deleteDiaryEntry = async (req, res) => {
  try {
    const entry = await FoodLog.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Diary entry not found.",
      });
    }

    return res.json({
      success: true,
      message: "Food removed from diary.",
    });
  } catch (error) {
    console.error("Delete diary entry error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to delete diary entry.",
    });
  }
};
