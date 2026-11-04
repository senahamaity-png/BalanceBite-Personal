const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  getWeightHistory,
  addWeight,
  updateWeight,
  deleteWeight,
} = require("../controllers/weightController");

router.use(protect);

router.get("/", getWeightHistory);
router.post("/", addWeight);
router.put("/:id", updateWeight);
router.delete("/:id", deleteWeight);

module.exports = router;