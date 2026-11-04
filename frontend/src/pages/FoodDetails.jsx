
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";

const categoryIcons = {
  Fruits: "🍎",
  Vegetables: "🥦",
  Grains: "🌾",
  Protein: "🥚",
  Dairy: "🥛",
  "Nuts & Seeds": "🥜",
  Beverages: "🥤",
  Other: "🥗",
};

const nutrientItems = [
  { label: "Calories", key: "calories", unit: "kcal", icon: "🔥" },
  { label: "Protein", key: "protein", unit: "g", icon: "💪" },
  { label: "Carbohydrates", key: "carbohydrates", unit: "g", icon: "🌾" },
  { label: "Fat", key: "fat", unit: "g", icon: "🥑" },
  { label: "Fiber", key: "fiber", unit: "g", icon: "🌿" },
  { label: "Sugar", key: "sugar", unit: "g", icon: "🍯" },
  { label: "Calcium", key: "calcium", unit: "mg", icon: "🦴" },
  { label: "Iron", key: "iron", unit: "mg", icon: "🩸" },
];

function FoodDetails() {
  const { id } = useParams();

  const [food, setFood] = useState(null);
  const [quantity, setQuantity] = useState("100");
  const [mealType, setMealType] = useState("Breakfast");
  const [date, setDate] = useState(
    new Date().toLocaleDateString("en-CA")
  );

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchFood = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/foods/${id}`);
        const data = response.data;
        const result = data.food || data.data || data;

        if (active) {
          setFood(result);
          setImageFailed(false);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Could not load this food."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchFood();

    return () => {
      active = false;
    };
  }, [id]);

  const quantityNumber = Number(quantity);

  const multiplier =
    Number.isFinite(quantityNumber) && quantityNumber > 0
      ? quantityNumber / 100
      : 0;

  const nutrients = food?.nutrients || {};

  function calculated(value) {
    return ((Number(value) || 0) * multiplier).toFixed(2);
  }

  async function addToDiary(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
      setError("Please enter a quantity greater than zero.");
      return;
    }

    if (quantityNumber > 5000) {
      setError("Maximum quantity allowed is 5000 grams.");
      return;
    }

    try {
      setSubmitting(true);

      await api.post("/diary", {
        foodId: food._id,
        mealType,
        quantityGrams: quantityNumber,
        dateKey: date,
      });

      setMessage("Food added to your diary successfully!");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not add food. Please log in again if your session expired."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="food-details-page">
        <div className="food-details-loading">
          <span>🥗</span>
          <p>Loading food details...</p>
        </div>
      </main>
    );
  }

  if (error && !food) {
    return (
      <main className="food-details-page">
        <div className="food-details-error">
          <span>⚠️</span>
          <h2>Unable to load food</h2>
          <p>{error}</p>
          <Link to="/foods">Back to Food Explorer</Link>
        </div>
      </main>
    );
  }

  if (!food) return null;

  return (
    <main className="food-details-page">
      <div className="food-details-container">

        <Link className="food-back-link" to="/foods">
          <span>←</span> Back to Food Explorer
        </Link>

        {/* Food Information */}
        <section className="food-details-hero">

          <div className="food-details-visual">
            {food.image && !imageFailed ? (
              <img
                className="food-details-image"
                src={food.image}
                alt={food.name}
                onError={() => setImageFailed(true)}
              />
            ) : (
              <span className="food-details-fallback">
                {categoryIcons[food.category] || "🥗"}
              </span>
            )}

            <div className="food-visual-decoration decoration-one" />
            <div className="food-visual-decoration decoration-two" />
          </div>

          <div className="food-details-intro">
            <span className="food-details-category">
              {food.category || "Healthy Food"}
            </span>

            <h1>{food.name}</h1>

            <p className="food-details-description">
              {food.description ||
                "A nutritious choice for your daily wellness journey."}
            </p>

            <div className="food-details-serving">
              <span>🥣</span>
              <div>
                <small>Reference Serving Size</small>
                <strong>{food.servingSize || "100g"}</strong>
              </div>
            </div>
          </div>

        </section>

        {/* Nutrition Section */}
        <section className="food-nutrition-section">

          <div className="food-details-section-heading">
            <div>
              <span className="section-eyebrow">
                NUTRITION BREAKDOWN
              </span>

              <h2>Nutrition Information</h2>

              <p>
                Explore the nutritional value of your selected food.
              </p>
            </div>

            <div className="nutrition-quantity-badge">
              <span>Current Quantity</span>
              <strong>
                {multiplier > 0 ? quantityNumber : 0}g
              </strong>
            </div>
          </div>

          <div className="details-nutrient-grid">
            {nutrientItems.map((item) => (
              <div
                className="details-nutrient"
                key={item.key}
              >
                <span className="details-nutrient-icon">
                  {item.icon}
                </span>

                <span className="details-nutrient-label">
                  {item.label}
                </span>

                <strong>
                  {calculated(nutrients[item.key])}{" "}
                  <small>{item.unit}</small>
                </strong>
              </div>
            ))}
          </div>

          <p className="food-nutrition-note">
            <span>ⓘ</span>
            Values are estimated from the database's per-100g
            nutrient information and adjusted according to quantity.
          </p>

        </section>

        {/* Add to Diary */}
        <section className="food-diary-section">

          <div className="food-diary-heading">
            <span className="diary-heading-icon">📖</span>

            <div>
              <h2>Add to Food Diary</h2>
              <p>
                Track your daily nutrition by adding this food
                to your meal diary.
              </p>
            </div>
          </div>

          <form className="diary-form" onSubmit={addToDiary}>

            <div className="diary-form-grid">

              <div className="diary-form-group">
                <label htmlFor="quantity">
                  Quantity <span>*</span>
                </label>

                <div className="quantity-input-wrapper">
                  <input
                    id="quantity"
                    type="number"
                    min="1"
                    max="5000"
                    step="1"
                    value={quantity}
                    onChange={(event) => {
                      setQuantity(event.target.value);
                      setMessage("");
                    }}
                    required
                  />

                  <span>grams (g)</span>
                </div>
              </div>

              <div className="diary-form-group">
                <label htmlFor="mealType">
                  Select Meal <span>*</span>
                </label>

                <select
                  id="mealType"
                  value={mealType}
                  onChange={(event) => setMealType(event.target.value)}
                >
                  <option value="Breakfast">🌅 Breakfast</option>
                  <option value="Lunch">☀️ Lunch</option>
                  <option value="Dinner">🌙 Dinner</option>
                  <option value="Snacks">🍎 Snacks</option>
                </select>
              </div>

              <div className="diary-form-group">
                <label htmlFor="date">
                  Diary Date <span>*</span>
                </label>

                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
              </div>

            </div>

            {/* Live Nutrition Preview */}
            <div className="diary-live-preview">
              <div>
                <span>🔥</span>
                <small>Estimated Calories</small>
                <strong>
                  {calculated(nutrients.calories)} kcal
                </strong>
              </div>

              <div>
                <span>💪</span>
                <small>Protein</small>
                <strong>
                  {calculated(nutrients.protein)} g
                </strong>
              </div>

              <div>
                <span>🌿</span>
                <small>Fiber</small>
                <strong>
                  {calculated(nutrients.fiber)} g
                </strong>
              </div>
            </div>

            <button
              className="nutrition-button"
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? "Adding to Diary..."
                : "＋ Add Food to Diary"}
            </button>

            {message && (
              <div className="nutrition-success" role="status">
                <span>✓</span>
                <p>{message}</p>
                <Link to="/diary">View My Diary →</Link>
              </div>
            )}

            {error && (
              <p className="nutrition-error" role="alert">
                {error}
              </p>
            )}

          </form>
        </section>

      </div>
    </main>
  );
}

export default FoodDetails;
