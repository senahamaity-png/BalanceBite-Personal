
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "./MealPlanner.css";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snacks"];
const NUTRIENTS = ["calories", "protein", "carbohydrates", "fat", "fiber"];

const dateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const mondayOf = (date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() + (result.getDay() === 0 ? -6 : 1 - result.getDay()));
  return result;
};

const addDays = (key, amount) => {
  const date = new Date(`${key}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
};

const formatDate = (key, options) =>
  new Date(`${key}T12:00:00`).toLocaleDateString("en-IN", options);

function MealPlanner() {
  const today = dateKey(new Date());

  const [weekStart, setWeekStart] = useState(() => dateKey(mondayOf(new Date())));
  const [selectedDate, setSelectedDate] = useState(today);
  const [plan, setPlan] = useState(null);
  const [foods, setFoods] = useState([]);
  const [search, setSearch] = useState("");
  const [mealType, setMealType] = useState("Breakfast");
  const [quantity, setQuantity] = useState(100);
  const [selectedFoodId, setSelectedFoodId] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [foodLoading, setFoodLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/meal-plans", {
        params: { weekStart },
      });
      setPlan(response.data.plan);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load meal plan.");
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    let active = true;

    const loadFoods = async () => {
      setFoodLoading(true);
      try {
        const response = await api.get("/foods", {
          params: search.trim() ? { search: search.trim() } : {},
        });
        if (active) setFoods(response.data.foods || []);
      } catch {
        if (active) setFoods([]);
      } finally {
        if (active) setFoodLoading(false);
      }
    };

    const timer = setTimeout(loadFoods, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search]);

  useEffect(() => {
    if (!weekDays.includes(selectedDate)) {
      setSelectedDate(weekStart);
    }
  }, [weekDays, selectedDate, weekStart]);

  const selectedMeals = (plan?.meals || []).filter(
    (meal) => meal.dateKey === selectedDate
  );

  const getMeal = (type) =>
    selectedMeals.find((meal) => meal.mealType === type);

  const getTotals = (meals) => {
    const totals = Object.fromEntries(NUTRIENTS.map((key) => [key, 0]));

    meals.forEach((meal) => {
      meal.items.forEach((item) => {
        NUTRIENTS.forEach((key) => {
          totals[key] += Number(item.nutrients?.[key] || 0);
        });
      });
    });

    return totals;
  };

  const dailyTotals = getTotals(selectedMeals);

  const caloriesForDay = (key) => {
    const meals = (plan?.meals || []).filter((meal) => meal.dateKey === key);
    return Math.round(getTotals(meals).calories);
  };

  const openAddForm = (type) => {
    setMealType(type);
    setSelectedFoodId("");
    setQuantity(100);
    setSearch("");
    setEditingItem(null);
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const openEditForm = (type, meal, item) => {
    const foodId = typeof item.food === "object" ? item.food?._id : item.food;
    setMealType(type);
    setSelectedFoodId(foodId || "");
    setQuantity(item.quantityGrams);
    setSearch(item.food?.name || "");
    setEditingItem({
      planId: plan._id,
      mealId: meal._id,
      itemId: item._id,
    });
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setSelectedFoodId("");
    setQuantity(100);
    setSearch("");
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!editingItem && !selectedFoodId) {
      setError("Please select a food.");
      return;
    }

    if (!Number.isFinite(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > 5000) {
      setError("Quantity must be between 1g and 5000g.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingItem) {
        await api.put(
          `/meal-plans/${editingItem.planId}/meals/${editingItem.mealId}/items/${editingItem.itemId}`,
          { quantityGrams: Number(quantity) }
        );
        setSuccess("Meal quantity updated.");
      } else {
        await api.post("/meal-plans/items", {
          weekStart,
          dateKey: selectedDate,
          mealType,
          foodId: selectedFoodId,
          quantityGrams: Number(quantity),
        });
        setSuccess("Food added to your meal plan!");
      }

      closeForm();
      await loadPlan();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save this meal.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (meal, item) => {
    if (!window.confirm(`Remove ${item.food?.name || "this food"}?`)) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(
        `/meal-plans/${plan._id}/meals/${meal._id}/items/${item._id}`
      );
      setSuccess("Food removed from your meal plan.");
      await loadPlan();
    } catch (err) {
      setError(err.response?.data?.message || "Could not remove food.");
    }
  };

  const changeWeek = (amount) => {
    const nextWeek = addDays(weekStart, amount * 7);
    setWeekStart(nextWeek);
    setSelectedDate(nextWeek);
    closeForm();
    setError("");
    setSuccess("");
  };

  const selectedFood = foods.find((food) => food._id === selectedFoodId);

  return (
    <main className="meal-planner-page">
      <header className="mp-header">
        <div>
          <span className="mp-eyebrow">BALANCEBITE / NUTRITION</span>
          <h1>Meal Planner</h1>
          <p>Plan your meals, balance your nutrition, and build healthier habits.</p>
        </div>
        <Link to="/dashboard" className="mp-back-link">← Dashboard</Link>
      </header>

      {error && <div className="mp-alert mp-error">{error}</div>}
      {success && <div className="mp-alert mp-success">{success}</div>}

      <section className="mp-week-panel">
        <div className="mp-week-heading">
          <div>
            <span className="mp-section-label">YOUR WEEK</span>
            <h2>
              {formatDate(weekStart, { day: "numeric", month: "short" })}
              {" — "}
              {formatDate(weekDays[6], { day: "numeric", month: "short", year: "numeric" })}
            </h2>
          </div>
          <div className="mp-week-actions">
            <button onClick={() => changeWeek(-1)} aria-label="Previous week">‹</button>
            <button
              className="mp-today-button"
              onClick={() => {
                const monday = dateKey(mondayOf(new Date()));
                setWeekStart(monday);
                setSelectedDate(today);
                closeForm();
              }}
            >
              This week
            </button>
            <button onClick={() => changeWeek(1)} aria-label="Next week">›</button>
          </div>
        </div>

        <div className="mp-week-grid">
          {weekDays.map((key) => {
            const isToday = key === today;
            return (
              <button
                key={key}
                className={`mp-day-card ${selectedDate === key ? "active" : ""}`}
                onClick={() => {
                  setSelectedDate(key);
                  closeForm();
                  setError("");
                  setSuccess("");
                }}
              >
                <span className="mp-day-name">{formatDate(key, { weekday: "short" })}</span>
                <strong>{formatDate(key, { day: "numeric" })}</strong>
                <span className="mp-day-calories">{caloriesForDay(key)} kcal</span>
                {isToday && <span className="mp-today-dot">Today</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mp-summary-grid">
        <div className="mp-summary-card mp-calorie-card">
          <span>Daily planned calories</span>
          <strong>{Math.round(dailyTotals.calories)}</strong>
          <small>kcal planned</small>
        </div>
        <div className="mp-summary-card">
          <span>Protein</span>
          <strong>{dailyTotals.protein.toFixed(1)} g</strong>
          <small>Daily planned</small>
        </div>
        <div className="mp-summary-card">
          <span>Carbohydrates</span>
          <strong>{dailyTotals.carbohydrates.toFixed(1)} g</strong>
          <small>Daily planned</small>
        </div>
        <div className="mp-summary-card">
          <span>Fiber</span>
          <strong>{dailyTotals.fiber.toFixed(1)} g</strong>
          <small>Daily planned</small>
        </div>
      </section>

      <section className="mp-daily-section">
        <div className="mp-daily-heading">
          <div>
            <span className="mp-section-label">DAILY VIEW</span>
            <h2>{formatDate(selectedDate, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}</h2>
          </div>
          <span className="mp-meal-count">
            {selectedMeals.reduce((sum, meal) => sum + meal.items.length, 0)} food items planned
          </span>
        </div>

        {loading ? (
          <div className="mp-loading">Loading your meal plan...</div>
        ) : (
          <div className="mp-meal-grid">
            {MEAL_TYPES.map((type) => {
              const meal = getMeal(type);
              const items = meal?.items || [];
              const mealCalories = Math.round(
                items.reduce((sum, item) => sum + Number(item.nutrients?.calories || 0), 0)
              );

              return (
                <article className="mp-meal-card" key={type}>
                  <div className="mp-meal-card-header">
                    <div>
                      <span className="mp-meal-icon">
                        {type === "Breakfast" ? "☀️" : type === "Lunch" ? "🥗" : type === "Dinner" ? "🌙" : "🍎"}
                      </span>
                      <div>
                        <h3>{type}</h3>
                        <span>{mealCalories} kcal planned</span>
                      </div>
                    </div>
                    <button className="mp-add-button" onClick={() => openAddForm(type)}>
                      + Add food
                    </button>
                  </div>

                  {items.length === 0 ? (
                    <div className="mp-empty-meal">
                      <span>🥣</span>
                      <p>No food added yet</p>
                      <small>Start planning this meal.</small>
                    </div>
                  ) : (
                    <div className="mp-food-list">
                      {items.map((item) => (
                        <div className="mp-food-item" key={item._id}>
                          <div className="mp-food-info">
                            <strong>{item.food?.name || "Food item"}</strong>
                            <span>
                              {item.quantityGrams}g · {Math.round(item.nutrients?.calories || 0)} kcal
                            </span>
                          </div>
                          <div className="mp-item-actions">
                            <button onClick={() => openEditForm(type, meal, item)}>Edit</button>
                            <button className="mp-delete-button" onClick={() => handleDelete(meal, item)}>
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {showForm && (
        <div className="mp-modal-backdrop" onClick={closeForm}>
          <form className="mp-modal" onSubmit={handleSave} onClick={(event) => event.stopPropagation()}>
            <div className="mp-modal-heading">
              <div>
                <span className="mp-section-label">{editingItem ? "UPDATE FOOD" : "ADD FOOD"}</span>
                <h2>{editingItem ? "Edit meal quantity" : `Add to ${mealType}`}</h2>
              </div>
              <button type="button" className="mp-modal-close" onClick={closeForm}>×</button>
            </div>

            {editingItem ? (
              <div className="mp-selected-food">
                <strong>{search || "Selected food"}</strong>
                <small>Update the quantity for this food.</small>
              </div>
            ) : (
              <>
                <label htmlFor="mp-food-search">Search food</label>
                <input
                  id="mp-food-search"
                  type="text"
                  placeholder="Search apple, banana, milk..."
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setSelectedFoodId("");
                  }}
                />

                <div className="mp-food-options">
                  {foodLoading ? (
                    <p>Searching foods...</p>
                  ) : foods.length === 0 ? (
                    <p>No foods found. Try another search.</p>
                  ) : (
                    foods.slice(0, 8).map((food) => (
                      <button
                        type="button"
                        key={food._id}
                        className={`mp-food-option ${selectedFoodId === food._id ? "selected" : ""}`}
                        onClick={() => {
                          setSelectedFoodId(food._id);
                          setSearch(food.name);
                        }}
                      >
                        <span>
                          <strong>{food.name}</strong>
                          <small>{food.category}</small>
                        </span>
                        <span>{food.nutrients?.calories || 0} kcal / 100g</span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}

            <label htmlFor="mp-quantity">Quantity (grams)</label>
            <input
              id="mp-quantity"
              type="number"
              min="1"
              max="5000"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
            />

            {selectedFood && !editingItem && (
              <div className="mp-selection-note">
                Selected: <strong>{selectedFood.name}</strong>
              </div>
            )}

            <div className="mp-modal-actions">
              <button type="button" className="mp-cancel-button" onClick={closeForm}>
                Cancel
              </button>
              <button type="submit" className="mp-save-button" disabled={saving}>
                {saving ? "Saving..." : editingItem ? "Update food" : "Add to plan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

export default MealPlanner;
