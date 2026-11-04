
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

// Category icons
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

const categories = [
  "All",
  "Fruits",
  "Vegetables",
  "Grains",
  "Protein",
  "Dairy",
  "Nuts & Seeds",
  "Beverages",
  "Other",
];

// Fallback image
const FALLBACK_IMAGE = "/foods/food-placeholder.jpg";

function FoodExplorer() {
  const [foods, setFoods] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch foods from backend
  useEffect(() => {
    const fetchFoods = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/foods");

        const foodData =
          response.data.foods ||
          response.data.data ||
          response.data;

        if (Array.isArray(foodData)) {
          setFoods(foodData);
        } else {
          setFoods([]);
        }
      } catch (err) {
        console.error("Food fetching error:", err);
        setError("Unable to load foods. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchFoods();
  }, []);

  // Search, filter and sorting
  const filteredFoods = foods
    .filter((food) => {
      const searchText = search.toLowerCase().trim();

      const matchesSearch =
        food.name?.toLowerCase().includes(searchText) ||
        food.description?.toLowerCase().includes(searchText);

      const matchesCategory =
        category === "All" ||
        food.category?.toLowerCase() === category.toLowerCase();

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const caloriesA = Number(a.nutrients?.calories ?? 0);
      const caloriesB = Number(b.nutrients?.calories ?? 0);

      if (sortBy === "name") {
        return (a.name || "").localeCompare(b.name || "");
      }

      if (sortBy === "calories-low") {
        return caloriesA - caloriesB;
      }

      if (sortBy === "calories-high") {
        return caloriesB - caloriesA;
      }

      return 0;
    });

  // Loading state
  if (loading) {
    return (
      <section className="food-explorer-section">
        <div className="food-explorer-container">
          <div className="food-loading">
            <span>🥗</span>
            <p>Loading healthy foods...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="food-explorer-section">
      <div className="food-explorer-container">

        {/* Heading */}
        <div className="food-explorer-heading">
          <span className="section-eyebrow">
            EXPLORE & DISCOVER
          </span>

          <h2>
            Discover Healthy <span>Foods</span>
          </h2>

          <p>
            Explore nutritious foods and make smarter choices
            for your daily wellness journey.
          </p>
        </div>

        {/* Search and Sorting */}
        <div className="food-explorer-controls">
          <div className="food-search-box">
            <span>🔍</span>

            <input
              type="text"
              placeholder="Search food by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <select
            className="food-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name">Sort by Name</option>
            <option value="calories-low">
              Calories: Low to High
            </option>
            <option value="calories-high">
              Calories: High to Low
            </option>
          </select>
        </div>

        {/* Category Filters */}
        <div className="food-category-list">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={`food-category-btn ${
                category === item ? "active" : ""
              }`}
              onClick={() => setCategory(item)}
            >
              {item === "All"
                ? "🌱"
                : categoryIcons[item]}{" "}
              {item}
            </button>
          ))}
        </div>

        {/* Error State */}
        {error ? (
          <div className="food-error">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="food-results-info">
              <p>
                Showing <strong>{filteredFoods.length}</strong>{" "}
                of <strong>{foods.length}</strong> foods
              </p>
            </div>

            {/* Empty State */}
            {filteredFoods.length === 0 ? (
              <div className="food-empty-state">
                <span>🥗</span>
                <h3>No foods found</h3>
                <p>
                  Try another search or select a different category.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCategory("All");
                  }}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              /* Food Cards */
              <div className="food-explorer-grid">
                {filteredFoods.map((food) => {
                  const nutrients = food.nutrients || {};

                  const imagePath =
                    food.image?.trim() || FALLBACK_IMAGE;

                  return (
                    <article
                      className="food-explorer-card"
                      key={food._id}
                    >
                      {/* Food Image */}
                      <div className="food-card-image-wrapper">
                        <img
                          src={imagePath}
                          alt={food.name}
                          className="food-card-image"
                          loading="lazy"
                          onError={(e) => {
                            if (e.currentTarget.dataset.fallback !== "true") {
                              e.currentTarget.dataset.fallback = "true";
                              e.currentTarget.src = FALLBACK_IMAGE;
                            }
                          }}
                        />

                        <span className="food-card-category">
                          {food.category || "Other"}
                        </span>
                      </div>

                      <div className="food-card-content">
                        <h3>{food.name}</h3>

                        <p className="food-card-description">
                          {food.description ||
                            "A nutritious choice for your daily diet."}
                        </p>

                        <div className="food-serving">
                          <span>Serving Size</span>

                          <strong>
                            {food.servingSize || "100g"}
                          </strong>
                        </div>

                        <div className="food-nutrition-details">
                          <div>
                            <strong>
                              {nutrients.calories ?? 0}
                            </strong>
                            <span>Calories</span>
                          </div>

                          <div>
                            <strong>
                              {nutrients.protein ?? 0}g
                            </strong>
                            <span>Protein</span>
                          </div>

                          <div>
                            <strong>
                              {nutrients.fiber ?? 0}g
                            </strong>
                            <span>Fiber</span>
                          </div>
                        </div>

                        <Link
                          to={`/foods/${food._id}`}
                          className="food-details-link"
                        >
                          View Details <span>→</span>
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default FoodExplorer;
