// src/components/chat/ModeSelectionView.jsx
import React from "react";

export default function ModeSelectionView({
  banner,
  onModeSelect,
  totalOnline,
}) {
  return (
    <div className="d-flex align-items-center justify-content-center flex-grow-1 py-4">
      <div className="d-flex flex-column align-items-center w-100" style={{ maxWidth: "780px" }}>
        
        {/* Banner Alert if present */}
        {banner && (
          <div className="alert alert-info border-0 shadow-sm rounded-pill px-4 mb-4 text-center glass-panel" style={{ color: 'var(--text-main)' }}>
            <i className="bi bi-info-circle-fill me-2 text-primary"></i>
            {banner}
          </div>
        )}

        <div className="text-center mb-5">
          <h2 className="fw-bold mb-2" style={{ letterSpacing: "-0.5px", fontSize: "2.2rem" }}>
            Choose Your Mode
          </h2>
          <p className="text-muted">How would you like to connect with strangers today?</p>
        </div>

        {/* Mode cards container */}
        <div className="row g-4 w-100 px-3 justify-content-center">
          
          {/* Card 1: Text Chat */}
          <div className="col-md-6 col-lg-5">
            <div 
              className="glass-panel mode-card p-4 h-100 d-flex flex-column align-items-center text-center rounded-4"
              onClick={() => onModeSelect("chat")}
            >
              <div 
                className="d-flex align-items-center justify-content-center mb-4 rounded-circle bg-opacity-10"
                style={{ width: "80px", height: "80px", backgroundColor: "rgba(109, 117, 242, 0.12)", border: "1.5px solid rgba(109, 117, 242, 0.3)" }}
              >
                <i className="bi bi-chat-right-text-fill" style={{ fontSize: "2.2rem", color: "var(--primary-color)" }}></i>
              </div>
              <h3 className="fw-bold mb-2 fs-4">Text Chat</h3>
              <p className="text-muted small flex-grow-1 px-2 mb-4">
                Chat completely anonymously using text. Ideal for casual, fast matchmaking.
              </p>
              <button 
                className="btn btn-glowing-primary w-100 py-3 rounded-pill"
                onClick={(e) => {
                  e.stopPropagation();
                  onModeSelect("chat");
                }}
              >
                Start Chatting
              </button>
            </div>
          </div>

          {/* Card 2: Video Chat */}
          <div className="col-md-6 col-lg-5">
            <div 
              className="glass-panel mode-card p-4 h-100 d-flex flex-column align-items-center text-center rounded-4"
              onClick={() => onModeSelect("video")}
            >
              <div 
                className="d-flex align-items-center justify-content-center mb-4 rounded-circle bg-opacity-10"
                style={{ width: "80px", height: "80px", backgroundColor: "rgba(46, 196, 182, 0.12)", border: "1.5px solid rgba(46, 196, 182, 0.3)" }}
              >
                <i className="bi bi-camera-video-fill" style={{ fontSize: "2.2rem", color: "var(--success-color)" }}></i>
              </div>
              <h3 className="fw-bold mb-2 fs-4">Video Chat</h3>
              <p className="text-muted small flex-grow-1 px-2 mb-4">
                Share your webcam and microphone to chat face-to-face in real-time.
              </p>
              <button 
                className="btn btn-glowing-success w-100 py-3 rounded-pill"
                onClick={(e) => {
                  e.stopPropagation();
                  onModeSelect("video");
                }}
              >
                Start Video Call
              </button>
            </div>
          </div>
        </div>

        {/* 🔥 Online count block */}
        {totalOnline && (
          <div 
            className="glass-panel mt-5 px-4 py-3 text-center d-flex align-items-center justify-content-center gap-2 rounded-pill shadow-sm"
            style={{ minWidth: "280px" }}
          >
            <span className="d-inline-block rounded-circle bg-success anim-pulse" style={{ width: "10px", height: "10px", boxShadow: "0 0 10px #2ec4b6" }}></span>
            <span className="text-muted small fw-semibold tracking-wide">
              {totalOnline}
            </span>
            <style>{`
              @keyframes animPulse {
                0% { transform: scale(0.9); opacity: 1; }
                50% { transform: scale(1.2); opacity: 0.6; }
                100% { transform: scale(0.9); opacity: 1; }
              }
              .anim-pulse {
                animation: animPulse 2s infinite ease-in-out;
              }
            `}</style>
          </div>
        )}

      </div>
    </div>
  );
}
