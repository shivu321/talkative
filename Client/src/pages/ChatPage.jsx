// src/pages/ChatPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../api";

import ModeSelectionView from "../components/Chat/ModeSelectionView";
import QueueView from "../components/Chat/QueueView";
import ChatView from "../components/Chat/ChatView";
import PrivacyModal from "../components/PrivacyModal";
import TermsModal from "../components/TermsModal";

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export default function ChatPage({ sessionId, theme, toggleTheme }) {
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
  const [totalOnline, SetTotalOnline] = useState(0);
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

  const [friendRequests, setFriendRequests] = useState({ sent: [], received: [], friends: [] });
  const [isFriendChat, setIsFriendChat] = useState(false);
  const [isFriendOnline, setIsFriendOnline] = useState(false);
  const [isFriendshipAccepted, setIsFriendshipAccepted] = useState(false);
  const [partnerGender, setPartnerGender] = useState(null);

  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPolicyNotification, setShowPolicyNotification] = useState(false);
  const [policyNotificationMessage, setPolicyNotificationMessage] = useState("");

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

    if (text.includes("@") || text.includes("_"))
      return {
        flag: true,
        message: "❌ Usernames or handles containing '@' or '_' are not allowed.",
      };
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

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;
    socket.on("onlineCount", ({ total }) => {
      console.log("Total online users:", total);
      SetTotalOnline(total);

      // reset typing
      setTypedText("");
      const fullText = `Total strangers available for chat: ${total}`;
      let i = 0;
      setTypedText(fullText);
      
    });
    socket.on("connect", () => {
      socket.emit("register", { sessionId });
      setBanner(null);
    });

    socket.on("registered", () => {
      setBanner("Registered. Select a mode to start.");
      socket.emit("friend-requests-get");
    });

    socket.on("queued", () => {
      setStatus("queued");
      setBanner("Searching for a partner...");
    });

    socket.on("error", (err) => {
      const msg =
        typeof err === "string" ? err : err?.message || "Unknown error";
      setBanner(`Error: ${msg}`);
      alert(`Error: ${msg}`);
    });

    socket.on("friend-requests-list", ({ sent, received, friends }) => {
      setFriendRequests({ sent, received, friends });
    });

    socket.on("friend-request-received", ({ fromUserId }) => {
      alert(`New friend request received from talkative_${fromUserId}!`);
      socketRef.current?.emit("friend-requests-get");
    });

    socket.on("friend-request-accepted", ({ friendId }) => {
      alert(`You are now friends with talkative_${friendId}!`);
      socketRef.current?.emit("friend-requests-get");
    });

    socket.on("friend-request-declined", () => {
      socketRef.current?.emit("friend-requests-get");
    });

    socket.on("friend-request-sent-success", ({ toUserId }) => {
      alert(`Friend request sent successfully to talkative_${toUserId}!`);
      socketRef.current?.emit("friend-requests-get");
    });

    socket.on("policy-updated-notification", ({ message }) => {
      setShowPolicyNotification(true);
      setPolicyNotificationMessage(message);
    });

    socket.on("friend-chat-init-response", ({ isFriend, friendId, messages: historicalMessages, isOnline, roomId: rid, partnerGender: pGender }) => {
      setIsFriendChat(true);
      setIsFriendshipAccepted(isFriend);
      setIsFriendOnline(isOnline);
      setPartnerId(friendId);
      setPartnerGender(pGender || "other");
      setMessages(historicalMessages || []);
      setStatus("connected");
      setRoomId(rid || "offline_room");
      setPartnerPresent(isOnline);
      setMode("chat");
    });

    socket.on(
      "matched",
      ({ roomId: rid, partnerId: pid, mode: matchedMode, messages: historicalMessages, isFriendChat: matchedIsFriendChat, partnerGender: pGender }) => {
        displayedIdsRef.current.clear();
        setShowEmoji(false);
        setPartnerPresent(true);
        setPartnerTyping(false);
        setMessages(historicalMessages || []);
        setBanner(null);
        sendBusyRef.current = false;
        setStatus("connected");
        setRoomId(rid);
        setPartnerId(pid);
        setPartnerGender(pGender || "other");

        setIsFriendChat(!!matchedIsFriendChat);
        setIsFriendshipAccepted(!!matchedIsFriendChat);
        setIsFriendOnline(!!matchedIsFriendChat);

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
      setIsFriendOnline(false);
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
    if (showPolicyNotification) {
      alert("Please accept the updated Privacy Policy and Terms & Conditions at the top of the page first.");
      return;
    }
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
    nextBusyRef.current = false;
  };

  const handleConnectWithFriend = (friendId) => {
    if (showPolicyNotification) {
      alert("Please accept the updated Privacy Policy and Terms & Conditions at the top of the page first.");
      return;
    }
    if (!socketRef.current) return;
    socketRef.current.emit("friend-chat-init", { friendId });
  };

  const handleAcceptRequest = (fromUserId) => {
    if (showPolicyNotification) {
      alert("Please accept the updated Privacy Policy and Terms & Conditions at the top of the page first.");
      return;
    }
    if (!socketRef.current) return;
    socketRef.current.emit("friend-request-accept", { fromUserId });
  };

  const handleDeclineRequest = (fromUserId) => {
    if (!socketRef.current) return;
    socketRef.current.emit("friend-request-decline", { fromUserId });
  };

  const handleSendRequestDirectly = (toUserId) => {
    if (showPolicyNotification) {
      alert("Please accept the updated Privacy Policy and Terms & Conditions at the top of the page first.");
      return;
    }
    if (!socketRef.current) return;
    socketRef.current.emit("friend-request-send", { toUserId });
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
        canSend:
          status === "connected" &&
          (isFriendChat
            ? isFriendshipAccepted && isFriendOnline
            : partnerPresent),
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
        theme,
        toggleTheme,
        isFriendChat,
        isFriendOnline,
        isFriendshipAccepted,
        friendRequests,
        onSendRequestDirectly: handleSendRequestDirectly,
        mySessionId: sessionId,
        partnerId,
        partnerGender,
      };
      return <ChatView {...chatViewProps} />;
    }
    return (
      <ModeSelectionView
        banner={banner}
        onModeSelect={handleModeSelect}
        totalOnline={typedText}
        onConnectWithFriend={handleConnectWithFriend}
        friendRequests={friendRequests}
        onAcceptRequest={handleAcceptRequest}
        onDeclineRequest={handleDeclineRequest}
        onSendRequestDirectly={handleSendRequestDirectly}
        mySessionId={sessionId}
      />
    );
  };

  return (
    <div
      className="container-fluid d-flex flex-column bg-transparent position-relative"
      style={{ minHeight: "100vh" }}
    >
      {/* Theme Toggle Button for Selection Screen */}
      {status === "idle" && (
        <div className="position-absolute top-0 end-0 m-3" style={{ zIndex: 100 }}>
          <button
            className="btn btn-outline-light rounded-circle border-0 d-flex align-items-center justify-content-center shadow-sm"
            onClick={toggleTheme}
            style={{ width: "42px", height: "42px", color: "var(--text-main)", background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
            type="button"
            title="Toggle Theme"
          >
            <i className={theme === "light" ? "bi bi-moon-stars-fill" : "bi bi-sun-fill"}></i>
          </button>
        </div>
      )}

      {/* Policy Update Notification Banner */}
      {showPolicyNotification && status === "idle" && (
        <div 
          className="alert alert-info border-0 rounded-4 p-3 m-3 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 glass-panel"
          style={{ 
            color: 'var(--text-main)', 
            border: '1px solid rgba(109, 117, 242, 0.3)',
            boxShadow: '0 0 15px rgba(109, 117, 242, 0.15)',
            marginTop: '70px',
            zIndex: 10
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-shield-fill-info text-primary fs-5 animate-pulse"></i>
            <span className="small fw-semibold text-start">{policyNotificationMessage}</span>
          </div>
          <div className="d-flex gap-2 flex-shrink-0">
            <button 
              className="btn btn-sm btn-outline-secondary rounded-pill py-1 px-3"
              style={{ color: "var(--text-main)", borderColor: "var(--glass-border)", fontSize: "0.8rem" }}
              onClick={() => setShowPrivacy(true)}
            >
              Privacy Policy
            </button>
            <button 
              className="btn btn-sm btn-outline-secondary rounded-pill py-1 px-3"
              style={{ color: "var(--text-main)", borderColor: "var(--glass-border)", fontSize: "0.8rem" }}
              onClick={() => setShowTerms(true)}
            >
              Terms & Conditions
            </button>
            <button 
              className="btn btn-sm btn-glowing-primary rounded-pill py-1.5 px-4"
              style={{ fontSize: "0.8rem" }}
              onClick={() => {
                setShowPolicyNotification(false);
                socketRef.current?.emit("policy-accepted");
              }}
            >
              Accept & Dismiss
            </button>
          </div>
        </div>
      )}

      {renderContent()}

      <PrivacyModal
        show={showPrivacy}
        handleClose={() => setShowPrivacy(false)}
      />
      <TermsModal show={showTerms} handleClose={() => setShowTerms(false)} />
    </div>
  );
}
