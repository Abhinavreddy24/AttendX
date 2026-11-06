import { useState } from "react";

import {
  ArrowLeft,
  CheckCircle,
  MapPin,
  Loader2,
} from "lucide-react";

import FaceVerification from "./FaceVerification";
import QRScanner from "./QRScanner";

function AttendanceFlow({
  studentDbId,
  studentId,
  studentName,
  onBack,
  onComplete,
}) {
  const [stage, setStage] = useState("face");

  const [faceData, setFaceData] =
    useState(null);

  const [location, setLocation] =
    useState(null);

  const [gpsMessage, setGpsMessage] =
    useState("Checking your live location...");

  const [gpsError, setGpsError] =
    useState("");

  /*
   * IMPORTANT
   *
   * This tells us whether the QR attendance
   * has already been successfully recorded.
   *
   * We do NOT immediately leave the flow when
   * attendance succeeds.
   *
   * The success screen remains visible.
   *
   * Only when the student presses "Done" do
   * we return to the dashboard.
   */
  const [attendanceCompleted, setAttendanceCompleted] =
    useState(false);

  const [attendanceResult, setAttendanceResult] =
    useState(null);

  // =========================================================
  // DEBUG
  // =========================================================

  console.log(
    "AttendanceFlow studentDbId:",
    studentDbId
  );

  console.log(
    "AttendanceFlow studentId:",
    studentId
  );

  console.log(
    "AttendanceFlow studentName:",
    studentName
  );

  console.log(
    "AttendanceFlow stage:",
    stage
  );

  console.log(
    "AttendanceFlow attendanceCompleted:",
    attendanceCompleted
  );

  // =========================================================
  // FACE VERIFIED
  // =========================================================

  const handleFaceVerified = (data) => {
    console.log(
      "Face verification successful:",
      data
    );

    setFaceData(data);

    setAttendanceCompleted(false);
    setAttendanceResult(null);

    setStage("gps");

    checkLocation();
  };

  // =========================================================
  // GPS CHECK
  // =========================================================

  const checkLocation = () => {
    setGpsError("");

    setGpsMessage(
      "Requesting your live location..."
    );

    setLocation(null);

    if (!navigator.geolocation) {
      setGpsError(
        "Geolocation is not supported by this browser."
      );

      return;
    }

    console.log(
      "[AttendanceFlow] Requesting student GPS..."
    );

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const studentLatitude =
          position.coords.latitude;

        const studentLongitude =
          position.coords.longitude;

        const accuracy =
          position.coords.accuracy;

        console.log(
          "===================================="
        );

        console.log(
          "STUDENT LIVE GPS"
        );

        console.log(
          "Student latitude:",
          studentLatitude
        );

        console.log(
          "Student longitude:",
          studentLongitude
        );

        console.log(
          "GPS accuracy:",
          accuracy,
          "meters"
        );

        console.log(
          "===================================="
        );

        const locationData = {
          latitude: studentLatitude,
          longitude: studentLongitude,
          accuracy: accuracy,
        };

        setLocation(locationData);

        setGpsMessage(
          "Live location captured successfully."
        );

        /*
         * Give the user a moment to see the
         * location success message.
         */
        setTimeout(() => {
          setStage("qr");
        }, 800);
      },

      (error) => {
        console.error(
          "Location error:",
          error
        );

        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsError(
              "Location permission was denied. Please allow location access."
            );
            break;

          case error.POSITION_UNAVAILABLE:
            setGpsError(
              "Your location is currently unavailable."
            );
            break;

          case error.TIMEOUT:
            setGpsError(
              "Location request timed out. Please try again."
            );
            break;

          default:
            setGpsError(
              "Unable to get your current location."
            );
        }
      },

      {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 10000,
      }
    );
  };

  // =========================================================
  // BACK FROM GPS
  // =========================================================

  const handleGpsBack = () => {
    console.log(
      "[AttendanceFlow] Going back from GPS to Face."
    );

    setStage("face");

    setFaceData(null);

    setLocation(null);

    setGpsError("");

    setAttendanceCompleted(false);

    setAttendanceResult(null);
  };

  // =========================================================
  // QR BACK
  // =========================================================

  const handleQrBack = () => {
    /*
     * VERY IMPORTANT:
     *
     * If attendance has already been successfully
     * recorded, pressing Done must return to the
     * Student Dashboard.
     *
     * It must NOT return to GPS.
     */

    if (attendanceCompleted) {
      console.log(
        "[AttendanceFlow] Attendance completed."
      );

      console.log(
        "[AttendanceFlow] Returning to Student Dashboard."
      );

      if (onComplete) {
        onComplete(attendanceResult);
      }

      return;
    }

    /*
     * If attendance has NOT been completed,
     * normal Back behavior is still available.
     */
    console.log(
      "[AttendanceFlow] QR back → GPS."
    );

    setStage("gps");
  };

  // =========================================================
  // ATTENDANCE COMPLETED
  // =========================================================

  const handleAttendanceComplete = (
    data
  ) => {
    console.log(
      "===================================="
    );

    console.log(
      "[AttendanceFlow] ATTENDANCE SUCCESS"
    );

    console.log(
      "[AttendanceFlow] Server result:",
      data
    );

    console.log(
      "===================================="
    );

    /*
     * IMPORTANT:
     *
     * Do NOT call the parent's onComplete here.
     *
     * We want the student to see:
     *
     * ✓ Attendance Marked
     * Done
     *
     * Only after Done should the dashboard
     * open.
     */

    setAttendanceResult(data);

    setAttendanceCompleted(true);
  };

  // =========================================================
  // FACE STAGE
  // =========================================================

  if (stage === "face") {
    return (
      <FaceVerification
        /*
         * Face backend expects students.id,
         * which is the numeric database ID.
         */
        studentId={studentDbId}
        studentDbId={studentDbId}
        studentName={studentName}
        onBack={onBack}
        onVerified={handleFaceVerified}
      />
    );
  }

  // =========================================================
  // GPS STAGE
  // =========================================================

  if (stage === "gps") {
    return (
      <div className="face-verification-page">

        {/* BACK BUTTON */}

        <button
          className="back-button"
          onClick={handleGpsBack}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="face-verification-card">

          {/* HEADER */}

          <div className="face-verification-header">

            <div className="login-icon">
              <MapPin size={32} />
            </div>

            <h1>
              Location Verification
            </h1>

            <p>
              We need to verify that you are
              physically present in the classroom.
            </p>

          </div>

          {/* GPS STATUS */}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              padding: "40px 20px",
            }}
          >

            {/* GPS ERROR */}

            {gpsError ? (
              <>
                <MapPin size={55} />

                <p
                  style={{
                    textAlign: "center",
                    maxWidth: "400px",
                  }}
                >
                  {gpsError}
                </p>
              </>
            ) : location ? (

              /* GPS SUCCESS */

              <>
                <CheckCircle size={60} />

                <h2>
                  Location Captured
                </h2>

                <p
                  style={{
                    textAlign: "center",
                    maxWidth: "400px",
                  }}
                >
                  Your live GPS location has been
                  captured successfully.
                </p>

                <p
                  style={{
                    fontSize: "14px",
                    textAlign: "center",
                    opacity: 0.8,
                  }}
                >
                  Accuracy:{" "}
                  <strong>
                    {Math.round(
                      location.accuracy
                    )}{" "}
                    meters
                  </strong>
                </p>
              </>

            ) : (

              /* GPS LOADING */

              <>
                <Loader2
                  size={55}
                  className="spin"
                />

                <p>
                  {gpsMessage}
                </p>
              </>
            )}

          </div>

          {/* GPS ERROR BUTTON */}

          {gpsError && (
            <button
              className="login-button"
              onClick={checkLocation}
            >
              <MapPin size={18} />
              Try Location Again
            </button>
          )}

          {/* GPS SUCCESS */}

          {location && (
            <div className="face-status">

              <CheckCircle size={22} />

              <span>
                Location captured. Opening QR
                scanner...
              </span>

            </div>
          )}

        </div>
      </div>
    );
  }

  // =========================================================
  // QR STAGE
  // =========================================================

  if (stage === "qr") {
    return (
      <QRScanner
        onBack={handleQrBack}

        faceVerified={!!faceData}

        studentLocation={location}

        studentDbId={studentDbId}

        studentId={studentId}

        studentName={studentName}

        /*
         * IMPORTANT:
         *
         * QRScanner tells us that the server
         * successfully recorded attendance.
         *
         * We DO NOT leave this flow yet.
         */
        onComplete={
          handleAttendanceComplete
        }
      />
    );
  }

  return null;
}

export default AttendanceFlow;