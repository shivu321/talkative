/**
 * pages/admin/AdminPage.jsx
 *
 * Master orchestrator that controls authentication flow and renders
 * the Admin OTP, Login, or Dashboard view.
 */
import React, { useState, useEffect } from "react";
import OTPModal from "./OTPModal";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";
import { adminApi } from "../../utils/adminApi";

export default function AdminPage({ theme, toggleTheme }) {
  // Auth steps: "otp" | "login" | "dashboard"
  const [step, setStep] = useState("otp");
  const [otpStep, setOtpStep] = useState("email"); // "email" | "otp"
  
  // Input fields
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  // Token stores
  const [otpToken, setOtpToken] = useState("");
  
  // Loading & error handling
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if token exists in localStorage
    const token = localStorage.getItem("adminToken");
    if (token) {
      setStep("dashboard");
    } else {
      setStep("otp");
      setOtpStep("email");
    }
  }, []);

  const handleSendOtp = async () => {
    setLoading(true);
    setError("");
    try {
      await adminApi.sendOtp(email);
      setOtpStep("otp");
    } catch (err) {
      setError(err.message || "Failed to send OTP code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.verifyOtp(email, otp);
      if (res.otpToken) {
        setOtpToken(res.otpToken);
        setStep("login");
      } else {
        setError("Invalid OTP response received.");
      }
    } catch (err) {
      setError(err.message || "Invalid or expired OTP code.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.login(username, password, otpToken);
      if (res.token) {
        localStorage.setItem("adminToken", res.token);
        setStep("dashboard");
      } else {
        setError("Invalid login response received.");
      }
    } catch (err) {
      setError(err.message || "Invalid admin credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setOtpToken("");
    setEmail("");
    setOtp("");
    setUsername("");
    setPassword("");
    setOtpStep("email");
    setStep("otp");
  };

  const handleCancel = () => {
    // Return back to main public page
    window.location.hash = "";
    window.location.reload();
  };

  return (
    <div
      className={theme === "light" ? "light-theme" : "dark-theme"}
      style={{ minHeight: "100vh", position: "relative" }}
    >
      {/* Top Floating Controls */}
      <div
        style={{
          position: "absolute",
          top: "1.5rem",
          right: "1.5rem",
          display: "flex",
          gap: "1rem",
          zIndex: 1000,
        }}
      >
        <button
          onClick={toggleTheme}
          className="btn btn-sm btn-outline-secondary rounded-circle"
          style={{
            width: "38px",
            height: "38px",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderColor: "var(--glass-border)",
            color: "var(--text-main)",
            background: "var(--glass-bg)",
          }}
          title="Toggle Theme"
        >
          {theme === "light" ? "🌙" : "☀️"}
        </button>
        {step !== "dashboard" && (
          <button
            onClick={handleCancel}
            className="btn btn-sm btn-outline-secondary rounded-pill px-3"
            style={{
              borderColor: "var(--glass-border)",
              color: "var(--text-main)",
              background: "var(--glass-bg)",
            }}
          >
            Public Chat
          </button>
        )}
      </div>

      {/* Renders Auth States */}
      {step === "otp" && (
        <OTPModal
          email={email}
          setEmail={setEmail}
          otp={otp}
          setOtp={setOtp}
          step={otpStep}
          error={error}
          loading={loading}
          onSendOtp={handleSendOtp}
          onVerifyOtp={handleVerifyOtp}
          onCancel={handleCancel}
        />
      )}

      {step === "login" && (
        <AdminLogin
          username={username}
          setUsername={setUsername}
          password={password}
          setPassword={setPassword}
          error={error}
          loading={loading}
          onLogin={handleLogin}
          onBack={() => {
            setError("");
            setOtp("");
            setOtpStep("otp");
            setStep("otp");
          }}
        />
      )}

      {step === "dashboard" && (
        <AdminDashboard onLogout={handleLogout} />
      )}
    </div>
  );
}
