import { useEffect, useRef, useState } from "react";

const API_BASE_URL = "http://172.18.22.164:8000";

function FaceEnrollment({
  studentId,
  onComplete,
  onBack,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraStarted, setCameraStarted] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ==================================================
  // START CAMERA
  // ==================================================

  const startCamera = async () => {
    setError("");
    setMessage("");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Camera access is not supported by this browser."
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: "user",
            },
            width: {
              ideal: 640,
            },
            height: {
              ideal: 480,
            },
          },
          audio: false,
        });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        await videoRef.current.play();
      }

      setCameraStarted(true);

    } catch (err) {

      console.error(
        "Camera error:",
        err
      );

      setError(
        "Unable to access the camera. Please allow camera permission and use HTTPS."
      );
    }
  };


  // ==================================================
  // STOP CAMERA
  // ==================================================

  const stopCamera = () => {

    if (streamRef.current) {

      streamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      streamRef.current = null;
    }

    setCameraStarted(false);
  };


  // ==================================================
  // CAPTURE AND ENROLL
  // ==================================================

  const captureAndEnroll = async () => {

    if (
      !videoRef.current ||
      !canvasRef.current
    ) {
      return;
    }

    setCapturing(true);
    setError("");
    setMessage(
      "Capturing your face..."
    );

    try {

      const video =
        videoRef.current;

      const canvas =
        canvasRef.current;

      // --------------------------------------------------
      // SET CANVAS SIZE
      // --------------------------------------------------

      canvas.width =
        video.videoWidth || 640;

      canvas.height =
        video.videoHeight || 480;

      // --------------------------------------------------
      // CAPTURE IMAGE
      // --------------------------------------------------

      const context =
        canvas.getContext("2d");

      context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );

      // --------------------------------------------------
      // CONVERT IMAGE TO JPEG
      // --------------------------------------------------

      const blob =
        await new Promise(
          (resolve) => {

            canvas.toBlob(
              resolve,
              "image/jpeg",
              0.9
            );

          }
        );

      if (!blob) {

        throw new Error(
          "Unable to capture camera image."
        );
      }

      // --------------------------------------------------
      // CREATE FORM DATA
      // --------------------------------------------------

      const formData =
        new FormData();

      formData.append(
        "student_id",
        String(studentId)
      );

      formData.append(
        "image",
        blob,
        "face-enrollment.jpg"
      );

      // --------------------------------------------------
      // SEND TO FASTAPI
      // --------------------------------------------------

      setMessage(
        "Enrolling your face..."
      );

      const response =
        await fetch(
          `${API_BASE_URL}/face/enroll`,
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      // --------------------------------------------------
      // HANDLE ERROR
      // --------------------------------------------------

      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Face enrollment failed."
        );
      }

      // --------------------------------------------------
      // SUCCESS
      // --------------------------------------------------

      setMessage(
        "Face enrolled successfully!"
      );

      stopCamera();

      setTimeout(() => {

        onComplete();

      }, 700);

    } catch (err) {

      console.error(
        "Face enrollment error:",
        err
      );

      setError(
        err.message ||
        "Face enrollment failed."
      );

      setMessage("");

    } finally {

      setCapturing(false);

    }
  };


  // ==================================================
  // START CAMERA ON PAGE LOAD
  // ==================================================

  useEffect(() => {

    startCamera();

    return () => {

      stopCamera();

    };

  }, []);


  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="login-page">

      <button
        className="back-button"
        onClick={() => {

          stopCamera();

          if (onBack) {
            onBack();
          }

        }}
      >
        ← Back
      </button>


      <div className="login-card">

        <div className="login-icon">
          👤
        </div>


        <h1>
          Face Enrollment
        </h1>


        <p>
          This is required only for your
          first login.
        </p>


        {/* CAMERA */}

        <div
          style={{
            width: "100%",
            marginTop: "20px",
            borderRadius: "14px",
            overflow: "hidden",
            background: "#111",
          }}
        >

          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: "100%",
              display: "block",
              transform: "scaleX(-1)",
            }}
          />

        </div>


        {/* HIDDEN CANVAS */}

        <canvas
          ref={canvasRef}
          style={{
            display: "none",
          }}
        />


        {/* INSTRUCTIONS */}

        <p
          style={{
            marginTop: "15px",
            fontSize: "14px",
          }}
        >
          Look directly at the camera and
          keep your face clearly visible.
        </p>


        {/* SUCCESS / PROCESS MESSAGE */}

        {message && (

          <p
            style={{
              marginTop: "10px",
              color: "green",
            }}
          >
            {message}
          </p>

        )}


        {/* ERROR */}

        {error && (

          <p
            style={{
              marginTop: "10px",
              color: "red",
            }}
          >
            {error}
          </p>

        )}


        {/* CAMERA STARTING */}

        {!cameraStarted && !error && (

          <p>
            Starting camera...
          </p>

        )}


        {/* RETRY */}

        {error && (

          <button
            type="button"
            className="login-button"
            onClick={startCamera}
            style={{
              marginTop: "12px",
            }}
          >
            Retry Camera
          </button>

        )}


        {/* CAPTURE */}

        {cameraStarted && (

          <button
            type="button"
            className="login-button"
            disabled={capturing}
            onClick={captureAndEnroll}
            style={{
              marginTop: "12px",
            }}
          >

            {capturing
              ? "Enrolling..."
              : "Capture & Enroll"}

          </button>

        )}

      </div>

    </div>
  );
}

export default FaceEnrollment;