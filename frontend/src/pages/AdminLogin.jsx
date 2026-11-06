import React, { useState } from "react";

import {
  ArrowLeft,
  ArrowRight,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";

function AdminLogin({ onBack, onLogin }) {
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");

    if (!adminId.trim() || !password.trim()) {
      setError("Please enter Admin ID and password.");
      return;
    }

    // Temporary frontend login
    // PostgreSQL authentication will be connected next.
    onLogin();
  };

  return (
    <div className="admin-login-page">

      {/* Top navigation */}
      <div className="admin-login-topbar">

        <button
          className="admin-back-button"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft size={17} />
          Back to Home
        </button>

        <div className="admin-brand">

          <div className="admin-brand-mark">
            <ShieldCheck size={20} />
          </div>

          <div>
            <strong>AttendX</strong>
            <span>HITAM</span>
          </div>

        </div>

      </div>

      {/* Main content */}
      <main className="admin-login-main">

        {/* Introduction */}
        <section className="admin-login-intro">

          <div className="admin-intro-label">
            ADMINISTRATION PORTAL
          </div>

          <h1>
            One place.
            <br />
            <span>Complete control.</span>
          </h1>

          <p>
            Manage the AttendX attendance ecosystem,
            accounts, academic data, and system operations
            through the administration portal.
          </p>

          <div className="admin-security-note">

            <div className="admin-security-icon">
              <ShieldCheck size={19} />
            </div>

            <div>
              <strong>Restricted administrator access</strong>

              <span>
                This portal is intended only for authorized
                college administration personnel.
              </span>
            </div>

          </div>

        </section>

        {/* Login card */}
        <section className="admin-login-card">

          <div className="admin-card-heading">

            <div className="admin-login-icon">
              <ShieldCheck size={26} />
            </div>

            <div>
              <div className="admin-card-kicker">
                ATTENDX
              </div>

              <h2>Admin Login</h2>
            </div>

          </div>

          <p className="admin-login-description">
            Sign in to access the AttendX administration portal.
          </p>

          <form onSubmit={handleLogin}>

            {/* Admin ID */}
            <div className="admin-form-group">

              <label htmlFor="adminId">
                Admin ID
              </label>

              <div className="admin-input-wrapper">

                <ShieldCheck size={17} />

                <input
                  id="adminId"
                  type="text"
                  placeholder="Enter Admin ID"
                  value={adminId}
                  onChange={(e) =>
                    setAdminId(e.target.value)
                  }
                  autoComplete="username"
                />

              </div>

            </div>

            {/* Password */}
            <div className="admin-form-group">

              <label htmlFor="adminPassword">
                Password
              </label>

              <div className="admin-input-wrapper">

                <Lock size={17} />

                <input
                  id="adminPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="admin-password-toggle"
                  onClick={() =>
                    setShowPassword((current) => !current)
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
              <div className="admin-login-error">

                <span>!</span>

                <p>{error}</p>

              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="admin-login-submit"
            >
              Sign in
              <ArrowRight size={18} />
            </button>

          </form>

          <div className="admin-login-divider">
            <span>AUTHORIZED ADMINISTRATOR ACCOUNT</span>
          </div>

          <div className="admin-login-meta">
            <span>HITAM</span>
            <span>•</span>
            <span>ATTENDX</span>
            <span>•</span>
            <span>ADMIN PORTAL</span>
          </div>

        </section>

      </main>

      <footer className="admin-login-footer">
        © 2026 AttendX · Intelligent College Attendance Management System
      </footer>

    </div>
  );
}

export default AdminLogin;