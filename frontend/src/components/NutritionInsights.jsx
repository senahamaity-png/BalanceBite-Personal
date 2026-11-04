
import { useEffect, useState } from "react";
import api from "../services/api";

function getToday() {
  const now = new Date();
  const localDate = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().slice(0, 10);
}

export default function NutritionInsights() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function generateInsights() {
      try {
        setError("");

        const [diaryResponse, goalResponse] = await Promise.all([
          api.get("/diary", {
            params: { date: getToday() },
          }),
          api.get("/nutrition-goals"),
        ]);

        const totals = diaryResponse.data.totals || {};
        const goals = goalResponse.data.goals || {};

        const recommendations = [];

        const calories = Number(totals.calories || 0);
        const protein = Number(totals.protein || 0);
        const fiber = Number(totals.fiber || 0);

        const calorieGoal = Number(goals.calories || 0);
        const proteinGoal = Number(goals.protein || 0);
        const fiberGoal = Number(goals.fiber || 0);

        if (calories === 0) {
          recommendations.push({
            icon: "🥗",
            title: "Start your food diary",
            message:
              "Add your meals to understand your daily nutrition intake.",
            type: "info",
          });
        } else if (
          calorieGoal > 0 &&
          calories < calorieGoal * 0.5
        ) {
          recommendations.push({
            icon: "📊",
            title: "Your calorie log is below target",
            message:
              "You have logged less than half of your daily calorie target so far. Check whether all your meals have been recorded.",
            type: "info",
          });
        } else if (
          calorieGoal > 0 &&
          calories >= calorieGoal
        ) {
          recommendations.push({
            icon: "🎯",
            title: "Calorie target reached",
            message:
              "You have reached your logged calorie target. Remember that your personal needs may differ from general targets.",
            type: "success",
          });
        } else {
          recommendations.push({
            icon: "🌿",
            title: "Keep tracking your meals",
            message:
              "Your diary is recording today's intake. Continue logging meals for a more complete picture.",
            type: "success",
          });
        }

        if (proteinGoal > 0 && protein < proteinGoal * 0.5) {
          recommendations.push({
            icon: "💪",
            title: "Review your protein intake",
            message:
              "Your logged protein is below half of your current target. You could review protein-containing foods such as eggs, beans, lentils, milk or tofu.",
            type: "info",
          });
        } else if (proteinGoal > 0 && protein >= proteinGoal) {
          recommendations.push({
            icon: "✨",
            title: "Protein target reached",
            message:
              "Your recorded protein has reached your set target for today.",
            type: "success",
          });
        }

        if (fiberGoal > 0 && fiber < fiberGoal * 0.5) {
          recommendations.push({
            icon: "🥦",
            title: "Check your fiber intake",
            message:
              "Your logged fiber is below half of your target. Fruits, vegetables, beans and whole grains are common sources of dietary fiber.",
            type: "info",
          });
        } else if (fiberGoal > 0 && fiber >= fiberGoal) {
          recommendations.push({
            icon: "🌟",
            title: "Fiber target reached",
            message:
              "Your recorded fiber has reached your set target for today.",
            type: "success",
          });
        }

        if (recommendations.length === 1) {
          recommendations.push({
            icon: "💧",
            title: "Build balanced habits",
            message:
              "Include a variety of foods and log your meals consistently. Hydration is important too, although water intake is not tracked by this summary.",
            type: "info",
          });
        }

        setInsights(recommendations);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to generate nutrition insights."
        );
      } finally {
        setLoading(false);
      }
    }

    generateInsights();
  }, []);

  return (
    <section className="nutrition-insights">
      <div className="insights-heading">
        <div>
          <span className="insights-eyebrow">
            YOUR DAILY CHECK-IN
          </span>
          <h2>Smart Nutrition Insights 💡</h2>
          <p>
            Helpful observations based on your logged meals and
            the goals you have set.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="insights-status">Analyzing your food diary...</p>
      ) : error ? (
        <p className="insights-error">{error}</p>
      ) : (
        <div className="insights-grid">
          {insights.map((insight, index) => (
            <article
              key={`${insight.title}-${index}`}
              className={`insight-card insight-${insight.type}`}
            >
              <div className="insight-icon">{insight.icon}</div>
              <div>
                <h3>{insight.title}</h3>
                <p>{insight.message}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="insights-disclaimer">
        These are general tracking insights, not medical advice.
        Targets may need to be adjusted for your individual needs.
      </p>
    </section>
  );
}
