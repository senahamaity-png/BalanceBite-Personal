
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    inviteCode: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await api.post("/auth/register", {
        ...form,
        inviteCode: form.inviteCode.trim().toUpperCase(),
      });

      localStorage.setItem(
        "balancebite_personal_token",
        response.data.token
      );

      localStorage.setItem(
        "balancebite_personal_user",
        JSON.stringify(response.data.user)
      );

      navigate("/dashboard");
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h2>BalanceBite</h2>
          <span>SMART NUTRITION</span>
        </div>

        <h1>Create Account</h1>
        <p className="auth-subtitle">
          Create your personal nutrition account.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={6}
          />

          <div className="invite-code-field">
            <label htmlFor="inviteCode">
              Family Invitation Code (Optional)
            </label>

            <input
              id="inviteCode"
              type="text"
              name="inviteCode"
              placeholder="Enter family invitation code"
              value={form.inviteCode}
              onChange={handleChange}
            />

            <small>
              Enter a code to join an existing family. Leave it empty to
              create a new family.
            </small>
          </div>

          {message && <p className="auth-error">{message}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
