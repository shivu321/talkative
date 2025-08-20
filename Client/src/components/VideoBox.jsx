import React, { useEffect, useRef } from "react";

export default function VideoBox({ localStream, remoteStream }) {
  const localRef = useRef();
  const remoteRef = useRef();

  useEffect(() => {
    if (localRef.current && localStream)
      localRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteRef.current && remoteStream)
      remoteRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  return (
    <div className="d-flex gap-2">
      <div>
        <video
          ref={localRef}
          autoPlay
          muted
          playsInline
          style={{ width: "250px", borderRadius: 8, background: "#000" }}
        />
        <div className="text-center small">You</div>
      </div>
      <div>
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          style={{ width: "250px", borderRadius: 8, background: "#000" }}
        />
        <div className="text-center small">Stranger</div>
      </div>
    </div>
  );
}
