
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const foodRoutes = require("./routes/foodRoutes");
const diaryRoutes = require("./routes/diaryRoutes");
const nutritionGoalRoutes = require("./routes/nutritionGoalRoutes");
const aiRoutes = require("./routes/aiRoutes");
const mealPlanRoutes = require("./routes/mealPlanRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://balancebite-six.vercel.app",
    ],
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "BalanceBite API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/foods", foodRoutes);
app.use("/api/diary", diaryRoutes);
app.use("/api/nutrition-goals", nutritionGoalRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/meal-plans", mealPlanRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

module.exports = app;
