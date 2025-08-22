// ChatPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../api";
import MessageList from "../components/MessageList"; // You will need to style this component for bubbles
import VideoBox from "../components/VideoBox";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { Helmet } from "react-helmet";

// Lightweight unique id
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export default function ChatPage({ sessionId }) {
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Dedupe and action guards
  const displayedIdsRef = useRef(new Set());
  const sendBusyRef = useRef(false);
  const nextBusyRef = useRef(false);

  const [mode, setMode] = useState(null); // null | 'chat' | 'video'
  const [status, setStatus] = useState("idle"); // idle | queued | connected
  const [roomId, setRoomId] = useState(null);
  const [partnerId, setPartnerId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerPresent, setPartnerPresent] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [banner, setBanner] = useState(null);
  const [videoError, setVideoError] = useState(null);

  // --- NO LOGIC CHANGES BELOW THIS LINE ---
  // Create one socket for the whole lifetime (no session rotation)
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("register", { sessionId });
      setBanner(null);
    });

    socket.on("registered", () => {
      setBanner("Registered. Select a mode to start.");
    });

    socket.on("error", (err) => {
      const msg =
        typeof err === "string" ? err : err?.message || "Unknown error";
      setBanner(`Error: ${msg}`);
    });

    // Queue/match flow
    socket.on("queued", () => {
      setStatus("queued");
      setBanner("Searching for a partner...");
    });

    socket.on("matched", ({ roomId, partnerId, mode: matchedMode }) => {
      // Reset per-match UI
      displayedIdsRef.current.clear();
      setShowEmoji(false);
      setPartnerPresent(true);
      setPartnerTyping(false);
      setMessages([]);
      setBanner(null);
      sendBusyRef.current = false;

      setStatus("connected");
      setRoomId(roomId);
      setPartnerId(partnerId);

      const finalMode = matchedMode || mode;

      if (finalMode === "video") {
        // Deterministic caller to avoid glare
        const meIsCaller = sessionId < partnerId;
        if (meIsCaller) {
          ensureLocalStream()
            .then(() => {
              cleanupPeer();
              createPeerAsCaller(partnerId);
            })
            .catch((e) => {
              setVideoError("Camera/mic permission error.");
              console.error(e);
            });
        }
      }
      nextBusyRef.current = false;
    });

    // Incoming chat message: drop own echo + dedupe by messageId
    socket.on("message", (m) => {
      // 1) Drop my echoed copy from server (we already rendered optimistically)
      if (m?.from && m.from === sessionId) return;

      // 2) Dedupe (prefer messageId if present)
      const id =
        m?.messageId ||
        `${m?.from || ""}-${m?.text || ""}-${m?.createdAt || ""}`;
      if (displayedIdsRef.current.has(id)) return;
      displayedIdsRef.current.add(id);

      setMessages((prev) => [...prev, m]);
    });

    socket.on("typing", ({ typing }) => setPartnerTyping(!!typing));

    socket.on("partner-left", () => {
      setPartnerPresent(false);
      setPartnerTyping(false);
      const sysId = uid();
      displayedIdsRef.current.add(sysId);
      setMessages((prev) => [
        ...prev,
        { sys: true, text: "Partner left.", messageId: sysId },
      ]);
      setBanner("Partner left. You can End or Next to continue.");
      cleanupPeer();
    });

    // WebRTC signaling
    socket.on("webrtc-offer", async ({ from, sdp }) => {
      try {
        await ensureLocalStream();
        await createPeerAsReceiver(from, sdp);
      } catch (e) {
        console.error("Error handling offer:", e);
        setVideoError("Failed to handle incoming offer.");
      }
    });

    socket.on("webrtc-answer", async ({ sdp }) => {
      if (peerRef.current && sdp) {
        await peerRef.current.setRemoteDescription(sdp).catch(console.error);
      }
    });

    socket.on("webrtc-ice", ({ candidate }) => {
      if (peerRef.current && candidate) {
        peerRef.current.addIceCandidate(candidate).catch(console.error);
      }
    });

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      cleanupPeer();
      stopLocalStream();
      socket.disconnect();
    };
  }, [sessionId]);

  // High-quality local media
  const ensureLocalStream = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const st = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 360 },
          frameRate: { ideal: 30, min: 24 },
        },
      });
      localStreamRef.current = st;
      setVideoError(null);
      return st;
    } catch (e) {
      setVideoError("Unable to access camera/microphone.");
      throw e;
    }
  };

  const stopLocalStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks()?.forEach((t) => t.stop?.());
      localStreamRef.current = null;
    }
  };

  // Mode selection (no socket/session rotation)
  const handleModeSelect = async (m) => {
    setMode(m);
    setBanner(null);
    // Reset UI
    setMessages([]);
    setInput("");
    setPartnerPresent(false);
    setPartnerTyping(false);
    displayedIdsRef.current.clear();

    if (m === "video") {
      try {
        await ensureLocalStream();
      } catch {
        return;
      }
    }
    joinQueue(m);
  };

  const joinQueue = (m) => {
    const socket = socketRef.current;
    if (!socket || socket.disconnected) return;
    socket.emit("joinQueue", { sessionId, mode: m });
  };

  // End: back to selection, stop peer + camera (keep same session/socket)
  const handleEnd = () => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit("endChat");
      socket.emit("next");
      socket.emit("leaveQueue");
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    cleanupPeer();
    stopLocalStream();

    setStatus("idle");
    setRoomId(null);
    setPartnerId(null);
    setPartnerPresent(false);
    setMode(null);
    setBanner("Chat ended. Choose a mode to start again.");
    setShowEmoji(false);
    displayedIdsRef.current.clear();
    sendBusyRef.current = false;
    nextBusyRef.current = false;
  };

  // Next: requeue; keep camera (video) for speed
  const handleNext = () => {
    if (nextBusyRef.current) return;
    nextBusyRef.current = true;

    const socket = socketRef.current;
    if (!socket || socket.disconnected) {
      nextBusyRef.current = false;
      return;
    }
    cleanupPeer();
    setMessages([]);
    setInput("");
    setStatus("idle");
    setRoomId(null);
    setPartnerId(null);
    setPartnerPresent(false);
    setPartnerTyping(false);
    setBanner("Searching for a new partner...");
    displayedIdsRef.current.clear();
    socket.emit("next");
  };

  // Send message with messageId; optimistic render; drop echo
  const sendMsg = () => {
    const text = input.trim();
    if (!text || !roomId || !partnerPresent) return;
    if (sendBusyRef.current) return;
    sendBusyRef.current = true;

    const socket = socketRef.current;
    const messageId = uid();
    // Optimistic add and mark as displayed
    displayedIdsRef.current.add(messageId);
    setMessages((prev) => [
      ...prev,
      { from: "me", text, messageId, createdAt: new Date().toISOString() },
    ]);

    setInput("");
    setShowEmoji(false);
    socket.emit("typing", { roomId, typing: false });
    socket.emit("message", { roomId, text, messageId });

    setTimeout(() => {
      sendBusyRef.current = false;
    }, 120);
  };

  const handleTyping = (v) => {
    setInput(v);
    if (!roomId || !partnerPresent) return;
    const socket = socketRef.current;
    socket.emit("typing", { roomId, typing: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", { roomId, typing: false });
      typingTimeoutRef.current = null;
    }, 800);
  };

  // WebRTC
  const createPeerBase = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        ...(import.meta.env.VITE_TURN_URL
          ? [
              {
                urls: import.meta.env.VITE_TURN_URL,
                username: import.meta.env.VITE_TURN_USER,
                credential: import.meta.env.VITE_TURN_PASS,
              },
            ]
          : []),
      ],
    });
    peerRef.current = pc;
    pc.ontrack = (e) => {
      // Find the remote stream and update the state to trigger a re-render
      const remote = e.streams?.[0] || null;
      if (remote) {
        remoteStreamRef.current = remote;
        // Force a re-render to show the remote stream
        setPartnerId((p) => p);
      }
    };
    return pc;
  };

  const createPeerAsCaller = async (toPartnerId) => {
    try {
      const pc = createPeerBase();
      const localStream = localStreamRef.current || (await ensureLocalStream());
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
      pc.onicecandidate = (e) => {
        if (e.candidate)
          socketRef.current.emit("webrtc-ice", {
            to: toPartnerId,
            candidate: e.candidate,
          });
      };
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      socketRef.current.emit("webrtc-offer", {
        to: toPartnerId,
        sdp: pc.localDescription,
      });
    } catch (e) {
      console.error("webrtc caller err", e);
      setVideoError("Failed to start call.");
    }
  };

  const createPeerAsReceiver = async (from, remoteSdp) => {
    try {
      const pc = createPeerBase();
      const localStream = localStreamRef.current || (await ensureLocalStream());
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
      pc.onicecandidate = (e) => {
        if (e.candidate)
          socketRef.current.emit("webrtc-ice", {
            to: from,
            candidate: e.candidate,
          });
      };
      await pc.setRemoteDescription(remoteSdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit("webrtc-answer", {
        to: from,
        sdp: pc.localDescription,
      });
    } catch (e) {
      console.error("webrtc receiver err", e);
      setVideoError("Failed to answer call.");
    }
  };

  const cleanupPeer = () => {
    if (peerRef.current) {
      try {
        peerRef.current.getSenders?.().forEach((s) => s.track?.stop?.());
        peerRef.current.getReceivers?.().forEach((r) => r.track?.stop?.());
      } catch {}
      try {
        peerRef.current.close();
      } catch {}
      peerRef.current = null;
    }
    remoteStreamRef.current = null;
  };

  // Back from queue to selection (no session/socket changes)
  const handleBackFromQueue = () => {
    socketRef.current?.emit("leaveQueue");
    if (mode === "video") stopLocalStream();
    setMode(null);
    setStatus("idle");
    setBanner("Left queue. Choose a mode to start.");
    setMessages([]);
    setInput("");
    setPartnerPresent(false);
    setPartnerTyping(false);
    displayedIdsRef.current.clear();
    sendBusyRef.current = false;
    nextBusyRef.current = false;
  };

  // --- UI/RENDER SECTION (IMPROVED) ---

  if (!mode) {
    return (
      <div className="container d-flex align-items-center justify-content-center vh-100">
        <div className="text-center p-4 rounded-3 shadow-sm bg-light">
          <h2 className="mb-4">Select a Mode</h2>
          {banner && <div className="alert alert-info">{banner}</div>}
          <div className="d-grid gap-3 d-sm-flex justify-content-sm-center">
            <button
              className="btn btn-primary btn-lg px-4"
              onClick={() => handleModeSelect("chat")}
            >
              Chat Only
            </button>
            <button
              className="btn btn-success btn-lg px-4"
              onClick={() => handleModeSelect("video")}
            >
              Video Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "queued") {
    return (
      <div className="container d-flex flex-column align-items-center justify-content-center vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h3 className="mb-3">Waiting for a partner...</h3>
          {mode === "video" && (
            <div className="mt-4 w-100" style={{ maxWidth: 640 }}>
              <div className="ratio ratio-16x9 bg-dark rounded-3 shadow-sm overflow-hidden">
                <VideoBox localStream={localStreamRef.current} muted />
                <div className="position-absolute top-0 start-0 m-2 badge bg-secondary">
                  You
                </div>
              </div>
              {videoError && (
                <div className="alert alert-danger mt-2 ">{videoError}</div>
              )}
            </div>
          )}
          {banner && <div className="text-muted mt-3">{banner}</div>}
          <button
            className="btn btn-outline-secondary mt-4"
            onClick={handleBackFromQueue}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const canSend = mode === "chat" && partnerPresent && status === "connected";

  return (
    <div
      className="container-fluid py-3 d-flex flex-column"
      style={{ height: "100vh" }}
    >
      <Helmet>
        <title>Anonymous Chat with Strangers - Omegle Alternative</title>
        <meta
          name="description"
          content="Start a free and anonymous video or text chat with random strangers instantly. A simple, fast, and fun alternative to Omegle."
        />
        <meta
          name="keywords"
          content="omegle, anonymous chat, video chat, random chat, chat with strangers, free chat"
        />
        {/* Sets the canonical URL to the current page */}
        <link rel="canonical" href={window.location.href} />
      </Helmet>
      <div className="row">
        <div className="col-lg-7 col-md-7 col-sm-12 col-xs-12">
          {/* Header */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-3 pb-3 border-bottom">
            <h4 className="mb-2 mb-md-0">
              Anonymous {mode === "video" ? "Video" : "Chat"}
            </h4>
            <div className="btn-group" role="group">
              <button
                className="btn btn-success"
                onClick={handleNext}
                disabled={nextBusyRef.current}
              >
                {nextBusyRef.current ? "Finding..." : "Next"}
              </button>
              <button className="btn btn-danger" onClick={handleEnd}>
                End
              </button>
            </div>
          </div>

          {banner && <div className="alert alert-info py-2 mb-3">{banner}</div>}

          {/* Main Content Area */}
          <main className="flex-grow-1">
            {mode === "video" ? (
              // --- VIDEO CHAT UI ---
              <div className="d-flex justify-content-center align-items-center h-100">
                <div
                  className="w-100 h-100"
                  style={{ maxWidth: "1280px", maxHeight: "720px" }}
                >
                  <div className="ratio ratio-16x9 bg-dark rounded-3 position-relative shadow-lg overflow-hidden">
                    {/* Partner's Video */}
                    <VideoBox remoteStream={remoteStreamRef.current} />
                    {!remoteStreamRef.current && (
                      <div className="d-flex align-items-center justify-content-center text-white">
                        {partnerPresent
                          ? "Connecting to partner..."
                          : "Waiting for partner..."}
                      </div>
                    )}
                    <span className="position-absolute top-0 start-0 m-2 badge bg-success fs-6">
                      Partner
                    </span>

                    {/* Local Video (PiP) */}
                    {localStreamRef.current && (
                      <div
                        className="position-absolute end-0 bottom-0 m-3 border border-2 border-white shadow rounded-3 overflow-hidden bg-black"
                        style={{
                          width: "25%",
                          minWidth: "150px",
                          maxWidth: "240px",
                        }}
                      >
                        <div className="ratio ratio-16x9">
                          <VideoBox
                            localStream={localStreamRef.current}
                            muted
                          />
                        </div>
                        <span className="position-absolute top-0 start-0 m-1 badge bg-secondary">
                          You
                        </span>
                      </div>
                    )}
                  </div>
                  {videoError && (
                    <div className="alert alert-danger mt-2">{videoError}</div>
                  )}
                  {!partnerPresent && (
                    <div className="alert alert-warning small mt-2">
                      Partner has left. You can click 'Next' to find someone
                      else or 'End' the session.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // --- TEXT CHAT UI ---
              <div className="row justify-content-center h-100">
                <div className="col-12 col-md-10 col-lg-8 d-flex flex-column h-100">
                  <div className="card shadow-sm flex-grow-1">
                    <div className="card-body d-flex flex-column p-2 p-md-3">
                      <div className="flex-grow-1 mb-3">
                        <MessageList
                          messages={messages}
                          partnerTyping={partnerTyping}
                        />
                      </div>

                      <div className="mt-auto">
                        <div className="position-relative">
                          {showEmoji && (
                            <div className="position-absolute bottom-100 mb-2">
                              <Picker
                                data={data}
                                onEmojiSelect={(emoji) =>
                                  setInput(
                                    (prev) => prev + (emoji?.native || "")
                                  )
                                }
                                previewPosition="none"
                                theme="light"
                              />
                            </div>
                          )}
                          <div className="d-flex align-items-center gap-2">
                            <button
                              className="btn btn-light rounded-circle flex-shrink-0"
                              onClick={() => setShowEmoji((v) => !v)}
                            >
                              😊
                            </button>
                            <input
                              className="form-control rounded-pill"
                              value={input}
                              onChange={(e) => handleTyping(e.target.value)}
                              onKeyDown={(e) =>
                                e.key === "Enter" &&
                                !sendBusyRef.current &&
                                canSend &&
                                sendMsg()
                              }
                              placeholder={
                                canSend
                                  ? "Type a message..."
                                  : "Partner has left."
                              }
                              disabled={!canSend}
                            />
                            <button
                              className="btn btn-primary rounded-circle flex-shrink-0"
                              onClick={sendMsg}
                              disabled={
                                !canSend || !input.trim() || sendBusyRef.current
                              }
                              style={{
                                width: "40px",
                                height: "40px",
                                paddingTop: "0.1rem",
                              }}
                            >
                              ➤
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
        <div className="col-lg-5 col-md-5 col-sm-12 col-xs-12">
          <img src={"../src/assest/add.svg"} alt="Chatting illustration" />
        </div>
      </div>
    </div>
  );
}
