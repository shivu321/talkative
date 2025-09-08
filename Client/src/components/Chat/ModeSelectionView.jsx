// src/components/chat/ModeSelectionView.jsx
import React from "react";

export default function ModeSelectionView({
  banner,
  onModeSelect,
  totalOnline,
}) {
  return (
    <div className="d-flex align-items-center justify-content-center flex-grow-1">
      <div
        className="text-center p-4 p-md-5 rounded-3 shadow-sm bg-white"
        style={{ maxWidth: "500px" }}
      >
        <h2 className="mb-4 fw-bold">Select a Mode</h2>
        {banner && <div className="alert alert-info">{banner}</div>}
        <div className="d-grid gap-3 d-sm-flex justify-content-sm-center">
          <button
            className="btn btn-primary btn-lg px-4"
            onClick={() => onModeSelect("chat")}
          >
            Chat Only
          </button>
          <button
            className="btn btn-success btn-lg px-4"
            onClick={() => onModeSelect("video")}
          >
            Video Chat
          </button>
        </div>
        <div
          class="alert alert-warning alert-dismissible fade show pt-5"
          role="alert"
        >
          <strong>Hey Total Stranger Available</strong> For Chat :-{" "}
          {totalOnline}
        </div>
      </div>
    </div>
  );
}
