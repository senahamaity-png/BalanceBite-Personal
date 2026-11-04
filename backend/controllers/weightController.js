const mongoose = require("mongoose");
const WeightLog = require("../models/WeightLog");
const User = require("../models/User");

function getTodayDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isValidDateKey(dateKey) {
  if (
    typeof dateKey !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)
  ) {
    return false;
  }

  const date = new Date(`${dateKey}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === dateKey
  );
}

function validateWeight(weightKg) {
  return (
    typeof weightKg === "number" &&
    Number.isFinite(weightKg) &&
    weightKg >= 2 &&
    weightKg <= 500
  );
}

function calculateBMI(weightKg, heightCm) {
  if (
    !Number.isFinite(weightKg) ||
    !Number.isFinite(heightCm) ||
    heightCm <= 0
  ) {
    return null;
  }

  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
}

function getBMICategory(bmi) {
  if (bmi === null) return "Height not available";
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal range";
  if (bmi < 30) return "Overweight";
  return "Obesity range";
}

// GET /api/weight
// Get the authenticated user's weight history.
exports.getWeightHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("profile.height");

    const heightCm = Number(user?.profile?.height);
    const safeHeight = Number.isFinite(heightCm) && heightCm > 0
      ? heightCm
      : null;

    const logs = await WeightLog.find({
      user: req.user._id,
    })
      .sort({ dateKey: -1, createdAt: -1 })
      .limit(365)
      .lean();

    const history = logs.map((log) => {
      const bmi = safeHeight
        ? calculateBMI(log.weightKg, safeHeight)
        : null;

      return {
        ...log,
        bmi,
        bmiCategory: getBMICategory(bmi),
      };
    });

    const latest = history[0] || null;
    const oldest = history.length > 0
      ? history[history.length - 1]
      : null;

    const weightChange =
      latest && oldest && latest._id.toString() !== oldest._id.toString()
        ? Number((latest.weightKg - oldest.weightKg).toFixed(1))
        : 0;

    return res.json({
      success: true,
      today: getTodayDateKey(),
      heightCm: safeHeight,
      latest,
      weightChange,
      entryCount: history.length,
      history,
    });
  } catch (error) {
    console.error("Get weight history error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not load weight history.",
    });
  }
};

// POST /api/weight
// Create a new record or update today's existing record.
exports.addWeight = async (req, res) => {
  try {
    const { weightKg, dateKey, note } = req.body;

    if (!validateWeight(weightKg)) {
      return res.status(400).json({
        success: false,
        message: "Weight must be a number between 2 and 500 kg.",
      });
    }

    const selectedDate = dateKey || getTodayDateKey();

    if (!isValidDateKey(selectedDate)) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid date in YYYY-MM-DD format.",
      });
    }

    if (note !== undefined && (
      typeof note !== "string" || note.length > 250
    )) {
      return res.status(400).json({
        success: false,
        message: "Note must be text with a maximum of 250 characters.",
      });
    }

    const log = await WeightLog.findOneAndUpdate(
      {
        user: req.user._id,
        dateKey: selectedDate,
      },
      {
        $set: {
          weightKg,
          note: (note || "").trim(),
        },
        $setOnInsert: {
          user: req.user._id,
          dateKey: selectedDate,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Weight saved successfully.",
      weight: log,
    });
  } catch (error) {
    console.error("Add weight error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not save weight.",
    });
  }
};

// PUT /api/weight/:id
// Update an existing weight record.
exports.updateWeight = async (req, res) => {
  try {
    const { id } = req.params;
    const { weightKg, note } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid weight record ID.",
      });
    }

    if (!validateWeight(weightKg)) {
      return res.status(400).json({
        success: false,
        message: "Weight must be a number between 2 and 500 kg.",
      });
    }

    if (note !== undefined && (
      typeof note !== "string" || note.length > 250
    )) {
      return res.status(400).json({
        success: false,
        message: "Note must be text with a maximum of 250 characters.",
      });
    }

    const update = {
      weightKg,
    };

    if (note !== undefined) {
      update.note = note.trim();
    }

    const log = await WeightLog.findOneAndUpdate(
      {
        _id: id,
        user: req.user._id,
      },
      { $set: update },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Weight record not found.",
      });
    }

    return res.json({
      success: true,
      message: "Weight updated successfully.",
      weight: log,
    });
  } catch (error) {
    console.error("Update weight error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not update weight.",
    });
  }
};

// DELETE /api/weight/:id
exports.deleteWeight = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid weight record ID.",
      });
    }

    const log = await WeightLog.findOneAndDelete({
      _id: id,
      user: req.user._id,
    });

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Weight record not found.",
      });
    }

    return res.json({
      success: true,
      message: "Weight record deleted successfully.",
    });
  } catch (error) {
    console.error("Delete weight error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not delete weight record.",
    });
  }
};