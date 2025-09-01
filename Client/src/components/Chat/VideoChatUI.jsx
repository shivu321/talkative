import React, { useEffect, useRef, useState } from "react";

export default function VideoChatUI({
  localStream,
  remoteStream,
  videoError,
  partnerPresent,
}) {
  const localRef = useRef();
  const remoteRef = useRef();

  const [isLocalMain, setIsLocalMain] = useState(false);

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
    <div className="w-100 h-100 d-flex flex-column align-items-center">
      <div className="w-100 h-100 bg-dark rounded-3 position-relative shadow-lg overflow-hidden">
        {/* Partner video (always mounted) */}
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          className={`position-absolute top-0 start-0 w-100 h-100 transition-all ${
            isLocalMain ? "d-none" : ""
          }`}
          style={{ objectFit: "cover", cursor: "pointer" }}
          onClick={() => setIsLocalMain(true)}
        />

        {/* Local video (always mounted) */}
        <video
          ref={localRef}
          autoPlay
          muted
          playsInline
          className={`position-absolute top-0 start-0 w-100 h-100 transition-all ${
            isLocalMain ? "" : "d-none"
          }`}
          style={{ objectFit: "cover", cursor: "pointer" }}
          onClick={() => setIsLocalMain(false)}
        />

        {/* Floating small preview */}
        <div
          className="position-absolute border border-2 border-white shadow rounded-3 overflow-hidden bg-black"
          style={{
            width: "25%",
            minWidth: "120px",
            maxWidth: "220px",
            aspectRatio: "3/4",
            bottom: "1rem",
            right: "1rem",
            cursor: "pointer",
          }}
          onClick={() => setIsLocalMain((prev) => !prev)}
        >
          {!isLocalMain && localStream && (
            <video
              ref={localRef}
              autoPlay
              muted
              playsInline
              className="w-100 h-100"
              style={{ objectFit: "cover" }}
            />
          )}

          {isLocalMain && remoteStream && (
            <video
              ref={remoteRef}
              autoPlay
              playsInline
              className="w-100 h-100"
              style={{ objectFit: "cover" }}
            />
          )}
        </div>

        {/* Overlay only when partner is absent */}
        {!remoteStream && !partnerPresent && (
          <div className="d-flex h-100 align-items-center justify-content-center text-white fs-5 text-center">
            Waiting for partner...
          </div>
        )}
      </div>

      {/* Alerts */}
      {videoError && (
        <div className="alert alert-danger mt-2 w-100 text-center small">
          {videoError}
        </div>
      )}
      {!partnerPresent && (
        <div className="alert alert-warning mt-2 w-100 text-center small">
          Partner has left. Click 'Next' or 'End'.
        </div>
      )}
    </div>
  );
}
