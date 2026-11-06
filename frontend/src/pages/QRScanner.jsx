import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import { Html5Qrcode } from "html5-qrcode";

const API_BASE_URL = "/api";

function QRScanner({
  onBack,
  faceVerified = false,
  studentLocation = null,
  studentDbId = null,
  studentId = null,
  studentName = "",
  onComplete,
}) {
  const scannerRef = useRef(null);
  const processingRef = useRef(false);
  const mountedRef = useRef(true);

  const [scannerStarted, setScannerStarted] =
    useState(false);

  const [scannedCode, setScannedCode] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [processing, setProcessing] =
    useState(false);

  const [attendanceMarked, setAttendanceMarked] =
    useState(false);

  const [attendanceData, setAttendanceData] =
    useState(null);

  const [locationStatus, setLocationStatus] =
    useState("");

  const [qrStatus, setQrStatus] =
    useState("");

  const [localLocation, setLocalLocation] =
    useState(studentLocation);

  // ---------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      stopScanner();
    };
  }, []);

  // ---------------------------------------------------------
  // START CAMERA
  // ---------------------------------------------------------

  useEffect(() => {
    if (!faceVerified) {
      setError(
        "Please complete face verification first."
      );

      return;
    }

    startScanner();

    return () => {
      stopScanner();
    };
  }, [faceVerified]);

  // ---------------------------------------------------------
  // START SCANNER
  // ---------------------------------------------------------

  const startScanner = async () => {
    try {
      if (processingRef.current) {
        return;
      }

      setError("");
      setMessage("Starting camera...");

      if (!faceVerified) {
        setError(
          "Face verification is required before scanning."
        );

        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          "Camera access is not supported by this browser."
        );

        return;
      }

      // Prevent creating multiple scanner instances.
      if (scannerRef.current) {
        return;
      }

      const scanner =
        new Html5Qrcode(
          "attendx-qr-reader"
        );

      scannerRef.current = scanner;

      console.log(
        "[QR] Starting camera..."
      );

      await scanner.start(
        {
          facingMode: "environment",
        },
        {
          fps: 10,
          qrbox: {
            width: 250,
            height: 250,
          },
          aspectRatio: 1.0,
        },

        (decodedText) => {
          handleQRCode(decodedText);
        },

        () => {
          // Normal scanner misses are ignored.
        }
      );

      if (!mountedRef.current) {
        await scanner
          .stop()
          .catch(() => {});

        return;
      }

      setScannerStarted(true);

      setMessage(
        "Point the camera at the live faculty QR."
      );

      console.log(
        "[QR] Camera started."
      );

    } catch (err) {
      console.error(
        "[QR] CAMERA START ERROR:",
        err
      );

      if (mountedRef.current) {
        setError(
          err?.message ||
            "Unable to start camera. Please allow camera permission."
        );

        setScannerStarted(false);
      }
    }
  };

  // ---------------------------------------------------------
  // STOP SCANNER
  // ---------------------------------------------------------

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        const state =
          scannerRef.current.getState?.();

        /*
         * html5-qrcode state 2 = scanning.
         */
        if (state === 2) {
          await scannerRef.current
            .stop()
            .catch(() => {});
        }

        await scannerRef.current
          .clear()
          .catch(() => {});

        scannerRef.current = null;
      }
    } catch (err) {
      console.warn(
        "[QR] Scanner stop warning:",
        err
      );
    }

    if (mountedRef.current) {
      setScannerStarted(false);
    }
  };

  // ---------------------------------------------------------
  // GET STUDENT LOCATION
  // ---------------------------------------------------------

  const getStudentLocation = () => {
    return new Promise(
      (resolve, reject) => {
        if (!navigator.geolocation) {
          reject(
            new Error(
              "Geolocation is not supported by this browser."
            )
          );

          return;
        }

        console.log(
          "[GPS] Requesting student location..."
        );

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              latitude:
                position.coords.latitude,

              longitude:
                position.coords.longitude,

              accuracy:
                position.coords.accuracy,
            };

            console.log(
              "[GPS] Student location:",
              location
            );

            if (mountedRef.current) {
              setLocalLocation(location);

              setLocationStatus(
                `Location detected. Accuracy: ${Math.round(
                  location.accuracy
                )}m`
              );
            }

            resolve(location);
          },

          (err) => {
            console.error(
              "[GPS] LOCATION ERROR:",
              err
            );

            let locationMessage =
              "Unable to get your live location.";

            if (err.code === 1) {
              locationMessage =
                "Location permission denied. Please allow location access.";
            } else if (err.code === 2) {
              locationMessage =
                "Location unavailable. Please turn on GPS/location services.";
            } else if (err.code === 3) {
              locationMessage =
                "Location request timed out. Please try again.";
            }

            reject(
              new Error(locationMessage)
            );
          },

          {
            enableHighAccuracy: false,
            timeout: 30000,
            maximumAge: 10000,
          }
        );
      }
    );
  };

  // ---------------------------------------------------------
  // PARSE QR
  // ---------------------------------------------------------

  const parseQRCode = (rawValue) => {
    const raw = String(
      rawValue || ""
    ).trim();

    console.log(
      "[QR] RAW VALUE:",
      raw
    );

    if (!raw) {
      return null;
    }

    const parts = raw.split(":");

    /*
     * CURRENT FORMAT:
     *
     * session_code:qr_token
     *
     * Example:
     *
     * AX-F21F6224:abcdef123456...
     */

    if (parts.length === 2) {
      const sessionCode =
        parts[0]
          .trim()
          .toUpperCase();

      const qrToken =
        parts[1].trim();

      if (
        sessionCode.startsWith("AX-") &&
        qrToken.length > 0
      ) {
        return {
          sessionCode,
          qrToken,
          raw,
        };
      }
    }

    /*
     * Optional URL support.
     */

    try {
      const url = new URL(raw);

      const sessionCode =
        url.searchParams.get(
          "session_code"
        ) ||
        url.searchParams.get(
          "session"
        );

      const qrToken =
        url.searchParams.get(
          "qr_token"
        ) ||
        url.searchParams.get(
          "token"
        );

      if (
        sessionCode &&
        qrToken
      ) {
        return {
          sessionCode:
            sessionCode
              .trim()
              .toUpperCase(),

          qrToken:
            qrToken.trim(),

          raw,
        };
      }
    } catch {
      // Not a URL.
    }

    return null;
  };

  // ---------------------------------------------------------
  // HANDLE QR
  // ---------------------------------------------------------

  const handleQRCode = async (
    decodedText
  ) => {
    if (processingRef.current) {
      return;
    }

    if (attendanceMarked) {
      return;
    }

    processingRef.current = true;

    const processStart =
      performance.now();

    try {
      setProcessing(true);
      setError("");
      setMessage(
        "QR detected. Starting attendance verification..."
      );

      setScannedCode(decodedText);

      console.log(
        "===================================="
      );

      console.log(
        "[ATTENDANCE] QR DETECTED:",
        decodedText
      );

      // -----------------------------------------------------
      // FACE
      // -----------------------------------------------------

      if (!faceVerified) {
        throw new Error(
          "Face verification is required before scanning the QR."
        );
      }

      console.log(
        "[ATTENDANCE] Face verification: OK"
      );

      // -----------------------------------------------------
      // STUDENT ID
      // -----------------------------------------------------

      if (!studentDbId) {
        throw new Error(
          "Student account information is missing. Please login again."
        );
      }

      console.log(
        "[ATTENDANCE] Student DB ID:",
        studentDbId
      );

      // -----------------------------------------------------
      // GPS
      // -----------------------------------------------------

      let finalLocation =
        localLocation ||
        studentLocation;

      if (
        !finalLocation ||
        finalLocation.latitude === undefined ||
        finalLocation.longitude === undefined
      ) {
        setLocationStatus(
          "Getting your live location..."
        );

        finalLocation =
          await getStudentLocation();
      }

      if (
        !finalLocation ||
        finalLocation.latitude === undefined ||
        finalLocation.longitude === undefined
      ) {
        throw new Error(
          "Student live location could not be obtained."
        );
      }

      console.log(
        "[ATTENDANCE] GPS:",
        finalLocation
      );

      setLocationStatus(
        `Location ready. Accuracy: ${Math.round(
          finalLocation.accuracy || 0
        )}m`
      );

      // -----------------------------------------------------
      // PARSE QR
      // -----------------------------------------------------

      const parsed =
        parseQRCode(decodedText);

      if (!parsed) {
        throw new Error(
          "Invalid AttendX QR. Please scan the live faculty QR."
        );
      }

      console.log(
        "[ATTENDANCE] Parsed QR:",
        parsed
      );

      // -----------------------------------------------------
      // STOP CAMERA
      // -----------------------------------------------------

      setMessage(
        "QR detected. Validating with AttendX server..."
      );

      await stopScanner();

      // -----------------------------------------------------
      // QR VALIDATION
      // -----------------------------------------------------

      setQrStatus(
        "Validating live QR..."
      );

      const validateParams =
        new URLSearchParams({
          qr_token:
            parsed.qrToken,
        });

      const validateUrl =
        `${API_BASE_URL}/qr-sessions/qr/` +
        `${encodeURIComponent(
          parsed.sessionCode
        )}/validate?` +
        `${validateParams.toString()}`;

      console.log(
        "[QR] Validation URL:",
        validateUrl
      );

      const qrStart =
        performance.now();

      const validateResponse =
        await fetch(
          validateUrl,
          {
            method: "POST",
            cache: "no-store",

            headers: {
              "Content-Type":
                "application/json",

              "Cache-Control":
                "no-cache, no-store, must-revalidate",

              Pragma: "no-cache",

              Expires: "0",
            },
          }
        );

      const validateText =
        await validateResponse.text();

      let validateData = {};

      try {
        validateData =
          JSON.parse(
            validateText
          );
      } catch {
        console.error(
          "[QR] Invalid validation response:",
          validateText
        );

        throw new Error(
          "QR validation server returned an invalid response."
        );
      }

      console.log(
        "[QR] Validation response:",
        validateData
      );

      console.log(
        `[QR] Validation took ${Math.round(
          performance.now() -
            qrStart
        )} ms`
      );

      if (!validateResponse.ok) {
        throw new Error(
          validateData?.detail ||
            "QR is expired or invalid. Please scan the latest live QR."
        );
      }

      if (
        validateData.valid === false
      ) {
        throw new Error(
          validateData?.message ||
            "QR validation failed."
        );
      }

      setQrStatus(
        "✓ QR verified successfully"
      );

      setMessage(
        "QR verified. Marking your attendance..."
      );

      console.log(
        "[ATTENDANCE] QR validation: SUCCESS"
      );

      // -----------------------------------------------------
      // ATTENDANCE MARK
      // -----------------------------------------------------

      const verifiedSessionCode =
        validateData.session_code ||
        parsed.sessionCode;

      const attendanceParams =
        new URLSearchParams({
          student_id:
            String(studentDbId),

          session_code:
            String(
              verifiedSessionCode
            ),

          student_latitude:
            String(
              finalLocation.latitude
            ),

          student_longitude:
            String(
              finalLocation.longitude
            ),
        });

      const attendanceUrl =
        `${API_BASE_URL}/attendance/mark?` +
        attendanceParams.toString();

      console.log(
        "[ATTENDANCE] Mark URL:",
        attendanceUrl
      );

      console.log(
        "[ATTENDANCE] Sending actual attendance request..."
      );

      const attendanceStart =
        performance.now();

      const attendanceResponse =
        await fetch(
          attendanceUrl,
          {
            method: "POST",
            cache: "no-store",

            headers: {
              "Content-Type":
                "application/json",

              "Cache-Control":
                "no-cache, no-store, must-revalidate",

              Pragma: "no-cache",

              Expires: "0",
            },
          }
        );

      const attendanceText =
        await attendanceResponse.text();

      let attendanceResult = {};

      try {
        attendanceResult =
          JSON.parse(
            attendanceText
          );
      } catch {
        console.error(
          "[ATTENDANCE] Invalid server response:",
          attendanceText
        );

        throw new Error(
          "Attendance server returned an invalid response."
        );
      }

      console.log(
        "[ATTENDANCE] SERVER RESPONSE:",
        attendanceResult
      );

      console.log(
        `[ATTENDANCE] Request took ${Math.round(
          performance.now() -
            attendanceStart
        )} ms`
      );

      // -----------------------------------------------------
      // ACTUAL FAILURE
      // -----------------------------------------------------

      if (!attendanceResponse.ok) {
        throw new Error(
          attendanceResult?.detail ||
            attendanceResult?.message ||
            `Attendance was NOT marked. Server returned ${attendanceResponse.status}.`
        );
      }

      // -----------------------------------------------------
      // SUCCESS
      // -----------------------------------------------------

      console.log(
        "[ATTENDANCE] ==============================="
      );

      console.log(
        "[ATTENDANCE] ATTENDANCE MARKED SUCCESSFULLY"
      );

      console.log(
        "[ATTENDANCE] Server result:",
        attendanceResult
      );

      console.log(
        `[ATTENDANCE] Total process time: ${Math.round(
          performance.now() -
            processStart
        )} ms`
      );

      console.log(
        "[ATTENDANCE] ==============================="
      );

      setAttendanceData(
        attendanceResult
      );

      setAttendanceMarked(true);

      setProcessing(false);

      setMessage(
        "Attendance marked successfully!"
      );

      setQrStatus(
        "✓ Attendance confirmed by server"
      );

      setError("");

      /*
       * IMPORTANT:
       *
       * We DO NOT navigate anywhere from here.
       *
       * The success screen stays visible.
       */

      if (onComplete) {
        onComplete(
          attendanceResult
        );
      }

    } catch (err) {

      console.error(
        "===================================="
      );

      console.error(
        "[ATTENDANCE] PROCESS FAILED:",
        err
      );

      console.error(
        "===================================="
      );

      if (mountedRef.current) {
        setError(
          err?.message ||
            "Attendance process failed."
        );

        setMessage("");

        setQrStatus("");

        setProcessing(false);
      }

      processingRef.current = false;

      /*
       * Restart scanner after a failure.
       */

      if (
        mountedRef.current &&
        !attendanceMarked
      ) {
        setTimeout(() => {
          if (
            mountedRef.current &&
            !attendanceMarked
          ) {
            startScanner();
          }
        }, 1000);
      }

      return;
    }

    processingRef.current = false;
  };

  // ---------------------------------------------------------
  // REFRESH LOCATION
  // ---------------------------------------------------------

  const refreshStudentLocation =
    async () => {
      try {
        setError("");

        setLocationStatus(
          "Getting your live location..."
        );

        const location =
          await getStudentLocation();

        setLocalLocation(
          location
        );

        setLocationStatus(
          `Location detected. Accuracy: ${Math.round(
            location.accuracy
          )}m`
        );

        setMessage(
          "Location detected. Scan the live faculty QR."
        );

      } catch (err) {
        console.error(
          "[GPS] Refresh error:",
          err
        );

        setError(
          err?.message ||
            "Unable to get your location."
        );

        setLocationStatus("");
      }
    };

  // ---------------------------------------------------------
  // BACK
  // ---------------------------------------------------------

  const handleBack =
    async () => {
      if (processing) {
        return;
      }

      await stopScanner();

      if (onBack) {
        onBack();
      }
    };

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

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
          maxWidth: "700px",
          margin: "0 auto",
        }}
      >

        {/* HEADER */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
          }}
        >

          <div>

            <h1
              style={{
                margin: 0,
                fontSize: "28px",
                fontWeight: 700,
              }}
            >
              Scan Attendance QR
            </h1>

            <p
              style={{
                marginTop: "6px",
                color: "#666",
              }}
            >
              Scan the live faculty QR to mark
              attendance.
            </p>

          </div>

          {onBack && !processing && (
            <button
              onClick={handleBack}
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Back
            </button>
          )}

        </div>

        {/* STUDENT */}

        {(studentName || studentId) && (
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

            {studentName && (
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: "4px",
                }}
              >
                {studentName}
              </div>
            )}

            {studentId && (
              <div
                style={{
                  color: "#666",
                  fontSize: "14px",
                }}
              >
                Student ID: {studentId}
              </div>
            )}

          </div>
        )}

        {/* FACE */}

        <div
          style={{
            background: faceVerified
              ? "#eefbf3"
              : "#fff0f0",

            color: faceVerified
              ? "#176b3a"
              : "#b91c1c",

            borderRadius: "10px",
            padding: "13px",
            marginBottom: "12px",
          }}
        >
          <strong>
            {faceVerified
              ? "✓ Face verification completed"
              : "✗ Face verification required"}
          </strong>
        </div>

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

          <div
            style={{
              fontWeight: 700,
              marginBottom: "8px",
            }}
          >
            Student Location
          </div>

          {localLocation ? (

            <div
              style={{
                background: "#eefbf3",
                color: "#176b3a",
                padding: "10px",
                borderRadius: "8px",
                fontSize: "14px",
              }}
            >

              <div>
                Latitude:{" "}
                {Number(
                  localLocation.latitude
                ).toFixed(6)}
              </div>

              <div>
                Longitude:{" "}
                {Number(
                  localLocation.longitude
                ).toFixed(6)}
              </div>

              {localLocation.accuracy !==
                undefined && (
                <div>
                  Accuracy:{" "}
                  {Math.round(
                    localLocation.accuracy
                  )}
                  m
                </div>
              )}

            </div>

          ) : (

            <div
              style={{
                background: "#fff8e8",
                color: "#92400e",
                padding: "10px",
                borderRadius: "8px",
                fontSize: "14px",
              }}
            >
              Location not available yet.
            </div>

          )}

          <button
            onClick={
              refreshStudentLocation
            }
            disabled={processing}
            style={{
              width: "100%",
              marginTop: "12px",
              padding: "11px",
              borderRadius: "8px",
              border: "1px solid #ddd",
              background: "#fff",
              fontWeight: 600,
              cursor: processing
                ? "not-allowed"
                : "pointer",
            }}
          >
            Refresh My Location
          </button>

          {locationStatus && (
            <div
              style={{
                marginTop: "8px",
                fontSize: "13px",
                color: "#666",
              }}
            >
              {locationStatus}
            </div>
          )}

        </div>

        {/* SUCCESS */}

        {attendanceMarked ? (

          <div
            style={{
              marginTop: "20px",
              background: "#eefbf3",
              color: "#166534",
              borderRadius: "14px",
              padding: "28px 20px",
              textAlign: "center",
              boxShadow:
                "0 2px 10px rgba(0,0,0,0.06)",
            }}
          >

            <div
              style={{
                fontSize: "48px",
                marginBottom: "10px",
              }}
            >
              ✓
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: "24px",
              }}
            >
              Attendance Marked
            </h2>

            <p
              style={{
                marginTop: "8px",
              }}
            >
              The AttendX server confirmed that
              your attendance was recorded.
            </p>

            {studentName && (
              <p
                style={{
                  marginTop: "8px",
                  fontWeight: 700,
                }}
              >
                {studentName}
              </p>
            )}

            {attendanceData && (
              <div
                style={{
                  marginTop: "15px",
                  fontSize: "13px",
                  color: "#166534",
                }}
              >
                Server response received ✓
              </div>
            )}

            {onBack && (
              <button
                onClick={handleBack}
                style={{
                  marginTop: "20px",
                  padding: "12px 20px",
                  borderRadius: "9px",
                  border: "none",
                  background: "#166534",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            )}

          </div>

        ) : (

          <>
            {/* CAMERA */}

            <div
              style={{
                background: "#fff",
                borderRadius: "14px",
                padding: "20px",
                boxShadow:
                  "0 2px 10px rgba(0,0,0,0.08)",
                textAlign: "center",
              }}
            >

              <h2
                style={{
                  marginTop: 0,
                  fontSize: "20px",
                }}
              >
                Live QR Scanner
              </h2>

              <div
                id="attendx-qr-reader"
                style={{
                  width: "100%",
                  maxWidth: "500px",
                  margin: "0 auto",
                  overflow: "hidden",
                  borderRadius: "12px",
                }}
              />

              {!scannerStarted &&
                !processing && (
                  <button
                    onClick={startScanner}
                    style={{
                      width: "100%",
                      marginTop: "16px",
                      padding: "13px",
                      borderRadius: "9px",
                      border: "none",
                      background: "#2563eb",
                      color: "#fff",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Start Camera
                  </button>
                )}

              {processing && (
                <div
                  style={{
                    marginTop: "16px",
                    padding: "14px",
                    borderRadius: "9px",
                    background: "#eef4ff",
                    color: "#1e40af",
                    fontWeight: 600,
                  }}
                >
                  Processing attendance...
                </div>
              )}

              {qrStatus && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "12px",
                    borderRadius: "9px",
                    background:
                      "#eefbf3",
                    color:
                      "#176b3a",
                  }}
                >
                  {qrStatus}
                </div>
              )}

            </div>

            {/* SCANNED CODE */}

            {scannedCode && (
              <div
                style={{
                  marginTop: "16px",
                  background: "#fff",
                  borderRadius: "12px",
                  padding: "16px",
                  boxShadow:
                    "0 2px 10px rgba(0,0,0,0.05)",
                }}
              >

                <div
                  style={{
                    fontSize: "13px",
                    color: "#666",
                    marginBottom: "6px",
                  }}
                >
                  Last scanned QR
                </div>

                <div
                  style={{
                    fontFamily:
                      "monospace",
                    fontSize: "12px",
                    wordBreak:
                      "break-all",
                    background:
                      "#f5f7fb",
                    padding: "10px",
                    borderRadius:
                      "8px",
                  }}
                >
                  {scannedCode}
                </div>

              </div>
            )}
          </>
        )}

        {/* MESSAGE */}

        {message &&
          !attendanceMarked && (
            <div
              style={{
                marginTop: "16px",
                padding: "13px",
                borderRadius: "9px",
                background:
                  "#eef4ff",
                color:
                  "#1e40af",
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
              background:
                "#fff0f0",
              color:
                "#b91c1c",
            }}
          >
            <strong>
              Attendance was NOT marked
            </strong>

            <div
              style={{
                marginTop: "5px",
              }}
            >
              {error}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default QRScanner;