/**
 * socket/socketHandler.js  — Orchestrator
 *
 * This file wires together all per-socket event handlers.
 * It contains NO business logic of its own — all logic lives in
 * the dedicated handler modules inside ./handlers/.
 *
 * Adding a new feature? Create a new handler file and attach it here.
 */

import logger from "../logger.js";
import { activeUsers } from "./store.js";
import { attachRegisterHandler } from "./handlers/registerHandler.js";
import { attachQueueHandlers } from "./handlers/queueHandler.js";
import { attachChatHandlers } from "./handlers/chatHandler.js";
import { attachWebRTCHandlers } from "./handlers/webrtcHandler.js";
import { attachFriendshipHandlers } from "./handlers/friendshipHandler.js";
import { attachFriendChatHandlers } from "./handlers/friendChatHandler.js";
import { attachDisconnectHandler } from "./handlers/disconnectHandler.js";

/**
 * Returns true when the socket is properly registered and its entry in
 * activeUsers still references this same socket connection.
 *
 * This guard is passed into every handler so they can short-circuit on
 * stale or unregistered sockets without knowing about activeUsers directly.
 *
 * @param {import('socket.io').Socket} socket
 * @returns {boolean}
 */
function createRegistrationGuard(socket) {
  return () => {
    const sid = socket.sessionId;
    if (!sid) return false;
    const state = activeUsers.get(sid);
    return !!(state && state.socket.id === socket.id);
  };
}

/**
 * Main entry point — called once when the Socket.IO server is ready.
 * @param {import('socket.io').Server} io
 */
function socketHandler(io) {
  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    const ensureRegistered = createRegistrationGuard(socket);

    // Attach all event handlers in logical groups
    attachRegisterHandler(io, socket);
    attachQueueHandlers(io, socket, ensureRegistered);
    attachChatHandlers(io, socket, ensureRegistered);
    attachWebRTCHandlers(socket, ensureRegistered);
    attachFriendshipHandlers(socket, ensureRegistered);
    attachFriendChatHandlers(socket, ensureRegistered);
    attachDisconnectHandler(socket);
  });
}

export default socketHandler;
