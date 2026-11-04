
const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  getNutritionGoals,
  updateNutritionGoals,
} = require("../controllers/nutritionGoalController");

router.use(protect);

router.get("/", getNutritionGoals);
router.put("/", updateNutritionGoals);

module.exports = router;
