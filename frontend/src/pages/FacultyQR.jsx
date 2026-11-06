import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

const API_BASE_URL = "/api";
const FACULTY_ID = 1;
const QR_ROTATION_SECONDS = 20;
const SESSION_DURATION_MINUTES = 5;

function FacultyQR() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const [sessionCode, setSessionCode] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [rotationNumber, setRotationNumber] = useState(0);

  const [secondsRemaining, setSecondsRemaining] = useState(
    QR_ROTATION_SECONDS
  );

  const [sessionSecondsRemaining, setSessionSecondsRemaining] = useState(
    SESSION_DURATION_MINUTES * 60
  );

  const [sessionActive, setSessionActive] = useState(false);

  const [facultyLocation, setFacultyLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [creatingSession, setCreatingSession] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const pollingRef = useRef(null);
  const countdownRef = useRef(null);
  const lastQrKeyRef = useRef("");

  // ========================================================
  // LOAD COURSES FROM POSTGRESQL
  // ========================================================

  useEffect(() => {
    loadCourses();

    return () => {
      stopPolling();
      stopCountdown();
    };
  }, []);

  const loadCourses = async () => {
    try {
      setLoadingCourses(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/courses/?t=${Date.now()}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );

      const text = await response.text();

      let data = [];

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Backend returned an invalid courses response.");
      }

      if (!response.ok) {
        throw new Error(
          data?.detail || "Unable to load courses from PostgreSQL."
        );
      }

      console.log("COURSES FROM POSTGRESQL:", data);

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("No active courses were found in PostgreSQL.");
      }

      setCourses(data);
    } catch (err) {
      console.error("LOAD COURSES ERROR:", err);

      setCourses([]);

      setError(
        err?.message || "Unable to load courses from PostgreSQL."
      );
    } finally {
      setLoadingCourses(false);
    }
  };

  // ========================================================
  // STOP POLLING
  // ========================================================

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // ========================================================
  // STOP COUNTDOWN
  // ========================================================

  const stopCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  // ========================================================
  // GET FACULTY GPS
  // ========================================================

  const getFacultyLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(
          new Error("Geolocation is not supported by this browser.")
        );
        return;
      }

      setLoadingLocation(true);
      setError("");
      setMessage("Getting faculty live location...");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };

          console.log("FACULTY LIVE LOCATION:", location);

          setFacultyLocation(location);
          setLoadingLocation(false);

          resolve(location);
        },
        (err) => {
          console.error("FACULTY LOCATION ERROR:", err);

          setLoadingLocation(false);

          let errorMessage = "Unable to get faculty location.";

          if (err.code === 1) {
            errorMessage =
              "Location permission denied. Please allow location access.";
          } else if (err.code === 2) {
            errorMessage =
              "Location unavailable. Please turn on GPS/location services.";
          } else if (err.code === 3) {
            errorMessage =
              "Location request timed out. Please try again.";
          }

          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  };

  // ========================================================
  // GENERATE QR IMAGE
  // ========================================================

  const generateQRImage = async (stableSessionCode, token) => {
    try {
      /*
       * QR payload:
       *
       * stable session code : token
       *
       * Example:
       *
       * AX-F21F6224:abcdef1234567890...
       *
       * The token changes every 20 seconds.
       */

      const qrPayload = `${stableSessionCode}:${token}`;

      console.log("GENERATING QR:", qrPayload);

      const image = await QRCode.toDataURL(qrPayload, {
        width: 320,
        margin: 2,
        errorCorrectionLevel: "M",
      });

      setQrImage(image);

      console.log("QR IMAGE UPDATED");
    } catch (err) {
      console.error("QR GENERATION ERROR:", err);
      setError("Unable to generate QR code.");
    }
  };

  // ========================================================
  // CREATE SESSION
  // ========================================================

  const createSession = async () => {
    try {
      setError("");
      setMessage("");

      if (!selectedCourseId) {
        setError("Please select a subject before starting the session.");
        return;
      }

      const selectedCourse = courses.find(
        (course) =>
          String(course.id) === String(selectedCourseId)
      );

      if (!selectedCourse) {
        setError("Selected subject could not be found.");
        return;
      }

      setCreatingSession(true);

      stopPolling();
      stopCountdown();

      // ----------------------------------------------------
      // GET LIVE FACULTY LOCATION
      // ----------------------------------------------------

      const location = await getFacultyLocation();

      if (!location) {
        throw new Error("Faculty location is unavailable.");
      }

      // ----------------------------------------------------
      // CREATE BACKEND SESSION
      // ----------------------------------------------------

      const params = new URLSearchParams({
        faculty_id: String(FACULTY_ID),

        // REAL POSTGRESQL COURSE ID
        course_id: String(selectedCourse.id),

        classroom_latitude: String(location.latitude),
        classroom_longitude: String(location.longitude),

        allowed_radius: "100",

        duration_minutes: String(
          SESSION_DURATION_MINUTES
        ),
      });

      const url =
        `${API_BASE_URL}/qr-sessions/qr/create?` +
        params.toString();

      console.log("CREATE SESSION URL:", url);
      console.log("SELECTED COURSE:", selectedCourse);

      const response = await fetch(url, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      const text = await response.text();

      let data = {};

      try {
        data = JSON.parse(text);
      } catch {
        console.error("CREATE SESSION NON-JSON:", text);

        throw new Error(
          "Backend returned an invalid response."
        );
      }

      console.log("CREATE SESSION RESPONSE:", data);

      if (!response.ok) {
        throw new Error(
          data?.detail || "Unable to create QR session."
        );
      }

      // ----------------------------------------------------
      // SAVE SESSION
      // ----------------------------------------------------

      const stableCode = data.session_code;
      const token = data.qr_token;

      if (!stableCode || !token) {
        throw new Error(
          "Backend did not return a valid QR session."
        );
      }

      setSessionCode(stableCode);
      setQrToken(token);

      setRotationNumber(
        data.rotation_number ?? 0
      );

      setSecondsRemaining(
        data.seconds_remaining ??
          QR_ROTATION_SECONDS
      );

      setSessionSecondsRemaining(
        data.session_seconds_remaining ??
          SESSION_DURATION_MINUTES * 60
      );

      setSessionActive(true);

      lastQrKeyRef.current =
        `${stableCode}:${token}`;

      // ----------------------------------------------------
      // GENERATE INITIAL QR
      // ----------------------------------------------------

      await generateQRImage(
        stableCode,
        token
      );

      setMessage(
        `Attendance session started for ${selectedCourse.course_code} - ${selectedCourse.course_name}.`
      );

      // ----------------------------------------------------
      // START BACKEND POLLING
      // ----------------------------------------------------

      startPolling(stableCode);

      // ----------------------------------------------------
      // START UI COUNTDOWN
      // ----------------------------------------------------

      startCountdown();

    } catch (err) {
      console.error("CREATE SESSION ERROR:", err);

      setError(
        err?.message ||
          "Unable to create attendance session."
      );

      setSessionActive(false);
    } finally {
      setCreatingSession(false);
      setLoadingLocation(false);
    }
  };

  // ========================================================
  // POLL BACKEND
  // ========================================================

  const startPolling = (stableSessionCode) => {
    stopPolling();

    pollingRef.current = setInterval(async () => {
      await refreshSession(stableSessionCode);
    }, 3000);
  };

  // ========================================================
  // REFRESH SESSION
  // ========================================================

  const refreshSession = async (stableSessionCode) => {
    try {
      const url =
        `${API_BASE_URL}/qr-sessions/qr/` +
        `${encodeURIComponent(
          stableSessionCode
        )}/current?time=${Date.now()}`;

      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: {
          "Cache-Control":
            "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      const text = await response.text();

      let data = {};

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          "Invalid response from QR server."
        );
      }

      console.log(
        "CURRENT QR RESPONSE:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Unable to refresh QR."
        );
      }

      // ----------------------------------------------------
      // SESSION EXPIRED
      // ----------------------------------------------------

      if (!data.is_active) {
        await stopSession(false);
        return;
      }

      // ----------------------------------------------------
      // UPDATE UI COUNTDOWN
      // ----------------------------------------------------

      setSecondsRemaining(
        data.seconds_remaining ??
          QR_ROTATION_SECONDS
      );

      setSessionSecondsRemaining(
        data.session_seconds_remaining ??
          0
      );

      setRotationNumber(
        data.rotation_number ?? 0
      );

      // ----------------------------------------------------
      // CHECK WHETHER QR ACTUALLY CHANGED
      // ----------------------------------------------------

      const newToken = data.qr_token;

      const newSessionCode =
        data.session_code ||
        stableSessionCode;

      const newQrKey =
        `${newSessionCode}:${newToken}`;

      if (
        newQrKey !==
        lastQrKeyRef.current
      ) {
        console.log(
          "QR ROTATION DETECTED"
        );

        console.log(
          "Old QR:",
          lastQrKeyRef.current
        );

        console.log(
          "New QR:",
          newQrKey
        );

        lastQrKeyRef.current =
          newQrKey;

        setSessionCode(
          newSessionCode
        );

        setQrToken(
          newToken
        );

        await generateQRImage(
          newSessionCode,
          newToken
        );
      }

      // ----------------------------------------------------
      // BACKEND IS SOURCE OF TRUTH
      // ----------------------------------------------------

      if (
        data.session_seconds_remaining <= 0
      ) {
        await stopSession(false);
      }

    } catch (err) {
      console.error(
        "QR REFRESH ERROR:",
        err
      );

      /*
       * Do not immediately destroy the session because
       * one polling request failed.
       *
       * The next poll will retry.
       */

      if (
        err?.message?.toLowerCase()
          .includes("expired")
      ) {
        await stopSession(false);
      }
    }
  };

  // ========================================================
  // UI COUNTDOWN
  // ========================================================

  const startCountdown = () => {
    stopCountdown();

    countdownRef.current =
      setInterval(() => {
        setSecondsRemaining(
          (previous) => {
            if (previous <= 1) {
              return QR_ROTATION_SECONDS;
            }

            return previous - 1;
          }
        );

        setSessionSecondsRemaining(
          (previous) => {
            if (previous <= 1) {
              return 0;
            }

            return previous - 1;
          }
        );
      }, 1000);
  };

  // ========================================================
  // STOP SESSION
  // ========================================================

  const stopSession = async (
    deactivateOnServer = true
  ) => {
    const currentSessionCode =
      sessionCode;

    stopPolling();
    stopCountdown();

    if (
      deactivateOnServer &&
      currentSessionCode
    ) {
      try {
        await fetch(
          `${API_BASE_URL}/qr-sessions/qr/` +
            `${encodeURIComponent(
              currentSessionCode
            )}/deactivate`,
          {
            method: "POST",
            cache: "no-store",
          }
        );
      } catch (err) {
        console.error(
          "DEACTIVATE ERROR:",
          err
        );
      }
    }

    setSessionActive(false);

    if (!deactivateOnServer) {
      setMessage(
        "Attendance session expired."
      );
    } else {
      setMessage(
        "Attendance session stopped."
      );
    }
  };

  // ========================================================
  // FORMAT TIME
  // ========================================================

  const formatTime = (totalSeconds) => {
    const safeSeconds = Math.max(
      0,
      Number(totalSeconds) || 0
    );

    const minutes = Math.floor(
      safeSeconds / 60
    );

    const seconds =
      safeSeconds % 60;

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  };

  // ========================================================
  // GET SELECTED COURSE
  // ========================================================

  const selectedCourse = courses.find(
    (course) =>
      String(course.id) ===
      String(selectedCourseId)
  );

  // ========================================================
  // UI
  // ========================================================

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "650px",
          margin: "0 auto",
        }}
      >

        {/* HEADER */}

        <div
          style={{
            marginBottom: "20px",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "28px",
            }}
          >
            Live Attendance QR
          </h1>

          <p
            style={{
              color: "#666",
              marginTop: "6px",
            }}
          >
            QR changes every 3 seconds.
          </p>
        </div>

        {/* SUBJECT SELECTION */}

        {!sessionActive && (
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "16px",
              boxShadow:
                "0 2px 10px rgba(0,0,0,0.06)",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: "10px",
              }}
            >
              Select Subject
            </h3>

            <select
              value={selectedCourseId}
              onChange={(event) =>
                setSelectedCourseId(
                  event.target.value
                )
              }
              disabled={
                loadingCourses ||
                creatingSession
              }
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border:
                  "1px solid #d1d5db",
                background: "#fff",
                fontSize: "15px",
                boxSizing: "border-box",
              }}
            >
              <option value="">
                {loadingCourses
                  ? "Loading subjects..."
                  : "Select a subject"}
              </option>

              {courses.map((course) => (
                <option
                  key={course.id}
                  value={course.id}
                >
                  {course.course_code} —{" "}
                  {course.course_name}
                </option>
              ))}
            </select>

            {selectedCourse && (
              <div
                style={{
                  marginTop: "10px",
                  fontSize: "13px",
                  color: "#555",
                }}
              >
                Selected:{" "}
                <strong>
                  {selectedCourse.course_name}
                </strong>
              </div>
            )}
          </div>
        )}

        {/* LOCATION */}

        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "16px",
            boxShadow:
              "0 2px 10px rgba(0,0,0,0.06)",
          }}
        >
          <h3
            style={{
              marginTop: 0,
            }}
          >
            Faculty Location
          </h3>

          {facultyLocation ? (
            <div
              style={{
                background: "#eefbf3",
                padding: "12px",
                borderRadius: "8px",
                color: "#166534",
              }}
            >
              <div>
                Latitude:{" "}
                {facultyLocation.latitude.toFixed(
                  6
                )}
              </div>

              <div>
                Longitude:{" "}
                {facultyLocation.longitude.toFixed(
                  6
                )}
              </div>

              <div>
                Accuracy:{" "}
                {Math.round(
                  facultyLocation.accuracy
                )}
                m
              </div>
            </div>
          ) : (
            <div
              style={{
                color: "#666",
              }}
            >
              Faculty location not acquired yet.
            </div>
          )}
        </div>

        {/* START SESSION */}

        {!sessionActive && (
          <button
            onClick={createSession}
            disabled={
              creatingSession ||
              loadingLocation ||
              loadingCourses ||
              !selectedCourseId
            }
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "10px",
              border: "none",
              background:
                !selectedCourseId ||
                loadingCourses
                  ? "#9ca3af"
                  : "#2563eb",
              color: "#fff",
              fontSize: "16px",
              fontWeight: 700,
              cursor:
                creatingSession ||
                loadingLocation ||
                loadingCourses ||
                !selectedCourseId
                  ? "not-allowed"
                  : "pointer",
              marginBottom: "16px",
            }}
          >
            {creatingSession
              ? "Creating Session..."
              : loadingLocation
              ? "Getting Location..."
              : loadingCourses
              ? "Loading Subjects..."
              : !selectedCourseId
              ? "Select Subject First"
              : "Start Attendance Session"}
          </button>
        )}

        {/* ACTIVE SESSION */}

        {sessionActive && (
          <>
            {/* SESSION STATUS */}

            <div
              style={{
                background: "#eefbf3",
                color: "#166534",
                padding: "14px",
                borderRadius: "10px",
                marginBottom: "16px",
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              ● Attendance Session Active
            </div>

            {/* SELECTED SUBJECT */}

            {selectedCourse && (
              <div
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  padding: "16px",
                  marginBottom: "16px",
                  boxShadow:
                    "0 2px 10px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    color: "#666",
                  }}
                >
                  Subject
                </div>

                <div
                  style={{
                    marginTop: "5px",
                    fontSize: "18px",
                    fontWeight: 700,
                  }}
                >
                  {selectedCourse.course_name}
                </div>

                <div
                  style={{
                    marginTop: "4px",
                    fontSize: "13px",
                    color: "#666",
                  }}
                >
                  {selectedCourse.course_code}
                </div>
              </div>
            )}

            {/* QR */}

            <div
              style={{
                background: "#fff",
                borderRadius: "16px",
                padding: "24px",
                textAlign: "center",
                boxShadow:
                  "0 2px 15px rgba(0,0,0,0.08)",
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                }}
              >
                Scan This QR
              </h2>

              {qrImage && (
                <img
                  src={qrImage}
                  alt="AttendX Live QR"
                  style={{
                    width: "320px",
                    maxWidth: "100%",
                    height: "auto",
                    display: "block",
                    margin:
                      "20px auto",
                  }}
                />
              )}

              {/* QR ROTATION COUNTDOWN */}

              <div
                style={{
                  marginTop: "16px",
                  padding: "14px",
                  borderRadius: "10px",
                  background: "#f5f7fb",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    color: "#666",
                  }}
                >
                  QR changes in
                </div>

                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: 800,
                    marginTop: "4px",
                  }}
                >
                  3s
                </div>
              </div>

              {/* SESSION COUNTDOWN */}

              <div
                style={{
                  marginTop: "12px",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    color: "#666",
                  }}
                >
                  Session remaining
                </div>

                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    marginTop: "4px",
                  }}
                >
                  {formatTime(
                    sessionSecondsRemaining
                  )}
                </div>
              </div>

              {/* ROTATION NUMBER */}

              <div
                style={{
                  marginTop: "14px",
                  fontSize: "13px",
                  color: "#777",
                }}
              >
                QR Rotation #{rotationNumber}
              </div>
            </div>

            {/* SESSION CODE */}

            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                padding: "16px",
                marginTop: "16px",
                boxShadow:
                  "0 2px 10px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  color: "#666",
                }}
              >
                Session Code
              </div>

              <div
                style={{
                  marginTop: "6px",
                  fontFamily: "monospace",
                  fontWeight: 700,
                  fontSize: "18px",
                  wordBreak: "break-all",
                }}
              >
                {sessionCode}
              </div>
            </div>

            {/* CURRENT TOKEN */}

            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                padding: "16px",
                marginTop: "12px",
                boxShadow:
                  "0 2px 10px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  color: "#666",
                }}
              >
                Current QR Token
              </div>

              <div
                style={{
                  marginTop: "6px",
                  fontFamily: "monospace",
                  fontSize: "11px",
                  wordBreak: "break-all",
                  color: "#444",
                }}
              >
                {qrToken}
              </div>
            </div>

            {/* STOP */}

            <button
              onClick={() =>
                stopSession(true)
              }
              style={{
                width: "100%",
                marginTop: "16px",
                padding: "13px",
                borderRadius: "10px",
                border: "none",
                background: "#dc2626",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Stop Attendance Session
            </button>
          </>
        )}

        {/* MESSAGE */}

        {message && (
          <div
            style={{
              marginTop: "16px",
              padding: "13px",
              borderRadius: "9px",
              background: "#eef4ff",
              color: "#1e40af",
            }}
          >
            {message}
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div
            style={{
              marginTop: "16px",
              padding: "13px",
              borderRadius: "9px",
              background: "#fff0f0",
              color: "#b91c1c",
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default FacultyQR;