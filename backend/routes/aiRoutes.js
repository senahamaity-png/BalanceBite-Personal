
const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  runNutritionAgent,
  confirmAddFoodToDiary,
  cancelFoodDiaryAction,
} = require("../services/nutritionAgent");

// All AI routes require authentication.
router.use(protect);

// ===============================
// AI CHAT
// ===============================
router.post("/chat", async (req, res) => {
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

// ===============================
// CONFIRM FOOD DIARY ACTION
// ===============================
router.post("/confirm-add", async (req, res) => {
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

// ===============================
// CANCEL FOOD DIARY ACTION
// ===============================
router.post("/cancel-add", async (req, res) => {
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

    const result = await cancelFoodDiaryAction(
      { confirmationToken },
      String(req.user._id)
    );

    return res.json(result);
  } catch (error) {
    console.error("Diary cancellation error:", error.message);

    return res.status(400).json({
      success: false,
      message: error.message || "Could not cancel the diary action.",
    });
  }
});

module.exports = router;
