
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const meals = [
  { name: "Breakfast", icon: "🌅", description: "Start your day right" },
  { name: "Lunch", icon: "☀️", description: "Fuel your afternoon" },
  { name: "Dinner", icon: "🌙", description: "A balanced evening meal" },
  { name: "Snacks", icon: "🍎", description: "Small bites, smart choices" },
];

const nutrients = [
  { key: "calories", label: "Calories", unit: "kcal", icon: "🔥" },
  { key: "protein", label: "Protein", unit: "g", icon: "💪" },
  { key: "carbohydrates", label: "Carbs", unit: "g", icon: "🌾" },
  { key: "fat", label: "Fat", unit: "g", icon: "🥑" },
  { key: "fiber", label: "Fiber", unit: "g", icon: "🌿" },
];

function getToday() {
  const now = new Date();
  const localDate = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  );
  return localDate.toISOString().slice(0, 10);
}

function shiftDate(date, days) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + days);

  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, "0");
  const day = String(next.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function FoodDiary() {
  const [date, setDate] = useState(getToday);
  const [entries, setEntries] = useState([]);
  const [totals, setTotals] = useState({});
  const [goals, setGoals] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState("");

  const loadDiary = useCallback(async (selectedDate) => {
    try {
      setLoading(true);
      setError("");

      const [diaryResponse, goalsResponse] = await Promise.all([
        api.get("/diary", { params: { date: selectedDate } }),
        api.get("/nutrition-goals"),
      ]);

      const diaryData = diaryResponse.data;
      const goalData = goalsResponse.data;

      setEntries(diaryData.entries || []);
      setTotals(diaryData.totals || {});
      setGoals(
        goalData.goals ||
        goalData.nutritionGoals ||
        goalData
      );
    } catch (err) {
      console.error("Diary loading error:", err);
      setError(
        err.response?.data?.message ||
          "Could not load diary. Please check your login and backend."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDiary(date);
  }, [date, loadDiary]);

  async function removeEntry(id) {
    const confirmed = window.confirm(
      "Are you sure you want to remove this food from your diary?"
    );

    if (!confirmed) return;

    try {
      setRemovingId(id);
      setError("");

      await api.delete(`/diary/${id}`);
      await loadDiary(date);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not remove this entry."
      );
    } finally {
      setRemovingId("");
    }
  }

  function getMealTotals(mealEntries) {
    return mealEntries.reduce(
      (sum, entry) => {
        nutrients.forEach(({ key }) => {
          sum[key] += Number(entry.nutrients?.[key] || 0);
        });

        return sum;
      },
      {
        calories: 0,
        protein: 0,
        carbohydrates: 0,
        fat: 0,
        fiber: 0,
      }
    );
  }

  function getGoal(key) {
    const value = Number(goals?.[key]);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function getProgress(key) {
    const goal = getGoal(key);
    if (!goal) return 0;

    return Math.min(
      100,
      (Number(totals[key] || 0) / goal) * 100
    );
  }

  const formattedDate = new Date(
    `${date}T12:00:00`
  ).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="food-diary-page">
      <div className="food-diary-container">

        {/* Page Header */}
        <section className="diary-hero">
          <div className="diary-hero-content">
            <span className="diary-eyebrow">
              YOUR DAILY NUTRITION TRACKER
            </span>

            <h1>
              Your Food <span>Diary</span> 📔
            </h1>

            <p>
              Every meal matters. Track your food, monitor your
              nutrition and build healthier habits every day.
            </p>
          </div>

          <Link className="diary-explore-button" to="/foods">
            <span>＋</span> Explore Foods
          </Link>
        </section>

        {/* Date Selector */}
        <section className="diary-date-panel">
          <button
            type="button"
            className="diary-date-button"
            onClick={() =>
              setDate((current) => shiftDate(current, -1))
            }
            aria-label="Previous day"
          >
            ← Previous
          </button>

          <div className="diary-selected-date">
            <span>📅</span>
            <div>
              <small>Selected Date</small>
              <strong>{formattedDate}</strong>
            </div>
          </div>

          <div className="diary-date-input">
            <label htmlFor="diaryDate">Choose date</label>
            <input
              id="diaryDate"
              type="date"
              value={date}
              max={getToday()}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>

          <button
            type="button"
            className="diary-date-button"
            onClick={() =>
              setDate((current) => shiftDate(current, 1))
            }
            disabled={date >= getToday()}
          >
            Next →
          </button>

          {date !== getToday() && (
            <button
              type="button"
              className="diary-today-button"
              onClick={() => setDate(getToday())}
            >
              Today
            </button>
          )}
        </section>

        {/* Loading */}
        {loading && (
          <div className="diary-loading">
            <span>🥗</span>
            <p>Loading your daily nutrition...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="diary-error" role="alert">
            <span>⚠️</span>
            <p>{error}</p>
            <button
              type="button"
              onClick={() => loadDiary(date)}
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && (
          <>
            {/* Daily Nutrition Summary */}
            <section className="diary-summary-section">
              <div className="diary-section-heading">
                <div>
                  <span className="diary-section-eyebrow">
                    YOUR DAILY OVERVIEW
                  </span>
                  <h2>Nutrition Summary</h2>
                  <p>Your total nutrient intake for this day.</p>
                </div>
              </div>

              <div className="daily-nutrition-grid">
                {nutrients.map((item) => (
                  <article
                    className="daily-nutrition-card"
                    key={item.key}
                  >
                    <div className="daily-card-top">
                      <span>{item.label}</span>
                      <span className="daily-card-icon">
                        {item.icon}
                      </span>
                    </div>

                    <strong>
                      {Number(totals[item.key] || 0).toFixed(1)}
                    </strong>

                    <small>{item.unit} consumed</small>
                  </article>
                ))}
              </div>
            </section>

            {/* Nutrition Goals */}
            <section className="diary-goal-section">
              <div className="diary-section-heading goal-heading">
                <div>
                  <span className="diary-section-eyebrow">
                    YOUR DAILY TARGETS
                  </span>
                  <h2>Nutrition Progress</h2>
                  <p>See how close you are to your daily goals.</p>
                </div>

                <Link to="/goals" className="diary-edit-goals">
                  Edit Goals →
                </Link>
              </div>

              <div className="diary-progress-grid">
                {nutrients.map((item) => {
                  const goal = getGoal(item.key);
                  const consumed = Number(totals[item.key] || 0);
                  const progress = getProgress(item.key);

                  return (
                    <article
                      className="diary-progress-card"
                      key={item.key}
                    >
                      <div className="diary-progress-title">
                        <span>{item.icon}</span>
                        <strong>{item.label}</strong>
                      </div>

                      <div className="diary-progress-label">
                        <strong>
                          {consumed.toFixed(1)} {item.unit}
                        </strong>
                        <span>
                          / {goal ? `${goal} ${item.unit}` : "Not set"}
                        </span>
                      </div>

                      <div
                        className="diary-progress-track"
                        role="progressbar"
                        aria-label={`${item.label} progress`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progress}
                      >
                        <div
                          className="diary-progress-fill"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <small>
                        {!goal
                          ? "Set a daily target to track progress."
                          : progress >= 100
                            ? "Daily target reached 🎉"
                            : `${Math.round(progress)}% of daily target`}
                      </small>
                    </article>
                  );
                })}
              </div>
            </section>

            {/* Meal List Heading */}
            <div className="diary-section-heading meal-list-title">
              <div>
                <span className="diary-section-eyebrow">
                  YOUR FOOD JOURNEY
                </span>
                <h2>Meals for the Day</h2>
                <p>Everything you have added to your diary.</p>
              </div>

              <span className="diary-entry-count">
                {entries.length}{" "}
                {entries.length === 1 ? "Entry" : "Entries"}
              </span>
            </div>

            {/* Meal Sections */}
            <div className="diary-meals-list">
              {meals.map((meal) => {
                const mealEntries = entries.filter(
                  (entry) => entry.mealType === meal.name
                );

                const mealTotals = getMealTotals(mealEntries);

                return (
                  <section
                    className="meal-section"
                    key={meal.name}
                  >
                    <div className="meal-heading">
                      <div className="meal-heading-info">
                        <span className="meal-icon">
                          {meal.icon}
                        </span>

                        <div>
                          <h2>{meal.name}</h2>
                          <p>{meal.description}</p>
                        </div>
                      </div>

                      <div className="meal-heading-summary">
                        <strong>
                          {mealTotals.calories.toFixed(1)} kcal
                        </strong>
                        <span>
                          {mealEntries.length}{" "}
                          {mealEntries.length === 1 ? "item" : "items"}
                        </span>
                      </div>
                    </div>

                    {mealEntries.length === 0 ? (
                      <div className="empty-meal">
                        <span>🥗</span>
                        <p>No food added to this meal yet.</p>
                        <Link to="/foods">Explore Foods →</Link>
                      </div>
                    ) : (
                      <div className="diary-entry-list">
                        {mealEntries.map((entry) => (
                          <article
                            className="diary-entry"
                            key={entry._id}
                          >
                            <div className="diary-entry-icon">
                              {meal.icon}
                            </div>

                            <div className="diary-entry-info">
                              <h3>
                                {entry.food?.name || "Food"}
                              </h3>

                              <p>
                                {entry.quantityGrams}g
                                <span> · </span>
                                {Number(
                                  entry.nutrients?.calories || 0
                                ).toFixed(1)}{" "}
                                kcal
                              </p>

                              <div className="diary-entry-nutrients">
                                <span>
                                  Protein:{" "}
                                  {Number(
                                    entry.nutrients?.protein || 0
                                  ).toFixed(1)}g
                                </span>

                                <span>
                                  Carbs:{" "}
                                  {Number(
                                    entry.nutrients?.carbohydrates || 0
                                  ).toFixed(1)}g
                                </span>

                                <span>
                                  Fat:{" "}
                                  {Number(
                                    entry.nutrients?.fat || 0
                                  ).toFixed(1)}g
                                </span>

                                <span>
                                  Fiber:{" "}
                                  {Number(
                                    entry.nutrients?.fiber || 0
                                  ).toFixed(1)}g
                                </span>
                              </div>
                            </div>

                            <button
                              className="remove-entry-button"
                              type="button"
                              disabled={removingId === entry._id}
                              onClick={() => removeEntry(entry._id)}
                            >
                              {removingId === entry._id
                                ? "Removing..."
                                : "🗑 Remove"}
                            </button>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>

            {/* Empty Diary */}
            {entries.length === 0 && (
              <div className="diary-empty-state">
                <span>🥗</span>
                <h3>Your diary is waiting for its first meal!</h3>
                <p>
                  Start tracking your daily nutrition by adding
                  healthy foods to your diary.
                </p>

                <Link to="/foods" className="diary-explore-button">
                  Explore Healthy Foods →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default FoodDiary;
