
const express = require("express");
const { protect } = require("../middleware/authMiddleware");

const {
  addFoodToDiary,
  getDailyDiary,
  deleteDiaryEntry,
} = require("../controllers/diaryController");

const router = express.Router();

router.use(protect);

router.post("/", addFoodToDiary);
router.get("/", getDailyDiary);
router.delete("/:id", deleteDiaryEntry);

module.exports = router;
