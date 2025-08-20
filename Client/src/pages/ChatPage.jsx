// ChatPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../api";
import MessageList from "../components/MessageList";
import VideoBox from "../components/VideoBox";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

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
      remoteStreamRef.current = e.streams?.[0] || null;
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

  // === Render ===

  if (!mode) {
    return (
      <div className="container h-100">
        <div className="row h-100">
          <div
            className="col-12 d-flex flex-column align-items-center justify-content-center"
            style={{ minHeight: "100vh" }}
          >
            <h3 className="text-center">Select Mode</h3>
            {banner && <div className="alert alert-info mt-3">{banner}</div>}
            <div className="mt-3 d-flex flex-wrap justify-content-center">
              <button
                className="btn btn-primary m-2 px-4 py-2"
                onClick={() => handleModeSelect("chat")}
              >
                Chat Only
              </button>
              <button
                className="btn btn-success m-2 px-4 py-2"
                onClick={() => handleModeSelect("video")}
              >
                Video Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === "queued") {
    return (
      <div className="container h-100">
        <div className="row h-100">
          <div
            className="col-12 d-flex flex-column align-items-center justify-content-center"
            style={{ minHeight: "100vh" }}
          >
            <h3 className="text-center">Waiting for a partner...</h3>
            {mode === "video" && (
              <div className="mt-3 w-100" style={{ maxWidth: 720 }}>
                <div className="ratio ratio-16x9 border rounded bg-black">
                  <VideoBox
                    localStream={localStreamRef.current}
                    remoteStream={null}
                  />
                </div>
                {videoError && (
                  <div className="text-danger mt-2">{videoError}</div>
                )}
              </div>
            )}
            {banner && <div className="text-muted mt-2">{banner}</div>}
            <button
              className="btn btn-warning mt-3"
              onClick={handleBackFromQueue}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const canSend = mode === "chat" && partnerPresent && status === "connected";

  return (
    <div className="container-fluid py-3">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <h4 className="mb-2 mb-md-0">
          Anonymous {mode === "video" ? "Video" : "Chat"} Chat
        </h4>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-primary"
            onClick={handleNext}
            disabled={nextBusyRef.current}
          >
            Next
          </button>
          <button className="btn btn-secondary" onClick={handleEnd}>
            End
          </button>
        </div>
      </div>

      {banner && (
        <div className="alert alert-info py-2 px-3 mb-3">{banner}</div>
      )}

      {mode === "video" ? (
        <div className="row">
          <div className="col-12">
            <div className="ratio ratio-16x9 border rounded bg-black">
              <VideoBox
                localStream={localStreamRef.current}
                remoteStream={remoteStreamRef.current}
              />
            </div>
            {videoError && <div className="text-danger mt-2">{videoError}</div>}
            {!partnerPresent && (
              <div className="text-muted small mt-2">
                Partner left. You can End or Next to continue.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="row g-3">
          <div className="col-12 col-lg-10 col-xl-8 mx-auto">
            <div className="card shadow-sm">
              <div className="card-body">
                <MessageList
                  messages={messages}
                  partnerTyping={partnerTyping}
                />
                <div className="mt-2">
                  <div className="d-flex">
                    <button
                      className="btn btn-light me-2"
                      title="Emoji"
                      onClick={() => setShowEmoji((v) => !v)}
                    >
                      😊
                    </button>
                    <input
                      className="form-control"
                      value={input}
                      onChange={(e) => handleTyping(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        canSend &&
                        !sendBusyRef.current &&
                        sendMsg()
                      }
                      placeholder={
                        partnerPresent
                          ? "Type a message..."
                          : "Partner left. End or Next to continue."
                      }
                      disabled={!canSend}
                    />
                    <button
                      className="btn btn-primary ms-2"
                      onClick={sendMsg}
                      disabled={
                        !canSend || !input.trim() || sendBusyRef.current
                      }
                    >
                      Send
                    </button>
                  </div>
                  {showEmoji && (
                    <div className="mt-2" style={{ maxWidth: 360 }}>
                      <Picker
                        data={data}
                        onEmojiSelect={(emoji) =>
                          setInput((prev) => prev + (emoji?.native || ""))
                        }
                        previewPosition="none"
                        searchPosition="top"
                        theme="light"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            {!partnerPresent && (
              <div className="text-muted small mt-2 text-center">
                Partner left. You can End or Next to continue.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
