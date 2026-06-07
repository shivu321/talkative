/**
 * pages/admin/OTPModal.jsx
 *
 * Glassmorphic OTP modal for starting admin verification flow.
 */
import React from "react";

export default function OTPModal({
  email,
  setEmail,
  otp,
  setOtp,
  step,
  error,
  loading,
  onSendOtp,
  onVerifyOtp,
  onCancel,
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1050,
      }}
    >
      <div
        className="glass-panel glass-panel-glow"
        style={{
          width: "100%",
          maxWidth: "440px",
          padding: "2.5rem",
          margin: "1rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "rgba(109, 117, 242, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
            border: "1px solid var(--primary-color)",
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--primary-color)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h3 className="fw-bold mb-2" style={{ color: "var(--text-main)", letterSpacing: "-0.5px" }}>
          Admin Verification
        </h3>
        <p className="text-muted small mb-4">
          {step === "email"
            ? "Enter your administrator email. We'll send a One-Time Passcode (OTP) via Mailtrap."
            : `Enter the 6-digit OTP sent to ${email}`}
        </p>

        {error && (
          <div
            className="alert alert-danger py-2 px-3 mb-4 small"
            style={{
              background: "rgba(220, 53, 69, 0.1)",
              border: "1px solid rgba(220, 53, 69, 0.2)",
              color: "#f87171",
              borderRadius: "8px",
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step === "email") {
              onSendOtp();
            } else {
              onVerifyOtp();
            }
          }}
        >
          {step === "email" ? (
            <div className="mb-4 text-start">
              <label className="form-label small fw-semibold text-muted mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                className="form-control"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                style={{
                  background: "var(--input-bg)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-main)",
                  borderRadius: "8px",
                  padding: "0.75rem 1rem",
                }}
              />
            </div>
          ) : (
            <div className="mb-4 text-start">
              <label className="form-label small fw-semibold text-muted mb-2">
                One-Time Passcode (OTP)
              </label>
              <input
                type="text"
                required
                maxLength="6"
                pattern="\d{6}"
                className="form-control text-center"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                disabled={loading}
                style={{
                  background: "var(--input-bg)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-main)",
                  borderRadius: "8px",
                  padding: "0.75rem 1rem",
                  fontSize: "1.5rem",
                  letterSpacing: "8px",
                  fontWeight: "bold",
                }}
              />
            </div>
          )}

          <div className="d-grid gap-2">
            <button
              type="submit"
              className="btn btn-glowing-primary py-2.5"
              disabled={loading}
              style={{ borderRadius: "8px" }}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
              ) : step === "email" ? (
                "Send OTP Code"
              ) : (
                "Verify OTP Code"
              )}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary py-2"
              onClick={onCancel}
              disabled={loading}
              style={{
                borderRadius: "8px",
                borderColor: "var(--glass-border)",
                color: "var(--text-main)",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
