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
      if (el) {
        el.srcObject = localStream || null;
        el.muted = true;
        el.play?.().catch(() => {});
      }
    });
  }, [localStream]);

  // Attach REMOTE stream
  useEffect(() => {
    if (!remoteStream) return;

    [remoteMainRef.current, remotePreviewRef.current].forEach((el) => {
      if (el) {
        // Important: reset srcObject first
        el.srcObject = null;
        el.srcObject = remoteStream;
        el.play?.().catch(() => {});
      }
    });
  }, [remoteStream]);

  // Control which remote video outputs audio
  useEffect(() => {
    if (!remoteMainRef.current || !remotePreviewRef.current) return;

    remoteMainRef.current.muted = isLocalMain;
    remotePreviewRef.current.muted = !isLocalMain;

    // Ensure the visible remote video plays
    const activeRemote = isLocalMain
      ? remotePreviewRef.current
      : remoteMainRef.current;
    activeRemote?.play?.().catch(() => {});
  }, [isLocalMain, remoteStream]);

  return (
    <div className="w-100 h-100 d-flex flex-column align-items-center">
      <div className="w-100 h-100 bg-dark rounded-3 position-relative shadow-lg overflow-hidden">
        {/* Main videos */}
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

        {/* Small floating preview */}
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
        </div>

        {/* Waiting overlay */}
        {!remoteStream && !partnerPresent && (
          <div className="d-flex h-100 align-items-center justify-content-center text-white fs-5">
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
