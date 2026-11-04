
import { useEffect, useState } from "react";
import api from "../services/api";
import "./HeightProfile.css";

function HeightProfile() {
  const [height, setHeight] = useState("");
  const [savedHeight, setSavedHeight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get("/auth/profile");

        const profile = response.data?.profile?.profile;
        const currentHeight = profile?.height;

        if (currentHeight != null && Number(currentHeight) > 0) {
          setHeight(String(currentHeight));
          setSavedHeight(Number(currentHeight));
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
          "Unable to load your profile."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    const heightValue = Number(height);

    if (
      !Number.isFinite(heightValue) ||
      heightValue < 50 ||
      heightValue > 250
    ) {
      setError("Please enter a valid height between 50 and 250 cm.");
      return;
    }

    try {
      setSaving(true);

      const response = await api.put("/auth/profile", {
        height: heightValue,
      });

      const updatedHeight = Number(
        response.data?.profile?.height ?? heightValue
      );

      setSavedHeight(updatedHeight);
      setHeight(String(updatedHeight));
      setMessage("Your height has been saved successfully! 💚");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to save your height. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="height-profile-card">
      <div className="height-profile-header">
        <div className="height-profile-icon">📏</div>

        <div>
          <span className="height-profile-eyebrow">
            PERSONAL INFORMATION
          </span>
          <h2>My Body Profile</h2>
          <p>Keep your body measurements updated.</p>
        </div>
      </div>

      {loading ? (
        <p className="height-profile-loading">
          Loading your profile...
        </p>
      ) : (
        <form onSubmit={handleSave}>
          <div className="height-profile-content">
            <label htmlFor="profile-height">
              Your Height <span>(centimeters)</span>
            </label>

            <div className="height-input-wrapper">
              <input
                id="profile-height"
                type="number"
                min="50"
                max="250"
                step="0.1"
                placeholder="Enter your height"
                value={height}
                onChange={(event) => setHeight(event.target.value)}
                required
              />

              <span>cm</span>
            </div>

            <p className="height-profile-hint">
              Your height is used to calculate your BMI in Weight Tracker.
            </p>
          </div>

          {savedHeight && (
            <div className="saved-height">
              <span>Currently saved height</span>
              <strong>{savedHeight} cm</strong>
            </div>
          )}

          {message && (
            <p className="height-profile-success">{message}</p>
          )}

          {error && (
            <p className="height-profile-error">{error}</p>
          )}

          <button
            type="submit"
            className="height-save-btn"
            disabled={saving || !height}
          >
            {saving ? "Saving..." : "Save Height"}
            {!saving && <span> →</span>}
          </button>
        </form>
      )}
    </section>
  );
}

export default HeightProfile;
