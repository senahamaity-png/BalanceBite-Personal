import { useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";

import api from "../services/api";

function Login() {
  const navigate =
    useNavigate();

  const [form, setForm] =
    useState({
      email: "",
      password: "",
    });

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]:
        e.target.value,
    });
  };

  const handleSubmit =
    async (e) => {
      e.preventDefault();

      setMessage("");
      setLoading(true);

      try {
        const response =
          await api.post(
            "/auth/login",
            form
          );

        localStorage.setItem(
          "balancebite_personal_token",
          response.data.token
        );

        localStorage.setItem(
          "balancebite_personal_user",
          JSON.stringify(
            response.data.user
          )
        );

        navigate("/dashboard");
      } catch (error) {
        setMessage(
          error.response?.data
            ?.message ||
            "Login failed"
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="logo">
          BalanceBite
        </div>

        <div className="logo-subtitle">
          SMART NUTRITION
        </div>

        <h1>
          Welcome Back
        </h1>

        <p className="subtitle">
          Continue your
          nutrition journey.
        </p>

        <form
          onSubmit={
            handleSubmit
          }
        >
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={form.email}
            onChange={
              handleChange
            }
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={
              handleChange
            }
            required
          />

          {message && (
            <div className="error">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>
        </form>

        <p className="bottom-text">
          Don't have an account?{" "}
          <Link to="/register">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
