import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "./WeightTracker.css";

function getLocalDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return parts;
}

function formatDate(dateKey) {
  if (!dateKey) return "—";

  return new Date(`${dateKey}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function getBmiDescription(bmi) {
  if (bmi === null || bmi === undefined) {
    return "Add your height in your profile to calculate BMI.";
  }

  if (bmi < 18.5) return "Below the standard adult BMI range.";
  if (bmi < 25) return "Within the standard adult BMI range.";
  if (bmi < 30) return "Above the standard adult BMI range.";
  return "In the obesity BMI range.";
}

export default function WeightTracker() {
  const [history, setHistory] = useState([]);
  const [heightCm, setHeightCm] = useState(null);
  const [weightKg, setWeightKg] = useState("");
  const [dateKey, setDateKey] = useState(getLocalDateKey());
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadWeightHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/weight");

      setHistory(response.data.history || []);
      setHeightCm(response.data.heightCm ?? null);
    } catch (err) {
      console.error("Load weight history error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load weight history."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeightHistory();
  }, [loadWeightHistory]);

  const latest = history[0] || null;

  const previous = history.length > 1 ? history[1] : null;

  const weightDifference =
    latest && previous
      ? Number((latest.weightKg - previous.weightKg).toFixed(1))
      : null;

  const latestBMI = latest?.bmi ?? null;

  const chartData = useMemo(
    () => [...history].reverse().slice(-10),
    [history]
  );

  const chartPoints = useMemo(() => {
    if (chartData.length === 0) return "";

    const values = chartData.map((item) => item.weightKg);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return chartData
      .map((item, index) => {
        const x =
          chartData.length === 1
            ? 50
            : 10 + (index / (chartData.length - 1)) * 180;

        const y = 90 - ((item.weightKg - min) / range) * 65;

        return `${x},${y}`;
      })
      .join(" ");
  }, [chartData]);

  async function handleSubmit(event) {
    event.preventDefault();

    const numericWeight = Number(weightKg);

    if (
      !Number.isFinite(numericWeight) ||
      numericWeight < 2 ||
      numericWeight > 500
    ) {
      setError("Enter a valid weight between 2 and 500 kg.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (editingId) {
        const response = await api.put(`/weight/${editingId}`, {
          weightKg: numericWeight,
          note,
        });

        setSuccess(
          response.data.message || "Weight updated successfully."
        );
      } else {
        const response = await api.post("/weight", {
          weightKg: numericWeight,
          dateKey,
          note,
        });

        setSuccess(
          response.data.message || "Weight saved successfully."
        );
      }

      setWeightKg("");
      setNote("");
      setEditingId(null);

      await loadWeightHistory();
    } catch (err) {
      console.error("Save weight error:", err);

      setError(
        err.response?.data?.message ||
          "Could not save your weight. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  function startEditing(item) {
    setEditingId(item._id);
    setWeightKg(String(item.weightKg));
    setDateKey(item.dateKey);
    setNote(item.note || "");
    setError("");
    setSuccess("");
  }

  function cancelEditing() {
    setEditingId(null);
    setWeightKg("");
    setNote("");
    setDateKey(getLocalDateKey());
    setError("");
    setSuccess("");
  }

  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this weight record?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      const response = await api.delete(`/weight/${id}`);

      setSuccess(
        response.data.message || "Weight record deleted."
      );

      if (editingId === id) {
        cancelEditing();
      }

      await loadWeightHistory();
    } catch (err) {
      console.error("Delete weight error:", err);

      setError(
        err.response?.data?.message ||
          "Could not delete the weight record."
      );
    }
  }

  return (
    <section className="weight-tracker">
      <div className="weight-header">
        <div>
          <span className="weight-eyebrow">HEALTH & FITNESS</span>
          <h2>Weight Tracking</h2>
          <p>
            Track your weight over time and understand your progress.
          </p>
        </div>

        <div className="weight-header-icon">⚖️</div>
      </div>

      {error && (
        <div className="weight-alert error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="weight-alert success" role="status">
          {success}
        </div>
      )}

      <div className="weight-summary-grid">
        <article className="weight-summary-card">
          <span>Latest Weight</span>
          <strong>
            {latest ? `${latest.weightKg} kg` : "—"}
          </strong>
          <small>
            {latest ? formatDate(latest.dateKey) : "No records yet"}
          </small>
        </article>

        <article className="weight-summary-card">
          <span>Change Since Previous Entry</span>
          <strong>
            {weightDifference === null
              ? "—"
              : `${weightDifference > 0 ? "+" : ""}${weightDifference} kg`}
          </strong>
          <small>
            {weightDifference === null
              ? "Add another entry to compare"
              : weightDifference > 0
                ? "Weight increased"
                : weightDifference < 0
                  ? "Weight decreased"
                  : "No change"}
          </small>
        </article>

        <article className="weight-summary-card">
          <span>Body Mass Index (BMI)</span>
          <strong>{latestBMI ?? "—"}</strong>
          <small>
            {latest?.bmiCategory || "Height required"}
          </small>
        </article>

        <article className="weight-summary-card">
          <span>Total Records</span>
          <strong>{history.length}</strong>
          <small>Saved weight entries</small>
        </article>
      </div>

      <div className="weight-main-grid">
        <div className="weight-panel">
          <div className="weight-panel-heading">
            <div>
              <h3>{editingId ? "Edit Weight" : "Add Weight"}</h3>
              <p>Record your weight in kilograms.</p>
            </div>
            <span>＋</span>
          </div>

          <form onSubmit={handleSubmit} className="weight-form">
            <label htmlFor="weightKg">Weight (kg)</label>
            <input
              id="weightKg"
              type="number"
              min="2"
              max="500"
              step="0.1"
              placeholder="e.g. 65.5"
              value={weightKg}
              onChange={(event) => setWeightKg(event.target.value)}
              required
            />

            <label htmlFor="weightDate">Date</label>
            <input
              id="weightDate"
              type="date"
              value={dateKey}
              max={getLocalDateKey()}
              onChange={(event) => setDateKey(event.target.value)}
              disabled={Boolean(editingId)}
              required
            />

            <label htmlFor="weightNote">Note (optional)</label>
            <textarea
              id="weightNote"
              rows="3"
              maxLength="250"
              placeholder="e.g. Morning weight"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />

            <button
              type="submit"
              className="weight-save-button"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Weight"
                  : "Save Weight"}
            </button>

            {editingId && (
              <button
                type="button"
                className="weight-secondary-button"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel Edit
              </button>
            )}
          </form>

          <div className="weight-bmi-info">
            <strong>Your height: </strong>
            {heightCm ? `${heightCm} cm` : "Not added to profile"}
            <p>
              {getBmiDescription(latestBMI)}
            </p>
          </div>
        </div>

        <div className="weight-panel weight-chart-panel">
          <div className="weight-panel-heading">
            <div>
              <h3>Weight Progress</h3>
              <p>Your latest 10 recorded entries.</p>
            </div>
            <span>↗</span>
          </div>

          {chartData.length > 0 ? (
            <>
              <div className="weight-chart">
                <svg
                  viewBox="0 0 200 110"
                  role="img"
                  aria-label="Weight progress line chart"
                >
                  <line
                    x1="10"
                    y1="90"
                    x2="190"
                    y2="90"
                    stroke="currentColor"
                    opacity="0.15"
                  />

                  <polyline
                    points={chartPoints}
                    fill="none"
                    stroke="#16a085"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {chartPoints.split(" ").map((point, index) => {
                    const [x, y] = point.split(",");

                    return (
                      <circle
                        key={index}
                        cx={x}
                        cy={y}
                        r="3.5"
                        fill="#16a085"
                      />
                    );
                  })}
                </svg>
              </div>

              <div className="weight-chart-labels">
                <span>{formatDate(chartData[0].dateKey)}</span>
                <span>
                  {formatDate(chartData[chartData.length - 1].dateKey)}
                </span>
              </div>
            </>
          ) : (
            <div className="weight-empty-chart">
              <span>📈</span>
              <strong>No weight history yet</strong>
              <p>Save your first weight entry to see your progress chart.</p>
            </div>
          )}

          <div className="weight-chart-note">
            The chart shows recorded weight values, not a medical assessment.
          </div>
        </div>
      </div>

      <div className="weight-panel weight-history-panel">
        <div className="weight-panel-heading">
          <div>
            <h3>Weight History</h3>
            <p>Review, edit or delete your previous records.</p>
          </div>
          <span>📋</span>
        </div>

        {loading ? (
          <p className="weight-empty-message">Loading weight history...</p>
        ) : history.length === 0 ? (
          <p className="weight-empty-message">
            No weight records found. Add your first entry above.
          </p>
        ) : (
          <div className="weight-table-wrapper">
            <table className="weight-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Weight</th>
                  <th>BMI</th>
                  <th>Note</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {history.map((item) => (
                  <tr key={item._id}>
                    <td>{formatDate(item.dateKey)}</td>
                    <td>
                      <strong>{item.weightKg} kg</strong>
                    </td>
                    <td>
                      {item.bmi ?? "—"}
                      {item.bmiCategory && (
                        <small className="weight-bmi-category">
                          {item.bmiCategory}
                        </small>
                      )}
                    </td>
                    <td>{item.note || "—"}</td>
                    <td>
                      <div className="weight-row-actions">
                        <button
                          type="button"
                          onClick={() => startEditing(item)}
                          aria-label="Edit weight"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="delete"
                          onClick={() => handleDelete(item._id)}
                          aria-label="Delete weight"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}