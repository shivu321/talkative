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
    <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 text-center p-3">
      {/* Spinner */}
      <div
        className="spinner-border text-primary mb-3"
        role="status"
        style={{ width: "3rem", height: "3rem" }}
      >
        <span className="visually-hidden">Loading...</span>
      </div>

      <h3 className="mb-4">Waiting for a partner...</h3>

      {/* Video preview */}
      {mode === "video" && (
        <div className="w-100" style={{ maxWidth: 640 }}>
          <div className="position-relative ratio ratio-16x9 bg-dark rounded-3 shadow overflow-hidden">
            {/* Local video */}
            <VideoBox localStream={localStream} muted />

            {/* "You" badge */}
            <div className="position-absolute top-0 start-0 m-2 badge bg-secondary">
              You
            </div>
          </div>

          {/* Video error */}
          {videoError && (
            <div className="alert alert-danger mt-2">{videoError}</div>
          )}
        </div>
      )}

      {/* Banner */}
      {banner && <div className="text-muted mt-3">{banner}</div>}

      {/* Cancel button */}
      <button className="btn btn-outline-secondary mt-4" onClick={onBack}>
        Cancel
      </button>
    </div>
  );
}
