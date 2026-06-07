import React, { useEffect, useRef } from "react";

export default function VideoBox({ localStream, remoteStream, videoError }) {
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
    <div className="position-relative w-100 h-100 bg-black rounded overflow-hidden">
      {/* Remote video (partner) */}
      {remoteStream ? (
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div className="d-flex justify-content-center align-items-center text-white h-100">
          Waiting for stranger...
        </div>
      )}

      {/* Local video (you) */}
      {localStream && !videoError && (
        <div
          className="position-absolute bottom-0 end-0 m-3 border border-2 border-white rounded overflow-hidden bg-black shadow"
          style={{ width: "25%", minWidth: "150px", maxWidth: "240px" }}
        >
          <video
            ref={localRef}
            autoPlay
            muted
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}

      {/* Error case */}
      {videoError && (
        <div className="position-absolute top-50 start-50 translate-middle text-danger bg-dark bg-opacity-75 px-3 py-2 rounded">
          {videoError}
        </div>
      )}
    </div>
  );
}
