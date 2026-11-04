const WaterLog = require("../models/WaterLog");
const WaterGoal = require("../models/WaterGoal");

// Get today's date in India timezone (YYYY-MM-DD)
const getIndiaDateKey = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return `${values.year}-${values.month}-${values.day}`;
};

// GET today's water records and daily goal
exports.getTodayWater = async (req, res) => {
  try {
    const userId = req.user._id;
    const dateKey = getIndiaDateKey();

    const [logs, goal] = await Promise.all([
      WaterLog.find({
        user: userId,
        dateKey,
      }).sort({ createdAt: -1 }),

      WaterGoal.findOne({ user: userId }),
    ]);

    const dailyGoalMl = goal ? goal.dailyGoalMl : 2500;

    const totalWaterMl = logs.reduce(
      (total, log) => total + log.amountMl,
      0
    );

    const remainingMl = Math.max(dailyGoalMl - totalWaterMl, 0);

    const progressPercentage = Math.min(
      Math.round((totalWaterMl / dailyGoalMl) * 100),
      100
    );

    res.status(200).json({
      success: true,
      dateKey,
      dailyGoalMl,
      totalWaterMl,
      remainingMl,
      progressPercentage,
      entryCount: logs.length,
      logs,
    });
  } catch (error) {
    console.error("Get water error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch water records",
    });
  }
};

// POST add water intake
exports.addWater = async (req, res) => {
  try {
    const { amountMl } = req.body;

    if (
      typeof amountMl !== "number" ||
      !Number.isFinite(amountMl) ||
      !Number.isInteger(amountMl) ||
      amountMl < 1 ||
      amountMl > 5000
    ) {
      return res.status(400).json({
        success: false,
        message: "amountMl must be a whole number between 1 and 5000",
      });
    }

    const log = await WaterLog.create({
      user: req.user._id,
      amountMl,
      dateKey: getIndiaDateKey(),
    });

    res.status(201).json({
      success: true,
      message: "Water intake added successfully",
      log,
    });
  } catch (error) {
    console.error("Add water error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add water intake",
    });
  }
};

// DELETE one of the current user's water records
exports.deleteWater = async (req, res) => {
  try {
    const log = await WaterLog.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Water record not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Water record deleted successfully",
      deletedLog: log,
    });
  } catch (error) {
    console.error("Delete water error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid water record ID",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to delete water record",
    });
  }
};

// PUT update the current user's daily water goal
exports.updateWaterGoal = async (req, res) => {
  try {
    const { dailyGoalMl } = req.body;

    if (
      typeof dailyGoalMl !== "number" ||
      !Number.isFinite(dailyGoalMl) ||
      !Number.isInteger(dailyGoalMl) ||
      dailyGoalMl < 500 ||
      dailyGoalMl > 10000
    ) {
      return res.status(400).json({
        success: false,
        message: "dailyGoalMl must be a whole number between 500 and 10000",
      });
    }

    const goal = await WaterGoal.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: { dailyGoalMl },
        $setOnInsert: { user: req.user._id },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Daily water goal updated successfully",
      goal,
    });
  } catch (error) {
    console.error("Update water goal error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update water goal",
    });
  }
};