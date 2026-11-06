import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

import StudentDashboard from "./StudentDashboard";
import FaceEnrollment from "./FaceEnrollment";

const API_BASE_URL = "/api";

function StudentLogin({ onBack }) {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingFace, setCheckingFace] = useState(false);
  const [needsEnrollment, setNeedsEnrollment] = useState(false);
  const [loggedInStudent, setLoggedInStudent] = useState(null);
  const [error, setError] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");

    if (!studentId.trim() || !password.trim()) {
      setError("Please enter Student ID and Password.");
      return;
    }

    try {
      setCheckingFace(true);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: studentId.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Invalid username or password."
        );
      }

      if (data.role !== "student") {
        throw new Error(
          "This account is not a student account."
        );
      }

      console.log("Login successful:", data);

      setLoggedInStudent(data);
      setLoggedIn(true);

      if (data.face_enrollment_required) {
        setNeedsEnrollment(true);
      } else {
        setNeedsEnrollment(false);
      }
    } catch (err) {
      console.error("Login error:", err);

      setError(
        err.message || "Unable to login. Please try again."
      );
    } finally {
      setCheckingFace(false);
    }
  };

  /*
   * FIRST LOGIN
   * If face is not enrolled, show Face Enrollment.
   */
  if (
    loggedIn &&
    needsEnrollment &&
    loggedInStudent
  ) {
    return (
      <FaceEnrollment
        studentId={loggedInStudent.student_db_id}
        onComplete={() => {
          setNeedsEnrollment(false);
        }}
        onBack={() => {
          setLoggedIn(false);
          setNeedsEnrollment(false);
          setLoggedInStudent(null);
        }}
      />
    );
  }

  /*
   * NORMAL LOGIN
   * If face is already enrolled, go directly
   * to the Student Dashboard.
   */
  if (
    loggedIn &&
    !needsEnrollment &&
    loggedInStudent
  ) {
    return (
      <StudentDashboard
        studentId={loggedInStudent.student_id}
        studentDbId={loggedInStudent.student_db_id}
        studentName={loggedInStudent.name}
        onLogout={() => {
          setLoggedIn(false);
          setNeedsEnrollment(false);
          setLoggedInStudent(null);
          setStudentId("");
          setPassword("");
          setShowPassword(false);
        }}
      />
    );
  }

  return (
    <div className="student-login-page">

      {/* Top navigation */}
      <div className="student-login-topbar">
        <button
          className="student-back-button"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft size={17} />
          Back to Home
        </button>

        <div className="student-brand">
          <div className="student-brand-mark">
            <GraduationCap size={21} />
          </div>

          <div>
            <strong>AttendX</strong>
            <span>HITAM</span>
          </div>
        </div>
      </div>

      {/* Main login area */}
      <main className="student-login-main">

        {/* Left information panel */}
        <section className="student-login-intro">

          <div className="student-intro-label">
            STUDENT PORTAL
          </div>

          <h1>
            Welcome back.
            <br />
            <span>Stay on track.</span>
          </h1>

          <p>
            Access your attendance dashboard, view your
            attendance history, and securely mark your
            classroom attendance.
          </p>

          <div className="student-security-note">
            <div className="student-security-icon">
              <ShieldCheck size={19} />
            </div>

            <div>
              <strong>Secure student access</strong>
              <span>
                Your account is protected by AttendX
                authentication and biometric verification.
              </span>
            </div>
          </div>

        </section>

        {/* Login card */}
        <section className="student-login-card">

          <div className="student-card-heading">

            <div className="student-login-icon">
              <GraduationCap size={27} />
            </div>

            <div>
              <div className="student-card-kicker">
                ATTENDX
              </div>

              <h2>Student Login</h2>
            </div>

          </div>

          <p className="student-login-description">
            Sign in with your college credentials to
            continue.
          </p>

          <form onSubmit={handleLogin}>

            <div className="student-form-group">
              <label htmlFor="studentId">
                Student ID
              </label>

              <input
                id="studentId"
                type="text"
                placeholder="Example: 23E51A6765"
                value={studentId}
                onChange={(event) =>
                  setStudentId(event.target.value)
                }
                autoComplete="username"
              />
            </div>

            <div className="student-form-group">
              <label htmlFor="studentPassword">
                Password
              </label>

              <div className="student-password-wrapper">

                <input
                  id="studentPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="student-password-toggle"
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
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>

              </div>
            </div>

            {error && (
              <div className="student-login-error">
                <span>!</span>
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="student-login-submit"
              disabled={checkingFace}
            >
              {checkingFace ? (
                <>
                  <span className="student-spinner"></span>
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={18} />
                </>
              )}
            </button>

          </form>

          <div className="student-login-divider">
            <span>AUTHORIZED COLLEGE ACCOUNT</span>
          </div>

          <div className="student-login-meta">
            <span>HITAM</span>
            <span>•</span>
            <span>ATTENDX</span>
            <span>•</span>
            <span>STUDENT PORTAL</span>
          </div>

        </section>

      </main>

      <footer className="student-login-footer">
        © 2026 AttendX · Intelligent College Attendance Management System
      </footer>

    </div>
  );
}

export default StudentLogin;