// src/pages/ChatPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../api";

import ModeSelectionView from "../components/Chat/ModeSelectionView";
import QueueView from "../components/Chat/QueueView";
import ChatView from "../components/Chat/ChatView";

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export default function ChatPage({ sessionId }) {
  const socketRef = useRef(null);
  const peerRef = useRef(null);

  const localStreamRef = useRef(null);
  const [localStreamState, setLocalStreamState] = useState(null);

  const remoteStreamRef = useRef(null);
  const [remoteStreamState, setRemoteStreamState] = useState(null);

  const typingTimeoutRef = useRef(null);
  const displayedIdsRef = useRef(new Set());
  const sendBusyRef = useRef(false);
  const nextBusyRef = useRef(false);
  const [totalOnline,SetTotalOnline] = useState(0);
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

  // -----------------------------------------
  // Message validation
  // -----------------------------------------
  const validateChatMessage = (inputVal) => {
    const text = inputVal.trim();
    const digitRegex = /\d/;
    const numberWords =
      /\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/i;
    const linkRegex =
      /(https?:\/\/[^\s]+|www\.[^\s]+|facebook\.com|instagram\.com|twitter\.com|x\.com|linkedin\.com|snapchat\.com|t\.co|bit\.ly|youtu\.be|youtube\.com|telegram\.me|wa\.me|whatsapp\.com|discord\.gg)/i;
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/i;
    const phoneRegex = /\b(?:\+?\d{1,3}[-.\s]?)?(?:\d[-.\s]?){8,}\d\b/;

    if (digitRegex.test(text))
      return { flag: true, message: "❌ Numbers are not allowed." };
    if (numberWords.test(text))
      return {
        flag: true,
        message: "❌ Numbers in words (One–Ten) are not allowed.",
      };
    if (linkRegex.test(text))
      return {
        flag: true,
        message: "❌ Links and social media are not allowed.",
      };
    if (emailRegex.test(text))
      return { flag: true, message: "❌ Email addresses are not allowed." };
    if (phoneRegex.test(text))
      return { flag: true, message: "❌ Phone numbers are not allowed." };
    return { flag: false, message: "" };
  };

  // -----------------------------------------
  // Socket + signaling
  // -----------------------------------------
  const [typedText, setTypedText] = useState("");
  const fullText = `Hey! Total strangers available for chat: ${totalOnline}`;

  useEffect(() => {
    setTypedText(""); // reset when totalOnline changes
    let i = 0;
    const interval = setInterval(() => {
      setTypedText((prev) => prev + fullText[i]);
      i++;
      if (i >= fullText.length) {
        clearInterval(interval);
      }
    }, 50); // typing speed (ms per letter)

    return () => clearInterval(interval);
  }, [totalOnline]);
  useEffect(() => {
    // const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    const socket = io("https://api.talkative.co.in", {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;
    socket.on("onlineCount", ({ total }) => {
      console.log("Total online users:", total);
      // You can update your UI here
      SetTotalOnline(total)
    });
    socket.on("connect", () => {
      socket.emit("register", { sessionId });
      setBanner(null);
    });

    socket.on("registered", () =>
      setBanner("Registered. Select a mode to start.")
    );

    socket.on("error", (err) => {
      const msg =
        typeof err === "string" ? err : err?.message || "Unknown error";
      setBanner(`Error: ${msg}`);
    });

    socket.on("queued", () => {
      setStatus("queued");
      setBanner("Searching for a partner...");
    });

    socket.on(
      "matched",
      ({ roomId: rid, partnerId: pid, mode: matchedMode }) => {
        displayedIdsRef.current.clear();
        setShowEmoji(false);
        setPartnerPresent(true);
        setPartnerTyping(false);
        setMessages([]);
        setBanner(null);
        sendBusyRef.current = false;
        setStatus("connected");
        setRoomId(rid);
        setPartnerId(pid);

        const finalMode = matchedMode || mode;

        if (finalMode === "video") {
          const meIsCaller = sessionId < pid;
          ensureLocalStream()
            .then(() => {
              cleanupPeer(); // close previous peer
              if (meIsCaller) createPeerAsCaller(pid);
            })
            .catch((e) => {
              setVideoError("Camera/mic permission error.");
              console.error(e);
            });
        }

        nextBusyRef.current = false;
      }
    );

    socket.on("message", (m) => {
      if (m?.from && m.from === sessionId) return;
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
      if (peerRef.current && sdp)
        await peerRef.current.setRemoteDescription(sdp);
    });

    socket.on("webrtc-ice", ({ candidate }) => {
      if (peerRef.current && candidate)
        peerRef.current.addIceCandidate(candidate).catch(console.error);
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

  // -----------------------------------------
  // Local stream
  // -----------------------------------------
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
      setLocalStreamState(st);
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
      setLocalStreamState(null);
    }
  };

  // -----------------------------------------
  // Peer creation
  // -----------------------------------------
  const createPeerBase = () => {
    if (peerRef.current) {
      try {
        peerRef.current.getReceivers()?.forEach((r) => r.track?.stop?.());
        peerRef.current.close();
      } catch {}
      peerRef.current = null;
    }

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

    pc.ontrack = (e) => {
      console.log("ontrack received", e.streams, e.track);
      const remote = e.streams?.[0] || new MediaStream([e.track]);
      remoteStreamRef.current = remote;
      setRemoteStreamState(remote);
      setPartnerPresent(true);
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate && socketRef.current && partnerId) {
        socketRef.current.emit("webrtc-ice", {
          to: partnerId,
          candidate: ev.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (
        state === "disconnected" ||
        state === "failed" ||
        state === "closed"
      ) {
        setPartnerPresent(false);
        remoteStreamRef.current = null;
        setRemoteStreamState(null);
      } else if (state === "connected") setPartnerPresent(true);
    };

    peerRef.current = pc;
    return pc;
  };

  const createPeerAsCaller = async (toPartnerId) => {
    try {
      const pc = createPeerBase();
      const localStream = localStreamRef.current || (await ensureLocalStream());
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current?.emit("webrtc-offer", {
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
      await pc.setRemoteDescription(remoteSdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current?.emit("webrtc-answer", {
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
        peerRef.current.getReceivers()?.forEach((r) => r.track?.stop?.());
        peerRef.current.close();
      } catch {}
      peerRef.current = null;
    }
    remoteStreamRef.current = null;
    setRemoteStreamState(null);
    setPartnerPresent(false);
  };

  // -----------------------------------------
  // Chat handlers
  // -----------------------------------------
  const handleModeSelect = async (m) => {
    setMode(m);
    setBanner(null);
    setMessages([]);
    setInput("");
    setPartnerPresent(false);
    setPartnerTyping(false);
    displayedIdsRef.current.clear();
    if (m === "video") await ensureLocalStream();
    joinQueue(m);
  };

  const joinQueue = (m) => {
    socketRef.current?.emit("joinQueue", { sessionId, mode: m });
  };

  const handleEnd = () => {
    socketRef.current?.emit("endChat");
    socketRef.current?.emit("next");
    socketRef.current?.emit("leaveQueue");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
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
    cleanupPeer();
    stopLocalStream();
    setMessages([]);
    setInput("");
    setStatus("idle");
    setRoomId(null);
    setPartnerId(null);
    setPartnerPresent(false);
    setPartnerTyping(false);
    setBanner("Searching for a new partner...");
    displayedIdsRef.current.clear();
    socketRef.current?.emit("next");
  };

  const sendMsg = () => {
    const text = input.trim();
    if (!text || !roomId || !partnerPresent || sendBusyRef.current) return;
    sendBusyRef.current = true;
    const messageId = uid();
    displayedIdsRef.current.add(messageId);
    setMessages((prev) => [
      ...prev,
      { from: "me", text, messageId, createdAt: new Date().toISOString() },
    ]);
    setInput("");
    setShowEmoji(false);
    socketRef.current?.emit("typing", { roomId, typing: false });
    socketRef.current?.emit("message", { roomId, text, messageId });
    setTimeout(() => (sendBusyRef.current = false), 120);
  };

  const handleTyping = (v) => {
    setInput(v);
    if (!roomId || !partnerPresent) return;
    socketRef.current?.emit("typing", { roomId, typing: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("typing", { roomId, typing: false });
      typingTimeoutRef.current = null;
    }, 800);
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

  // -----------------------------------------
  // Render
  // -----------------------------------------
  const renderContent = () => {
    if (status === "queued") {
      return (
        <QueueView
          banner={banner}
          mode={mode}
          localStream={localStreamState}
          videoError={videoError}
          onBack={handleBackFromQueue}
        />
      );
    }
    if (status === "connected") {
      const chatViewProps = {
        mode,
        banner,
        handleNext,
        handleEnd,
        nextBusyRef: nextBusyRef.current,
        localStream: localStreamState,
        remoteStream: remoteStreamState,
        videoError,
        partnerPresent,
        messages,
        partnerTyping,
        input,
        showEmoji,
        canSend: mode === "chat" && partnerPresent && status === "connected",
        handleTyping,
        sendMsg,
        setShowEmoji,
        sendBusyRef: sendBusyRef.current,
        validateChatMessage,
        setInput,
        messageFlag,
        SetMessageFlag,
        validationMessage,
        SetValidationMessage,
      };
      return <ChatView {...chatViewProps} />;
    }
    return (
      <ModeSelectionView banner={banner} onModeSelect={handleModeSelect} totalOnline={typedText}/>
    );
  };

  return (
    <div
      className="container-fluid d-flex flex-column"
      style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}
    >
      {renderContent()}
    </div>
  );
}
