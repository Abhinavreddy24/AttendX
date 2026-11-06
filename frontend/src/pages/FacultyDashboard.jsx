
import React, { useEffect, useState } from "react";

import {
  QrCode,
  Users,
  BarChart3,
  AlertTriangle,
  BookOpen,
  LogOut,
} from "lucide-react";

import "./FacultyDashboard.css";

const API_BASE_URL = "/api";

function FacultyDashboard({
  facultyName,
  facultyId,
  onCreateQR,
  onLiveAttendance,
  onReports,
  onSuspiciousAttempts,
  onLogout,
}) {
  const [totalSubjects, setTotalSubjects] = useState(null);
  const [subjectsLoading, setSubjectsLoading] = useState(true);

  const [todayAttendance, setTodayAttendance] =
    useState(null);

  const [attendanceLoading, setAttendanceLoading] =
    useState(true);

  // ========================================================
  // GET TOTAL SUBJECTS
  // ========================================================

  useEffect(() => {
    const fetchSubjectCount = async () => {
      console.log(
        "Faculty ID received by dashboard:",
        facultyId
      );

      if (!facultyId) {
        console.error("Faculty ID is missing.");

        setTotalSubjects(null);
        setSubjectsLoading(false);

        return;
      }

      try {
        setSubjectsLoading(true);

        const url =
          `${API_BASE_URL}/faculty/` +
          `${facultyId}/subjects/count`;

        console.log(
          "Requesting subject count:",
          url
        );

        const response = await fetch(url);

        const data = await response.json();

        console.log(
          "Subject count HTTP status:",
          response.status
        );

        console.log(
          "Subject count response:",
          data
        );

        if (!response.ok) {
          console.error(
            "Subject count backend error:",
            JSON.stringify(
              data,
              null,
              2
            )
          );

          throw new Error(
            typeof data.detail === "string"
              ? data.detail
              : JSON.stringify(
                  data.detail || data
                )
          );
        }

        if (
          typeof data.total_subjects !==
          "number"
        ) {
          throw new Error(
            "Backend did not return total_subjects."
          );
        }

        setTotalSubjects(
          data.total_subjects
        );
      } catch (error) {
        console.error(
          "Faculty subject count error:",
          error
        );

        setTotalSubjects(null);
      } finally {
        setSubjectsLoading(false);
      }
    };

    fetchSubjectCount();
  }, [facultyId]);

  // ========================================================
  // GET TODAY'S ATTENDANCE
  // ========================================================

  useEffect(() => {
    const fetchTodayAttendance = async () => {
      console.log(
        "Fetching today's attendance for:",
        facultyId
      );

      if (!facultyId) {
        console.error(
          "Faculty ID is missing for today's attendance."
        );

        setTodayAttendance(null);
        setAttendanceLoading(false);

        return;
      }

      try {
        setAttendanceLoading(true);

        const url =
          `${API_BASE_URL}/attendance/faculty/today/` +
          `${facultyId}`;

        console.log(
          "Requesting today's attendance:",
          url
        );

        const response = await fetch(url);

        const data = await response.json();

        console.log(
          "Today's attendance HTTP status:",
          response.status
        );

        console.log(
          "Today's attendance response:",
          data
        );

        if (!response.ok) {
          console.error(
            "Today's attendance backend error:",
            JSON.stringify(
              data,
              null,
              2
            )
          );

          throw new Error(
            typeof data.detail === "string"
              ? data.detail
              : JSON.stringify(
                  data.detail || data
                )
          );
        }

        setTodayAttendance(data);
      } catch (error) {
        console.error(
          "Today's attendance error:",
          error
        );

        setTodayAttendance(null);
      } finally {
        setAttendanceLoading(false);
      }
    };

    fetchTodayAttendance();
  }, [facultyId]);

  return (
    <div className="faculty-dashboard">
      <header className="faculty-header">
        <div>
          <h1>Faculty Dashboard</h1>

          <p>
            Welcome back,{" "}
            {facultyName || "Faculty"}
          </p>
        </div>

        <button
          className="faculty-logout"
          onClick={onLogout}
        >
          <LogOut size={18} />
          Logout
        </button>
      </header>

      <section className="faculty-stats">
        {/* =================================================
            TOTAL SUBJECTS
        ================================================= */}

        <div className="faculty-stat-card">
          <BookOpen size={28} />

          <div>
            <span>Total Subjects</span>

            <h2>
              {subjectsLoading
                ? "..."
                : totalSubjects !== null
                ? totalSubjects
                : "-"}
            </h2>
          </div>
        </div>

        {/* =================================================
            TOTAL STUDENTS
        ================================================= */}

        <div className="faculty-stat-card">
          <Users size={28} />

          <div>
            <span>Total Students</span>

            <h2>68</h2>
          </div>
        </div>

        {/* =================================================
            TODAY'S ATTENDANCE
        ================================================= */}

        <div className="faculty-stat-card">
          <BarChart3 size={28} />

          <div>
            <span>Today's Attendance</span>

            <h2>
              {attendanceLoading
                ? "..."
                : todayAttendance !== null
                ? `${todayAttendance.attendance_percentage}%`
                : "-"}
            </h2>
          </div>
        </div>

        {/* =================================================
            SUSPICIOUS ATTEMPTS
        ================================================= */}

        <div className="faculty-stat-card">
          <AlertTriangle size={28} />

          <div>
            <span>Suspicious Attempts</span>

            <h2>3</h2>
          </div>
        </div>
      </section>

      <section className="faculty-actions">
        {/* =================================================
            CREATE QR
        ================================================= */}

        <div className="faculty-action-card">
          <QrCode size={42} />

          <h2>
            Create Attendance QR
          </h2>

          <p>
            Generate a QR session for your
            current class and start
            attendance.
          </p>

          <button onClick={onCreateQR}>
            Create QR Session
          </button>
        </div>

        {/* =================================================
            LIVE ATTENDANCE
        ================================================= */}

        <div className="faculty-action-card">
          <Users size={42} />

          <h2>Live Attendance</h2>

          <p>
            Monitor students who are marking
            attendance in the current
            session.
          </p>

          <button onClick={onLiveAttendance}>
            View Live Attendance
          </button>
        </div>

        {/* =================================================
            REPORTS
        ================================================= */}

        <div className="faculty-action-card">
          <BarChart3 size={42} />

          <h2>
            Attendance Reports
          </h2>

          <p>
            View attendance statistics and
            generate reports for your
            subjects.
          </p>

          <button onClick={onReports}>
            View Reports
          </button>
        </div>

        {/* =================================================
            SUSPICIOUS ATTEMPTS
        ================================================= */}

        <div className="faculty-action-card">
          <AlertTriangle size={42} />

          <h2>
            Suspicious Attempts
          </h2>

          <p>
            Review duplicate scans, invalid
            locations and other suspicious
            attendance attempts.
          </p>

          <button
            onClick={onSuspiciousAttempts}
          >
            Review Attempts
          </button>
        </div>
      </section>
    </div>
  );
}

export default FacultyDashboard;
