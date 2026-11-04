
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import api from "../services/api";
import DashboardNutritionSummary from "../components/DashboardNutritionSummary";
import NutritionInsights from "../components/NutritionInsights";
import AIAssistant from "../components/AIAssistant";
import WaterTracker from "../components/WaterTracker";
import WeightTracker from "../components/WeightTracker";

function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("balancebite_personal_user");
    const token = localStorage.getItem("balancebite_personal_token");

    if (!storedUser || !token) {
      navigate("/login");
      return;
    }

    try {
      setUser(JSON.parse(storedUser));
    } catch {
      localStorage.removeItem("balancebite_personal_user");
      localStorage.removeItem("balancebite_personal_token");
      navigate("/login");
      return;
    }

    const fetchFoods = async () => {
      try {
        const response = await api.get("/foods");

        const foodList = Array.isArray(response.data.foods)
          ? response.data.foods
          : Array.isArray(response.data)
            ? response.data
            : [];

        setFoods(foodList);
      } catch (error) {
        console.error("Failed to fetch foods:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFoods();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("balancebite_personal_token");
    localStorage.removeItem("balancebite_personal_user");
    navigate("/login");
  };

  const getFoodImage = (image) => {
    if (!image) return "";

    if (image.startsWith("http")) {
      return image;
    }

    return `${image.startsWith("/") ? "" : "/"}${image}`;
  };

  return (
    <div className="dashboard">

      {/* NAVBAR */}
      <nav className="navbar">

        <Link to="/dashboard" className="dashboard-brand">
          <div className="logo">🌿</div>

          <div className="brand-details">
            <h1>BalanceBite</h1>

            <p className="brand-tagline">
              Where Nutrition Meets Balance
            </p>

            <p className="nav-subtitle">
              Smart Nutrition • Healthy Choices • Balanced Living
            </p>
          </div>
        </Link>

        <div className="dashboard-nav-actions">

          <Link to="/dashboard" className="dashboard-nav-link active">
            Overview
          </Link>

          <Link to="/foods" className="dashboard-nav-link">
            Food Explorer
          </Link>

          <Link to="/diary" className="dashboard-nav-link">
            Food Diary
          </Link>

          <Link to="/nutrition-goals" className="dashboard-nav-link">
            Goals
          </Link>

          <Link to="/meal-planner" className="dashboard-nav-link">
            Meal Planner
          </Link>

          <Link to="/family" className="dashboard-nav-link">
            👨‍👩‍👧 Family
          </Link>

          {user?.role === "admin" && (
            <Link to="/admin" className="dashboard-nav-link">
              🛡️ Admin Dashboard
            </Link>
          )}

          <button className="logout-btn" onClick={handleLogout}>
            Logout ↗
          </button>

        </div>
      </nav>

      <main className="dashboard-content">

        {/* HERO SECTION */}
        <section className="hero">

          <div className="hero-content">

            <span className="eyebrow">
              ✨ YOUR PERSONAL NUTRITION SPACE
            </span>

            <h1>
              Hello, {user?.name || "there"} 👋
            </h1>

            <p>
              Welcome to your healthier lifestyle.
              Make smarter food choices, track your nutrition
              and build better habits every day.
            </p>

            <div className="hero-actions">

              <Link to="/foods" className="dashboard-primary-link">
                Explore Foods <span>→</span>
              </Link>

              <Link to="/diary" className="dashboard-secondary-link">
                + Add Today's Meal
              </Link>

            </div>

          </div>

          <div className="hero-visual">
            <div className="hero-icon">🥗</div>
            <div className="hero-floating-icon">🍃</div>

            <div className="hero-floating-text">
              <span>Healthy choices</span>
              <strong>Happy life!</strong>
            </div>
          </div>

        </section>

        {/* QUICK STATS */}
        <section className="stats">

          <div className="stat-card stat-green">
            <div className="stat-top">
              <div className="stat-icon">🔥</div>
              <span className="stat-tag">DAILY TARGET</span>
            </div>

            <p>Daily Calorie Target</p>

            <h2>
              <Link to="/nutrition-goals">
                Set your goal <span>→</span>
              </Link>
            </h2>
          </div>

          <div className="stat-card stat-purple">
            <div className="stat-top">
              <div className="stat-icon">📔</div>
              <span className="stat-tag">DAILY TRACKING</span>
            </div>

            <p>Food Diary</p>

            <h2>
              <Link to="/diary">
                Track your meals <span>→</span>
              </Link>
            </h2>
          </div>

          <div className="stat-card stat-orange">
            <div className="stat-top">
              <div className="stat-icon">🥑</div>
              <span className="stat-tag">FOOD LIBRARY</span>
            </div>

            <p>Foods Available</p>
            <h2>{foods.length} <small>Foods</small></h2>
          </div>

        </section>

        {/* NUTRITION SUMMARY */}
        <section className="dashboard-section">
          <DashboardNutritionSummary />
        </section>

        {/* WATER TRACKING */}
        <section className="dashboard-section">
          <WaterTracker />
        </section>

        {/* WEIGHT TRACKING */}
        <section className="dashboard-section">
          <WeightTracker />
        </section>

        {/* NUTRITION INSIGHTS */}
        <section className="dashboard-section">
          <NutritionInsights />
        </section>

        {/* AI ASSISTANT */}
        <section
          className="dashboard-ai-section"
          id="nutrition-agent"
        >
          <AIAssistant />
        </section>

        {/* FOOD EXPLORER */}
        <section className="food-section">

          <div className="section-title">

            <div>
              <span className="eyebrow">
                🌱 EXPLORE & DISCOVER
              </span>

              <h2>Discover Healthy Foods</h2>

              <p>
                Explore nutritious foods and learn what makes
                every bite count.
              </p>
            </div>

            <Link to="/foods" className="food-count">
              View all {foods.length} foods →
            </Link>

          </div>

          {loading ? (

            <div className="loading">
              <span className="loading-icon">🌿</span>
              <p>Preparing your food collection...</p>
            </div>

          ) : foods.length === 0 ? (

            <div className="loading">
              No foods found. Please check your backend food API.
            </div>

          ) : (

            <div className="food-grid">

              {foods.slice(0, 6).map((food) => (

                <article className="food-card" key={food._id}>

                  <div className="dashboard-food-image-wrap">

                    {food.image ? (
                      <img
                        className="dashboard-food-image"
                        src={getFoodImage(food.image)}
                        alt={food.name}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";

                          const placeholder =
                            event.currentTarget.nextElementSibling;

                          if (placeholder) {
                            placeholder.style.display = "flex";
                          }
                        }}
                      />
                    ) : null}

                    <div
                      className="dashboard-food-placeholder"
                      style={{
                        display: food.image ? "none" : "flex"
                      }}
                      aria-hidden="true"
                    >
                      🥗
                    </div>

                    <span className="food-image-label">
                      Healthy Choice
                    </span>

                  </div>

                  <div className="food-card-content">

                    <div className="food-top">

                      <span className="dashboard-category">
                        {food.category}
                      </span>

                      <span className="food-leaf">🌿</span>

                    </div>

                    <h3>{food.name}</h3>

                    <p>{food.description}</p>

                    <div className="nutrition-row">

                      <div>
                        <strong>
                          {Number(food.nutrients?.calories || 0)}
                        </strong>
                        <span>Calories</span>
                      </div>

                      <div>
                        <strong>
                          {Number(food.nutrients?.protein || 0)}g
                        </strong>
                        <span>Protein</span>
                      </div>

                      <div>
                        <strong>
                          {Number(food.nutrients?.fiber || 0)}g
                        </strong>
                        <span>Fiber</span>
                      </div>

                    </div>

                    <Link
                      to={`/foods/${food._id}`}
                      className="dashboard-food-link"
                    >
                      Explore Food Details <span>→</span>
                    </Link>

                  </div>

                </article>

              ))}

            </div>

          )}

        </section>

        {/* FOOTER */}
        <footer className="dashboard-footer">

          <div className="footer-brand">
            🌿 BalanceBite
          </div>

          <p>
            Better food choices, healthier habits.
          </p>

          <span>
            <b>Made for a healthier you 💚</b>
          </span>

        </footer>

      </main>
    </div>
  );
}

export default Dashboard;
