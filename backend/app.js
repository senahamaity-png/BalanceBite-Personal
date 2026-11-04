
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const foodRoutes = require("./routes/foodRoutes");
const diaryRoutes = require("./routes/diaryRoutes");
const nutritionGoalRoutes = require("./routes/nutritionGoalRoutes");
const aiRoutes = require("./routes/aiRoutes");
const mealPlanRoutes = require("./routes/mealPlanRoutes");
const adminRoutes = require("./routes/adminRoutes");
const familyRoutes = require("./routes/familyRoutes");
const waterRoutes = require("./routes/waterRoutes");
const weightRoutes = require("./routes/weightRoutes");

const app = express();

const allowedOrigins = (
  process.env.CORS_ORIGINS || ""
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow Postman and server-to-server requests
    if (!origin) {
      return callback(null, true);
    }

    // Allow local development
    const isLocalOrigin =
      /^http:\/\/localhost:\d+$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);

    // Allow only configured production domains
    const isProductionOrigin =
      allowedOrigins.includes(origin);

    if (isLocalOrigin || isProductionOrigin) {
      return callback(null, true);
    }

    return callback(
      new Error("CORS origin not allowed")
    );
  },
};

app.use(cors(corsOptions));

app.use(express.json());

// API health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "BalanceBite API is running",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/foods", foodRoutes);
app.use("/api/diary", diaryRoutes);
app.use("/api/nutrition-goals", nutritionGoalRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/meal-plans", mealPlanRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/families", familyRoutes);
app.use("/api/water", waterRoutes);
app.use("/api/weight", weightRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error("Server error:", error.message);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

module.exports = app;
