
import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import "./WaterTracker.css";

function WaterTracker() {
  const [water, setWater] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [goalInput, setGoalInput] = useState("2500");
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchWater = useCallback(async () => {
    try {
      setError("");
      const response = await api.get("/water/today");
      setWater(response.data);
      setGoalInput(String(response.data.dailyGoalMl));
    } catch (err) {
      console.error("Water fetch error:", err);
      setError(
        err.response?.data?.message ||
        "Unable to load today's water records."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWater();
  }, [fetchWater]);

  const addWater = async (amountMl) => {
    if (
      !Number.isInteger(amountMl) ||
      amountMl < 1 ||
      amountMl > 5000
    ) {
      setError("Please enter a whole number between 1 and 5000 ml.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await api.post("/water", { amountMl });

      setMessage(`${amountMl} ml water added successfully!`);
      setCustomAmount("");
      await fetchWater();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Failed to add water. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const updateGoal = async (event) => {
    event.preventDefault();

    const dailyGoalMl = Number(goalInput);

    if (
      !Number.isInteger(dailyGoalMl) ||
      dailyGoalMl < 500 ||
      dailyGoalMl > 10000
    ) {
      setError("Daily goal must be between 500 and 10000 ml.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await api.put("/water/goal", { dailyGoalMl });

      setMessage("Your daily water goal has been updated!");
      setShowGoalEditor(false);
      await fetchWater();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to update your water goal."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteWater = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this water entry?"
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await api.delete(`/water/${id}`);

      setMessage("Water entry deleted successfully!");
      await fetchWater();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to delete this water entry."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="water-card water-loading">
        <div className="water-loading-icon">💧</div>
        <p>Loading your hydration tracker...</p>
      </section>
    );
  }

  if (!water) {
    return (
      <section className="water-card">
        <h2>💧 Water Tracker</h2>
        <p>{error || "Water information is unavailable."}</p>
        <button
          className="water-button water-primary"
          onClick={fetchWater}
        >
          Try Again
        </button>
      </section>
    );
  }

  const progress = water.progressPercentage || 0;
  const total = water.totalWaterMl || 0;
  const goal = water.dailyGoalMl || 2500;
  const remaining = water.remainingMl || 0;

  return (
    <section className="water-card">
      <div className="water-header">
        <div>
          <span className="water-eyebrow">DAILY HYDRATION</span>
          <h2>💧 Water Tracker</h2>
          <p>Stay hydrated, feel refreshed and build healthy habits.</p>
        </div>

        <div className="water-date">
          {water.dateKey}
        </div>
      </div>

      {message && (
        <div className="water-message" role="status">
          ✓ {message}
        </div>
      )}

      {error && (
        <div className="water-error" role="alert">
          {error}
        </div>
      )}

      <div className="water-progress-area">
        <div className="water-progress-top">
          <div>
            <span className="water-muted">Consumed today</span>
            <h3>
              {total.toLocaleString()}{" "}
              <small>ml</small>
            </h3>
          </div>

          <div className="water-percentage">
            <strong>{progress}%</strong>
            <span>of daily goal</span>
          </div>
        </div>

        <div
          className="water-progress-track"
          role="progressbar"
          aria-label="Daily water goal progress"
          aria-valuenow={progress}
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div
            className="water-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="water-progress-bottom">
          <span>0 ml</span>
          <span>{goal.toLocaleString()} ml goal</span>
        </div>

        <div className="water-remaining">
          <span>💦</span>
          <p>
            {remaining > 0
              ? `${remaining.toLocaleString()} ml remaining to reach your goal`
              : "Amazing! You have reached your daily water goal."}
          </p>
        </div>
      </div>

      <div className="water-quick-add">
        <div className="water-section-heading">
          <h3>Quick Add Water</h3>
          <span>Choose your amount</span>
        </div>

        <div className="water-quick-buttons">
          {[250, 500, 750].map((amount) => (
            <button
              key={amount}
              className="water-quick-button"
              disabled={saving}
              onClick={() => addWater(amount)}
            >
              <span>💧</span>
              <strong>{amount} ml</strong>
              <small>Add water</small>
            </button>
          ))}
        </div>

        <form
          className="water-custom-form"
          onSubmit={(event) => {
            event.preventDefault();
            addWater(Number(customAmount));
          }}
        >
          <label htmlFor="customWaterAmount">
            Custom amount (ml)
          </label>

          <div className="water-custom-controls">
            <input
              id="customWaterAmount"
              type="number"
              min="1"
              max="5000"
              step="1"
              placeholder="Enter amount"
              value={customAmount}
              onChange={(event) =>
                setCustomAmount(event.target.value)
              }
            />

            <button
              type="submit"
              disabled={saving || !customAmount}
              className="water-button water-primary"
            >
              {saving ? "Please wait..." : "+ Add"}
            </button>
          </div>
        </form>
      </div>

      <div className="water-goal-section">
        <div>
          <h3>Daily Water Goal</h3>
          <p>Your current target is {goal.toLocaleString()} ml.</p>
        </div>

        <button
          type="button"
          className="water-button water-outline"
          onClick={() => {
            setGoalInput(String(goal));
            setShowGoalEditor((current) => !current);
            setError("");
          }}
        >
          {showGoalEditor ? "Cancel" : "Edit Goal"}
        </button>
      </div>

      {showGoalEditor && (
        <form className="water-goal-form" onSubmit={updateGoal}>
          <label htmlFor="waterGoalInput">
            New daily goal (500–10000 ml)
          </label>

          <div className="water-custom-controls">
            <input
              id="waterGoalInput"
              type="number"
              min="500"
              max="10000"
              step="1"
              value={goalInput}
              onChange={(event) =>
                setGoalInput(event.target.value)
              }
            />

            <button
              type="submit"
              disabled={saving}
              className="water-button water-primary"
            >
              Save Goal
            </button>
          </div>
        </form>
      )}

      <div className="water-history">
        <div className="water-section-heading">
          <h3>Today's Water History</h3>
          <span>{water.entryCount || 0} entries</span>
        </div>

        {water.logs?.length > 0 ? (
          <div className="water-history-list">
            {water.logs.map((log) => (
              <div className="water-history-item" key={log._id}>
                <div className="water-history-icon">💧</div>

                <div className="water-history-details">
                  <strong>{log.amountMl} ml</strong>
                  <span>
                    {new Date(log.createdAt).toLocaleTimeString(
                      "en-IN",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                        timeZone: "Asia/Kolkata",
                      }
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  className="water-delete-button"
                  disabled={saving}
                  onClick={() => deleteWater(log._id)}
                  aria-label={`Delete ${log.amountMl} ml water entry`}
                  title="Delete entry"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="water-empty">
            <span>🥤</span>
            <p>No water entries yet. Start by adding a glass of water!</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default WaterTracker;
