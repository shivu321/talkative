/**
 * pages/ChatPage.jsx  — Compositor
 *
 * This component owns application-level state and wires together all
 * hooks and sub-components. It contains NO business logic of its own.
 *
 * State ownership:
 *   useMyHandle      → myHandle, myHandleRef
 *   useWebRTC        → streams, peer, videoError
 *   useChatRequest   → incoming/outgoing chat-request state
 *   local state      → everything else (status, messages, friends, etc.)
 */

import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../api";

// Hooks
import { useMyHandle } from "../hooks/useMyHandle";
import { useWebRTC } from "../hooks/useWebRTC";
import { useChatRequest } from "../hooks/useChatRequest";

// Utils
import { validateChatMessage } from "../utils/messageValidation";

// Components
import ModeSelectionView from "../components/Chat/ModeSelectionView";
import QueueView from "../components/Chat/QueueView";
import ChatView from "../components/Chat/ChatView";
import ChatRequestPopups from "../components/Chat/ChatRequestPopups";
import PrivacyModal from "../components/PrivacyModal";
import TermsModal from "../components/TermsModal";

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Generate a locally unique ID for optimistic message dedup. */
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatPage({ sessionId, theme, toggleTheme }) {
  // ── Refs ────────────────────────────────────────────────────────────────────
  const socketRef = useRef(null);
  const partnerIdRef = useRef(null);        // kept in sync with partnerId state
  const typingTimeoutRef = useRef(null);
  const displayedIdsRef = useRef(new Set());
  const sendBusyRef = useRef(false);
  const nextBusyRef = useRef(false);

  // ── Session handle (SHA-256) ────────────────────────────────────────────────
  const { myHandle, myHandleRef } = useMyHandle(sessionId);

  // ── Chat state ──────────────────────────────────────────────────────────────
  const [status, setStatus] = useState("idle");
  const [mode, setMode] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [partnerId, setPartnerId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerPresent, setPartnerPresent] = useState(false);
  const [partnerGender, setPartnerGender] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [banner, setBanner] = useState(null);
  const [typedText, setTypedText] = useState("");

  // ── Friend state ────────────────────────────────────────────────────────────
  const [friendRequests, setFriendRequests] = useState({ sent: [], received: [], friends: [] });
  const [isFriendChat, setIsFriendChat] = useState(false);
  const [isFriendOnline, setIsFriendOnline] = useState(false);
  const [isFriendshipAccepted, setIsFriendshipAccepted] = useState(false);

  // ── Policy / legal state ────────────────────────────────────────────────────
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPolicyNotification, setShowPolicyNotification] = useState(false);
  const [policyNotificationMessage, setPolicyNotificationMessage] = useState("");

  // ── Message validation flags ────────────────────────────────────────────────
  const [messageFlag, SetMessageFlag] = useState(false);
  const [validationMessage, SetValidationMessage] = useState("");

  // ── Custom hooks ────────────────────────────────────────────────────────────
  const {
    localStream,
    remoteStream,
    videoError,
    peerRef,
    ensureLocalStream,
    stopLocalStream,
    cleanupPeer,
    createPeerAsCaller,
    createPeerAsReceiver,
  } = useWebRTC(socketRef, partnerIdRef, setPartnerPresent);

  const {
    incomingChatRequest,
    outgoingChatRequest,
    handleConnectWithFriend,
    handleRespondChatRequest,
    handleDismissOutgoingRequest,
    registerChatRequestListeners,
  } = useChatRequest(socketRef, showPolicyNotification);

  // Keep partnerIdRef in sync with partnerId state (for closure-safe WebRTC use)
  useEffect(() => {
    partnerIdRef.current = partnerId;
  }, [partnerId]);

  // ── Socket setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    // ── Core events ──────────────────────────────────────────────────────────

    socket.on("connect", () => {
      socket.emit("register", { sessionId });
      setBanner(null);
    });

    socket.on("registered", () => {
      setBanner("Registered. Select a mode to start.");
      socket.emit("friend-requests-get");
    });

    socket.on("onlineCount", ({ total }) => {
      setTypedText(`Total strangers available for chat: ${total}`);
    });

    socket.on("queued", () => {
      setStatus("queued");
      setBanner("Searching for a partner...");
    });

    socket.on("error", (err) => {
      const msg = typeof err === "string" ? err : err?.message || "Unknown error";
      setBanner(`Error: ${msg}`);
      alert(`Error: ${msg}`);
    });

    // ── Matched ───────────────────────────────────────────────────────────────

    socket.on("matched", ({ roomId: rid, partnerId: pid, mode: matchedMode, messages: history, isFriendChat: friendChat, partnerGender: pGender }) => {
      displayedIdsRef.current.clear();
      setShowEmoji(false);
      setPartnerPresent(true);
      setPartnerTyping(false);
      setMessages(history || []);
      setBanner(null);
      sendBusyRef.current = false;
      setStatus("connected");
      setRoomId(rid);
      setPartnerId(pid);
      setPartnerGender(pGender || "other");
      setIsFriendChat(!!friendChat);
      setIsFriendshipAccepted(!!friendChat);
      setIsFriendOnline(!!friendChat);
      nextBusyRef.current = false;

      // Clear any pending chat-request toast — the friend accepted
      handleDismissOutgoingRequest();

      const finalMode = matchedMode || mode;
      if (finalMode === "video") {
        const meIsCaller = myHandleRef.current < pid;
        ensureLocalStream()
          .then(() => {
            cleanupPeer();
            if (meIsCaller) createPeerAsCaller(pid);
          })
          .catch((e) => console.error(e));
      }
    });


    // ── Messaging ─────────────────────────────────────────────────────────────

    socket.on("message", (m) => {
      if (m?.from && m.from === myHandleRef.current) return;
      const id = m?.messageId || `${m?.from || ""}-${m?.text || ""}-${m?.createdAt || ""}`;
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
      setMessages((prev) => [...prev, { sys: true, text: "Partner left.", messageId: sysId }]);
      setBanner("Partner left. You can End or Next to continue.");
      cleanupPeer();
    });

    // ── Friendship events ─────────────────────────────────────────────────────

    socket.on("friend-requests-list", ({ sent, received, friends }) => {
      setFriendRequests({ sent, received, friends });
    });

    socket.on("friend-request-received", ({ fromUserId }) => {
      alert(`New friend request received from talkative_${fromUserId}!`);
      socket.emit("friend-requests-get");
    });

    socket.on("friend-request-accepted", ({ friendId }) => {
      alert(`You are now friends with talkative_${friendId}!`);
      socket.emit("friend-requests-get");
    });

    socket.on("friend-request-declined", () => {
      socket.emit("friend-requests-get");
    });

    socket.on("friend-request-sent-success", ({ toUserId }) => {
      alert(`Friend request sent successfully to talkative_${toUserId}!`);
      socket.emit("friend-requests-get");
    });

    socket.on("friend-chat-init-response", ({ isFriend, friendId, messages: history, isOnline, roomId: rid, partnerGender: pGender }) => {
      setIsFriendChat(true);
      setIsFriendshipAccepted(isFriend);
      setIsFriendOnline(isOnline);
      setPartnerId(friendId);
      setPartnerGender(pGender || "other");
      setMessages(history || []);
      setStatus("connected");
      setRoomId(rid || "offline_room");
      setPartnerPresent(isOnline);
      setMode("chat");
    });

    // ── Policy ────────────────────────────────────────────────────────────────

    socket.on("policy-updated-notification", ({ message }) => {
      setShowPolicyNotification(true);
      setPolicyNotificationMessage(message);
    });

    // ── WebRTC signaling ──────────────────────────────────────────────────────

    socket.on("webrtc-offer", async ({ from, sdp }) => {
      try {
        await ensureLocalStream();
        await createPeerAsReceiver(from, sdp);
      } catch (e) {
        console.error("Error handling offer:", e);
      }
    });

    socket.on("webrtc-answer", async ({ sdp }) => {
      if (peerRef.current && sdp) await peerRef.current.setRemoteDescription(sdp);
    });

    socket.on("webrtc-ice", ({ candidate }) => {
      if (peerRef.current && candidate)
        peerRef.current.addIceCandidate(candidate).catch(console.error);
    });

    // ── Chat-request listeners (from hook) ────────────────────────────────────
    registerChatRequestListeners(socket);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      cleanupPeer();
      stopLocalStream();
      socket.disconnect();
    };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Chat action handlers ────────────────────────────────────────────────────

  function guardPolicy(action) {
    if (showPolicyNotification) {
      alert("Please accept the updated Privacy Policy and Terms & Conditions at the top of the page first.");
      return false;
    }
    return true;
  }

  function joinQueue(m) {
    socketRef.current?.emit("joinQueue", { sessionId, mode: m });
  }

  async function handleModeSelect(m) {
    if (!guardPolicy()) return;
    setMode(m);
    setBanner(null);
    setMessages([]);
    setInput("");
    setPartnerPresent(false);
    setPartnerTyping(false);
    displayedIdsRef.current.clear();
    if (m === "video") await ensureLocalStream();
    joinQueue(m);
  }

  function handleEnd() {
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
  }

  function handleNext() {
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
  }

  function sendMsg() {
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
  }

  function handleTyping(v) {
    setInput(v);
    if (!roomId || !partnerPresent) return;
    socketRef.current?.emit("typing", { roomId, typing: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("typing", { roomId, typing: false });
      typingTimeoutRef.current = null;
    }, 800);
  }

  function handleBackFromQueue() {
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
  }

  function handleAcceptRequest(fromUserId) {
    if (!guardPolicy()) return;
    socketRef.current?.emit("friend-request-accept", { fromUserId });
  }

  function handleDeclineRequest(fromUserId) {
    socketRef.current?.emit("friend-request-decline", { fromUserId });
  }

  function handleSendRequestDirectly(toUserId) {
    if (!guardPolicy()) return;
    socketRef.current?.emit("friend-request-send", { toUserId });
  }

  function handleSetFriendAlias(friendId, alias) {
    socketRef.current?.emit("friend-alias-set", { friendId, alias });
  }

  /**
   * Look up the alias a user has set for a given handle.
   * Falls back to "talkative_{handle}" if no alias exists.
   * @param {string|undefined} handle
   * @returns {string}
   */
  function resolveDisplayName(handle) {
    if (!handle) return "";
    const entry = friendRequests.friends?.find(
      (f) => (typeof f === "string" ? f : f.handle) === handle
    );
    const alias = typeof entry === "object" ? entry?.alias : "";
    return alias || `talkative_${handle}`;
  }

  // ── Inline validation wrapper (passed to ChatView) ─────────────────────────

  function validateMessage(inputVal) {
    const isFriend =
      isFriendChat ||
      friendRequests.friends?.some((f) =>
        typeof f === "string" ? f === partnerId : f.handle === partnerId
      );
    return validateChatMessage(inputVal, isFriend);
  }

  // ── Content renderer ────────────────────────────────────────────────────────

  function renderContent() {
    if (status === "queued") {
      return (
        <QueueView
          banner={banner}
          mode={mode}
          localStream={localStream}
          videoError={videoError}
          onBack={handleBackFromQueue}
        />
      );
    }

    if (status === "connected") {
      const canSend =
        status === "connected" &&
        (isFriendChat ? isFriendshipAccepted && isFriendOnline : partnerPresent);

      return (
        <ChatView
          mode={mode}
          banner={banner}
          handleNext={handleNext}
          handleEnd={handleEnd}
          nextBusyRef={nextBusyRef.current}
          localStream={localStream}
          remoteStream={remoteStream}
          videoError={videoError}
          partnerPresent={partnerPresent}
          messages={messages}
          partnerTyping={partnerTyping}
          input={input}
          showEmoji={showEmoji}
          canSend={canSend}
          handleTyping={handleTyping}
          sendMsg={sendMsg}
          setShowEmoji={setShowEmoji}
          sendBusyRef={sendBusyRef.current}
          validateChatMessage={validateMessage}
          setInput={setInput}
          messageFlag={messageFlag}
          SetMessageFlag={SetMessageFlag}
          validationMessage={validationMessage}
          SetValidationMessage={SetValidationMessage}
          theme={theme}
          toggleTheme={toggleTheme}
          isFriendChat={isFriendChat}
          isFriendOnline={isFriendOnline}
          isFriendshipAccepted={isFriendshipAccepted}
          friendRequests={friendRequests}
          onSendRequestDirectly={handleSendRequestDirectly}
          onAcceptRequest={handleAcceptRequest}
          onDeclineRequest={handleDeclineRequest}
          mySessionId={myHandle || sessionId}
          partnerId={partnerId}
          partnerGender={partnerGender}
        />
      );
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
        onSetFriendAlias={handleSetFriendAlias}
        mySessionId={myHandle || sessionId}
        outgoingChatRequest={outgoingChatRequest}
        onDismissOutgoingRequest={handleDismissOutgoingRequest}
      />
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="container-fluid d-flex flex-column bg-transparent position-relative"
      style={{ minHeight: "100vh" }}
    >
      {/* Theme toggle (idle screen only) */}
      {status === "idle" && (
        <div className="position-absolute top-0 end-0 m-3" style={{ zIndex: 100 }}>
          <button
            className="btn btn-outline-light rounded-circle border-0 d-flex align-items-center justify-content-center shadow-sm"
            onClick={toggleTheme}
            style={{
              width: "42px",
              height: "42px",
              color: "var(--text-main)",
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
            }}
            type="button"
            title="Toggle Theme"
          >
            <i className={theme === "light" ? "bi bi-moon-stars-fill" : "bi bi-sun-fill"} />
          </button>
        </div>
      )}

      {/* Policy update banner */}
      {showPolicyNotification && status === "idle" && (
        <div
          className="alert alert-info border-0 rounded-4 p-3 m-3 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 glass-panel"
          style={{
            color: "var(--text-main)",
            border: "1px solid rgba(109, 117, 242, 0.3)",
            boxShadow: "0 0 15px rgba(109, 117, 242, 0.15)",
            marginTop: "70px",
            zIndex: 10,
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-shield-fill-info text-primary fs-5 animate-pulse" />
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
              Terms &amp; Conditions
            </button>
            <button
              className="btn btn-sm btn-glowing-primary rounded-pill py-1.5 px-4"
              style={{ fontSize: "0.8rem" }}
              onClick={() => {
                setShowPolicyNotification(false);
                socketRef.current?.emit("policy-accepted");
              }}
            >
              Accept &amp; Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      {renderContent()}

      {/* Legal modals */}
      <PrivacyModal show={showPrivacy} handleClose={() => setShowPrivacy(false)} />
      <TermsModal show={showTerms} handleClose={() => setShowTerms(false)} />

      {/* Chat-request overlays */}
      <ChatRequestPopups
        incomingChatRequest={incomingChatRequest}
        incomingDisplayName={resolveDisplayName(incomingChatRequest?.fromHandle)}
        outgoingChatRequest={outgoingChatRequest}
        onRespond={handleRespondChatRequest}
        onDismissOutgoing={handleDismissOutgoingRequest}
      />
    </div>
  );
}
