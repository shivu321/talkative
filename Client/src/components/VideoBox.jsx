// VideoBox.jsx
import React, { useEffect, useRef } from "react";

export default function VideoBox({ localStream, remoteStream }) {
  const localRef = useRef();
  const remoteRef = useRef();

  useEffect(() => {
    if (localRef.current && localStream) {
      localRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteRef.current && remoteStream) {
      remoteRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    // Use Bootstrap's responsive grid system
    <div className="row g-2">
      {/* Local Video Column */}
      <div className="col-12 col-md-6">
        {/* Use Bootstrap's ratio helper to maintain a 16:9 aspect ratio */}
        <div className="ratio ratio-16x9 rounded overflow-hidden bg-black">
          <video
            ref={localRef}
            autoPlay
            muted
            playsInline
            // The video will fill the container, no fixed width needed
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
        <div className="text-center small mt-2">You</div>
      </div>

      {/* Remote Video Column */}
      <div className="col-12 col-md-6">
        <div className="ratio ratio-16x9 rounded overflow-hidden bg-black">
          <video
            ref={remoteRef}
            autoPlay
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
        <div className="text-center small mt-2">Stranger</div>
      </div>
    </div>
  );
}
