import { useEffect, useState } from "react";

import StudentLogin from "./pages/StudentLogin";
import FacultyLogin from "./pages/FacultyLogin";
import FacultyQR from "./pages/FacultyQR";
import AdminLogin from "./pages/AdminLogin";
import FacultyDashboard from "./pages/FacultyDashboard";
import FacultyLiveAttendance from "./pages/FacultyLiveAttendance";
import FacultyReports from "./pages/FacultyReports";
import FacultySuspiciousAttempts from "./pages/FacultySuspiciousAttempts";

import {
  QrCode,
  GraduationCap,
  Users,
  ShieldCheck,
  ArrowRight,
  LockKeyhole,
  MapPin,
  ScanFace,
  Activity,
  CheckCircle2,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

import "./App.css";

const API_BASE_URL = "/api";

/* =========================================================
   ACCOUNT HELPERS
========================================================= */

const getAccountActive = (account) => {
  if (typeof account?.is_active === "boolean") {
    return account.is_active;
  }

  if (typeof account?.account_active === "boolean") {
    return account.account_active;
  }

  if (typeof account?.user_is_active === "boolean") {
    return account.user_is_active;
  }

  if (typeof account?.active === "boolean") {
    return account.active;
  }

  if (
    account?.user &&
    typeof account.user.is_active === "boolean"
  ) {
    return account.user.is_active;
  }

  return false;
};

const getSubjectDisplayName = (subject) => {
  if (typeof subject === "string") {
    return subject;
  }

  if (!subject || typeof subject !== "object") {
    return "";
  }

  const nestedSubject =
    subject.subject ||
    subject.course ||
    subject.subject_details ||
    subject.course_details ||
    {};

  const code =
    subject.subject_code ??
    subject.code ??
    subject.course_code ??
    nestedSubject.subject_code ??
    nestedSubject.code ??
    nestedSubject.course_code ??
    "";

  const name =
    subject.subject_name ??
    subject.name ??
    subject.course_name ??
    nestedSubject.subject_name ??
    nestedSubject.name ??
    nestedSubject.course_name ??
    "";

  if (code && name) {
    return `${code} - ${name}`;
  }

  return name || code || "";
};

const getSubjectsDisplay = (subjects) => {
  if (Array.isArray(subjects)) {
    const formattedSubjects = subjects
      .map(getSubjectDisplayName)
      .filter(Boolean);

    return formattedSubjects.length
      ? formattedSubjects.join(", ")
      : "-";
  }

  if (typeof subjects === "string") {
    return subjects || "-";
  }

  if (subjects && typeof subjects === "object") {
    const singleSubject = getSubjectDisplayName(subjects);
    return singleSubject || "-";
  }

  return "-";
};

/* =========================================================
   ADMIN STUDENT ACCOUNTS
========================================================= */

function AdminStudentAccounts({ onBack }) {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_BASE_URL}/admin/students`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof data.detail === "string"
              ? data.detail
              : "Unable to load student accounts."
          );
        }

        setStudents(
          Array.isArray(data)
            ? data
            : data.students || []
        );
      } catch (err) {
        console.error(
          "Student accounts error:",
          err
        );

        setError(
          err.message ||
            "Unable to load student accounts."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const filteredStudents = students.filter(
    (student) => {
      const searchText = search.toLowerCase();

      return (
        String(student.student_id || "")
          .toLowerCase()
          .includes(searchText) ||
        String(student.name || "")
          .toLowerCase()
          .includes(searchText) ||
        String(student.username || "")
          .toLowerCase()
          .includes(searchText) ||
        String(student.email || "")
          .toLowerCase()
          .includes(searchText)
      );
    }
  );

  return (
    <div className="portal-page">
      <header className="portal-navbar">
        <button
          className="brand-button"
          onClick={onBack}
        >
          <div className="brand-mark">
            <QrCode
              size={21}
              strokeWidth={2.4}
            />
          </div>

          <div className="brand-text">
            <strong>AttendX</strong>
            <span>ADMINISTRATION</span>
          </div>
        </button>

        <button
          className="portal-logout"
          onClick={onBack}
        >
          Back to Dashboard
        </button>
      </header>

      <main className="admin-dashboard">
        <div className="dashboard-page-heading">
          <div>
            <div className="section-eyebrow">
              <span></span>
              STUDENT ACCOUNTS
            </div>

            <h1>Student accounts</h1>

            <p>
              Manage student records and account
              access for the AttendX system.
            </p>
          </div>

          <button
            className="admin-back-button"
            onClick={onBack}
          >
            <ChevronRight
              size={17}
              style={{
                transform: "rotate(180deg)",
              }}
            />

            Admin Dashboard
          </button>
        </div>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <span>STUDENTS</span>

              <h2>
                {loading
                  ? "Loading..."
                  : `${students.length} student accounts`}
              </h2>
            </div>

            <GraduationCap size={22} />
          </div>

          <div
            style={{
              marginTop: "22px",
              marginBottom: "22px",
            }}
          >
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search by student ID, name or username..."
              style={{
                width: "100%",
                padding: "13px 15px",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                background: "#fff",
                color: "var(--text)",
              }}
            />
          </div>

          {loading && (
            <div
              style={{
                padding: "30px 0",
                textAlign: "center",
                color: "var(--text-soft)",
              }}
            >
              Loading student accounts...
            </div>
          )}

          {!loading && error && (
            <div
              style={{
                padding: "20px",
                borderRadius: "8px",
                background: "#fff4f4",
                border: "1px solid #f0caca",
                color: "#a33a3a",
                lineHeight: 1.6,
              }}
            >
              <strong>
                Student accounts could not be loaded.
              </strong>

              <p
                style={{
                  marginTop: "6px",
                  marginBottom: 0,
                }}
              >
                {error}
              </p>

              <p
                style={{
                  marginTop: "8px",
                  marginBottom: 0,
                  fontSize: "13px",
                }}
              >
                The Admin backend route will be connected
                in the next step.
              </p>
            </div>
          )}

          {!loading &&
            !error &&
            filteredStudents.length === 0 && (
              <div
                style={{
                  padding: "30px 0",
                  textAlign: "center",
                  color: "var(--text-soft)",
                }}
              >
                {students.length === 0
                  ? "No student accounts were returned by the backend."
                  : "No students match your search."}
              </div>
            )}

          {!loading &&
            !error &&
            filteredStudents.length > 0 && (
              <div
                style={{
                  overflowX: "auto",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "13px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom:
                          "1px solid var(--border)",
                        textAlign: "left",
                      }}
                    >
                      <th
                        style={{
                          padding: "13px 10px",
                        }}
                      >
                        Student ID
                      </th>

                      <th
                        style={{
                          padding: "13px 10px",
                        }}
                      >
                        Name
                      </th>

                      <th
                        style={{
                          padding: "13px 10px",
                        }}
                      >
                        Username
                      </th>

                      <th
                        style={{
                          padding: "13px 10px",
                        }}
                      >
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredStudents.map(
                      (student) => {
                        const accountActive =
                          getAccountActive(student);

                        return (
                          <tr
                            key={
                              student.id ||
                              student.student_id
                            }
                            style={{
                              borderBottom:
                                "1px solid var(--border)",
                            }}
                          >
                            <td
                              style={{
                                padding: "14px 10px",
                                fontWeight: 700,
                              }}
                            >
                              {student.student_id || "-"}
                            </td>

                            <td
                              style={{
                                padding: "14px 10px",
                              }}
                            >
                              {student.name || "-"}
                            </td>

                            <td
                              style={{
                                padding: "14px 10px",
                              }}
                            >
                              {student.username || "-"}
                            </td>

                            <td
                              style={{
                                padding: "14px 10px",
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  padding: "5px 9px",
                                  borderRadius: "20px",
                                  background:
                                    accountActive
                                      ? "#edf8f1"
                                      : "#fff1f1",
                                  color:
                                    accountActive
                                      ? "#237545"
                                      : "#a33a3a",
                                  fontWeight: 700,
                                  fontSize: "11px",
                                }}
                              >
                                <span
                                  style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius:
                                      "50%",
                                    background:
                                      accountActive
                                        ? "#36a269"
                                        : "#c44b4b",
                                  }}
                                ></span>

                                {accountActive
                                  ? "Active"
                                  : "Inactive"}
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

/* =========================================================
   ADMIN FACULTY ACCOUNTS
========================================================= */

function AdminFacultyAccounts({ onBack }) {
  const [faculty, setFaculty] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_BASE_URL}/admin/faculty`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof data.detail === "string"
              ? data.detail
              : "Unable to load faculty accounts."
          );
        }

        setFaculty(
          Array.isArray(data)
            ? data
            : data.faculty || []
        );
      } catch (err) {
        console.error(
          "Faculty accounts error:",
          err
        );

        setError(
          err.message ||
            "Unable to load faculty accounts."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchFaculty();
  }, []);

  const filteredFaculty = faculty.filter(
    (member) => {
      const searchText = search.toLowerCase();

      return (
        String(member.faculty_id || "")
          .toLowerCase()
          .includes(searchText) ||
        String(member.name || "")
          .toLowerCase()
          .includes(searchText) ||
        String(member.username || "")
          .toLowerCase()
          .includes(searchText) ||
        String(member.email || "")
          .toLowerCase()
          .includes(searchText)
      );
    }
  );

  return (
    <div className="portal-page">
      <header className="portal-navbar">
        <button
          className="brand-button"
          onClick={onBack}
        >
          <div className="brand-mark">
            <QrCode
              size={21}
              strokeWidth={2.4}
            />
          </div>

          <div className="brand-text">
            <strong>AttendX</strong>
            <span>ADMINISTRATION</span>
          </div>
        </button>

        <button
          className="portal-logout"
          onClick={onBack}
        >
          Back to Dashboard
        </button>
      </header>

      <main className="admin-dashboard">
        <div className="dashboard-page-heading">
          <div>
            <div className="section-eyebrow">
              <span></span>
              FACULTY ACCOUNTS
            </div>

            <h1>Faculty accounts</h1>

            <p>
              Manage faculty access and view their
              assigned subjects.
            </p>
          </div>

          <button
            className="admin-back-button"
            onClick={onBack}
          >
            <ChevronRight
              size={17}
              style={{
                transform: "rotate(180deg)",
              }}
            />

            Admin Dashboard
          </button>
        </div>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <span>FACULTY</span>

              <h2>
                {loading
                  ? "Loading..."
                  : `${faculty.length} faculty accounts`}
              </h2>
            </div>

            <Users size={22} />
          </div>

          <div
            style={{
              marginTop: "22px",
              marginBottom: "22px",
            }}
          >
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search by faculty ID, name or username..."
              style={{
                width: "100%",
                padding: "13px 15px",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                background: "#fff",
                color: "var(--text)",
              }}
            />
          </div>

          {loading && (
            <div
              style={{
                padding: "30px 0",
                textAlign: "center",
                color: "var(--text-soft)",
              }}
            >
              Loading faculty accounts...
            </div>
          )}

          {!loading && error && (
            <div
              style={{
                padding: "20px",
                borderRadius: "8px",
                background: "#fff4f4",
                border: "1px solid #f0caca",
                color: "#a33a3a",
                lineHeight: 1.6,
              }}
            >
              <strong>
                Faculty accounts could not be loaded.
              </strong>

              <p
                style={{
                  marginTop: "6px",
                  marginBottom: 0,
                }}
              >
                {error}
              </p>

              <p
                style={{
                  marginTop: "8px",
                  marginBottom: 0,
                  fontSize: "13px",
                }}
              >
                The Admin backend route will be connected
                in the next step.
              </p>
            </div>
          )}

          {!loading &&
            !error &&
            filteredFaculty.length === 0 && (
              <div
                style={{
                  padding: "30px 0",
                  textAlign: "center",
                  color: "var(--text-soft)",
                }}
              >
                {faculty.length === 0
                  ? "No faculty accounts were returned by the backend."
                  : "No faculty members match your search."}
              </div>
            )}

          {!loading &&
            !error &&
            filteredFaculty.length > 0 && (
              <div
                style={{
                  overflowX: "auto",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "13px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom:
                          "1px solid var(--border)",
                        textAlign: "left",
                      }}
                    >
                      <th
                        style={{
                          padding: "13px 10px",
                        }}
                      >
                        Faculty ID
                      </th>

                      <th
                        style={{
                          padding: "13px 10px",
                        }}
                      >
                        Name
                      </th>

                      <th
                        style={{
                          padding: "13px 10px",
                        }}
                      >
                        Username
                      </th>

                      <th
                        style={{
                          padding: "13px 10px",
                        }}
                      >
                        Subjects
                      </th>

                      <th
                        style={{
                          padding: "13px 10px",
                        }}
                      >
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredFaculty.map(
                      (member) => {
                        const accountActive =
                          getAccountActive(member);

                        return (
                          <tr
                            key={
                              member.id ||
                              member.faculty_id
                            }
                            style={{
                              borderBottom:
                                "1px solid var(--border)",
                            }}
                          >
                            <td
                              style={{
                                padding: "14px 10px",
                                fontWeight: 700,
                              }}
                            >
                              {member.faculty_id || "-"}
                            </td>

                            <td
                              style={{
                                padding: "14px 10px",
                              }}
                            >
                              {member.name || "-"}
                            </td>

                            <td
                              style={{
                                padding: "14px 10px",
                              }}
                            >
                              {member.username || "-"}
                            </td>

                            <td
                              style={{
                                padding: "14px 10px",
                              }}
                            >
                              {getSubjectsDisplay(
                                member.subjects
                              )}
                            </td>

                            <td
                              style={{
                                padding: "14px 10px",
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  padding: "5px 9px",
                                  borderRadius: "20px",
                                  background:
                                    accountActive
                                      ? "#edf8f1"
                                      : "#fff1f1",
                                  color:
                                    accountActive
                                      ? "#237545"
                                      : "#a33a3a",
                                  fontWeight: 700,
                                  fontSize: "11px",
                                }}
                              >
                                <span
                                  style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius:
                                      "50%",
                                    background:
                                      accountActive
                                        ? "#36a269"
                                        : "#c44b4b",
                                  }}
                                ></span>

                                {accountActive
                                  ? "Active"
                                  : "Inactive"}
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

/* =========================================================
   MAIN APP
========================================================= */

function App() {
  const [role, setRole] = useState(null);
  const [page, setPage] = useState("home");
  const [facultyData, setFacultyData] =
    useState(null);
  const [showAbout, setShowAbout] =
    useState(false);
  const [mobileMenu, setMobileMenu] =
    useState(false);
  const [adminPage, setAdminPage] =
    useState("dashboard");

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const goHome = () => {
    setRole(null);
    setPage("home");
    setShowAbout(false);
    setMobileMenu(false);
    setAdminPage("dashboard");
    setFacultyData(null);
  };

  const openRole = (selectedRole) => {
    setRole(selectedRole);
    setMobileMenu(false);

    if (selectedRole === "student") {
      setPage("student");
    } else if (selectedRole === "faculty") {
      setPage("faculty");
    } else if (selectedRole === "admin") {
      setAdminPage("dashboard");
      setPage("admin");
    }
  };

  /* =======================================================
     FACULTY NAVIGATION
  ======================================================= */

  const facultyNavigation = {
    dashboard: () =>
      setPage("faculty-dashboard"),

    qr: () =>
      setPage("faculty-qr"),

    live: () =>
      setPage("faculty-live"),

    reports: () =>
      setPage("faculty-reports"),

    suspicious: () =>
      setPage("faculty-suspicious"),
  };

  /* =======================================================
     ADMIN NAVIGATION
  ======================================================= */

  const adminNavigation = {
    dashboard: () =>
      setAdminPage("dashboard"),

    students: () =>
      setAdminPage("students"),

    faculty: () =>
      setAdminPage("faculty"),
  };

  /* =======================================================
     ABOUT PAGE
  ======================================================= */

  if (showAbout) {
    return (
      <div className="app-shell">
        <header className="main-navbar">
          <div className="navbar-inner">
            <button
              className="brand-button"
              onClick={goHome}
            >
              <div className="brand-mark">
                <QrCode
                  size={21}
                  strokeWidth={2.4}
                />
              </div>

              <div className="brand-text">
                <strong>AttendX</strong>
                <span>SMART ATTENDANCE</span>
              </div>
            </button>

            <div className="desktop-nav">
              <button
                className="nav-link"
                onClick={goHome}
              >
                Home
              </button>

              <button
                className="nav-link active"
                onClick={() =>
                  setShowAbout(true)
                }
              >
                About
              </button>
            </div>

            <button
              className="mobile-menu-button"
              onClick={() =>
                setMobileMenu(!mobileMenu)
              }
            >
              {mobileMenu ? (
                <X />
              ) : (
                <Menu />
              )}
            </button>
          </div>

          {mobileMenu && (
            <div className="mobile-nav">
              <button onClick={goHome}>
                Home
              </button>

              <button
                onClick={() =>
                  setShowAbout(true)
                }
              >
                About
              </button>
            </div>
          )}
        </header>

        <main className="about-page">
          <section className="about-hero">
            <div className="section-eyebrow">
              <span></span>
              ABOUT ATTENDX
            </div>

            <h1>
              Attendance designed for
              <span> real classrooms.</span>
            </h1>

            <p>
              AttendX is an intelligent college
              attendance management platform
              designed to make classroom attendance
              more secure, transparent and reliable.
            </p>
          </section>

          <section className="about-feature-grid">
            <div className="about-feature-card">
              <div className="about-feature-icon">
                <QrCode />
              </div>

              <h3>Dynamic QR</h3>

              <p>
                Attendance sessions use continuously
                changing QR codes to reduce screenshot
                sharing and QR reuse.
              </p>
            </div>

            <div className="about-feature-card">
              <div className="about-feature-icon">
                <ScanFace />
              </div>

              <h3>Face Verification</h3>

              <p>
                Student identity can be verified using
                the student's enrolled facial
                representation during attendance.
              </p>
            </div>

            <div className="about-feature-card">
              <div className="about-feature-icon">
                <MapPin />
              </div>

              <h3>Live Location</h3>

              <p>
                Classroom location validation helps
                ensure attendance is recorded from the
                permitted classroom area.
              </p>
            </div>
          </section>

          <section className="about-story">
            <div>
              <div className="section-eyebrow">
                <span></span>
                OUR APPROACH
              </div>

              <h2>
                More than scanning a QR code.
              </h2>
            </div>

            <p>
              Traditional QR attendance systems can
              be vulnerable to shared screenshots,
              repeated codes and attendance from
              outside the classroom. AttendX combines
              multiple verification layers so that
              attendance represents both the student's
              identity and classroom presence.
            </p>
          </section>
        </main>

        <footer className="main-footer">
          <div>
            <strong>AttendX</strong>

            <span>
              Intelligent College Attendance Management
            </span>
          </div>

          <p>© 2026 AttendX · MINI PROJ</p>
        </footer>
      </div>
    );
  }

  /* =======================================================
     STUDENT
  ======================================================= */

  if (page === "student") {
    return (
      <StudentLogin onBack={goHome} />
    );
  }

  /* =======================================================
     FACULTY LOGIN
  ======================================================= */

  if (page === "faculty") {
    return (
      <FacultyLogin
        onBack={goHome}
        onLogin={(data) => {
          setFacultyData(data);
          setPage("faculty-dashboard");
        }}
      />
    );
  }

  /* =======================================================
     FACULTY DASHBOARD
  ======================================================= */

  if (page === "faculty-dashboard") {
    const actualFacultyId =
      facultyData?.id ??
      facultyData?.faculty_id ??
      facultyData?.facultyId ??
      facultyData?.user_id;

    console.log(
      "Faculty data:",
      facultyData
    );

    console.log(
      "Actual faculty ID:",
      actualFacultyId
    );

    return (
      <FacultyDashboard
        facultyName={facultyData?.name}
        facultyId={actualFacultyId}
        onCreateQR={
          facultyNavigation.qr
        }
        onLiveAttendance={
          facultyNavigation.live
        }
        onReports={
          facultyNavigation.reports
        }
        onSuspiciousAttempts={
          facultyNavigation.suspicious
        }
        onLogout={goHome}
      />
    );
  }

  /* =======================================================
     FACULTY QR
  ======================================================= */

  if (page === "faculty-qr") {
    return (
      <FacultyQR
        onBack={
          facultyNavigation.dashboard
        }
      />
    );
  }

  /* =======================================================
     FACULTY LIVE
  ======================================================= */

  if (page === "faculty-live") {
    return (
      <FacultyLiveAttendance
        onBack={
          facultyNavigation.dashboard
        }
      />
    );
  }

  /* =======================================================
     FACULTY REPORTS
  ======================================================= */

  if (page === "faculty-reports") {
    return (
      <FacultyReports
        onBack={
          facultyNavigation.dashboard
        }
      />
    );
  }

  /* =======================================================
     FACULTY SUSPICIOUS
  ======================================================= */

  if (page === "faculty-suspicious") {
    return (
      <FacultySuspiciousAttempts
        onBack={
          facultyNavigation.dashboard
        }
      />
    );
  }

  /* =======================================================
     ADMIN LOGIN
  ======================================================= */

  if (page === "admin") {
    return (
      <AdminLogin
        onBack={goHome}
        onLogin={() => {
          setAdminPage("dashboard");
          setPage("admin-dashboard");
        }}
      />
    );
  }

  /* =======================================================
     ADMIN STUDENT ACCOUNTS
  ======================================================= */

  if (
    page === "admin-dashboard" &&
    adminPage === "students"
  ) {
    return (
      <AdminStudentAccounts
        onBack={
          adminNavigation.dashboard
        }
      />
    );
  }

  /* =======================================================
     ADMIN FACULTY ACCOUNTS
  ======================================================= */

  if (
    page === "admin-dashboard" &&
    adminPage === "faculty"
  ) {
    return (
      <AdminFacultyAccounts
        onBack={
          adminNavigation.dashboard
        }
      />
    );
  }

  /* =======================================================
     ADMIN DASHBOARD
  ======================================================= */

  if (
    page === "admin-dashboard" &&
    adminPage === "dashboard"
  ) {
    return (
      <div className="portal-page">
        <header className="portal-navbar">
          <button
            className="brand-button"
            onClick={goHome}
          >
            <div className="brand-mark">
              <QrCode
                size={21}
                strokeWidth={2.4}
              />
            </div>

            <div className="brand-text">
              <strong>AttendX</strong>
              <span>ADMINISTRATION</span>
            </div>
          </button>

          <button
            className="portal-logout"
            onClick={goHome}
          >
            Sign out
          </button>
        </header>

        <main className="admin-dashboard">
          <div className="dashboard-page-heading">
            <div>
              <div className="section-eyebrow">
                <span></span>
                ADMIN PORTAL
              </div>

              <h1>System overview</h1>

              <p>
                Manage attendance infrastructure,
                users and classroom operations.
              </p>
            </div>

            <div className="admin-status">
              <CheckCircle2 size={17} />
              System operational
            </div>
          </div>

          <div className="admin-stats">
            <div className="admin-stat">
              <div className="admin-stat-top">
                <span>Students</span>
                <GraduationCap />
              </div>

              <strong>68</strong>

              <small>
                Registered student accounts
              </small>
            </div>

            <div className="admin-stat">
              <div className="admin-stat-top">
                <span>Faculty</span>
                <Users />
              </div>

              <strong>7</strong>

              <small>
                Registered faculty accounts
              </small>
            </div>

            <div className="admin-stat">
              <div className="admin-stat-top">
                <span>Subjects</span>
                <Activity />
              </div>

              <strong>7</strong>

              <small>
                Configured subjects
              </small>
            </div>

            <div className="admin-stat">
              <div className="admin-stat-top">
                <span>Security</span>
                <ShieldCheck />
              </div>

              <strong>ON</strong>

              <small>
                Multi-layer verification
              </small>
            </div>
          </div>

          <section className="admin-content-grid">
            <div className="admin-panel">
              <div className="admin-panel-heading">
                <div>
                  <span>ACCOUNTS</span>

                  <h2>
                    Account management
                  </h2>
                </div>

                <Users size={21} />
              </div>

              <div className="admin-action-list">
                <button
                  onClick={
                    adminNavigation.students
                  }
                >
                  <div className="admin-action-icon">
                    <GraduationCap />
                  </div>

                  <div>
                    <strong>
                      Student accounts
                    </strong>

                    <span>
                      Manage student records and
                      access
                    </span>
                  </div>

                  <ArrowRight />
                </button>

                <button
                  onClick={
                    adminNavigation.faculty
                  }
                >
                  <div className="admin-action-icon">
                    <Users />
                  </div>

                  <div>
                    <strong>
                      Faculty accounts
                    </strong>

                    <span>
                      Manage faculty access and
                      subjects
                    </span>
                  </div>

                  <ArrowRight />
                </button>
              </div>
            </div>

            <div className="admin-panel">
              <div className="admin-panel-heading">
                <div>
                  <span>SECURITY</span>

                  <h2>
                    System protection
                  </h2>
                </div>

                <LockKeyhole size={21} />
              </div>

              <div className="security-list">
                <div>
                  <CheckCircle2 />

                  <span>
                    Secure password hashing
                  </span>
                </div>

                <div>
                  <CheckCircle2 />

                  <span>
                    Dynamic QR sessions
                  </span>
                </div>

                <div>
                  <CheckCircle2 />

                  <span>
                    Face verification
                  </span>
                </div>

                <div>
                  <CheckCircle2 />

                  <span>
                    Live GPS validation
                  </span>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  /* =======================================================
     HOME
  ======================================================= */

  return (
    <div className="app-shell">
      <header className="main-navbar">
        <div className="navbar-inner">
          <button
            className="brand-button"
            onClick={goHome}
          >
            <div className="brand-mark">
              <QrCode
                size={21}
                strokeWidth={2.4}
              />
            </div>

            <div className="brand-text">
              <strong>AttendX</strong>
              <span>SMART ATTENDANCE</span>
            </div>
          </button>

          <div className="desktop-nav">
            <button
              className="nav-link"
              onClick={() =>
                setShowAbout(true)
              }
            >
              About
            </button>
          </div>

          <button
            className="mobile-menu-button"
            onClick={() =>
              setMobileMenu(!mobileMenu)
            }
          >
            {mobileMenu ? (
              <X />
            ) : (
              <Menu />
            )}
          </button>
        </div>

        {mobileMenu && (
          <div className="mobile-nav">
            <button
              onClick={() =>
                setShowAbout(true)
              }
            >
              About
            </button>
          </div>
        )}
      </header>

      <main>
        {/* ================= HERO ================= */}

        <section className="hero">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="section-eyebrow hero-eyebrow">
                <span></span>
                INTELLIGENT COLLEGE ATTENDANCE
              </div>

              <h1>
                Attendance that
                <br />
                verifies the
                <em>student.</em>
              </h1>

              <p>
                A secure attendance platform
                combining dynamic QR sessions,
                face verification and live classroom
                location validation.
              </p>

              <div className="hero-security">
                <div>
                  <CheckCircle2 size={16} />
                  Secure verification
                </div>

                <div>
                  <CheckCircle2 size={16} />
                  Live validation
                </div>

                <div>
                  <CheckCircle2 size={16} />
                  College managed
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= PORTALS ================= */}

        <section className="portal-section">
          <div className="section-eyebrow">
            <span></span>
            ACCESS PORTALS
          </div>

          <div className="portal-heading">
            <h2>
              One platform.
              <br />
              Different responsibilities.
            </h2>

            <p>
              Students mark attendance, faculty
              manage classroom sessions and
              administrators manage the system.
            </p>
          </div>

          <div className="portal-grid">
            <button
              className="portal-card portal-student"
              onClick={() =>
                openRole("student")
              }
            >
              <div className="portal-card-top">
                <GraduationCap />
                <span>01</span>
              </div>

              <h3>Student</h3>

              <p>
                Mark attendance, view attendance
                history, monitor subjects and
                manage your account.
              </p>

              <div className="portal-card-action">
                Enter Student Portal
                <ArrowRight />
              </div>
            </button>

            <button
              className="portal-card portal-faculty"
              onClick={() =>
                openRole("faculty")
              }
            >
              <div className="portal-card-top">
                <Users />
                <span>02</span>
              </div>

              <h3>Faculty</h3>

              <p>
                Create attendance sessions, monitor
                students, review reports and
                investigate attempts.
              </p>

              <div className="portal-card-action">
                Enter Faculty Portal
                <ArrowRight />
              </div>
            </button>

            <button
              className="portal-card portal-admin"
              onClick={() =>
                openRole("admin")
              }
            >
              <div className="portal-card-top">
                <ShieldCheck />
                <span>03</span>
              </div>

              <h3>Administrator</h3>

              <p>
                Manage accounts, system
                configuration and college attendance
                infrastructure.
              </p>

              <div className="portal-card-action">
                Enter Admin Portal
                <ArrowRight />
              </div>
            </button>
          </div>
        </section>
      </main>

      <footer className="main-footer"></footer>
    </div>
  );
}

export default App;