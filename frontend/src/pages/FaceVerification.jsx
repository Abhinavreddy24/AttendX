import { useEffect, useRef, useState } from "react";

const API_BASE_URL = "/api";

function FaceVerification({
  studentId = 2,
  onVerified,
  onComplete,
  onBack,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const startingRef = useRef(false);

  const [cameraStarted, setCameraStarted] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [verified, setVerified] = useState(false);

  const stopCamera = () => {
    const video = videoRef.current;

    if (video) {
      try {
        video.pause();
      } catch {}

      video.srcObject = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });

      streamRef.current = null;
    }

    setCameraStarted(false);
  };

  const waitForVideoFrame = async (video) => {
    if (
      typeof video.requestVideoFrameCallback ===
      "function"
    ) {
      await new Promise((resolve) => {
        video.requestVideoFrameCallback(() => {
          resolve();
        });
      });
    } else {
      await new Promise((resolve) =>
        setTimeout(resolve, 700)
      );
    }
  };

  const startCamera = async () => {
    if (startingRef.current) return;

    startingRef.current = true;

    stopCamera();

    setError("");
    setMessage("Starting camera...");
    setCameraStarted(false);

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
          },
          audio: false,
        });

      streamRef.current = stream;

      const video = videoRef.current;

      if (!video) {
        throw new Error(
          "Video element is not ready."
        );
      }

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;

      await new Promise((resolve) => {
        if (video.readyState >= 1) {
          resolve();
          return;
        }

        video.onloadedmetadata = () => {
          resolve();
        };
      });

      await video.play();

      await waitForVideoFrame(video);

      // Extra time for camera exposure/focus.
      await new Promise((resolve) =>
        setTimeout(resolve, 1000)
      );

      if (
        !video.videoWidth ||
        !video.videoHeight
      ) {
        throw new Error(
          "Camera frame is not available."
        );
      }

      setCameraStarted(true);

      setMessage(
        "Camera ready. Keep your face inside the frame."
      );
    } catch (err) {
      console.error("Camera error:", err);

      stopCamera();

      if (err.name === "NotReadableError") {
        setError(
          "Camera is already being used. Close other camera tabs/apps and retry."
        );
      } else if (err.name === "NotAllowedError") {
        setError(
          "Camera permission was denied. Allow camera access and retry."
        );
      } else {
        setError(
          err.message ||
            "Unable to start camera."
        );
      }
    } finally {
      startingRef.current = false;
    }
  };

  const captureImage = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      throw new Error(
        "Camera is not ready."
      );
    }

    if (
      video.readyState < 2 ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      throw new Error(
        "Live camera frame is not ready."
      );
    }

    // Wait for the freshest available frame.
    await waitForVideoFrame(video);

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context =
      canvas.getContext("2d", {
        willReadFrequently: true,
      });

    if (!context) {
      throw new Error(
        "Unable to capture camera image."
      );
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // Check whether the captured image contains
    // actual visual information rather than a blank frame.
    const pixels = context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    ).data;

    let total = 0;

    for (
      let i = 0;
      i < pixels.length;
      i += 40
    ) {
      total +=
        pixels[i] +
        pixels[i + 1] +
        pixels[i + 2];
    }

    const average =
      total /
      Math.ceil(pixels.length / 40) /
      3;

    console.log(
      "Captured frame:",
      canvas.width,
      "x",
      canvas.height,
      "average brightness:",
      average
    );

    if (
      average < 5 ||
      average > 250
    ) {
      throw new Error(
        "The camera image appears blank. Please face the camera and try again."
      );
    }

    const blob = await new Promise(
      (resolve) => {
        canvas.toBlob(
          resolve,
          "image/jpeg",
          0.95
        );
      }
    );

    if (!blob || blob.size < 5000) {
      throw new Error(
        "Captured image is too small. Please try again."
      );
    }

    console.log(
      "Captured image size:",
      blob.size
    );

    return blob;
  };

  const verifyFace = async () => {
    if (capturing) return;

    setCapturing(true);
    setError("");

    setMessage(
      "Capturing your live face..."
    );

    try {
      const imageBlob =
        await captureImage();

      const formData = new FormData();

      formData.append(
        "student_id",
        String(studentId)
      );

      formData.append(
        "image",
        imageBlob,
        "live-face.jpg"
      );

      setMessage(
        "Verifying face..."
      );

      const response = await fetch(
        `${API_BASE_URL}/face/verify`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data =
        await response.json();

      console.log(
        "Face verification response:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Face verification failed."
        );
      }

      if (!data.verified) {
        throw new Error(
          `Face does not match enrolled face. Similarity: ${data.similarity}`
        );
      }

      setVerified(true);

      setMessage(
        `Face verified successfully (${(
          data.similarity * 100
        ).toFixed(1)}%)`
      );

      stopCamera();

      if (onVerified) {
        onVerified(data);
      }

      if (onComplete) {
        setTimeout(() => {
          onComplete(data);
        }, 500);
      }
    } catch (err) {
      console.error(
        "Face verification error:",
        err
      );

      setError(
        err.message ||
          "Face verification failed."
      );

      setMessage("");
    } finally {
      setCapturing(false);
    }
  };

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="face-verification-page">
      {onBack && (
        <button
          className="back-button"
          onClick={() => {
            stopCamera();
            onBack();
          }}
        >
          ← Back
        </button>
      )}

      <div className="face-verification-card">
        <div className="login-icon">
          👤
        </div>

        <h1>Face Verification</h1>

        <p>
          Look directly at the camera to
          verify your identity before
          marking attendance.
        </p>

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

        <canvas
          ref={canvasRef}
          style={{
            display: "none",
          }}
        />

        {message && (
          <p
            style={{
              marginTop: "15px",
              color: verified
                ? "green"
                : "#555",
            }}
          >
            {message}
          </p>
        )}

        {error && (
          <p
            style={{
              marginTop: "15px",
              color: "red",
              fontSize: "14px",
            }}
          >
            {error}
          </p>
        )}

        {cameraStarted && !verified && (
          <button
            type="button"
            className="login-button"
            disabled={capturing}
            onClick={verifyFace}
            style={{
              marginTop: "12px",
            }}
          >
            {capturing
              ? "Verifying..."
              : "Verify My Face"}
          </button>
        )}

        {error && !capturing && (
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
      </div>
    </div>
  );
}

export default FaceVerification;