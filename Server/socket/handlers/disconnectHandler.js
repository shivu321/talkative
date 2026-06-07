/**
 * socket/handlers/disconnectHandler.js
 *
 * Handles the "disconnect" event and the shared leaveCurrentRoom utility.
 *
 * Responsibilities:
 *  - Prune the disconnected socket from the matchmaking queue
 *  - Leave any active room and notify partner
 *  - Clean up activeUsers + handleToSessionId maps
 */

import logger from "../../logger.js";
import {
  activeUsers,
  handleToSessionId,
  getRoom,
  deleteRoom,
  getHandle,
  setActiveUser,
  deleteActiveUser,
  pruneDisconnectedFromQueue,
} from "../store.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Notify a room partner that the other user left, then reset both sides.
 * Exported so other handlers (e.g. queueHandler) can reuse it.
 *
 * @param {object|undefined} state  UserEntry for the leaving socket
 * @param {import('socket.io').Socket} socket  The leaving socket
 */
export function leaveCurrentRoom(state, socket) {
  if (!state || state.status !== "busy" || !state.roomId) return;

  const { roomId } = state;
  const room = getRoom(roomId);
  if (!room) return;

  const isA = room.a.socket.id === socket.id;
  const partner = isA ? room.b : room.a;

  // Notify and reset partner
  partner.socket.emit("partner-left");
  partner.socket.leave(roomId);
  setActiveUser(partner.sessionId, {
    socket: partner.socket,
    status: "idle",
    mode: partner.socket.mode || "video",
  });

  // Reset the leaving socket's state
  socket.leave(roomId);
  setActiveUser(socket.sessionId, {
    socket,
    status: "idle",
    mode: socket.mode || "video",
  });

  deleteRoom(roomId);
  logger.info(
    `Room ${roomId} closed. ${socket.sessionId} left; ${partner.sessionId} idle.`
  );
}

// ─── Main handler ─────────────────────────────────────────────────────────────

/**
 * Attach the "disconnect" event listener to a socket.
 * @param {import('socket.io').Socket} socket
 */
export function attachDisconnectHandler(socket) {
  socket.on("disconnect", () => {
    // Remove from matchmaking queue
    pruneDisconnectedFromQueue(socket);

    // Leave any active room and notify partner
    const state = activeUsers.get(socket.sessionId);
    leaveCurrentRoom(state, socket);

    // Remove from state maps
    if (socket.sessionId) {
      const handle = getHandle(socket.sessionId);
      handleToSessionId.delete(handle);
      deleteActiveUser(socket.sessionId);
    }

    logger.warn(`Socket disconnected: ${socket.id}`);
  });
}
