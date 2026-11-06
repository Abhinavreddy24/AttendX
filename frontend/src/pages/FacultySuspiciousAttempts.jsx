import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
  MapPin,
  Clock,
  User,
  QrCode,
  ShieldAlert,
  CheckCircle,
} from "lucide-react";

import "./FacultyDashboard.css";

const API_BASE_URL = "http://127.0.0.1:8000";
const FACULTY_ID = 1;

function SuspiciousAttempts({ onBack }) {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      setError("");

       const response = await fetch(
  `${API_BASE_URL}/attendance-attempts/faculty/${FACULTY_ID}`
);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const result = await response.json();

      console.log("Suspicious attempts response:", result);

      setAttempts(
        result?.attempts ??
          result?.records ??
          result?.data ??
          []
      );
    } catch (err) {
      console.error("Suspicious attempts error:", err);

      setError(
        "Activates when there are suspicious attendance attempts."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempts();

    const interval = setInterval(() => {
      fetchAttempts();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatDateTime = (value) => {
    if (!value) return "-";

    try {
      return new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return value;
    }
  };

  const getReason = (attempt) => {
    return (
      attempt.reason ??
      attempt.failure_reason ??
      attempt.attempt_reason ??
      "Suspicious attendance attempt"
    );
  };

  const getStatusClass = (attempt) => {
    const reason = getReason(attempt).toLowerCase();

    if (
      reason.includes("location") ||
      reason.includes("gps") ||
      reason.includes("distance")
    ) {
      return "suspicious-location";
    }

    if (
      reason.includes("duplicate") ||
      reason.includes("already")
    ) {
      return "suspicious-duplicate";
    }

    if (
      reason.includes("qr") ||
      reason.includes("expired") ||
      reason.includes("invalid")
    ) {
      return "suspicious-qr";
    }

    return "suspicious-other";
  };

  const locationIssues = attempts.filter((attempt) => {
    const reason = getReason(attempt).toLowerCase();

    return (
      reason.includes("location") ||
      reason.includes("gps") ||
      reason.includes("distance")
    );
  }).length;

  const qrIssues = attempts.filter((attempt) => {
    const reason = getReason(attempt).toLowerCase();

    return (
      reason.includes("qr") ||
      reason.includes("expired") ||
      reason.includes("invalid")
    );
  }).length;

  return (
    <div className="faculty-suspicious-page">
      <div className="faculty-suspicious-container">

        {/* TOP BAR */}
        <div className="faculty-suspicious-topbar">

          <button
            className="faculty-suspicious-back"
            onClick={onBack}
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          <button
            className="faculty-suspicious-refresh"
            onClick={fetchAttempts}
          >
            <RefreshCw
              size={17}
              className={loading ? "spin" : ""}
            />
            Refresh
          </button>

        </div>

        {/* TITLE */}
        <div className="faculty-suspicious-title">

          <div className="faculty-suspicious-title-icon">
            <ShieldAlert size={30} />
          </div>

          <div>
            <h1>Suspicious Attempts</h1>

            <p>
              Review attendance attempts that failed security
              verification.
            </p>
          </div>

        </div>

        {/* ERROR */}
        {error && (
          <div className="faculty-suspicious-error">
            <AlertTriangle size={19} />
            <span>{error}</span>
          </div>
        )}

        {/* SUMMARY */}
        <section className="faculty-suspicious-summary">

          <div className="faculty-suspicious-stat">

            <div className="faculty-suspicious-stat-icon">
              <AlertTriangle size={24} />
            </div>

            <div>
              <span>Total Suspicious Attempts</span>
              <h2>{attempts.length}</h2>
            </div>

          </div>

          <div className="faculty-suspicious-stat">

            <div className="faculty-suspicious-stat-icon">
              <MapPin size={24} />
            </div>

            <div>
              <span>Location Issues</span>
              <h2>{locationIssues}</h2>
            </div>

          </div>

          <div className="faculty-suspicious-stat">

            <div className="faculty-suspicious-stat-icon">
              <QrCode size={24} />
            </div>

            <div>
              <span>QR Issues</span>
              <h2>{qrIssues}</h2>
            </div>

          </div>

        </section>

        {/* ATTEMPTS */}
        <section className="faculty-suspicious-section">

          <div className="faculty-suspicious-section-header">

            <div>
              <h2>Security Alerts</h2>

              <p>
                Attendance attempts requiring faculty attention.
              </p>
            </div>

            <div className="faculty-suspicious-live">
              <span></span>
              Monitoring
            </div>

          </div>

          {loading && attempts.length === 0 ? (
            <div className="faculty-suspicious-empty">

              <RefreshCw
                size={40}
                className="spin"
              />

              <h3>Loading suspicious attempts...</h3>

              <p>
                Checking the AttendX attendance security records.
              </p>

            </div>
          ) : attempts.length === 0 ? (
            <div className="faculty-suspicious-empty success">

              <CheckCircle size={48} />

              <h3>No Suspicious Attempts</h3>

              <p>
                No suspicious attendance attempts have been
                recorded.
              </p>

            </div>
          ) : (
            <div className="faculty-suspicious-table-wrapper">

              <table className="faculty-suspicious-table">

                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student</th>
                    <th>Student ID</th>
                    <th>Reason</th>
                    <th>Location</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>

                  {attempts.map((attempt, index) => (
                    <tr
                      key={
                        attempt.id ??
                        attempt.attempt_id ??
                        index
                      }
                    >

                      <td>{index + 1}</td>

                      <td>
                        <div className="suspicious-student">

                          <div className="suspicious-user-icon">
                            <User size={16} />
                          </div>

                          <strong>
                            {attempt.student_name ??
                              attempt.name ??
                              "-"}
                          </strong>

                        </div>
                      </td>

                      <td>
                        <strong>
                          {attempt.student_code ??
                            attempt.student_id ??
                            "-"}
                        </strong>
                      </td>

                      <td>
                        <div className="suspicious-reason">
                          <AlertTriangle size={15} />
                          {getReason(attempt)}
                        </div>
                      </td>

                      <td>
                        <div className="suspicious-location">
                          <MapPin size={15} />

                          {attempt.distance_from_classroom !==
                          undefined
                            ? `${Number(
                                attempt.distance_from_classroom
                              ).toFixed(1)} m`
                            : attempt.location_status ?? "-"}
                        </div>
                      </td>

                      <td>
                        <div className="suspicious-time">
                          <Clock size={14} />

                          {formatDateTime(
                            attempt.created_at ??
                              attempt.attempted_at ??
                              attempt.marked_at
                          )}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`suspicious-status ${getStatusClass(
                            attempt
                          )}`}
                        >
                          <AlertTriangle size={13} />
                          Suspicious
                        </span>
                      </td>

                    </tr>
                  ))}

                </tbody>

              </table>

            </div>
          )}

        </section>

      </div>
    </div>
  );
}
export default SuspiciousAttempts;
