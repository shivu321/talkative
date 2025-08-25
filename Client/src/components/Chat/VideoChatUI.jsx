// src/components/chat/VideoChatUI.jsx
import React from 'react';
import VideoBox from '../VideoBox';

export default function VideoChatUI({ localStream, remoteStream, videoError, partnerPresent }) {
  return (
    <div className="w-100 h-100 d-flex justify-content-center align-items-center">
      <div className="w-100 h-100 ratio ratio-16x9 bg-dark rounded-3 position-relative shadow-lg overflow-hidden">
        <VideoBox remoteStream={remoteStream} />
        {!remoteStream && (
          <div className="d-flex h-100 align-items-center justify-content-center text-white">
            {partnerPresent ? "Connecting to partner's video..." : "Waiting for partner..."}
          </div>
        )}
        <span className="position-absolute top-0 start-0 m-2 badge bg-success fs-6">Partner</span>
        {localStream && (
          <div className="position-absolute end-0 bottom-0 m-3 border border-2 border-white shadow rounded-3 overflow-hidden bg-black" style={{ width: "25%", minWidth: "150px", maxWidth: "240px" }}>
            <div className="ratio ratio-16x9">
              <VideoBox localStream={localStream} muted />
            </div>
            <span className="position-absolute top-0 start-0 m-1 badge bg-secondary">You</span>
          </div>
        )}
      </div>
      {videoError && <div className="alert alert-danger mt-2">{videoError}</div>}
      {!partnerPresent && <div className="alert alert-warning small mt-2">Partner has left. Click 'Next' or 'End'.</div>}
    </div>
  );
}
