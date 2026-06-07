// src/components/chat/QueueView.jsx
import React from "react";
import VideoBox from "../VideoBox";

export default function QueueView({
  banner,
  mode,
  localStream,
  videoError,
  onBack,
}) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 text-center py-4 px-3">
      
      {/* Dynamic Radar Ring Scan Animation */}
      <div className="radar-container mb-5">
        <div className="radar-dot"></div>
        <div className="radar-ring"></div>
        <div className="radar-ring"></div>
        <div className="radar-ring"></div>
      </div>

      <h3 className="mb-2 fw-bold" style={{ letterSpacing: "-0.5px" }}>
        Searching for a Stranger...
      </h3>
      <p className="text-muted small mb-4" style={{ maxWidth: "340px" }}>
        Connecting you with the best match. This usually takes just a few seconds.
      </p>

      {mode === "video" && (
        <div className="mt-2 mb-4 w-100" style={{ maxWidth: 540 }}>
          <div className="glass-panel p-2 rounded-4 shadow-lg overflow-hidden">
            <div className="ratio ratio-16x9 bg-black rounded-3 overflow-hidden position-relative">
              <VideoBox localStream={localStream} muted />
              <div className="position-absolute top-0 start-0 m-3 badge bg-dark bg-opacity-75 px-3 py-2 border border-secondary border-opacity-50 text-white rounded-pill small">
                <span className="d-inline-block rounded-circle bg-danger me-2 animate-blink" style={{ width: '8px', height: '8px' }}></span>
                Camera Preview
              </div>
            </div>
          </div>
          {videoError && (
            <div className="alert alert-danger border-0 rounded-pill mt-3 px-4 shadow-sm small">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {videoError}
            </div>
          )}
        </div>
      )}

      {banner && (
        <div className="text-muted small mt-2 px-3 py-2 bg-white bg-opacity-5 rounded-pill border border-white border-opacity-5 shadow-sm">
          {banner}
        </div>
      )}

      <button 
        className="btn btn-outline-light py-3 px-5 rounded-pill mt-5 shadow-sm text-uppercase fw-bold tracking-wide" 
        onClick={onBack}
        style={{ fontSize: "0.85rem", letterSpacing: "1px", border: "1.5px solid rgba(255, 255, 255, 0.4)" }}
      >
        Cancel Search
      </button>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        .animate-blink {
          animation: blink 1.5s infinite;
        }
      `}</style>
    </div>
  );
}
