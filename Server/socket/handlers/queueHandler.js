/**
 * socket/handlers/queueHandler.js
 *
 * Handles matchmaking: joinQueue, leaveQueue, next.
 *
 * Responsibilities:
 *  - Add/remove users from the queue
 *  - Schedule and run the match-making loop
 *  - Create rooms and emit "matched" to both peers
 */

import { v4 as uuidv4 } from "uuid";
import logger from "../../logger.js";
import {
  activeUsers,
  queueState,
  rooms,
  getHandle,
  setActiveUser,
  setRoom,
  enqueueUser,
  dequeueUser,
} from "../store.js";
import { leaveCurrentRoom } from "./disconnectHandler.js";

// ─── Queue scheduling ─────────────────────────────────────────────────────────

/**
 * Schedule a single match-making pass on the next event-loop tick.
 * Coalesces multiple rapid joinQueue calls into one pass.
 * @param {import('socket.io').Server} io
 */
export function scheduleMatch(io) {
  if (queueState.matchScheduled) return;
  queueState.matchScheduled = true;
  setImmediate(() => {
    queueState.matchScheduled = false;
    tryMatchFromQueue(io);
  });
}

// ─── Matching engine ──────────────────────────────────────────────────────────

/**
 * Fisher-Yates in-place shuffle.
 * @param {Array} arr
 */
function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Collect all currently queued, connected, unique session IDs.
 * @returns {string[]}
 */
function collectValidQueued() {
  const seen = new Set();
  return queueState.queue.filter((sid) => {
    if (seen.has(sid)) return false;
    seen.add(sid);
    const u = activeUsers.get(sid);
    return !!(u && u.status === "queued" && u.socket?.connected);
  });
}

/**
 * Group session IDs by their mode.
 * @param {string[]} sids
 * @returns {Map<string, string[]>}
 */
function groupByMode(sids) {
  const byMode = new Map();
  for (const sid of sids) {
    const mode = activeUsers.get(sid)?.mode || "video";
    if (!byMode.has(mode)) byMode.set(mode, []);
    byMode.get(mode).push(sid);
  }
  return byMode;
}

/**
 * Create a room and emit "matched" to both matched users.
 * @param {import('socket.io').Server} io
 * @param {string} aSid
 * @param {string} bSid
 * @param {string} mode
 */
function matchPair(io, aSid, bSid, mode) {
  const aState = activeUsers.get(aSid);
  const bState = activeUsers.get(bSid);

  if (!aState || !bState) return;
  if (aState.status !== "queued" || bState.status !== "queued") return;
  if (!aState.socket?.connected || !bState.socket?.connected) return;

  const sa = aState.socket;
  const sb = bState.socket;
  const roomId = uuidv4();

  sa.join(roomId);
  sb.join(roomId);

  setRoom(roomId, {
    a: { socket: sa, sessionId: aSid },
    b: { socket: sb, sessionId: bSid },
    mode,
  });

  setActiveUser(aSid, { ...aState, status: "busy", roomId, mode });
  setActiveUser(bSid, { ...bState, status: "busy", roomId, mode });

  // Remove from queue
  queueState.queue = queueState.queue.filter(
    (sid) => sid !== aSid && sid !== bSid
  );

  const aHandle = getHandle(aSid);
  const bHandle = getHandle(bSid);

  sa.emit("matched", {
    roomId,
    partnerId: bHandle,
    partnerGender: bState.gender || "other",
    mode,
  });
  sb.emit("matched", {
    roomId,
    partnerId: aHandle,
    partnerGender: aState.gender || "other",
    mode,
  });

  logger.info(`Room created ${roomId} for ${aSid} & ${bSid} | mode=${mode}`);
}

/**
 * One pass of the match-making loop — groups queue by mode and pairs users.
 * @param {import('socket.io').Server} io
 */
function tryMatchFromQueue(io) {
  const validQueued = collectValidQueued();
  if (validQueued.length < 2) return;

  const byMode = groupByMode(validQueued);

  for (const [mode, sids] of byMode.entries()) {
    shuffleInPlace(sids);
    while (sids.length >= 2) {
      const aSid = sids.pop();
      const bSid = sids.pop();
      matchPair(io, aSid, bSid, mode);
    }
  }
}

// ─── Event handlers ───────────────────────────────────────────────────────────

/**
 * Attach joinQueue, leaveQueue, and next event listeners.
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {function(): boolean} ensureRegistered
 */
export function attachQueueHandlers(io, socket, ensureRegistered) {
  // ── joinQueue ──────────────────────────────────────────────────────────────
  socket.on("joinQueue", ({ sessionId, mode = "video" }) => {
    if (!sessionId) {
      socket.emit("error", { code: "NOT_REGISTERED", message: "Register first" });
      return;
    }
    if (!socket.sessionId) socket.sessionId = sessionId;

    const user = activeUsers.get(sessionId);
    if (!user || user.socket.id !== socket.id) {
      socket.emit("error", { code: "NOT_REGISTERED", message: "Register first" });
      return;
    }
    if (user.status === "busy") {
      socket.emit("error", { code: "IN_CHAT", message: "Already in chat" });
      return;
    }

    const finalMode = mode || "video";
    socket.mode = finalMode;

    setActiveUser(sessionId, { socket, status: "queued", mode: finalMode });
    enqueueUser(sessionId);
    socket.emit("queued");
    logger.info(`User queued: ${sessionId} | mode=${finalMode}`);
    scheduleMatch(io);
  });

  // ── leaveQueue ─────────────────────────────────────────────────────────────
  socket.on("leaveQueue", () => {
    if (!ensureRegistered()) return;
    const sid = socket.sessionId;
    dequeueUser(sid);
    const state = activeUsers.get(sid);
    if (state?.status === "queued") {
      setActiveUser(sid, {
        socket,
        status: "idle",
        mode: socket.mode || state.mode || "video",
      });
    }
    socket.emit("leftQueue");
    logger.info(`User left queue: ${sid}`);
  });

  // ── next ───────────────────────────────────────────────────────────────────
  socket.on("next", () => {
    if (!ensureRegistered()) {
      socket.emit("error", { code: "NOT_REGISTERED", message: "Register first" });
      return;
    }
    const state = activeUsers.get(socket.sessionId);
    leaveCurrentRoom(state, socket);

    // Re-join queue automatically
    const rejoiningMode = socket.mode || state?.mode || "video";
    setActiveUser(socket.sessionId, {
      socket,
      status: "queued",
      mode: rejoiningMode,
    });
    enqueueUser(socket.sessionId);
    socket.emit("queued");
    scheduleMatch(io);
  });
}
