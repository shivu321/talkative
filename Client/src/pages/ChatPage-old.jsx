// ChatPage.jsx
import React, { useEffect, useRef, useState, Suspense } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../api";
import MessageList from "../components/MessageList";
import VideoBox from "../components/VideoBox";
import { Helmet } from "react-helmet";

const Picker = React.lazy(() => import("@emoji-mart/react"));

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export default function ChatPage({ sessionId }) {
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

  const validateChatMessage = (input) => {
    const text = input.trim();
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

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;
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
        mode,
        banner,
        handleNext,
        handleEnd,
        nextBusyRef: nextBusyRef.current,
        localStream: localStreamRef.current,
        remoteStream: remoteStreamRef.current,
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
      <ModeSelectionView banner={banner} onModeSelect={handleModeSelect} />
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

const ModeSelectionView = ({ banner, onModeSelect }) => (
  <div className="d-flex align-items-center justify-content-center flex-grow-1">
    <div
      className="text-center p-4 p-md-5 rounded-3 shadow-sm bg-white"
      style={{ maxWidth: "500px" }}
    >
      <h2 className="mb-4 fw-bold">Select a Mode</h2>
      {banner && <div className="alert alert-info">{banner}</div>}
      <div className="d-grid gap-3 d-sm-flex justify-content-sm-center">
        <button
          className="btn btn-primary btn-lg px-4"
          onClick={() => onModeSelect("chat")}
        >
          Chat Only
        </button>
        <button
          className="btn btn-success btn-lg px-4"
          onClick={() => onModeSelect("video")}
        >
          Video Chat
        </button>
      </div>
    </div>
  </div>
);

const QueueView = ({ banner, mode, localStream, videoError, onBack }) => (
  <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 text-center">
    <div
      className="spinner-border text-primary mb-3"
      role="status"
      style={{ width: "3rem", height: "3rem" }}
    >
      <span className="visually-hidden">Loading...</span>
    </div>
    <h3 className="mb-3">Waiting for a partner...</h3>
    {mode === "video" && (
      <div className="mt-4 w-100" style={{ maxWidth: 640 }}>
        <div className="ratio ratio-16x9 bg-dark rounded-3 shadow-sm overflow-hidden">
          <VideoBox localStream={localStream} muted />
          <div className="position-absolute top-0 start-0 m-2 badge bg-secondary">
            You
          </div>
        </div>
        {videoError && (
          <div className="alert alert-danger mt-2">{videoError}</div>
        )}
      </div>
    )}
    {banner && <div className="text-muted mt-3">{banner}</div>}
    <button className="btn btn-outline-secondary mt-4" onClick={onBack}>
      Cancel
    </button>
  </div>
);

const ChatView = (props) => {
  const {
    mode,
    banner,
    handleNext,
    handleEnd,
    nextBusyRef,
    localStream,
    remoteStream,
    videoError,
    partnerPresent,
    messages,
    partnerTyping,
    input,
    showEmoji,
    canSend,
    handleTyping,
    sendMsg,
    setShowEmoji,
    sendBusyRef,
    validateChatMessage,
    setInput,
    messageFlag,
    SetMessageFlag,
    validationMessage,
    SetValidationMessage,
  } = props;

  return (
    <div className="d-flex flex-column flex-grow-1 py-3">
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
        <link rel="canonical" href={window.location.href} />
      </Helmet>

      <div className="row flex-grow-1 g-3">
        <div className="col-lg-7 d-flex flex-column">
          <header className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
            <h4 className="mb-0">
              Anonymous {mode === "video" ? "Video" : "Chat"}
            </h4>
            <div className="btn-group" role="group">
              <button
                style={{ background: "#6d75f2", color: "white" }}
                className="btn btn-lg"
                onClick={handleNext}
                disabled={nextBusyRef}
              >
                {nextBusyRef ? "Finding..." : "🏃‍♂️Left"}
              </button>
              {/* <button className="btn btn-danger" onClick={nextBusyRef}>
                End
              </button> */}
            </div>
          </header>

          <main className="flex-grow-1" style={{ position: "relative" }}>
            {mode === "video" ? (
              <VideoChatUI
                localStream={localStream}
                remoteStream={remoteStream}
                videoError={videoError}
                partnerPresent={partnerPresent}
              />
            ) : (
              <TextChatUI
                {...{
                  messages,
                  partnerTyping,
                  input,
                  showEmoji,
                  canSend,
                  handleTyping,
                  sendMsg,
                  setShowEmoji,
                  sendBusyRef,
                  validateChatMessage,
                  setInput,
                  messageFlag,
                  SetMessageFlag,
                  validationMessage,
                  SetValidationMessage,
                }}
              />
            )}
          </main>
        </div>

        <div className="col-lg-5 d-none d-lg-flex align-items-center justify-content-center bg-light rounded-3">
          <p className="text-muted">Advertisement</p>
        </div>
      </div>
    </div>
  );
};

const VideoChatUI = ({
  localStream,
  remoteStream,
  videoError,
  partnerPresent,
}) => (
  <div className="w-100 h-100 d-flex justify-content-center align-items-center">
    <div className="w-100 h-100 ratio ratio-16x9 bg-dark rounded-3 position-relative shadow-lg overflow-hidden">
      <VideoBox remoteStream={remoteStream} />
      {!remoteStream && (
        <div className="d-flex h-100 align-items-center justify-content-center text-white">
          {partnerPresent
            ? "Connecting to partner's video..."
            : "Waiting for partner..."}
        </div>
      )}
      <span className="position-absolute top-0 start-0 m-2 badge bg-success fs-6">
        Partner
      </span>

      {localStream && (
        <div
          className="position-absolute end-0 bottom-0 m-3 border border-2 border-white shadow rounded-3 overflow-hidden bg-black"
          style={{ width: "25%", minWidth: "150px", maxWidth: "240px" }}
        >
          <div className="ratio ratio-16x9">
            <VideoBox localStream={localStream} muted />
          </div>
          <span className="position-absolute top-0 start-0 m-1 badge bg-secondary">
            You
          </span>
        </div>
      )}
    </div>
    {videoError && <div className="alert alert-danger mt-2">{videoError}</div>}
    {!partnerPresent && (
      <div className="alert alert-warning small mt-2">
        Partner has left. Click 'Next' or 'End'.
      </div>
    )}
  </div>
);

// --- CORRECTED TEXT CHAT UI WITH WORKING EMOJI PICKER ---
const TextChatUI = (props) => {
  const {
    messages,
    partnerTyping,
    input,
    showEmoji,
    canSend,
    handleTyping,
    sendMsg,
    setShowEmoji,
    sendBusyRef,
    validateChatMessage,
    setInput,
    messageFlag,
    SetMessageFlag,
    validationMessage,
    SetValidationMessage,
  } = props;

  // State to hold the emoji data once it's loaded
  const [emojiData, setEmojiData] = useState(null);
  const [isEmojiLoading, setIsEmojiLoading] = useState(false);

  const handleInputChange = (e) => {
    handleTyping(e.target.value);
    const res = validateChatMessage(e.target.value);
    SetMessageFlag(res.flag);
    SetValidationMessage(res.message);
  };

  // This function now handles loading the data on the first click
  const toggleEmojiPicker = async () => {
    if (!showEmoji && !emojiData) {
      setIsEmojiLoading(true);
      const mod = await import("@emoji-mart/data");
      setEmojiData(mod.default);
      setIsEmojiLoading(false);
    }
    setShowEmoji((v) => !v);
  };

  return (
    <div className="d-flex flex-column h-100">
      <div className=" flex-grow-1 mb-3 overflow-auto">
        <MessageList messages={messages} partnerTyping={partnerTyping} />
      </div>
        {validationMessage && (
            <small className="text-danger mt-1 d-block">
              {validationMessage}
            </small>
          )}
      <div
        className="mt-auto"
        style={{ borderRadius: "37px", border: "1px solid rgb(109, 117, 242)" }}
      >
        <div className="position-relative">
          {showEmoji && (
            <div className="position-absolute bottom-100 mb-2">
              <Suspense
                fallback={
                  <div className="p-2 bg-light rounded">Loading Picker...</div>
                }
              >
                {isEmojiLoading ? (
                  <div className="p-2 bg-light rounded">Loading Emojis...</div>
                ) : (
                  // The Picker is only rendered *after* emojiData is available
                  emojiData && (
                    <Picker
                      data={emojiData}
                      onEmojiSelect={(emoji) =>
                        setInput((prev) => prev + (emoji?.native || ""))
                      }
                      previewPosition="none"
                      theme="light"
                    />
                  )
                )}
              </Suspense>
            </div>
          )}
          
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-light rounded-circle flex-shrink-0"
              onClick={toggleEmojiPicker}
            >
              😊
            </button>
            <input
              className="form-control rounded-pill"
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                !sendBusyRef &&
                canSend &&
                !messageFlag &&
                sendMsg()
              }
              placeholder={canSend ? "Type a message..." : "Partner has left."}
              disabled={!canSend}
            />
            <button
              className="btn btn-primary rounded-circle flex-shrink-0"
              onClick={sendMsg}
              disabled={messageFlag || !canSend || !input.trim() || sendBusyRef}
              style={{
                width: "44px",
                height: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="currentColor"
                className="bi bi-send-fill"
                viewBox="0 0 16 16"
              >
                <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083l6-15Zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 0 0-.154-.154l-.338-.215 7.494-7.494 1.178-.471-.47 1.178Z" />
              </svg>
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
};
