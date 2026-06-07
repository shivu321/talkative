// src/components/chat/QueueView.jsx
import React, { useState, useEffect } from "react";

export default function QueueView({
  banner,
  mode,
  localStream,
  videoError,
  onBack,
}) {
  const [webcamFilter, setWebcamFilter] = useState("normal");
  const [cameraActive, setCameraActive] = useState(true);
  const [micActive, setMicActive] = useState(true);
  
  // Simulated scanning telemetry text
  const [telemetry, setTelemetry] = useState({
    fps: 30,
    bitrate: 1850,
    peers: 42,
    matchingRate: 92,
  });

  // Keep camera and mic states in sync with tracks when stream changes
  useEffect(() => {
    if (localStream) {
      const vTrack = localStream.getVideoTracks()?.[0];
      const aTrack = localStream.getAudioTracks()?.[0];
      if (vTrack) setCameraActive(vTrack.enabled);
      if (aTrack) setMicActive(aTrack.enabled);
    }
  }, [localStream]);

  // Simulate updates to telemetry values to make it look alive
  useEffect(() => {
    const timer = setInterval(() => {
      setTelemetry((prev) => ({
        fps: Math.floor(28 + Math.random() * 4),
        bitrate: Math.floor(1750 + Math.random() * 200),
        peers: Math.max(12, prev.peers + (Math.random() > 0.5 ? 1 : -1)),
        matchingRate: Math.floor(88 + Math.random() * 10),
      }));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleCamera = () => {
    if (localStream) {
      const vTrack = localStream.getVideoTracks()?.[0];
      if (vTrack) {
        vTrack.enabled = !vTrack.enabled;
        setCameraActive(vTrack.enabled);
      }
    }
  };

  const handleToggleMic = () => {
    if (localStream) {
      const aTrack = localStream.getAudioTracks()?.[0];
      if (aTrack) {
        aTrack.enabled = !aTrack.enabled;
        setMicActive(aTrack.enabled);
      }
    }
  };

  const handleCycleFilter = () => {
    const filters = ["normal", "neon", "cyber", "retro"];
    const currentIdx = filters.indexOf(webcamFilter);
    const nextIdx = (currentIdx + 1) % filters.length;
    setWebcamFilter(filters[nextIdx]);
  };

  const getFilterStyle = () => {
    switch (webcamFilter) {
      case "neon":
        return "contrast(1.2) saturate(1.8) hue-rotate(45deg) brightness(1.1)";
      case "cyber":
        return "contrast(1.35) saturate(1.6) sepia(0.15) hue-rotate(-85deg)";
      case "retro":
        return "grayscale(1) contrast(1.3) sepia(0.05)";
      case "normal":
      default:
        return "none";
    }
  };

  return (
    <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 text-center py-4 px-3" style={{ color: "var(--text-main)" }}>
      
      {/* Radar Ring Scan Animation */}
      <div className="radar-container mb-4">
        <div className="radar-dot"></div>
        <div className="radar-ring"></div>
        <div className="radar-ring"></div>
        <div className="radar-ring"></div>
      </div>

      <h3 className="mb-2 fw-bold tracking-tight" style={{ fontSize: "1.75rem" }}>
        Searching for a Stranger...
      </h3>
      <p className="text-muted small mb-4" style={{ maxWidth: "360px" }}>
        Connecting you with the best match. This usually takes just a few seconds.
      </p>

      {mode === "video" && (
        <div className="mt-1 mb-4 w-100" style={{ maxWidth: 540 }}>
          <div className="glass-panel p-2.5 rounded-4 shadow-2xl border" style={{ borderColor: "var(--glass-border)" }}>
            <div 
              className="ratio ratio-16x9 bg-black rounded-3 overflow-hidden position-relative"
              style={{ boxShadow: "inset 0 0 30px rgba(0,0,0,0.8)" }}
            >
              {localStream && cameraActive ? (
                <video
                  ref={(el) => {
                    if (el) {
                      el.srcObject = localStream;
                      el.muted = true;
                      el.play?.().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  style={{ 
                    width: "100%", 
                    height: "100%", 
                    objectFit: "cover",
                    filter: getFilterStyle(),
                    transition: "filter 0.3s ease",
                  }}
                />
              ) : (
                <div className="d-flex flex-column justify-content-center align-items-center text-white h-100 gap-2" style={{ background: "radial-gradient(circle, #15102a 0%, #07050d 100%)" }}>
                  <div 
                    style={{ 
                      width: "60px", 
                      height: "60px", 
                      borderRadius: "50%", 
                      background: "rgba(255,255,255,0.05)", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      border: "1px solid rgba(255,255,255,0.1)"
                    }}
                  >
                    <i className="bi bi-camera-video-off text-muted" style={{ fontSize: "1.5rem" }}></i>
                  </div>
                  <span className="text-muted small">Camera is turned off</span>
                </div>
              )}

              {/* Futuristic Scanning Overlay HUD */}
              {cameraActive && localStream && (
                <>
                  {/* Neon Scanning line */}
                  <div className="scan-line"></div>

                  {/* Corner targets */}
                  <div className="hud-corner top-left"></div>
                  <div className="hud-corner top-right"></div>
                  <div className="hud-corner bottom-left"></div>
                  <div className="hud-corner bottom-right"></div>

                  {/* Telemetry data overlays */}
                  <div 
                    className="position-absolute d-flex flex-column text-start gap-1 font-monospace small" 
                    style={{ 
                      top: "12px", 
                      right: "12px", 
                      color: "#10b981", 
                      fontSize: "9px", 
                      textShadow: "0 0 4px rgba(16,185,129,0.5)",
                      zIndex: 3 
                    }}
                  >
                    <span>FPS: {telemetry.fps}</span>
                    <span>BITRATE: {telemetry.bitrate} kb/s</span>
                    <span>MATCHING RATE: {telemetry.matchingRate}%</span>
                    <span>ONLINE CHANNELS: {telemetry.peers}</span>
                  </div>

                  <div 
                    className="position-absolute d-flex flex-column text-start gap-1 font-monospace small" 
                    style={{ 
                      bottom: "12px", 
                      left: "12px", 
                      color: "#60a5fa", 
                      fontSize: "9px", 
                      textShadow: "0 0 4px rgba(96,165,250,0.5)",
                      zIndex: 3 
                    }}
                  >
                    <span>SYS_STATUS: ACTIVE_QUEUE</span>
                    <span>CIPHER: AES-GCM-256</span>
                    <span>SCAN: MODE_VIDEO_MATCH</span>
                  </div>
                </>
              )}

              {/* Status Header Badge */}
              <div className="position-absolute top-0 start-0 m-3 badge bg-dark bg-opacity-75 px-3 py-2 border border-secondary border-opacity-50 text-white rounded-pill small d-flex align-items-center gap-2" style={{ zIndex: 3 }}>
                <span 
                  className={`d-inline-block rounded-circle ${cameraActive && localStream ? 'bg-danger animate-blink' : 'bg-secondary'}`} 
                  style={{ width: '8px', height: '8px' }}
                ></span>
                <span>Camera Preview {webcamFilter !== "normal" && `(${webcamFilter.toUpperCase()})`}</span>
              </div>

              {/* Interactive In-Preview Controls */}
              <div 
                className="position-absolute start-50 translate-middle-x d-flex gap-2" 
                style={{ 
                  bottom: "16px", 
                  zIndex: 4,
                  background: "rgba(0,0,0,0.45)",
                  backdropFilter: "blur(8px)",
                  padding: "6px 12px",
                  borderRadius: "30px",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {/* Camera Toggle */}
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  className={`btn btn-sm rounded-circle d-flex align-items-center justify-content-center border-0`}
                  style={{ 
                    width: "32px", 
                    height: "32px", 
                    background: cameraActive ? "rgba(255,255,255,0.12)" : "rgba(239, 68, 68, 0.2)",
                    color: cameraActive ? "#fff" : "#ef4444",
                    transition: "all 0.2s",
                  }}
                  title={cameraActive ? "Turn Camera Off" : "Turn Camera On"}
                >
                  <i className={cameraActive ? "bi bi-camera-video-fill" : "bi bi-camera-video-off-fill"}></i>
                </button>

                {/* Mic Toggle */}
                <button
                  type="button"
                  onClick={handleToggleMic}
                  className={`btn btn-sm rounded-circle d-flex align-items-center justify-content-center border-0`}
                  style={{ 
                    width: "32px", 
                    height: "32px", 
                    background: micActive ? "rgba(255,255,255,0.12)" : "rgba(239, 68, 68, 0.2)",
                    color: micActive ? "#fff" : "#ef4444",
                    transition: "all 0.2s",
                  }}
                  title={micActive ? "Mute Mic" : "Unmute Mic"}
                >
                  <i className={micActive ? "bi bi-mic-fill" : "bi bi-mic-mute-fill"}></i>
                </button>

                {/* Filter Switcher */}
                {cameraActive && localStream && (
                  <button
                    type="button"
                    onClick={handleCycleFilter}
                    className="btn btn-sm rounded-circle d-flex align-items-center justify-content-center border-0"
                    style={{ 
                      width: "32px", 
                      height: "32px", 
                      background: "rgba(255,255,255,0.12)",
                      color: "#fff",
                      transition: "all 0.2s",
                    }}
                    title="Change Camera Filter"
                  >
                    <i className="bi bi-magic"></i>
                  </button>
                )}
              </div>

            </div>
          </div>
          {videoError && (
            <div className="alert alert-danger border-0 rounded-pill mt-3 px-4 shadow-sm small">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {videoError}
            </div>
          )}
        </div>
      )}

      {banner && (
        <div className="text-muted small mt-2 px-3 py-2 bg-white bg-opacity-5 rounded-pill border border-white border-opacity-5 shadow-sm">
          {banner}
        </div>
      )}

      <button 
        className="btn btn-outline-light py-3 px-5 rounded-pill mt-5 shadow-sm text-uppercase fw-bold tracking-wide" 
        onClick={onBack}
        style={{ fontSize: "0.85rem", letterSpacing: "1px", border: "1.5px solid rgba(255, 255, 255, 0.4)" }}
      >
        Cancel Search
      </button>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        .animate-blink {
          animation: blink 1.5s infinite;
        }
        
        /* Laser Sweep Line Animation */
        @keyframes sweep {
          0% { top: 0%; opacity: 0.1; }
          5% { opacity: 0.8; }
          50% { opacity: 0.8; }
          95% { opacity: 0.8; }
          100% { top: 100%; opacity: 0.1; }
        }
        .scan-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(16,185,129,0.7), transparent);
          box-shadow: 0 0 8px rgba(16,185,129,0.6);
          animation: sweep 3.5s infinite linear;
          z-index: 2;
        }

        /* HUD Target Corners */
        .hud-corner {
          position: absolute;
          width: 15px;
          height: 15px;
          border: 1.5px solid rgba(255,255,255,0.35);
          z-index: 2;
        }
        .top-left { top: 12px; left: 12px; border-right: none; border-bottom: none; }
        .top-right { top: 12px; right: 12px; border-left: none; border-bottom: none; }
        .bottom-left { bottom: 12px; left: 12px; border-right: none; border-top: none; }
        .bottom-right { bottom: 12px; right: 12px; border-left: none; border-top: none; }
      `}</style>
    </div>
  );
}
