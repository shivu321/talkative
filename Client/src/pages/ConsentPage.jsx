import React, { useEffect, useState } from "react";
import axios from "axios";
import { API } from "../api";
import PrivacyModal from "../components/PrivacyModal";
import TermsModal from "../components/TermsModal";

export default function ConsentPage({ onConsent }) {
  const [age, setAge] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  // const navigate = useNavigate();

  const submit = async () => {
    if (!age || !privacy || !terms) {
      return alert("Please accept all the conditions to continue.");
    }
    let sessionId = localStorage.getItem("sessionId");
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2, 15);
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/consent`, {
        is18Plus: age,
        acceptedPrivacyPolicy: privacy,
        acceptedTerms: terms,
        sessionId: sessionId,
      });
      const id = res.data?.sessionId;
      if (!sessionId) {
        localStorage.setItem("sessionId", sessionId);
      }
      onConsent(id);
      // navigate("/chat");
    } catch (e) {
      console.log(e);
      alert("Error saving consent.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container d-flex vh-100 justify-content-center align-items-center">
      <div className="card p-4" style={{ maxWidth: 560 }}>
        <h4>Welcome</h4>
        <p>
          Please confirm you are 18+ and accept our Privacy Policy and Terms &
          Conditions (as per Indian law).
        </p>

        <div className="form-check">
          <input
            className="form-check-input"
            id="age"
            type="checkbox"
            checked={age}
            onChange={() => setAge(!age)}
          />
          <label className="form-check-label" htmlFor="age">
            I confirm I am 18 years old or above.
          </label>
        </div>
        <div className="form-check mt-2">
          <input
            className="form-check-input"
            id="privacy"
            type="checkbox"
            checked={privacy}
            onChange={() => setPrivacy(!privacy)}
          />
          <label className="form-check-label" htmlFor="privacy">
            I agree to the Privacy Policy.
          </label>
        </div>
        <div className="form-check mt-2">
          <input
            className="form-check-input"
            id="terms"
            type="checkbox"
            checked={terms}
            onChange={() => setTerms(!terms)}
          />
          <label className="form-check-label" htmlFor="terms">
            I agree to the Terms & Conditions.
          </label>
        </div>

        <div className="mt-3 d-flex justify-content-between">
          <h6
            onClick={() => setShowPrivacy(true)}
            role="button"
            style={{ cursor: "pointer" }}
          >
            Privacy Policy
          </h6>
          <h6
            onClick={() => setShowTerms(true)}
            role="button"
            style={{ cursor: "pointer" }}
          >
            Terms & Conditions
          </h6>
        </div>

        <button
          className="btn btn-primary mt-3"
          onClick={submit}
          disabled={loading}
        >
          {loading ? "Please wait…" : "Continue"}
        </button>

        <small className="text-muted d-block mt-2">
          By continuing you agree to our policies. Use responsibly.
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
