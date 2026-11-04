
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const nutrients = [
  { key: "calories", label: "Calories", unit: "kcal", icon: "🔥" },
  { key: "protein", label: "Protein", unit: "g", icon: "💪" },
  { key: "carbohydrates", label: "Carbs", unit: "g", icon: "🌾" },
  { key: "fiber", label: "Fiber", unit: "g", icon: "🥦" },
];

function getToday() {
  const now = new Date();
  const local = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  );

  return local.toISOString().slice(0, 10);
}

export default function DashboardNutritionSummary() {
  const [goals, setGoals] = useState(null);
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSummary() {
      try {
        const [goalResponse, diaryResponse] = await Promise.all([
          api.get("/nutrition-goals"),
          api.get("/diary", { params: { date: getToday() } }),
        ]);

        setGoals(goalResponse.data.goals);
        setTotals(diaryResponse.data.totals || {});
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Nutrition summary could not be loaded."
        );
      } finally {
        setLoading(false);
      }
    }

    loadSummary();
  }, []);

  if (loading) {
    return (
      <section className="dashboard-nutrition">
        <p>Loading your nutrition summary...</p>
      </section>
    );
  }

  if (error || !goals) {
    return (
      <section className="dashboard-nutrition">
        <h2>Today's Nutrition</h2>
        <p>{error || "Nutrition goals are unavailable."}</p>
        <Link to="/nutrition-goals">View Nutrition Goals →</Link>
      </section>
    );
  }

  return (
    <section className="dashboard-nutrition">
      <div className="dashboard-nutrition-header">
        <div>
          <span className="dashboard-nutrition-eyebrow">
            YOUR DAILY WELLNESS
          </span>
          <h2>Today's Nutrition 🌿</h2>
          <p>Small healthy choices make a big difference.</p>
        </div>

        <Link
          to="/nutrition-goals"
          className="dashboard-nutrition-link"
        >
          View Goals →
        </Link>
      </div>

      <div className="dashboard-nutrition-grid">
        {nutrients.map((item) => {
          const consumed = Number(totals[item.key] || 0);
          const target = Number(goals[item.key] || 0);
          const percentage =
            target > 0
              ? Math.round((consumed / target) * 100)
              : 0;

          return (
            <article
              className="dashboard-nutrient-card"
              key={item.key}
            >
              <div className="dashboard-nutrient-title">
                <span className="dashboard-nutrient-icon">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>

              <h3>
                {consumed.toFixed(1)}
                <span>
                  {" "}/ {target} {item.unit}
                </span>
              </h3>

              <div
                className="dashboard-nutrient-track"
                role="progressbar"
                aria-label={`${item.label} progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(percentage, 100)}
              >
                <div
                  className="dashboard-nutrient-fill"
                  style={{
                    width: `${Math.min(percentage, 100)}%`,
                  }}
                />
              </div>

              <p>
                {percentage >= 100
                  ? "Daily target reached!"
                  : `${percentage}% of your daily target`}
              </p>
            </article>
          );
        })}
      </div>

      <div className="dashboard-nutrition-footer">
        <span>🥗</span>
        <p>
          Your food diary helps you understand your daily nutrition.
          Keep tracking your meals!
        </p>
        <Link to="/diary">Open Food Diary →</Link>
      </div>
    </section>
  );
}
