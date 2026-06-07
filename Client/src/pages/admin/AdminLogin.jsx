/**
 * pages/admin/AdminLogin.jsx
 *
 * Glassmorphic login page for entering credentials (admin / admin@123)
 * after OTP validation.
 */
import React from "react";

export default function AdminLogin({
  username,
  setUsername,
  password,
  setPassword,
  error,
  loading,
  onLogin,
  onBack,
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
        }}
      >
        <div className="text-center mb-4">
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
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>

          <h3 className="fw-bold mb-2" style={{ color: "var(--text-main)", letterSpacing: "-0.5px" }}>
            Admin Credentials
          </h3>
          <p className="text-muted small">
            Please enter your administrator username and password to log in.
          </p>
        </div>

        {error && (
          <div
            className="alert alert-danger py-2 px-3 mb-4 small text-center"
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
            onLogin();
          }}
        >
          <div className="mb-3 text-start">
            <label className="form-label small fw-semibold text-muted mb-2">
              Username
            </label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="Username (e.g. admin)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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

          <div className="mb-4 text-start">
            <label className="form-label small fw-semibold text-muted mb-2">
              Password
            </label>
            <input
              type="password"
              required
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          <div className="d-grid gap-2">
            <button
              type="submit"
              className="btn btn-glowing-primary py-2.5"
              disabled={loading}
              style={{ borderRadius: "8px" }}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
              ) : (
                "Log In"
              )}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary py-2"
              onClick={onBack}
              disabled={loading}
              style={{
                borderRadius: "8px",
                borderColor: "var(--glass-border)",
                color: "var(--text-main)",
              }}
            >
              Back to OTP
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
