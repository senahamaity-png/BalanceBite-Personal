
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "./FamilyManagement.css";

const nutritionFields = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbohydrates", label: "Carbohydrates", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
  { key: "fiber", label: "Fiber", unit: "g" },
];

function FamilyManagement() {
  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);
  const [nutritionData, setNutritionData] = useState([]);

  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const localDate = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000
    );
    return localDate.toISOString().slice(0, 10);
  });

  const [loading, setLoading] = useState(true);
  const [nutritionLoading, setNutritionLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const storedUser = (() => {
    try {
      return JSON.parse(
        localStorage.getItem("balancebite_personal_user") || "{}"
      );
    } catch {
      return {};
    }
  })();

  const currentUserId = String(storedUser._id || storedUser.id || "");

  // The backend owners array is the source of truth.
  const isOwner = Boolean(
    currentUserId &&
      family?.owners?.some(
        (owner) =>
          String(owner?._id || owner?.id || owner) === currentUserId
      )
  );

  const fetchFamily = useCallback(async () => {
    try {
      setError("");

      const response = await api.get("/families/me");

      if (!response.data?.success || !response.data?.family) {
        throw new Error("Family information could not be loaded.");
      }

      setFamily(response.data.family);
      setMembers(
        Array.isArray(response.data.members) ? response.data.members : []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load family information."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNutritionOverview = useCallback(async () => {
    if (!isOwner) return;

    try {
      setNutritionLoading(true);

      const response = await api.get(
        `/families/nutrition-overview?date=${selectedDate}`
      );

      setNutritionData(
        Array.isArray(response.data?.members)
          ? response.data.members
          : []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load family nutrition progress."
      );
    } finally {
      setNutritionLoading(false);
    }
  }, [isOwner, selectedDate]);

  useEffect(() => {
    fetchFamily();
  }, [fetchFamily]);

  useEffect(() => {
    if (family && isOwner) {
      fetchNutritionOverview();
    }
  }, [family, isOwner, fetchNutritionOverview]);

  const handleCopyCode = async () => {
    if (!family?.inviteCode) return;

    try {
      await navigator.clipboard.writeText(family.inviteCode);
      setCopied(true);
      setSuccess("Invitation code copied successfully.");

      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Could not copy automatically. Please copy the code manually.");
    }
  };

  const handleRegenerateCode = async () => {
    const confirmed = window.confirm(
      "Regenerate the invitation code? The old code will no longer work for new members."
    );

    if (!confirmed) return;

    try {
      setRegenerating(true);
      setError("");
      setSuccess("");

      await api.put("/families/invite-code");
      await fetchFamily();

      setSuccess("Your invitation code has been regenerated.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not regenerate the invitation code."
      );
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="family-page">
        <div className="family-loading">
          <div className="family-spinner" />
          <p>Loading your family space...</p>
        </div>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="family-page">
        <main className="family-container">
          <h1>Family information unavailable</h1>
          <p>{error || "Your account is not connected to a family yet."}</p>

          <Link to="/dashboard" className="family-primary-button">
            Back to Dashboard
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="family-page">
      <header className="family-topbar">
        <Link to="/dashboard" className="family-brand">
          <span>🌿</span>
          <span>BalanceBite</span>
        </Link>

        <Link to="/dashboard" className="family-back-link">
          ← Dashboard
        </Link>
      </header>

      <main className="family-container">
        <section className="family-hero">
          <div>
            <span className="family-eyebrow">YOUR PRIVATE FAMILY SPACE</span>
            <h1>Family Management</h1>
            <p>
              Stay connected, grow healthy habits and manage your family
              nutrition space together.
            </p>
          </div>

          <div className="family-hero-art" aria-hidden="true">
            👨‍👩‍👧‍👦
          </div>
        </section>

        {error && (
          <div className="family-alert family-alert-error" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="family-alert family-alert-success" role="status">
            {success}
          </div>
        )}

        <section className="family-overview-grid">
          <article className="family-info-card family-main-card">
            <div className="family-card-icon">🏡</div>
            <span className="family-card-label">YOUR FAMILY</span>
            <h2>{family.name}</h2>
            <p>
              Created{" "}
              {family.createdAt
                ? new Date(family.createdAt).toLocaleDateString()
                : "recently"}
            </p>
          </article>

          <article className="family-info-card">
            <div className="family-card-icon">👥</div>
            <span className="family-card-label">FAMILY MEMBERS</span>
            <h2>{members.length}</h2>
            <p>Connected accounts</p>
          </article>

          <article className="family-info-card">
            <div className="family-card-icon">🔐</div>
            <span className="family-card-label">YOUR ROLE</span>
            <h2>{isOwner ? "Owner" : "Member"}</h2>
            <p>Family account access</p>
          </article>
        </section>

        {/* Family Members */}
        <section className="family-section">
          <div className="family-section-heading">
            <div>
              <span className="family-eyebrow">CONNECTED ACCOUNTS</span>
              <h2>Family Members</h2>
            </div>

            <span className="family-count">{members.length} Members</span>
          </div>

          <div className="family-members-grid">
            {members.map((member) => {
              const memberIsOwner = member.familyRole === "owner";
              const isCurrentUser = String(member._id) === currentUserId;

              return (
                <article className="family-member-card" key={member._id}>
                  <div className="family-member-avatar">
                    {(member.name || "U").charAt(0).toUpperCase()}
                  </div>

                  <div className="family-member-details">
                    <h3>
                      {member.name}
                      {isCurrentUser ? " (You)" : ""}
                    </h3>

                    <p>{member.email}</p>

                    <span
                      className={`family-role ${
                        memberIsOwner ? "owner-role" : ""
                      }`}
                    >
                      {memberIsOwner ? "Owner" : "Member"}
                    </span>
                  </div>
                </article>
              );
            })}

            {members.length === 0 && (
              <p>No family members are connected yet.</p>
            )}
          </div>
        </section>

        {/* Family Nutrition Overview */}
        {isOwner && (
          <section className="family-section nutrition-overview-section">
            <div className="family-section-heading">
              <div>
                <span className="family-eyebrow">HEALTH INSIGHTS</span>
                <h2>Family Nutrition Overview</h2>
                <p>View each family member's daily nutrition progress.</p>
              </div>
            </div>

            <div className="nutrition-date-control">
              <label htmlFor="nutrition-date">Select date</label>

              <input
                id="nutrition-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />

              <button
                type="button"
                onClick={fetchNutritionOverview}
                disabled={nutritionLoading}
              >
                {nutritionLoading ? "Loading..." : "Refresh"}
              </button>
            </div>

            {nutritionLoading ? (
              <p className="nutrition-loading">
                Loading nutrition progress...
              </p>
            ) : (
              <div className="nutrition-members-grid">
                {nutritionData.map((member) => (
                  <article
                    className="nutrition-member-card"
                    key={member.userId}
                  >
                    <div className="nutrition-member-heading">
                      <div className="family-member-avatar">
                        {(member.name || "U").charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <h3>{member.name}</h3>
                        <span>{member.familyRole}</span>
                      </div>
                    </div>

                    <p className="nutrition-entry-count">
                      {member.entryCount} food entries
                    </p>

                    <div className="nutrition-progress-list">
                      {nutritionFields.map((field) => {
                        const total = Number(
                          member.totals?.[field.key] || 0
                        );

                        const goal = Number(
                          member.goals?.[field.key] || 0
                        );

                        const progress = Number(
                          member.progress?.[field.key] || 0
                        );

                        const barWidth = Math.min(
                          Math.max(progress, 0),
                          100
                        );

                        return (
                          <div
                            className="nutrition-progress-item"
                            key={field.key}
                          >
                            <div className="nutrition-progress-label">
                              <span>{field.label}</span>

                              <strong>
                                {total} / {goal} {field.unit}
                              </strong>
                            </div>

                            <div className="nutrition-progress-track">
                              <div
                                className="nutrition-progress-fill"
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>

                            <small>{progress}% of daily goal</small>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))}

                {nutritionData.length === 0 && (
                  <p>No family nutrition data found for this date.</p>
                )}
              </div>
            )}
          </section>
        )}

        {!isOwner && (
          <section className="family-member-notice">
            <h2>Your Nutrition Space</h2>
            <p>
              Your food diary and nutrition goals are private to your account.
              Visit your dashboard to manage your personal nutrition.
            </p>

            <Link to="/diary" className="family-primary-button">
              Open My Food Diary
            </Link>
          </section>
        )}

        {/* Invitation Section */}
        <section className="family-invite-section">
          <div>
            <span className="family-eyebrow">GROW YOUR FAMILY</span>
            <h2>Invite a Family Member</h2>
            <p>
              Share your invitation code with someone you want to add to
              your family.
              <br />
              New members automatically join with Member access.
            </p>
          </div>

          <div className="family-invite-code">
            <span>INVITATION CODE</span>
            <strong>{family.inviteCode || "Not available"}</strong>

            <div className="family-invite-actions">
              <button
                type="button"
                onClick={handleCopyCode}
                disabled={!family.inviteCode}
              >
                {copied ? "Copied!" : "Copy Code"}
              </button>

              {isOwner && (
                <button
                  type="button"
                  className="family-regenerate-button"
                  onClick={handleRegenerateCode}
                  disabled={regenerating}
                >
                  {regenerating ? "Regenerating..." : "Regenerate"}
                </button>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default FamilyManagement;
