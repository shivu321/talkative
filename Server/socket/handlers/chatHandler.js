/**
 * socket/handlers/chatHandler.js
 *
 * Handles text messaging and typing indicator events.
 *
 * Responsibilities:
 *  - Validate the sender is a participant in the room
 *  - Persist messages to MongoDB
 *  - Broadcast to room and emit typing indicator to partner
 */

import logger from "../../logger.js";
import Message from "../../models/Message.js";
import { getRoom, getHandle } from "../store.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Identify the sender's handle and the partner's socket from a room.
 * Returns null if the socket is not a participant of the room.
 *
 * @param {object} room  RoomEntry
 * @param {string} socketId
 * @param {string} sessionId  The sending socket's sessionId
 * @returns {{ senderHandle: string, receiverHandle: string, partnerSocket: import('socket.io').Socket }|null}
 */
function resolveParticipants(room, socketId, sessionId) {
  const isA = room.a.socket.id === socketId;
  const isB = room.b.socket.id === socketId;
  if (!isA && !isB) return null;

  const partnerEntry = isA ? room.b : room.a;
  return {
    senderHandle: getHandle(sessionId),
    receiverHandle: getHandle(partnerEntry.sessionId),
    partnerSocket: partnerEntry.socket,
  };
}

/**
 * Save a message document to the database and broadcast it to the room.
 *
 * @param {import('socket.io').Server} io
 * @param {string} roomId
 * @param {string} senderHandle
 * @param {string} receiverHandle
 * @param {string} text  Already trimmed
 * @param {string} messageId  Client-generated dedup ID
 */
async function persistAndBroadcastMessage(io, roomId, senderHandle, receiverHandle, text, messageId) {
  const doc = new Message({ senderId: senderHandle, receiverId: receiverHandle, text });
  await doc.save();

  io.to(roomId).emit("message", {
    from: senderHandle,
    text,
    createdAt: doc.createdAt,
    messageId,
  });
}

// ─── Event handlers ───────────────────────────────────────────────────────────

/**
 * Attach message and typing event listeners.
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {function(): boolean} ensureRegistered
 */
export function attachChatHandlers(io, socket, ensureRegistered) {
  // ── message ────────────────────────────────────────────────────────────────
  socket.on("message", async ({ roomId, text, messageId }) => {
    if (!ensureRegistered()) {
      socket.emit("error", { code: "NOT_REGISTERED", message: "Register first" });
      return;
    }
    if (!text?.trim()) return;

    let senderHandle, receiverHandle;
    const room = getRoom(roomId);
    if (!room) {
      // Resolve participants from offline friend chat roomId format
      if (/^[a-f0-9]{12}_[a-f0-9]{12}$/.test(roomId)) {
        senderHandle = getHandle(socket.sessionId);
        const handles = roomId.split("_");
        receiverHandle = handles[0] === senderHandle ? handles[1] : handles[0];
      } else {
        return;
      }
    } else {
      const participants = resolveParticipants(room, socket.id, socket.sessionId);
      if (!participants) return;
      senderHandle = participants.senderHandle;
      receiverHandle = participants.receiverHandle;
    }

    try {
      await persistAndBroadcastMessage(io, roomId, senderHandle, receiverHandle, text.trim(), messageId);
    } catch (e) {
      logger.error("Message save failed: " + e.message);
      socket.emit("error", { code: "MSG_FAILED", message: "Failed to send message" });
    }
  });

  // ── typing ─────────────────────────────────────────────────────────────────
  socket.on("typing", ({ roomId, typing }) => {
    if (!ensureRegistered()) return;

    const room = getRoom(roomId);
    if (!room) return;

    const participants = resolveParticipants(room, socket.id, socket.sessionId);
    if (!participants) return;

    participants.partnerSocket.emit("typing", {
      from: participants.senderHandle,
      typing: !!typing,
    });
  });
}
