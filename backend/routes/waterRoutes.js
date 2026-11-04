const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  getTodayWater,
  addWater,
  deleteWater,
  updateWaterGoal,
} = require("../controllers/waterController");

router.use(protect);

router.get("/today", getTodayWater);
router.post("/", addWater);
router.delete("/:id", deleteWater);
router.put("/goal", updateWaterGoal);

module.exports = router;