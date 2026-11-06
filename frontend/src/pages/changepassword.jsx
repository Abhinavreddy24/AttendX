import { useState } from "react";
import { ArrowLeft, Lock, CheckCircle } from "lucide-react";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function ChangePassword({
  username,
  onBack,
  onSuccess,
}) {
  const [step, setStep] = useState(1);

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const sendOTP = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/password/send-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to send OTP."
        );
      }

      /*
       * Development mode:
       * OTP is currently returned by the backend.
       * Gmail sending will be added later.
       */
      if (data.otp) {
        console.log("Development OTP:", data.otp);
      }

      setMessage(
        `OTP generated for ${data.email}`
      );

      setStep(2);
    } catch (err) {
      setError(
        err.message || "Unable to generate OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    setError("");
    setMessage("");

    if (!otp.trim()) {
      setError("Please enter the OTP.");
      return;
    }

    if (newPassword.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/password/change`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            otp: otp.trim(),
            new_password: newPassword,
            confirm_password: confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to change password."
        );
      }

      setMessage(
        "Password changed successfully."
      );

      setStep(3);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(
        err.message ||
          "Unable to change password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <button
        className="back-button"
        onClick={onBack}
      >
        <ArrowLeft size={17} />
        Back
      </button>

      <div className="login-card">
        <div className="login-icon">
          <Lock size={30} />
        </div>

        <h1>Change Password</h1>

        {step === 1 && (
          <>
            <p>
              We'll generate an OTP for your
              registered college email.
            </p>

            <button
              className="login-button"
              onClick={sendOTP}
              disabled={loading}
            >
              {loading
                ? "Generating OTP..."
                : "Send OTP"}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <p>
              Enter the OTP generated for your
              registered email.
            </p>

            <label htmlFor="otp">
              OTP
            </label>

            <input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(event) =>
                setOtp(
                  event.target.value.replace(
                    /\D/g,
                    ""
                  )
                )
              }
            />

            <label htmlFor="newPassword">
              New Password
            </label>

            <input
              id="newPassword"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(event) =>
                setNewPassword(
                  event.target.value
                )
              }
            />

            <label htmlFor="confirmPassword">
              Confirm Password
            </label>

            <input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
            />

            <button
              className="login-button"
              onClick={changePassword}
              disabled={loading}
            >
              {loading
                ? "Changing Password..."
                : "Change Password"}
            </button>
          </>
        )}

        {step === 3 && (
          <div
            style={{
              textAlign: "center",
              padding: "20px 0",
            }}
          >
            <CheckCircle
              size={50}
              style={{
                marginBottom: "15px",
              }}
            />

            <h2>
              Password Changed
            </h2>

            <p>
              Your password has been updated
              successfully.
            </p>

            <button
              className="login-button"
              onClick={onBack}
            >
              Back to Dashboard
            </button>
          </div>
        )}

        {message && step !== 3 && (
          <p
            style={{
              color: "green",
              marginTop: "15px",
            }}
          >
            {message}
          </p>
        )}

        {error && (
          <p
            style={{
              color: "red",
              marginTop: "15px",
            }}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}