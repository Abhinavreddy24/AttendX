import React, { useState } from "react";

import {
  ArrowLeft,
  ArrowRight,
  Lock,
  UserRound,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

const API_BASE_URL = "/api";

function FacultyLogin({ onBack, onLogin }) {
  const [facultyId, setFacultyId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    if (!facultyId.trim() || !password.trim()) {
      setError("Please enter Faculty ID and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: facultyId.trim(),
            password: password,
          }),
        }
      );

      const data = await response.json();

      console.log("Faculty login response:", data);

      if (!response.ok) {
        throw new Error(
          data.detail || "Invalid Faculty ID or password."
        );
      }

      if (data.role !== "faculty") {
        throw new Error(
          "This account is not a faculty account."
        );
      }

      // Send the complete faculty login data to App.jsx
      onLogin(data);
    } catch (err) {
      console.error("Faculty login error:", err);

      setError(
        err.message ||
          "Unable to login. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="faculty-login-page">

      {/* Top navigation */}
      <div className="faculty-login-topbar">
        <button
          className="faculty-back-button"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft size={17} />
          Back to Home
        </button>

        <div className="faculty-brand">
          <div className="faculty-brand-mark">
            <UserRound size={20} />
          </div>

          <div>
            <strong>AttendX</strong>
            <span>HITAM</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="faculty-login-main">

        {/* Introduction */}
        <section className="faculty-login-intro">

          <div className="faculty-intro-label">
            FACULTY PORTAL
          </div>

          <h1>
            Manage attendance.
            <br />
            <span>With confidence.</span>
          </h1>

          <p>
            Access your faculty portal to create attendance
            sessions, monitor live attendance, manage students,
            and generate reports.
          </p>

          <div className="faculty-security-note">
            <div className="faculty-security-icon">
              <ShieldCheck size={19} />
            </div>

            <div>
              <strong>
                Authorized faculty access
              </strong>

              <span>
                Use the Faculty ID and credentials provided
                by your college administration.
              </span>
            </div>
          </div>

        </section>

        {/* Login card */}
        <section className="faculty-login-card">

          <div className="faculty-card-heading">

            <div className="faculty-login-icon">
              <UserRound size={26} />
            </div>

            <div>
              <div className="faculty-card-kicker">
                ATTENDX
              </div>

              <h2>Faculty Login</h2>
            </div>

          </div>

          <p className="faculty-login-description">
            Sign in to access your faculty attendance portal.
          </p>

          <form onSubmit={handleLogin}>

            {/* Faculty ID */}
            <div className="faculty-form-group">

              <label htmlFor="facultyId">
                Faculty ID
              </label>

              <div className="faculty-input-wrapper">

                <UserRound size={17} />

                <input
                  id="facultyId"
                  type="text"
                  placeholder="Enter Faculty ID"
                  value={facultyId}
                  onChange={(e) =>
                    setFacultyId(e.target.value)
                  }
                  autoComplete="username"
                />

              </div>

            </div>

            {/* Password */}
            <div className="faculty-form-group">

              <label htmlFor="facultyPassword">
                Password
              </label>

              <div className="faculty-input-wrapper">

                <Lock size={17} />

                <input
                  id="facultyPassword"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="faculty-password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (current) => !current
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}
                </button>

              </div>

            </div>

            {/* Error */}
            {error && (
              <div className="faculty-login-error">
                <span>!</span>
                <p>{error}</p>
              </div>
            )}

            {/* Login */}
            <button
              type="submit"
              className="faculty-login-submit"
              disabled={loading}
            >
              {loading
                ? "Signing in..."
                : "Sign in"}

              {!loading && (
                <ArrowRight size={18} />
              )}
            </button>

          </form>

          <div className="faculty-login-divider">
            <span>
              COLLEGE AUTHORIZED ACCOUNT
            </span>
          </div>

          <div className="faculty-login-meta">
            <span>HITAM</span>
            <span>•</span>
            <span>ATTENDX</span>
            <span>•</span>
            <span>FACULTY PORTAL</span>
          </div>

        </section>

      </main>

      <footer className="faculty-login-footer">
        © 2026 AttendX · Intelligent College Attendance Management System
      </footer>

    </div>
  );
}

export default FacultyLogin;