import React, { useEffect, useState } from "react";

import {
  ArrowLeft,
  Users,
  CheckCircle,
  RefreshCw,
  MapPin,
  Clock,
  QrCode,
  AlertCircle,
  BookOpen,
} from "lucide-react";

import "./FacultyDashboard.css";

const API_BASE_URL =
  "/api";

const FACULTY_ID = 1;

function FacultyLiveAttendance({ onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================================================
  // FETCH LIVE ATTENDANCE
  // =========================================================

  const fetchLiveAttendance = async () => {
    try {
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/attendance/faculty/${FACULTY_ID}/live`
      );

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error("Live attendance error:", err);
      setError("Unable to load live attendance.");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // INITIAL LOAD + AUTO REFRESH
  // =========================================================

  useEffect(() => {
    fetchLiveAttendance();

    const interval = setInterval(() => {
      fetchLiveAttendance();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDateTime = (value) => {
    if (!value) {
      return "-";
    }

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

  // =========================================================
  // LOADING
  // =========================================================

  if (loading && !data) {
    return (
      <div className="faculty-live-page">
        <div className="faculty-live-container">

          <button
            className="faculty-live-back"
            onClick={onBack}
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          <div className="faculty-live-loading">
            <div className="faculty-live-loading-icon">
              <RefreshCw
                size={34}
                className="spin"
              />
            </div>

            <h2>Loading Live Attendance...</h2>

            <p>
              Connecting to the AttendX server.
            </p>
          </div>

        </div>
      </div>
    );
  }

  // =========================================================
  // DATA
  // =========================================================

  const session = data?.session ?? null;

  const summary = data?.summary ?? {
    present: 0,
    total_students: 0,
    percentage: 0,
  };

  const attendance =
    data?.attendance ??
    data?.records ??
    [];

  // =========================================================
  // MAIN PAGE
  // =========================================================

  return (
    <div className="faculty-live-page">

      <div className="faculty-live-container">

        {/* =================================================
            TOP BAR
        ================================================= */}

        <div className="faculty-live-topbar">

          <button
            className="faculty-live-back"
            onClick={onBack}
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          <button
            className="faculty-live-refresh"
            onClick={fetchLiveAttendance}
          >
            <RefreshCw
              size={17}
              className={loading ? "spin" : ""}
            />
            Refresh
          </button>

        </div>

        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <div className="faculty-live-title">

          <div className="faculty-live-title-icon">
            <Users size={30} />
          </div>

          <div>
            <h1>Live Attendance</h1>

            <p>
              Monitor students marking attendance
              in real time.
            </p>
          </div>

        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="faculty-live-error">

            <AlertCircle size={19} />

            <span>
              {error}
            </span>

          </div>
        )}

        {/* =================================================
            NO ACTIVE SESSION
        ================================================= */}

        {!session ? (

          <div className="faculty-live-empty">

            <div className="faculty-live-empty-icon">
              <QrCode size={42} />
            </div>

            <h2>
              No Active Attendance Session
            </h2>

            <p>
              Create an attendance QR session from
              the Faculty Dashboard to start
              monitoring students.
            </p>

            <button
              className="faculty-live-empty-button"
              onClick={onBack}
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>

          </div>

        ) : (

          <>
            {/* =============================================
                SESSION INFORMATION
            ============================================= */}

            <section className="faculty-live-session">

              <div className="faculty-live-session-header">

                <div>

                  <span className="faculty-live-active-label">
                    LIVE SESSION
                  </span>

                  <h2>
                    Attendance Session
                  </h2>

                </div>

                <span className="faculty-live-session-code">
                  {session.session_code}
                </span>

              </div>

              <div className="faculty-live-session-details">

                <div className="faculty-live-detail">

                  <QrCode size={19} />

                  <div>
                    <span>
                      Session Code
                    </span>

                    <strong>
                      {session.session_code}
                    </strong>
                  </div>

                </div>

                <div className="faculty-live-detail">

                  <BookOpen size={19} />

                  <div>
                    <span>
                      Course
                    </span>

                    <strong>
                      {session.course_id}
                    </strong>
                  </div>

                </div>

                <div className="faculty-live-detail">

                  <Clock size={19} />

                  <div>
                    <span>
                      Started
                    </span>

                    <strong>
                      {formatDateTime(
                        session.created_at
                      )}
                    </strong>
                  </div>

                </div>

              </div>

            </section>

            {/* =============================================
                LIVE STATISTICS
            ============================================= */}

            <section className="faculty-live-stats">

              <div className="faculty-live-stat-card">

                <div className="faculty-live-stat-icon blue">
                  <Users size={25} />
                </div>

                <div>
                  <span>
                    Students Present
                  </span>

                  <h2>
                    {summary.present ?? 0}
                  </h2>
                </div>

              </div>

              <div className="faculty-live-stat-card">

                <div className="faculty-live-stat-icon purple">
                  <Users size={25} />
                </div>

                <div>
                  <span>
                    Total Students
                  </span>

                  <h2>
                    {summary.total_students ?? 0}
                  </h2>
                </div>

              </div>

              <div className="faculty-live-stat-card">

                <div className="faculty-live-stat-icon green">
                  <CheckCircle size={25} />
                </div>

                <div>
                  <span>
                    Attendance
                  </span>

                  <h2>
                    {summary.percentage ?? 0}%
                  </h2>
                </div>

              </div>

            </section>

            {/* =============================================
                ATTENDANCE TABLE
            ============================================= */}

            <section className="faculty-live-attendance-section">

              <div className="faculty-live-section-header">

                <div>
                  <h2>
                    Students Marked Present
                  </h2>

                  <p>
                    Attendance updates automatically
                    every 3 seconds.
                  </p>
                </div>

                <div className="faculty-live-online">
                  <span></span>
                  Live
                </div>

              </div>

              {attendance.length === 0 ? (

                <div className="faculty-live-no-records">

                  <div className="faculty-live-no-records-icon">
                    <Users size={30} />
                  </div>

                  <h3>
                    Waiting for students...
                  </h3>

                  <p>
                    Students who successfully complete
                    QR, face and GPS verification will
                    appear here.
                  </p>

                </div>

              ) : (

                <div className="faculty-live-table-wrapper">

                  <table className="faculty-live-table">

                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Student ID</th>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Time</th>
                        <th>Distance</th>
                      </tr>
                    </thead>

                    <tbody>

                      {attendance.map(
                        (record, index) => (

                          <tr
                            key={
                              record.attendance_id ??
                              record.id ??
                              index
                            }
                          >

                            <td>
                              {index + 1}
                            </td>

                            <td>
                              <strong>
                                {record.student_code ??
                                  record.student_id ??
                                  "-"}
                              </strong>
                            </td>

                            <td>
                              {record.student_name ??
                                record.name ??
                                "-"}
                            </td>

                            <td>

                              <span className="faculty-live-present">

                                <CheckCircle
                                  size={14}
                                />

                                Present

                              </span>

                            </td>

                            <td>

                              <div className="faculty-live-time">

                                <Clock size={14} />

                                {formatDateTime(
                                  record.marked_at
                                )}

                              </div>

                            </td>

                            <td>

                              <div className="faculty-live-distance">

                                <MapPin size={14} />

                                {record.distance_from_classroom !==
                                undefined
                                  ? `${Number(
                                      record.distance_from_classroom
                                    ).toFixed(1)} m`
                                  : "-"}

                              </div>

                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              )}

            </section>

          </>

        )}

      </div>

    </div>
  );
}

export default FacultyLiveAttendance;