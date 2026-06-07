import React, { useState } from "react";
import axios from "axios";
import { API } from "../api";
import PrivacyModal from "../components/PrivacyModal";
import TermsModal from "../components/TermsModal";

export default function ConsentPage({ onConsent, theme, toggleTheme }) {
  const [age, setAge] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [gender, setGender] = useState("");

  const [myHandle, setMyHandle] = useState("");

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
          <div className="d-inline-flex align-items-center justify-content-center mb-3 rounded-circle" style={{ width: '76px', height: '76px', background: 'rgba(255, 75, 145, 0.1)', border: '2px dashed var(--accent-color)', boxShadow: '0 0 20px rgba(255, 75, 145, 0.2)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="var(--accent-color)" className="bi bi-chat-heart-fill" viewBox="0 0 16 16">
              <path d="M8 15c4.418 0 8-3.134 8-7s-3.582-7-8-7-8 3.134-8 7c0 1.76.743 3.37 1.97 4.6-.097 1.016-.417 2.13-.771 2.966-.079.186.074.394.273.362 2.256-.37 3.597-.938 4.18-1.234A9.06 9.06 0 0 0 8 15Zm0-9.007c1.664-1.711 5.825 1.283 0 5.185-5.825-3.897-1.664-6.896 0-5.185Z"/>
            </svg>
          </div>
          <h1 className="fw-bold mb-1" style={{ letterSpacing: '-1px', color: 'var(--text-main)', fontSize: '2.5rem' }}>Talkative</h1>
          <p className="text-muted small">Connect anonymously with strangers worldwide</p>
        </div>

        {/* User Unique Handle Display */}
        <div className="mb-4 d-inline-flex align-items-center justify-content-center gap-2 py-2 px-3 rounded-pill" style={{ background: "var(--input-bg)", border: "1px dashed var(--glass-border)" }}>
          <span className="text-muted small">Your unique handle:</span>
          <strong className="small" style={{ letterSpacing: "0.5px", color: "var(--text-main)" }}>talkative_{myHandle || "..."}</strong>
          <button
            className="btn btn-sm btn-link p-0 hover-scale"
            onClick={() => {
              if (myHandle) {
                navigator.clipboard.writeText(`talkative_${myHandle}`);
                alert("Copied handle to clipboard!");
              }
            }}
            type="button"
            title="Copy Handle"
            style={{ border: "none", background: "none" }}
          >
            <i className="bi bi-copy text-primary"></i>
          </button>
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
