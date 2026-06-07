import React, { useState } from "react";
import axios from "axios";
import { API } from "../api";
import PrivacyModal from "../components/PrivacyModal";
import TermsModal from "../components/TermsModal";
import talkativeLogo from "../assest/talkative-logo.png";

export default function ConsentPage({ onConsent, theme, toggleTheme }) {
  const [age, setAge] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [gender, setGender] = useState("");
  const [myHandle, setMyHandle] = useState("");
  const [copied, setCopied] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreHandleInput, setRestoreHandleInput] = useState("");
  const [restoreError, setRestoreError] = useState("");

  // Initialize or generate the sessionId on component load so we can show it
  const [mySessionId] = useState(() => {
    let sid = localStorage.getItem("sessionId");
    if (!sid) {
      sid = Math.random().toString(36).substring(2, 15);
    }
    return sid;
  });

  React.useEffect(() => {
    const msgBuffer = new TextEncoder().encode(mySessionId);
    crypto.subtle.digest("SHA-256", msgBuffer).then((hashBuffer) => {
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      setMyHandle(hashHex.slice(0, 12));
    });
  }, [mySessionId]);

  const submit = async () => {
    if (!gender) {
      return alert("Please select your gender to continue.");
    }
    if (!age || !privacy || !terms) {
      return alert("Please accept all the conditions to continue.");
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/consent`, {
        is18Plus: age,
        acceptedPrivacyPolicy: privacy,
        acceptedTerms: terms,
        sessionId: mySessionId,
        gender: gender,
      });
      const id = res.data?.sessionId || mySessionId;
      localStorage.setItem("sessionId", id);
      onConsent(id);
    } catch (e) {
      console.log(e);
      alert("Error saving consent.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartRestore = () => {
    setAge(false);
    setPrivacy(false);
    setTerms(false);
    setGender("");
    setRestoreHandleInput("");
    setRestoreError("");
    setIsRestoring(true);
  };

  const handleRestoreConfirm = async () => {
    if (!restoreHandleInput.trim()) {
      setRestoreError("Please enter a valid talkative handler.");
      return;
    }
    setLoading(true);
    setRestoreError("");
    try {
      const res = await axios.post(`${API}/consent/restore`, {
        handle: restoreHandleInput.trim(),
      });
      if (res.data?.success && res.data?.sessionId) {
        const sid = res.data.sessionId;
        localStorage.setItem("sessionId", sid);
        onConsent(sid);
      } else {
        setRestoreError("Could not restore session. Please check your handler.");
      }
    } catch (e) {
      console.log(e);
      const errMsg = e.response?.data?.message || "Failed to restore session. Handle may not exist.";
      setRestoreError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid d-flex min-vh-100 justify-content-center align-items-center p-3 position-relative">
      {/* Theme Toggle Button */}
      <div className="position-absolute top-0 end-0 m-3">
        <button
          className="btn btn-outline-light rounded-circle border-0 d-flex align-items-center justify-content-center shadow-sm"
          onClick={toggleTheme}
          style={{ width: "42px", height: "42px", color: "var(--text-main)", background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
          type="button"
          title="Toggle Theme"
        >
          <i className={theme === "light" ? "bi bi-moon-stars-fill" : "bi bi-sun-fill"}></i>
        </button>
      </div>

      <div className="glass-panel glass-panel-glow p-4 p-md-5 w-100 text-center" style={{ maxWidth: 520 }}>
        {/* Branding Area */}
        <div className="text-center mb-3">
          <div className="d-inline-flex align-items-center justify-content-center mb-3 rounded-4 shadow" style={{ width: '80px', height: '80px', overflow: 'hidden', border: '1.5px solid var(--glass-border)' }}>
            <img src={talkativeLogo} alt="Talkative Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h1 className="fw-bold mb-1" style={{ letterSpacing: '-1px', color: 'var(--text-main)', fontSize: '2.5rem' }}>Talkative</h1>
          <p className="text-muted small">Connect anonymously with strangers worldwide</p>
        </div>

        {isRestoring ? (
          <div className="text-start px-2 py-2">
            <h5 className="fw-bold mb-2 text-center" style={{ color: "var(--text-main)", fontSize: "1.25rem" }}>
              Restore Session
            </h5>
            <p className="text-muted small text-center mb-4">
              Enter your Talkative handle to restore your existing session.
            </p>
            
            {restoreError && (
              <div className="alert alert-danger border-0 small py-2 rounded-3 mb-3 text-center">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {restoreError}
              </div>
            )}

            <div className="mb-4">
              <label className="text-muted small fw-semibold d-block mb-2">Talkative Handle:</label>
              <input
                type="text"
                className="form-control form-control-lg rounded-pill px-4"
                placeholder="talkative_56fcc7349d64"
                value={restoreHandleInput}
                onChange={(e) => setRestoreHandleInput(e.target.value)}
                style={{ 
                  fontSize: "0.95rem", 
                  color: "var(--text-main)", 
                  background: "var(--input-bg)", 
                  border: "1px solid var(--glass-border)" 
                }}
              />
            </div>

            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary flex-grow-1 py-2.5 rounded-pill fw-semibold transition-all"
                style={{ 
                  fontSize: "0.85rem", 
                  color: "var(--text-main)", 
                  borderColor: "var(--glass-border)",
                  background: "var(--input-bg)"
                }}
                onClick={() => {
                  setIsRestoring(false);
                  setRestoreHandleInput("");
                  setRestoreError("");
                }}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-glowing-accent flex-grow-1 py-2.5 rounded-pill fw-semibold transition-all"
                style={{ fontSize: "0.85rem" }}
                onClick={handleRestoreConfirm}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Restoring...
                  </>
                ) : "Confirm"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* User Unique Handle Display */}
            <div className="mb-4 d-inline-flex align-items-center justify-content-center gap-2 py-2 px-3 rounded-pill" style={{ background: "var(--input-bg)", border: "1px dashed var(--glass-border)" }}>
              <span className="text-muted small">Your unique handle:</span>
              <strong className="small" style={{ letterSpacing: "0.5px", color: "var(--text-main)" }}>talkative_{myHandle || "..."}</strong>
              {copied ? (
                <span className="text-success small fw-semibold d-flex align-items-center gap-1" style={{ fontSize: "0.8rem" }}>
                  <i className="bi bi-check-lg"></i> Copied
                </span>
              ) : (
                <button
                  className="btn btn-sm btn-link p-0 hover-scale"
                  onClick={() => {
                    if (myHandle) {
                      navigator.clipboard.writeText(`talkative_${myHandle}`);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }
                  }}
                  type="button"
                  title="Copy Handle"
                  style={{ border: "none", background: "none" }}
                >
                  <i className="bi bi-copy text-primary"></i>
                </button>
              )}
            </div>

            {/* Gender Selection Area */}
            <div className="mb-4 text-start px-2">
              <label className="text-muted small fw-semibold d-block mb-2">Select Gender:</label>
              <div className="d-flex gap-2">
                <button
                  className={`btn flex-grow-1 py-2.5 rounded-pill fw-semibold transition-all ${
                    gender === "male"
                      ? "btn-glowing-primary"
                      : "btn-outline-secondary"
                  }`}
                  style={{
                    fontSize: "0.85rem",
                    color: gender === "male" ? "#fff" : "var(--text-main)",
                    borderColor: gender === "male" ? "transparent" : "var(--glass-border)",
                    background: gender === "male" ? "" : "var(--input-bg)"
                  }}
                  onClick={() => setGender("male")}
                  type="button"
                >
                  Male
                </button>
                <button
                  className={`btn flex-grow-1 py-2.5 rounded-pill fw-semibold transition-all ${
                    gender === "female"
                      ? "btn-glowing-accent"
                      : "btn-outline-secondary"
                  }`}
                  style={{
                    fontSize: "0.85rem",
                    color: gender === "female" ? "#fff" : "var(--text-main)",
                    borderColor: gender === "female" ? "transparent" : "var(--glass-border)",
                    background: gender === "female" ? "" : "var(--input-bg)"
                  }}
                  onClick={() => setGender("female")}
                  type="button"
                >
                  Female
                </button>
                <button
                  className={`btn flex-grow-1 py-2.5 rounded-pill fw-semibold transition-all ${
                    gender === "other"
                      ? "btn-glowing-success"
                      : "btn-outline-secondary"
                  }`}
                  style={{
                    fontSize: "0.85rem",
                    color: gender === "other" ? "#fff" : "var(--text-main)",
                    borderColor: gender === "other" ? "transparent" : "var(--glass-border)",
                    background: gender === "other" ? "" : "var(--input-bg)"
                  }}
                  onClick={() => setGender("other")}
                  type="button"
                >
                  Other
                </button>
              </div>
            </div>

            {/* Informative message */}
            <p className="mb-4 text-muted small px-2">
              To comply with the Information Technology Act of India, please confirm you are 18+ and accept our policy agreements.
            </p>

            {/* Custom checkboxes */}
            <div className="d-flex flex-column gap-3 mb-4 text-start px-2">
              <div className="d-flex align-items-center custom-checkbox-wrapper" onClick={() => setAge(!age)}>
                <input
                  className="custom-checkbox"
                  id="age"
                  type="checkbox"
                  checked={age}
                  readOnly
                />
                <label className="text-muted cursor-pointer mb-0 flex-grow-1" style={{ fontSize: '0.95rem', cursor: 'pointer' }}>
                  I confirm I am <strong className="fw-bold" style={{ color: "var(--text-main)" }}>18 years old or above</strong>.
                </label>
              </div>
              <div className="d-flex align-items-center custom-checkbox-wrapper" onClick={() => setPrivacy(!privacy)}>
                <input
                  className="custom-checkbox"
                  id="privacy"
                  type="checkbox"
                  checked={privacy}
                  readOnly
                />
                <label className="text-muted cursor-pointer mb-0 flex-grow-1" style={{ fontSize: '0.95rem', cursor: 'pointer' }}>
                  I agree to the <span className="hover-underline" onClick={(e) => { e.stopPropagation(); setShowPrivacy(true); }}>Privacy Policy</span>.
                </label>
              </div>
              <div className="d-flex align-items-center custom-checkbox-wrapper" onClick={() => setTerms(!terms)}>
                <input
                  className="custom-checkbox"
                  id="terms"
                  type="checkbox"
                  checked={terms}
                  readOnly
                />
                <label className="text-muted cursor-pointer mb-0 flex-grow-1" style={{ fontSize: '0.95rem', cursor: 'pointer' }}>
                  I agree to the <span className="hover-underline" onClick={(e) => { e.stopPropagation(); setShowTerms(true); }}>Terms & Conditions</span>.
                </label>
              </div>
            </div>

            {/* Action Button */}
            <button
              className="btn btn-glowing-accent w-100 py-3 rounded-pill fs-6 mb-3"
              onClick={submit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Please wait...
                </>
              ) : "Continue"}
            </button>

            {/* Already Used Session Restore Button */}
            <div className="mb-3">
              <button
                type="button"
                className="btn btn-link btn-sm text-decoration-none text-primary fw-semibold"
                onClick={handleStartRestore}
                style={{ fontSize: "0.85rem" }}
              >
                Already used? Restore previous session
              </button>
            </div>
          </>
        )}

        <small className="text-muted d-block small">
          Please use our service responsibly. By using Talkative, you agree not to engage in harmful behaviors.
        </small>
      </div>

      <PrivacyModal
        show={showPrivacy}
        handleClose={() => setShowPrivacy(false)}
      />
      <TermsModal show={showTerms} handleClose={() => setShowTerms(false)} />
    </div>
  );
}
