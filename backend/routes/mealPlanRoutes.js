
const express = require("express");

const {
  getWeeklyPlan,
  addMealItem,
  updateMealItem,
  deleteMealItem,
} = require("../controllers/mealPlanController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All meal planner routes require login
router.use(protect);

router.get("/", getWeeklyPlan);

router.post("/items", addMealItem);

router.put(
  "/:planId/meals/:mealId/items/:itemId",
  updateMealItem
);

router.delete(
  "/:planId/meals/:mealId/items/:itemId",
  deleteMealItem
);

module.exports = router;
