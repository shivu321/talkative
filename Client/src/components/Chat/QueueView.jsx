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
    <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 text-center">
      <div
        className="spinner-border text-primary mb-3"
        role="status"
        style={{ width: "3rem", height: "3rem" }}
      >
        <span className="visually-hidden">Loading...</span>
      </div>
      <h3 className="mb-3">Waiting for a partner...</h3>
      {mode === "video" && (
        <div className="mt-4 w-100" style={{ maxWidth: 640 }}>
          <div className="ratio ratio-16x9 bg-dark rounded-3 shadow-sm overflow-hidden">
            <VideoBox localStream={localStream} muted />
          </div>
          {videoError && (
            <div className="alert alert-danger mt-2">{videoError}</div>
          )}
        </div>
      )}
      {banner && <div className="text-muted mt-3">{banner}</div>}
      <button className="btn btn-outline-secondary mt-4" onClick={onBack}>
        Cancel
      </button>
    </div>
  );
}
