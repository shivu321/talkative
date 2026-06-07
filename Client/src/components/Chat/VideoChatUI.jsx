// src/components/chat/VideoChatUI.jsx
import React, { useEffect, useRef, useState } from "react";

export default function VideoChatUI({
  localStream,
  remoteStream,
  videoError,
  partnerPresent,
}) {
  const localMainRef = useRef(null);
  const localPreviewRef = useRef(null);
  const remoteMainRef = useRef(null);
  const remotePreviewRef = useRef(null);

  const [isLocalMain, setIsLocalMain] = useState(false);

  // Attach LOCAL stream
  useEffect(() => {
    [localMainRef.current, localPreviewRef.current].forEach((el) => {
      if (!el) return;
      el.srcObject = localStream || null;
      el.muted = true; // always mute local video
      el.play?.().catch(() => {});
    });
  }, [localStream]);

  // Attach REMOTE stream
  useEffect(() => {
    [remoteMainRef.current, remotePreviewRef.current].forEach((el) => {
      if (!el) return;
      el.srcObject = remoteStream || null;
      el.muted = false; // remote should always have audio
      el.play?.().catch(() => {});
    });
  }, [remoteStream]);

  return (
    <div className="w-100 h-100 d-flex flex-column align-items-center">
      <div 
        className="w-100 flex-grow-1 position-relative shadow-lg overflow-hidden rounded-4 border" 
        style={{ 
          minHeight: "420px", 
          backgroundColor: "#07050d",
          borderColor: "var(--glass-border)",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.4)" 
        }}
      >
        {/* Main Videos */}
        <video
          ref={remoteMainRef}
          autoPlay
          playsInline
          className={`position-absolute top-0 start-0 w-100 h-100 ${
            isLocalMain ? "d-none" : ""
          }`}
          style={{ objectFit: "cover" }}
        />
        <video
          ref={localMainRef}
          autoPlay
          playsInline
          muted
          className={`position-absolute top-0 start-0 w-100 h-100 ${
            isLocalMain ? "" : "d-none"
          }`}
          style={{ objectFit: "cover" }}
        />

        {/* Labels Overlay */}
        <div className="position-absolute top-0 start-0 m-3 d-flex gap-2" style={{ zIndex: 5 }}>
          <span className="badge bg-dark bg-opacity-75 px-3 py-2 border border-secondary border-opacity-50 text-white rounded-pill small">
            <i className={`bi bi-person-fill me-1 ${isLocalMain ? "text-primary" : "text-danger"}`}></i>
            {isLocalMain ? "You (Main)" : "Stranger"}
          </span>
          {partnerPresent && (
            <span className="badge bg-success bg-opacity-75 px-3 py-2 border border-success border-opacity-50 text-white rounded-pill small">
              Live Connection
            </span>
          )}
        </div>

        {/* Floating Preview (Bottom Right) */}
        <div
          className="position-absolute border shadow rounded-3 overflow-hidden"
          style={{
            width: "25%",
            minWidth: "120px",
            maxWidth: "200px",
            aspectRatio: "3/4",
            bottom: "1rem",
            right: "1rem",
            cursor: "pointer",
            zIndex: 10,
            borderColor: "rgba(255, 255, 255, 0.3)",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
            backgroundColor: "#000"
          }}
          onClick={() => {
            // User interaction ensures remote audio can play
            setIsLocalMain((prev) => !prev);
            remoteMainRef.current?.play?.().catch(() => {});
            remotePreviewRef.current?.play?.().catch(() => {});
          }}
        >
          <video
            ref={remotePreviewRef}
            autoPlay
            playsInline
            className={`w-100 h-100 ${isLocalMain ? "" : "d-none"}`}
            style={{ objectFit: "cover" }}
          />
          <video
            ref={localPreviewRef}
            autoPlay
            playsInline
            muted
            className={`w-100 h-100 ${isLocalMain ? "d-none" : ""}`}
            style={{ objectFit: "cover" }}
          />
          <div className="position-absolute bottom-0 start-0 m-1 bg-black bg-opacity-65 text-white px-2 py-0.5 rounded-pill" style={{ fontSize: "10px" }}>
            {isLocalMain ? "Stranger" : "You"}
          </div>
        </div>

        {/* Waiting / Connection overlay */}
        {!remoteStream && !partnerPresent && (
          <div className="d-flex h-100 flex-column align-items-center justify-content-center text-white gap-3 px-3 position-relative" style={{ zIndex: 1, backgroundColor: "rgba(7, 5, 13, 0.75)" }}>
            <div className="spinner-grow text-primary" role="status" style={{ width: "2.5rem", height: "2.5rem" }}>
              <span className="visually-hidden">Syncing...</span>
            </div>
            <div className="fs-6 fw-medium text-muted text-uppercase tracking-wider">
              Waiting for partner stream...
            </div>
          </div>
        )}
      </div>

      {/* Warning/Error alerts */}
      {videoError && (
        <div className="alert alert-danger border-0 rounded-3 mt-3 w-100 text-center small shadow-sm py-2 px-3">
          <i className="bi bi-camera-video-off-fill me-2"></i>
          {videoError}
        </div>
      )}
      {!partnerPresent && (
        <div className="alert alert-warning border-0 rounded-3 mt-3 w-100 text-center small shadow-sm py-2 px-3 bg-opacity-10 bg-warning text-warning">
          <i className="bi bi-chat-square-dots-fill me-2"></i>
          Partner disconnected. Click **Next Match** to continue.
        </div>
      )}
    </div>
  );
}
