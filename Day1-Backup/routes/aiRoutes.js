
const express = require("express");
const { protect } = require("../middleware/authMiddleware");

const {
  runNutritionAgent,
  confirmAddFoodToDiary,
} = require("../services/nutritionAgent");

const router = express.Router();

router.post("/chat", protect, async (req, res) => {
  try {
    const { message } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter a message.",
      });
    }

    if (message.length > 1500) {
      return res.status(400).json({
        success: false,
        message: "Message must be 1500 characters or fewer.",
      });
    }

    const result = await runNutritionAgent(
      message.trim(),
      String(req.user._id)
    );

    return res.json({
      success: true,
      reply: result.reply,
      pendingAction: result.pendingAction || null,
    });
  } catch (error) {
    console.error("Nutrition agent error:", error.message);

    return res.status(502).json({
      success: false,
      message: "The Nutrition Agent is temporarily unavailable.",
    });
  }
});

router.post("/confirm-add", protect, async (req, res) => {
  try {
    const { confirmationToken } = req.body;

    if (
      typeof confirmationToken !== "string" ||
      !confirmationToken.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid confirmation token is required.",
      });
    }

    const result = await confirmAddFoodToDiary(
      { confirmationToken },
      String(req.user._id)
    );

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Diary confirmation error:", error.message);

    return res.status(400).json({
      success: false,
      message: error.message || "Could not confirm the diary update.",
    });
  }
});

module.exports = router;
