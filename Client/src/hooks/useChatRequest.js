/**
 * hooks/useChatRequest.js
 *
 * Manages incoming and outgoing friend-chat request state.
 *
 * Incoming: a friend wants to chat with you → show a popup
 * Outgoing: you sent a request → show a status toast
 *
 * @param {React.RefObject} socketRef
 * @param {boolean} showPolicyNotification  Block actions when policy is pending
 * @returns {{
 *   incomingChatRequest: { fromHandle: string }|null,
 *   outgoingChatRequest: { toHandle: string, status: string, message?: string, remaining?: number }|null,
 *   handleConnectWithFriend: (friendId: string) => void,
 *   handleRespondChatRequest: (fromHandle: string, accepted: boolean) => void,
 *   handleDismissOutgoingRequest: () => void,
 *   registerChatRequestListeners: (socket: object) => void,
 * }}
 */
import { useState } from "react";

export function useChatRequest(socketRef, showPolicyNotification) {
  const [incomingChatRequest, setIncomingChatRequest] = useState(null);
  const [outgoingChatRequest, setOutgoingChatRequest] = useState(null);

  // ── Socket listeners (called once after socket is created) ─────────────────

  /**
   * Register all chat-request-related socket event listeners.
   * Call this inside the useSocket setup, passing the live socket instance.
   * @param {import('socket.io-client').Socket} socket
   */
  function registerChatRequestListeners(socket) {
    socket.on("friend-chat-incoming-request", ({ fromHandle }) => {
      setIncomingChatRequest({ fromHandle });
    });

    socket.on("friend-chat-request-sent", ({ toHandle }) => {
      setOutgoingChatRequest({ toHandle, status: "pending" });
    });

    socket.on("friend-chat-request-declined", ({ friendId, message: msg }) => {
      setOutgoingChatRequest({
        toHandle: friendId,
        status: "declined",
        message: msg || "Request was declined.",
      });
    });

    socket.on("friend-chat-request-cooldown", ({ remaining, message: msg }) => {
      setOutgoingChatRequest((prev) => ({
        ...prev,
        status: "cooldown",
        message: msg,
        remaining,
      }));
    });
  }

  // ── Action handlers ────────────────────────────────────────────────────────

  /** Send a chat-request to a friend (emits to server). */
  function handleConnectWithFriend(friendId) {
    if (showPolicyNotification) {
      alert(
        "Please accept the updated Privacy Policy and Terms & Conditions at the top of the page first."
      );
      return;
    }
    if (!socketRef.current) return;
    setOutgoingChatRequest(null);
    socketRef.current.emit("friend-chat-request", { friendId });
  }

  /** Respond to an incoming chat request (accept or decline). */
  function handleRespondChatRequest(fromHandle, accepted) {
    if (!socketRef.current) return;
    setIncomingChatRequest(null);
    socketRef.current.emit("friend-chat-request-response", { fromHandle, accepted });
  }

  /** Dismiss the outgoing request status toast. */
  function handleDismissOutgoingRequest() {
    setOutgoingChatRequest(null);
  }

  return {
    incomingChatRequest,
    outgoingChatRequest,
    handleConnectWithFriend,
    handleRespondChatRequest,
    handleDismissOutgoingRequest,
    registerChatRequestListeners,
  };
}
