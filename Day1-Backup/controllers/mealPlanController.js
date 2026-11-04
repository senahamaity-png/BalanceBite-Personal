
const mongoose = require("mongoose");
const MealPlan = require("../models/MealPlan");
const Food = require("../models/Food");

// Validate YYYY-MM-DD dates
const isValidDateKey = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

// Get Monday of a date's week (UTC)
const getMonday = (dateKey) => {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  const day = date.getUTCDay();
  const difference = day === 0 ? -6 : 1 - day;

  date.setUTCDate(date.getUTCDate() + difference);

  return date.toISOString().slice(0, 10);
};

// Calculate nutrients from Food values per 100g
const calculateNutrients = (food, quantityGrams) => {
  const nutrients = food.nutrients || {};
  const factor = quantityGrams / 100;

  return {
    calories: Number(((nutrients.calories || 0) * factor).toFixed(2)),
    protein: Number(((nutrients.protein || 0) * factor).toFixed(2)),
    carbohydrates: Number(((nutrients.carbohydrates || 0) * factor).toFixed(2)),
    fat: Number(((nutrients.fat || 0) * factor).toFixed(2)),
    fiber: Number(((nutrients.fiber || 0) * factor).toFixed(2)),
    sugar: Number(((nutrients.sugar || 0) * factor).toFixed(2)),
    calcium: Number(((nutrients.calcium || 0) * factor).toFixed(2)),
    iron: Number(((nutrients.iron || 0) * factor).toFixed(2)),
  };
};

// Find or create the user's weekly plan
const getOrCreatePlan = async (userId, weekStart) => {
  let plan = await MealPlan.findOne({
    user: userId,
    weekStart,
  });

  if (!plan) {
    plan = await MealPlan.create({
      user: userId,
      weekStart,
      meals: [],
    });
  }

  return plan;
};

// GET /api/meal-plans?weekStart=YYYY-MM-DD
const getWeeklyPlan = async (req, res) => {
  try {
    const weekStart = req.query.weekStart;

    if (!isValidDateKey(weekStart) || getMonday(weekStart) !== weekStart) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid Monday date as weekStart",
      });
    }

    const plan = await MealPlan.findOne({
      user: req.user._id,
      weekStart,
    }).populate("meals.items.food", "name category image servingSize nutrients");

    return res.json({
      success: true,
      plan: plan || {
        user: req.user._id,
        weekStart,
        meals: [],
      },
    });
  } catch (error) {
    console.error("Get weekly plan error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch weekly meal plan",
    });
  }
};

// POST /api/meal-plans/items
const addMealItem = async (req, res) => {
  try {
    const { weekStart, dateKey, mealType, foodId, quantityGrams } = req.body;

    const allowedMeals = ["Breakfast", "Lunch", "Dinner", "Snacks"];
    const quantity = Number(quantityGrams);

    if (
      !isValidDateKey(weekStart) ||
      getMonday(weekStart) !== weekStart ||
      !isValidDateKey(dateKey) ||
      getMonday(dateKey) !== weekStart
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid weekStart or dateKey",
      });
    }

    if (!allowedMeals.includes(mealType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid meal type",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(foodId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid food ID",
      });
    }

    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 5000) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be between 1g and 5000g",
      });
    }

    const food = await Food.findOne({
      _id: foodId,
      isActive: true,
    });

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food not found or inactive",
      });
    }

    const plan = await getOrCreatePlan(req.user._id, weekStart);

    let meal = plan.meals.find(
      (item) => item.dateKey === dateKey && item.mealType === mealType
    );

    if (!meal) {
      plan.meals.push({
        dateKey,
        mealType,
        items: [],
      });

      meal = plan.meals[plan.meals.length - 1];
    }

    meal.items.push({
      food: food._id,
      quantityGrams: quantity,
      nutrients: calculateNutrients(food, quantity),
    });

    await plan.save();

    await plan.populate(
      "meals.items.food",
      "name category image servingSize nutrients"
    );

    return res.status(201).json({
      success: true,
      message: "Food added to meal plan",
      plan,
    });
  } catch (error) {
    console.error("Add meal item error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add food to meal plan",
    });
  }
};

// PUT /api/meal-plans/:planId/meals/:mealId/items/:itemId
const updateMealItem = async (req, res) => {
  try {
    const { planId, mealId, itemId } = req.params;
    const quantity = Number(req.body.quantityGrams);

    if (
      !mongoose.Types.ObjectId.isValid(planId) ||
      !mongoose.Types.ObjectId.isValid(mealId) ||
      !mongoose.Types.ObjectId.isValid(itemId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan, meal or item ID",
      });
    }

    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 5000) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be between 1g and 5000g",
      });
    }

    const plan = await MealPlan.findOne({
      _id: planId,
      user: req.user._id,
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    const meal = plan.meals.id(mealId);
    const item = meal?.items.id(itemId);

    if (!meal || !item) {
      return res.status(404).json({
        success: false,
        message: "Meal or food item not found",
      });
    }

    const food = await Food.findOne({
      _id: item.food,
      isActive: true,
    });

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food not found or inactive",
      });
    }

    item.quantityGrams = quantity;
    item.nutrients = calculateNutrients(food, quantity);

    await plan.save();

    await plan.populate(
      "meals.items.food",
      "name category image servingSize nutrients"
    );

    return res.json({
      success: true,
      message: "Meal item updated",
      plan,
    });
  } catch (error) {
    console.error("Update meal item error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update meal item",
    });
  }
};

// DELETE /api/meal-plans/:planId/meals/:mealId/items/:itemId
const deleteMealItem = async (req, res) => {
  try {
    const { planId, mealId, itemId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(planId) ||
      !mongoose.Types.ObjectId.isValid(mealId) ||
      !mongoose.Types.ObjectId.isValid(itemId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan, meal or item ID",
      });
    }

    const plan = await MealPlan.findOne({
      _id: planId,
      user: req.user._id,
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    const meal = plan.meals.id(mealId);

    if (!meal || !meal.items.id(itemId)) {
      return res.status(404).json({
        success: false,
        message: "Meal item not found",
      });
    }

    meal.items.pull({ _id: itemId });

    // Remove the meal section if it has no food items
    if (meal.items.length === 0) {
      plan.meals.pull({ _id: mealId });
    }

    await plan.save();

    return res.json({
      success: true,
      message: "Food removed from meal plan",
      plan,
    });
  } catch (error) {
    console.error("Delete meal item error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove food from meal plan",
    });
  }
};

module.exports = {
  getWeeklyPlan,
  addMealItem,
  updateMealItem,
  deleteMealItem,
};
