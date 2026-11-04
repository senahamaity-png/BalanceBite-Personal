
import { useEffect, useState } from "react";
import api from "../services/api";

const fields = [
  { key: "calories", label: "Daily Calories", unit: "kcal", icon: "🔥" },
  { key: "protein", label: "Protein", unit: "g", icon: "💪" },
  { key: "carbohydrates", label: "Carbohydrates", unit: "g", icon: "🌾" },
  { key: "fat", label: "Fat", unit: "g", icon: "🥑" },
  { key: "fiber", label: "Fiber", unit: "g", icon: "🥦" },
];

const defaults = {
  calories: 2000,
  protein: 50,
  carbohydrates: 275,
  fat: 65,
  fiber: 28,
};

function ProgressCard({ field, consumed, target }) {
  const percentage =
    target > 0 ? Math.round((consumed / target) * 100) : 0;

  const progress = Math.min(percentage, 100);

  return (
    <div className="nutrition-progress-card">
      <div className="nutrition-progress-heading">
        <span className="nutrition-icon">{field.icon}</span>
        <div>
          <h3>{field.label}</h3>
          <p>
            {Number(consumed || 0).toFixed(1)} / {target} {field.unit}
          </p>
        </div>
      </div>

      <div
        className="nutrition-progress-track"
        role="progressbar"
        aria-label={`${field.label} daily progress`}
        aria-valuemin={0}
        aria-valuemax={target || 1}
        aria-valuenow={Math.min(consumed || 0, target || 0)}
      >
        <div
          className={`nutrition-progress-fill ${
            percentage >= 100 ? "goal-complete" : ""
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="nutrition-progress-footer">
        <span>{percentage}% of target</span>
        <span>
          {percentage >= 100
            ? "Target reached!"
            : `${Math.max(target - consumed, 0).toFixed(1)} ${field.unit} remaining`}
        </span>
      </div>
    </div>
  );
}

export default function NutritionGoals() {
  const [goals, setGoals] = useState(defaults);
  const [consumed, setConsumed] = useState({});
  const [date, setDate] = useState(() => {
    const now = new Date();
    const local = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000
    );
    return local.toISOString().slice(0, 10);
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [goalResponse, diaryResponse] = await Promise.all([
          api.get("/nutrition-goals"),
          api.get("/diary", { params: { date } }),
        ]);

        setGoals({
          ...defaults,
          ...goalResponse.data.goals,
        });

        const totals = diaryResponse.data.totals || {};
        setConsumed({
          calories: Number(totals.calories || 0),
          protein: Number(totals.protein || 0),
          carbohydrates: Number(totals.carbohydrates || 0),
          fat: Number(totals.fat || 0),
          fiber: Number(totals.fiber || 0),
        });
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Could not load nutrition data. Please check your login and backend."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [date]);

  function handleChange(key, value) {
    setGoals((previous) => ({
      ...previous,
      [key]: value === "" ? "" : Number(value),
    }));
  }

  async function saveGoals(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    for (const field of fields) {
      const value = goals[field.key];

      if (
        value === "" ||
        !Number.isFinite(Number(value)) ||
        Number(value) < 0
      ) {
        setError(`Please enter a valid ${field.label} target.`);
        setSaving(false);
        return;
      }
    }

    try {
      const payload = {};

      for (const field of fields) {
        payload[field.key] = Number(goals[field.key]);
      }

      const response = await api.put("/nutrition-goals", payload);

      setGoals({
        ...defaults,
        ...response.data.goals,
      });

      setMessage("Your nutrition goals have been saved successfully!");
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to save nutrition goals."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="nutrition-page"><p>Loading nutrition data...</p></main>;
  }

  return (
    <main className="nutrition-page">
      <section className="nutrition-hero">
        <span className="nutrition-eyebrow">YOUR HEALTH JOURNEY</span>
        <h1>Nutrition Goals</h1>
        <p>
          Set your daily targets, track your food, and build healthier habits
          one day at a time.
        </p>
      </section>

      {error && <div className="nutrition-alert error-alert">{error}</div>}
      {message && <div className="nutrition-alert success-alert">{message}</div>}

      <section className="nutrition-panel">
        <h2>Set Your Daily Targets</h2>
        <p className="nutrition-muted">
          These are editable starting values, not personalized medical advice.
        </p>

        <form onSubmit={saveGoals}>
          <div className="nutrition-form-grid">
            {fields.map((field) => (
              <label className="nutrition-field" key={field.key}>
                <span>{field.icon} {field.label} ({field.unit})</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={goals[field.key]}
                  onChange={(event) =>
                    handleChange(field.key, event.target.value)
                  }
                  required
                />
              </label>
            ))}
          </div>

          <button
            className="nutrition-save-button"
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save My Goals"}
          </button>
        </form>
      </section>

      <section className="nutrition-panel">
        <div className="nutrition-section-heading">
          <div>
            <h2>Your Daily Progress</h2>
            <p className="nutrition-muted">
              Compare today's food diary with your targets.
            </p>
          </div>

          <label className="nutrition-date-field">
            <span>Choose date</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
        </div>

        <div className="nutrition-progress-grid">
          {fields.map((field) => (
            <ProgressCard
              key={field.key}
              field={field}
              consumed={consumed[field.key] || 0}
              target={Number(goals[field.key]) || 0}
            />
          ))}
        </div>

        <p className="nutrition-note">
          Progress updates when you select a date and the corresponding food
          diary data loads.
        </p>
      </section>
    </main>
  );
}
