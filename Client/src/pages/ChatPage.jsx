// src/pages/ChatPage.jsx

import React, { useEffect, useRef, useState, Suspense } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../api";

// Import the new child components
import ModeSelectionView from "../components/chat/ModeSelectionView";
import QueueView from "../components/chat/QueueView";
import ChatView from "../components/chat/ChatView";

// Lightweight unique id
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export default function ChatPage({ sessionId }) {
  // All state and refs remain here in the parent component
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const displayedIdsRef = useRef(new Set());
  const sendBusyRef = useRef(false);
  const nextBusyRef = useRef(false);
  const [mode, setMode] = useState(null);
  const [status, setStatus] = useState("idle");
  const [roomId, setRoomId] = useState(null);
  const [partnerId, setPartnerId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerPresent, setPartnerPresent] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [banner, setBanner] = useState(null);
  const [videoError, setVideoError] = useState(null);
  const [messageFlag, SetMessageFlag] = useState(false);
  const [validationMessage, SetValidationMessage] = useState("");

  // All logic (functions) also remains in the parent
  const validateChatMessage = (input) => {
    const text = input.trim();
    const digitRegex = /\d/;
    const numberWords = /\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/i;
    const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|facebook\.com|instagram\.com|twitter\.com|x\.com|linkedin\.com|snapchat\.com|t\.co|bit\.ly|youtu\.be|youtube\.com|telegram\.me|wa\.me|whatsapp\.com|discord\.gg)/i;
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/i;
    const phoneRegex = /\b(?:\+?\d{1,3}[-.\s]?)?(?:\d[-.\s]?){8,}\d\b/;

    if (digitRegex.test(text)) return { flag: true, message: "❌ Numbers are not allowed." };
    if (numberWords.test(text)) return { flag: true, message: "❌ Numbers in words (One–Ten) are not allowed." };
    if (linkRegex.test(text)) return { flag: true, message: "❌ Links and social media are not allowed." };
    if (emailRegex.test(text)) return { flag: true, message: "❌ Email addresses are not allowed." };
    if (phoneRegex.test(text)) return { flag: true, message: "❌ Phone numbers are not allowed." };
    return { flag: false, message: "" };
  };

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.on("connect", () => {
      socket.emit("register", { sessionId });
      setBanner(null);
    });
    socket.on("registered", () => setBanner("Registered. Select a mode to start."));
    socket.on("error", (err) => {
      const msg = typeof err === "string" ? err : err?.message || "Unknown error";
      setBanner(`Error: ${msg}`);
    });
    socket.on("queued", () => {
      setStatus("queued");
      setBanner("Searching for a partner...");
    });
    socket.on("matched", ({ roomId, partnerId, mode: matchedMode }) => {
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
    socket.on("message", (m) => {
      if (m?.from && m.from === sessionId) return;
      const id = m?.messageId || `${m?.from || ""}-${m?.text || ""}-${m?.createdAt || ""}`;
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
      setMessages((prev) => [...prev, { sys: true, text: "Partner left.", messageId: sysId }]);
      setBanner("Partner left. You can End or Next to continue.");
      cleanupPeer();
    });
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

  const ensureLocalStream = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const st = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: { width: { ideal: 1280, min: 640 }, height: { ideal: 720, min: 360 }, frameRate: { ideal: 30, min: 24 } },
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

  const handleModeSelect = async (m) => {
    setMode(m);
    setBanner(null);
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

  const sendMsg = () => {
    const text = input.trim();
    if (!text || !roomId || !partnerPresent) return;
    if (sendBusyRef.current) return;
    sendBusyRef.current = true;
    const socket = socketRef.current;
    const messageId = uid();
    displayedIdsRef.current.add(messageId);
    setMessages((prev) => [...prev, { from: "me", text, messageId, createdAt: new Date().toISOString() }]);
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

  const createPeerBase = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        ...(import.meta.env.VITE_TURN_URL
          ? [{ urls: import.meta.env.VITE_TURN_URL, username: import.meta.env.VITE_TURN_USER, credential: import.meta.env.VITE_TURN_PASS }]
          : []),
      ],
    });
    peerRef.current = pc;
    pc.ontrack = (e) => {
      const remote = e.streams?.[0] || null;
      if (remote) {
        remoteStreamRef.current = remote;
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
        if (e.candidate) socketRef.current.emit("webrtc-ice", { to: toPartnerId, candidate: e.candidate });
      };
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      socketRef.current.emit("webrtc-offer", { to: toPartnerId, sdp: pc.localDescription });
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
        if (e.candidate) socketRef.current.emit("webrtc-ice", { to: from, candidate: e.candidate });
      };
      await pc.setRemoteDescription(remoteSdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit("webrtc-answer", { to: from, sdp: pc.localDescription });
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

  const renderContent = () => {
    if (status === "queued") {
      return (
        <QueueView
          banner={banner}
          mode={mode}
          localStream={localStreamRef.current}
          videoError={videoError}
          onBack={handleBackFromQueue}
        />
      );
    }
    if (status === "connected") {
      const chatViewProps = {
        mode, banner, handleNext, handleEnd, nextBusyRef: nextBusyRef.current,
        localStream: localStreamRef.current, remoteStream: remoteStreamRef.current,
        videoError, partnerPresent, messages, partnerTyping, input, showEmoji,
        canSend: mode === "chat" && partnerPresent && status === "connected",
        handleTyping, sendMsg, setShowEmoji, sendBusyRef: sendBusyRef.current,
        validateChatMessage, setInput, messageFlag, SetMessageFlag, validationMessage, SetValidationMessage,
      };
      return <ChatView {...chatViewProps} />;
    }
    // Default: status === 'idle'
    return <ModeSelectionView banner={banner} onModeSelect={handleModeSelect} />;
  };

  return (
    <div className="container-fluid d-flex flex-column" style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}>
      {renderContent()}
    </div>
  );
}
