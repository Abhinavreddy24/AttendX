
import { useEffect, useState } from "react";

import {
  LogOut,
  QrCode,
  CalendarCheck,
  BookOpen,
  TrendingUp,
  Lock,
  RefreshCw,
} from "lucide-react";

import AttendanceFlow from "./AttendanceFlow";
import ChangePassword from "./changepassword";

const API_BASE_URL = "/api";

export default function StudentDashboard({
  onLogout,
  studentId,
  studentDbId,
  studentName,
}) {
  const [showAttendanceFlow, setShowAttendanceFlow] =
    useState(false);

  const [showChangePassword, setShowChangePassword] =
    useState(false);

  const [student, setStudent] = useState(null);

  const [summary, setSummary] = useState({
    overall_percentage: 0,
    present: 0,
    absent: 0,
    total_classes: 0,
  });

  const [subjects, setSubjects] = useState([]);

  const [recentAttendance, setRecentAttendance] =
    useState([]);

  // Real courses from PostgreSQL
  const [courses, setCourses] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [attendanceSuccess, setAttendanceSuccess] =
    useState(false);

  // =========================================================
  // FETCH REAL COURSES
  // =========================================================

  const fetchCourses = async () => {
    try {
      console.log(
        "[Dashboard] Fetching real courses..."
      );

      const response = await fetch(
        `${API_BASE_URL}/courses/?t=${Date.now()}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            "Cache-Control":
              "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch courses (${response.status})`
        );
      }

      const data = await response.json();

      console.log(
        "[Dashboard] Real courses:",
        data
      );

      if (Array.isArray(data)) {
        setCourses(data);
      } else {
        setCourses([]);
      }
    } catch (err) {
      console.error(
        "[Dashboard] Course fetch error:",
        err
      );

      setCourses([]);
    }
  };

  // =========================================================
  // FETCH STUDENT ATTENDANCE
  // =========================================================

  const fetchAttendance = async (
    showFullLoader = false
  ) => {
    if (!studentDbId) {
      console.error(
        "[Dashboard] studentDbId is missing:",
        studentDbId
      );

      setError(
        "Student information is missing."
      );

      setLoading(false);

      return;
    }

    const numericStudentDbId = Number(studentDbId);

    if (!Number.isInteger(numericStudentDbId)) {
      console.error(
        "[Dashboard] Invalid studentDbId:",
        studentDbId
      );

      setError(
        "Invalid student database ID."
      );

      setLoading(false);

      return;
    }

    const startTime = performance.now();

    const apiUrl =
      `${API_BASE_URL}/attendance/student/` +
      `${numericStudentDbId}?t=${Date.now()}`;

    try {
      if (showFullLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      console.log("");
      console.log(
        "============================================"
      );
      console.log(
        "[Dashboard] FETCHING REAL ATTENDANCE DATA"
      );
      console.log(
        "============================================"
      );
      console.log(
        "[Dashboard] studentDbId:",
        numericStudentDbId
      );
      console.log(
        "[Dashboard] API URL:",
        apiUrl
      );

      const response = await fetch(
        apiUrl,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            "Cache-Control":
              "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );

      console.log(
        "[Dashboard] HTTP status:",
        response.status
      );

      const responseText =
        await response.text();

      console.log(
        "[Dashboard] Raw server response:",
        responseText
      );

      let data = {};

      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error(
          "[Dashboard] JSON parsing failed:",
          parseError
        );

        throw new Error(
          "Attendance server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            `Failed to fetch attendance (${response.status})`
        );
      }

      console.log(
        "[Dashboard] Parsed server response:",
        data
      );

      // =====================================================
      // STUDENT
      // =====================================================

      if (data.student) {
        setStudent(data.student);
      }

      // =====================================================
      // SUMMARY
      // =====================================================

      const serverSummary =
        data.summary || {};

      const newSummary = {
        overall_percentage:
          Number(
            serverSummary.overall_percentage ?? 0
          ),

        present:
          Number(
            serverSummary.present ?? 0
          ),

        absent:
          Number(
            serverSummary.absent ?? 0
          ),

        total_classes:
          Number(
            serverSummary.total_classes ?? 0
          ),
      };

      console.log(
        "[Dashboard] REAL SERVER SUMMARY:",
        newSummary
      );

      // IMPORTANT:
      // These values continue to come directly
      // from PostgreSQL/backend.
      setSummary(newSummary);

      // =====================================================
      // SUBJECT ATTENDANCE FROM BACKEND
      // =====================================================

      const attendanceSubjects =
        Array.isArray(data.subjects)
          ? data.subjects
          : [];

      console.log(
        "[Dashboard] Attendance subjects:",
        attendanceSubjects
      );

      setSubjects(attendanceSubjects);

      // =====================================================
      // RECENT ATTENDANCE
      // =====================================================

      const newRecentAttendance =
        Array.isArray(
          data.recent_attendance
        )
          ? data.recent_attendance
          : [];

      setRecentAttendance(
        newRecentAttendance
      );

      console.log(
        "[Dashboard] Request completed in:",
        Math.round(
          performance.now() - startTime
        ),
        "ms"
      );

    } catch (err) {
      console.error(
        "[Dashboard] Attendance fetch error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load attendance data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (studentDbId) {
      fetchAttendance(true);
    } else {
      setLoading(false);
    }
  }, [studentDbId]);

  // =========================================================
  // MERGE REAL COURSES + ATTENDANCE
  // =========================================================

  const mergedSubjects = courses.map(
    (course) => {
      const attendanceData =
        subjects.find(
          (subject) =>
            Number(subject.course_id) ===
            Number(course.id)
        );

      if (attendanceData) {
        return {
          ...course,

          course_id: course.id,

          attended:
            Number(
              attendanceData.attended ??
                attendanceData.present ??
                attendanceData.present_count ??
                0
            ),

          total:
            Number(
              attendanceData.total_classes ??
                attendanceData.total ??
                0
            ),

          percentage:
            Number(
              attendanceData.percentage ??
                0
            ),
        };
      }

      // No attendance session exists for this
      // subject yet.
      return {
        ...course,

        course_id: course.id,

        attended: 0,

        total: 0,

        percentage: 0,
      };
    }
  );

  // =========================================================
  // CALCULATE PERCENTAGE
  // =========================================================

  const calculatePercentage = (
    present,
    total
  ) => {
    if (!total || total === 0) {
      return 0;
    }

    return Math.round(
      (present / total) * 100
    );
  };

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (
    dateValue
  ) => {
    if (!dateValue) {
      return "-";
    }

    try {
      return new Date(
        dateValue
      ).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
    } catch {
      return dateValue;
    }
  };

  // =========================================================
  // FORMAT TIME
  // =========================================================

  const formatTime = (
    dateValue
  ) => {
    if (!dateValue) {
      return "-";
    }

    try {
      return new Date(
        dateValue
      ).toLocaleTimeString(
        "en-IN",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    } catch {
      return "";
    }
  };

  // =========================================================
  // ATTENDANCE FLOW
  // =========================================================

  if (showAttendanceFlow) {
    return (
      <AttendanceFlow
        studentDbId={studentDbId}
        studentId={studentId}
        studentName={studentName}
        onBack={() => {
          setShowAttendanceFlow(false);
          setAttendanceSuccess(false);

          fetchAttendance(false);
        }}
        onComplete={(attendanceData) => {
          console.log(
            "[Dashboard] ATTENDANCE COMPLETED:",
            attendanceData
          );

          setShowAttendanceFlow(false);

          setAttendanceSuccess(true);

          // Fetch actual values again
          // from PostgreSQL.
          fetchAttendance(false);
        }}
      />
    );
  }

  // =========================================================
  // CHANGE PASSWORD
  // =========================================================

  if (showChangePassword) {
    return (
      <ChangePassword
        username={studentId}
        onBack={() => {
          setShowChangePassword(false);
        }}
        onSuccess={() => {
          setShowChangePassword(false);
        }}
      />
    );
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          color: "#334155",
          fontSize: "16px",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div>
          Loading student dashboard...
        </div>

        <div
          style={{
            fontSize: "13px",
            color: "#64748b",
          }}
        >
          Loading attendance data...
        </div>
      </div>
    );
  }

  // =========================================================
  // DISPLAY NAME
  // =========================================================

  const displayName =
    studentName ||
    student?.name ||
    "Student";

  const displayStudentId =
    studentId ||
    student?.student_id ||
    "Student ID";

  // =========================================================
  // DASHBOARD
  // =========================================================

  return (
    <div className="student-dashboard">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <div className="sidebar-bottom">

        <button
          className="logout-button"
          onClick={() => {
            setShowChangePassword(true);
          }}
          style={{
            marginBottom: "10px",
          }}
        >
          <Lock size={18} />

          <span>
            Change Password
          </span>
        </button>

        <button
          className="logout-button"
          onClick={onLogout}
        >
          <LogOut size={18} />

          <span>
            Logout
          </span>
        </button>

      </div>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="student-main">

        {/* ===================================================
            HEADER
        =================================================== */}

        <header className="student-header">

          <div>

            <h1>
              Student Dashboard
            </h1>

            <p>
              Track your attendance and academic
              progress.
            </p>

          </div>

          <div className="student-profile">

            <div className="profile-avatar">
              {displayName
                ? displayName
                    .charAt(0)
                    .toUpperCase()
                : "S"}
            </div>

            <div className="profile-info">

              <strong>
                {displayName}
              </strong>

              <span>
                {displayStudentId}
              </span>

            </div>

          </div>

        </header>

        {/* ===================================================
            ATTENDANCE SUCCESS
        =================================================== */}

        {attendanceSuccess && (
          <div
            style={{
              marginBottom: "20px",
              padding: "15px 18px",
              borderRadius: "10px",
              background: "#ecfdf5",
              color: "#166534",
              border:
                "1px solid #bbf7d0",
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",
              gap: "15px",
            }}
          >

            <div>

              <strong>
                ✓ Attendance marked successfully
              </strong>

              <div
                style={{
                  fontSize: "13px",
                  marginTop: "4px",
                }}
              >
                Attendance was recorded.
                Dashboard data has been
                refreshed from the server.
              </div>

            </div>

            <button
              onClick={() => {
                setAttendanceSuccess(false);
                fetchAttendance(false);
              }}
              disabled={refreshing}
              style={{
                border: "none",
                background:
                  "transparent",
                cursor: refreshing
                  ? "not-allowed"
                  : "pointer",
                color: "#166534",
              }}
            >
              <RefreshCw
                size={18}
                className={
                  refreshing
                    ? "spin"
                    : ""
                }
              />
            </button>

          </div>
        )}

        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (
          <div
            style={{
              marginBottom: "20px",
              padding: "14px 16px",
              borderRadius: "10px",
              background: "#fee2e2",
              color: "#991b1b",
              border:
                "1px solid #fecaca",
            }}
          >
            {error}
          </div>
        )}

        {/* ===================================================
            WELCOME
        =================================================== */}

        <section className="welcome-section">

          <div>

            <h2>
              Welcome back,{" "}
              {displayName}!
            </h2>

            <p>
              Keep track of your attendance and
              stay above the required percentage.
            </p>

          </div>

          <button
            className="scan-button"
            onClick={() => {
              setAttendanceSuccess(false);
              setShowAttendanceFlow(true);
            }}
          >
            <QrCode size={19} />

            Mark Attendance
          </button>

        </section>

        {/* ===================================================
            STAT CARDS
        =================================================== */}

        <section className="stats-grid">

          {/* OVERALL */}

          <div className="stat-card">

            <div className="stat-card-top">

              <div className="stat-icon blue">
                <TrendingUp size={21} />
              </div>

            </div>

            <div className="stat-value">
              {summary.overall_percentage}%
            </div>

            <div className="stat-label">
              Overall Attendance
            </div>

          </div>

          {/* PRESENT */}

          <div className="stat-card">

            <div className="stat-card-top">

              <div className="stat-icon green">
                <CalendarCheck size={21} />
              </div>

            </div>

            <div className="stat-value">
              {summary.present}
            </div>

            <div className="stat-label">
              Present
            </div>

          </div>

          {/* ABSENT */}

          <div className="stat-card">

            <div className="stat-card-top">

              <div className="stat-icon red">
                <CalendarCheck size={21} />
              </div>

            </div>

            <div className="stat-value">
              {summary.absent}
            </div>

            <div className="stat-label">
              Absent
            </div>

          </div>

          {/* TOTAL */}

          <div className="stat-card">

            <div className="stat-card-top">

              <div className="stat-icon purple">
                <BookOpen size={21} />
              </div>

            </div>

            <div className="stat-value">
              {summary.total_classes}
            </div>

            <div className="stat-label">
              Total Classes
            </div>

          </div>

        </section>

        {/* ===================================================
            LOW ATTENDANCE
        =================================================== */}

        {summary.overall_percentage < 75 &&
          summary.total_classes > 0 && (
            <div className="attendance-warning">

              <div className="warning-icon">
                ⚠
              </div>

              <div>

                <strong>
                  Low Attendance Warning
                </strong>

                <p>
                  Your attendance is below
                  75%. Please attend upcoming
                  classes regularly.
                </p>

              </div>

            </div>
          )}

        {/* ===================================================
            SUBJECT ATTENDANCE
        =================================================== */}

        <section className="dashboard-section">

          <div className="section-header">

            <div>

              <h2>
                Subject Attendance
              </h2>

              <p>
                Attendance percentage for each
                subject.
              </p>

            </div>

          </div>

          {mergedSubjects.length === 0 ? (

            <div className="empty-state">

              <BookOpen size={30} />

              <p>
                No subjects available.
              </p>

            </div>

          ) : (

            <div className="subjects-grid">

              {mergedSubjects.map(
                (subject) => {

                  const present =
                    Number(
                      subject.attended ?? 0
                    );

                  const total =
                    Number(
                      subject.total ?? 0
                    );

                  const absent =
                    Math.max(
                      total - present,
                      0
                    );

                  const percentage =
                    Number(
                      subject.percentage ??
                        calculatePercentage(
                          present,
                          total
                        )
                    );

                  return (
                    <div
                      className="subject-card"
                      key={subject.id}
                    >

                      <div className="subject-card-header">

                        <div className="subject-icon">
                          <BookOpen size={18} />
                        </div>

                        <div>

                          <h3>
                            {subject.course_name}
                          </h3>

                          <span>
                            {subject.course_code}
                          </span>

                        </div>

                      </div>

                      <div className="subject-percentage">

                        <strong>
                          {percentage}%
                        </strong>

                        <span>
                          Attendance
                        </span>

                      </div>

                      <div className="progress-bar">

                        <div
                          className="progress-fill"
                          style={{
                            width:
                              `${Math.min(
                                percentage,
                                100
                              )}%`,
                          }}
                        />

                      </div>

                      <div className="subject-stats">

                        <span className="present-text">
                          Present: {present}
                        </span>

                        <span className="absent-text">
                          Absent: {absent}
                        </span>

                        <span>
                          Total: {total}
                        </span>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </section>

        {/* ===================================================
            RECENT ATTENDANCE
        =================================================== */}

        <section className="dashboard-section">

          <div className="section-header">

            <div>

              <h2>
                Recent Attendance
              </h2>

              <p>
                Your latest attendance records.
              </p>

            </div>

          </div>

          {recentAttendance.length === 0 ? (

            <div className="empty-state">

              <CalendarCheck size={30} />

              <p>
                No attendance records found.
              </p>

            </div>

          ) : (

            <div className="attendance-table-wrapper">

              <table className="attendance-table">

                <thead>

                  <tr>

                    <th>
                      Date
                    </th>

                    <th>
                      Subject
                    </th>

                    <th>
                      Time
                    </th>

                    <th>
                      Status
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {recentAttendance.map(
                    (record, index) => {

                      const status =
                        String(
                          record.status ||
                            "present"
                        ).toLowerCase();

                      const course =
                        courses.find(
                          (item) =>
                            Number(item.id) ===
                            Number(
                              record.course_id
                            )
                        );

                      const subjectName =
                        course?.course_name ||
                        record.course_name ||
                        record.subject_name ||
                        record.subject ||
                        `Course ${record.course_id}`;

                      return (
                        <tr
                          key={
                            record.attendance_id ||
                            record.id ||
                            index
                          }
                        >

                          <td>
                            {formatDate(
                              record.marked_at ||
                                record.date
                            )}
                          </td>

                          <td>
                            {subjectName}
                          </td>

                          <td>
                            {formatTime(
                              record.marked_at ||
                                record.date
                            )}
                          </td>

                          <td>

                            <span
                              className={
                                `status-badge ${
                                  status ===
                                  "present"
                                    ? "present"
                                    : "absent"
                                }`
                              }
                            >
                              {status ===
                              "present"
                                ? "Present"
                                : "Absent"}
                            </span>

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

      </main>

    </div>
  );
}
