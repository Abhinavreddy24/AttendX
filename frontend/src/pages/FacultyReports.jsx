import React, { useEffect, useState } from "react";

import {
  ArrowLeft,
  BarChart3,
  RefreshCw,
  Users,
  XCircle,
  AlertTriangle,
  UserCheck,
  UserX,
  ShieldAlert,
  CheckCircle,
} from "lucide-react";

import "./FacultyDashboard.css";

const API_BASE_URL = "http://127.0.0.1:8000";
const FACULTY_ID = 1;

function FacultyReports({ onBack }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
  `${API_BASE_URL}/attendance/faculty/report/${FACULTY_ID}`
);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const result = await response.json();

      console.log("Attendance report response:", result);

      setReport(result);
    } catch (err) {
      console.error("Attendance reports error:", err);
      setError("Unable to load attendance reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  /* =========================================================
     DATA
  ========================================================= */

  const students =
    report?.students ||
    report?.student_attendance ||
    report?.attendance ||
    report?.records ||
    [];

  const totalStudents =
    report?.total_students !== undefined
      ? Number(report.total_students)
      : 68;

  /* =========================================================
     STUDENT HELPERS
  ========================================================= */

  const getStudentName = (student) =>
    student.student_name ||
    student.name ||
    student.full_name ||
    student.student?.name ||
    "Unknown Student";

  const getStudentId = (student) =>
    student.student_id ||
    student.roll_number ||
    student.roll_no ||
    student.rollNumber ||
    student.student?.student_id ||
    "-";

  const getPresent = (student) =>
    Number(
      student.present ??
        student.present_count ??
        student.present_days ??
        0
    );

  const getAbsent = (student) =>
    Number(
      student.absent ??
        student.absent_count ??
        student.absent_days ??
        0
    );

  const getTotal = (student) => {
    if (student.total !== undefined) {
      return Number(student.total);
    }

    if (student.total_classes !== undefined) {
      return Number(student.total_classes);
    }

    if (student.total_sessions !== undefined) {
      return Number(student.total_sessions);
    }

    return getPresent(student) + getAbsent(student);
  };

  const getPercentage = (student) => {
    if (student.attendance_percentage !== undefined) {
      return Number(student.attendance_percentage);
    }

    if (student.attendance_rate !== undefined) {
      return Number(student.attendance_rate);
    }

    const total = getTotal(student);

    if (total === 0) {
      return 0;
    }

    return (getPresent(student) / total) * 100;
  };

  /* =========================================================
     REPORT CALCULATIONS
  ========================================================= */

  const totalAbsences = students.reduce(
    (sum, student) => sum + getAbsent(student),
    0
  );

  const studentsRequiringAttention = students.filter(
    (student) => getPercentage(student) < 75
  );

  const studentsWithGoodAttendance = students.filter(
    (student) => getPercentage(student) >= 75
  );

  const excellentAttendance = students.filter(
    (student) => getPercentage(student) >= 90
  );

  const moderateAttendance = students.filter(
    (student) => {
      const percentage = getPercentage(student);

      return percentage >= 75 && percentage < 90;
    }
  );

  const getAttendanceClass = (percentage) => {
    if (percentage < 75) {
      return "low";
    }

    if (percentage < 90) {
      return "medium";
    }

    return "good";
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="faculty-reports-page">
      <div className="faculty-reports-container">

        {/* ===================================================
            TOP BAR
        =================================================== */}

        <div className="faculty-reports-topbar">

          <button
            className="faculty-reports-back"
            onClick={onBack}
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          <button
            className="faculty-reports-refresh"
            onClick={fetchReport}
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={loading ? "spin" : ""}
            />
            Refresh
          </button>

        </div>

        {/* ===================================================
            TITLE
        =================================================== */}

        <div className="faculty-reports-title">

          <div className="faculty-reports-title-icon">
            <BarChart3 size={28} />
          </div>

          <div>
            <h1>Attendance Reports</h1>

            <p>
              Analyze student attendance and identify students
              who require attention.
            </p>
          </div>

        </div>

        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (
          <div className="faculty-reports-error">

            <AlertTriangle size={18} />

            <span>{error}</span>

          </div>
        )}

        {/* ===================================================
            SUMMARY CARDS
        =================================================== */}

        <div className="faculty-reports-stats">

          {/* TOTAL STUDENTS */}

          <div className="faculty-report-stat-card">

            <div className="faculty-report-stat-icon">
              <Users size={24} />
            </div>

            <div>
              <span>Total Students</span>
              <h2>{totalStudents}</h2>
            </div>

          </div>

          {/* TOTAL ABSENCES */}

          <div className="faculty-report-stat-card absent">

            <div className="faculty-report-stat-icon">
              <XCircle size={24} />
            </div>

            <div>
              <span>Total Absences</span>
              <h2>{totalAbsences}</h2>
            </div>

          </div>

          {/* NEEDS ATTENTION */}

          <div className="faculty-report-stat-card low">

            <div className="faculty-report-stat-icon">
              <UserX size={24} />
            </div>

            <div>
              <span>Needs Attention</span>
              <h2>
                {studentsRequiringAttention.length}
              </h2>
            </div>

          </div>

          {/* GOOD ATTENDANCE */}

          <div className="faculty-report-stat-card good">

            <div className="faculty-report-stat-icon">
              <UserCheck size={24} />
            </div>

            <div>
              <span>Good Attendance</span>
              <h2>
                {studentsWithGoodAttendance.length}
              </h2>
            </div>

          </div>

        </div>

        {/* ===================================================
            ATTENDANCE HEALTH
        =================================================== */}

        {!loading && students.length > 0 && (

          <section className="faculty-reports-health">

            <div className="faculty-reports-health-header">

              <div className="faculty-reports-health-icon">
                <ShieldAlert size={23} />
              </div>

              <div>
                <h2>Attendance Health</h2>

                <p>
                  Distribution of students based on their
                  attendance performance.
                </p>
              </div>

            </div>

            <div className="faculty-reports-health-grid">

              {/* BELOW 75 */}

              <div className="faculty-reports-health-card low">

                <div className="faculty-reports-health-card-top">

                  <div className="faculty-reports-health-small-icon">
                    <AlertTriangle size={19} />
                  </div>

                  <span>Below 75%</span>

                </div>

                <strong>
                  {studentsRequiringAttention.length}
                </strong>

                <p>
                  Students requiring attention
                </p>

              </div>

              {/* 75 - 89 */}

              <div className="faculty-reports-health-card medium">

                <div className="faculty-reports-health-card-top">

                  <div className="faculty-reports-health-small-icon">
                    <BarChart3 size={19} />
                  </div>

                  <span>75% – 89%</span>

                </div>

                <strong>
                  {moderateAttendance.length}
                </strong>

                <p>
                  Students with moderate attendance
                </p>

              </div>

              {/* 90+ */}

              <div className="faculty-reports-health-card good">

                <div className="faculty-reports-health-card-top">

                  <div className="faculty-reports-health-small-icon">
                    <CheckCircle size={19} />
                  </div>

                  <span>90% and above</span>

                </div>

                <strong>
                  {excellentAttendance.length}
                </strong>

                <p>
                  Students with excellent attendance
                </p>

              </div>

            </div>

          </section>

        )}

        {/* ===================================================
            STUDENTS REQUIRING ATTENTION
        =================================================== */}

        {!loading &&
          studentsRequiringAttention.length > 0 && (

            <section className="faculty-reports-section">

              <div className="faculty-reports-section-header">

                <div>
                  <h2>Students Requiring Attention</h2>

                  <p>
                    Students whose attendance is below 75%.
                  </p>
                </div>

                <div className="faculty-reports-attention-count">
                  <AlertTriangle size={16} />
                  {studentsRequiringAttention.length}
                </div>

              </div>

              <div className="faculty-reports-attention-list">

                {studentsRequiringAttention.map(
                  (student, index) => {

                    const percentage =
                      getPercentage(student);

                    return (

                      <div
                        className="faculty-reports-attention-item"
                        key={
                          student.id ||
                          student.student_id ||
                          index
                        }
                      >

                        <div className="faculty-reports-student-number">
                          {index + 1}
                        </div>

                        <div className="faculty-reports-attention-student">

                          <strong>
                            {getStudentName(student)}
                          </strong>

                          <span>
                            {getStudentId(student)}
                          </span>

                        </div>

                        <div className="faculty-reports-attention-bar">

                          <div className="faculty-reports-attention-bar-track">

                            <span
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    percentage
                                  )
                                )}%`,
                              }}
                            />

                          </div>

                        </div>

                        <strong className="faculty-reports-attention-percentage">
                          {percentage.toFixed(1)}%
                        </strong>

                      </div>

                    );
                  }
                )}

              </div>

            </section>

          )}

        {/* ===================================================
            COMPLETE STUDENT REPORT
        =================================================== */}

        <section className="faculty-reports-section">

          <div className="faculty-reports-section-header">

            <div>

              <h2>Complete Student Report</h2>

              <p>
                Detailed attendance information for every
                student.
              </p>

            </div>

          </div>

          {loading ? (

            <div className="faculty-reports-empty">

              <RefreshCw
                size={32}
                className="spin"
              />

              <h3>
                Loading attendance report...
              </h3>

              <p>
                Please wait while the report is being loaded.
              </p>

            </div>

          ) : students.length === 0 ? (

            <div className="faculty-reports-empty">

              <BarChart3 size={40} />

              <h3>
                No attendance records found
              </h3>

              <p>
                Attendance data will appear here after students
                mark attendance.
              </p>

            </div>

          ) : (

            <div className="faculty-reports-table-wrapper">

              <table className="faculty-reports-table">

                <thead>

                  <tr>

                    <th>#</th>

                    <th>Student</th>

                    <th>Student ID</th>

                    <th>Present</th>

                    <th>Absent</th>

                    <th>Total</th>

                    <th>Attendance</th>

                  </tr>

                </thead>

                <tbody>

                  {students.map(
                    (student, index) => {

                      const present =
                        getPresent(student);

                      const absent =
                        getAbsent(student);

                      const total =
                        getTotal(student);

                      const percentage =
                        getPercentage(student);

                      const attendanceClass =
                        getAttendanceClass(
                          percentage
                        );

                      return (

                        <tr
                          key={
                            student.id ||
                            student.student_id ||
                            index
                          }
                        >

                          <td>
                            {index + 1}
                          </td>

                          <td>
                            <strong>
                              {getStudentName(student)}
                            </strong>
                          </td>

                          <td>
                            {getStudentId(student)}
                          </td>

                          <td>
                            <span className="report-present">
                              {present}
                            </span>
                          </td>

                          <td>
                            <span className="report-absent">
                              {absent}
                            </span>
                          </td>

                          <td>
                            {total}
                          </td>

                          <td>

                            <div className="report-percentage">

                              <span
                                className={`report-attendance-value ${attendanceClass}`}
                              >
                                {percentage.toFixed(1)}%
                              </span>

                              <div className="report-progress">

                                <span
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.max(
                                        0,
                                        percentage
                                      )
                                    )}%`,
                                  }}
                                />

                              </div>

                            </div>

                          </td>

                        </tr>

                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>

      </div>
    </div>
  );
}

export default FacultyReports;