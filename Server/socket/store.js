/**
 * socket/store.js
 *
 * Single source of truth for all in-memory server state.
 * Handlers import from here — they never create their own Maps.
 *
 * Exported data structures:
 *   activeUsers        Map<sessionId, UserEntry>
 *   handleToSessionId  Map<handle, sessionId>
 *   rooms              Map<roomId, RoomEntry>
 *   chatRequestCooldowns Map<pairKey, timestamp>
 *   queue              string[]  (array of sessionIds)
 *   matchScheduled     boolean
 *
 * UserEntry  = { socket, status, roomId?, mode?, handle?, gender? }
 * RoomEntry  = { a: { socket, sessionId }, b: { socket, sessionId }, mode }
 */

import crypto from "crypto";

// ─── In-memory state ──────────────────────────────────────────────────────────

export const activeUsers = new Map();
export const handleToSessionId = new Map();
export const rooms = new Map();
export const chatRequestCooldowns = new Map();

/** Mutable queue state wrapped in an object so handlers can mutate it by reference. */
export const queueState = {
  queue: [],
  matchScheduled: false,
};

// ─── Handle helpers ───────────────────────────────────────────────────────────

/**
 * Derive the 12-char hex handle for a given sessionId using SHA-256.
 * @param {string} sessionId
 * @returns {string}
 */
export function getHandle(sessionId) {
  if (!sessionId) return "";
  return crypto
    .createHash("sha256")
    .update(sessionId)
    .digest("hex")
    .slice(0, 12);
}

/**
 * Strip the "talkative_" prefix from a user-supplied ID string.
 * @param {string} rawId
 * @returns {string}
 */
export function stripPrefix(rawId) {
  return rawId.replace(/^talkative_/, "").trim();
}

// ─── Active-user helpers ──────────────────────────────────────────────────────

/** @param {string} sessionId @returns {UserEntry|undefined} */
export function getActiveUser(sessionId) {
  return activeUsers.get(sessionId);
}

/** @param {string} sessionId @param {UserEntry} entry */
export function setActiveUser(sessionId, entry) {
  activeUsers.set(sessionId, entry);
}

/** @param {string} sessionId */
export function deleteActiveUser(sessionId) {
  activeUsers.delete(sessionId);
}

// ─── Room helpers ─────────────────────────────────────────────────────────────

/** @param {string} roomId @returns {RoomEntry|undefined} */
export function getRoom(roomId) {
  return rooms.get(roomId);
}

/** @param {string} roomId @param {RoomEntry} entry */
export function setRoom(roomId, entry) {
  rooms.set(roomId, entry);
}

/** @param {string} roomId */
export function deleteRoom(roomId) {
  rooms.delete(roomId);
}

// ─── Queue helpers ────────────────────────────────────────────────────────────

/** Add sessionId to queue if not already present. */
export function enqueueUser(sessionId) {
  if (!queueState.queue.includes(sessionId)) {
    queueState.queue.push(sessionId);
  }
}

/** Remove sessionId from queue. */
export function dequeueUser(sessionId) {
  queueState.queue = queueState.queue.filter((id) => id !== sessionId);
}

/** Remove all sessionIds whose socket matches the given socket object. */
export function pruneDisconnectedFromQueue(socket) {
  queueState.queue = queueState.queue.filter((sid) => {
    const u = activeUsers.get(sid);
    return u?.socket?.id !== socket.id;
  });
}

// ─── Socket relay utility ─────────────────────────────────────────────────────

/**
 * Emit an event to the socket associated with toSessionId.
 * Silently no-ops if the user is not found or disconnected.
 *
 * @param {string} toSessionId
 * @param {string} event
 * @param {object} payload
 */
export function relayTo(toSessionId, event, payload) {
  const dest = activeUsers.get(toSessionId)?.socket;
  if (dest) dest.emit(event, payload);
}

// ─── Cooldown helper ──────────────────────────────────────────────────────────

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check whether a chat-request cooldown is active for a pair.
 * @param {string} pairKey  e.g. "handle1|handle2" (sorted)
 * @returns {{ blocked: boolean, remaining: number }}
 */
export function checkCooldown(pairKey) {
  const last = chatRequestCooldowns.get(pairKey);
  if (!last) return { blocked: false, remaining: 0 };
  const elapsed = Date.now() - last;
  if (elapsed >= COOLDOWN_MS) return { blocked: false, remaining: 0 };
  return { blocked: true, remaining: Math.ceil((COOLDOWN_MS - elapsed) / 1000) };
}

/** Set the cooldown timestamp for a pair. */
export function setCooldown(pairKey) {
  chatRequestCooldowns.set(pairKey, Date.now());
}

/** Build the canonical sort-key for a pair of handles. */
export function pairKey(handleA, handleB) {
  return [handleA, handleB].sort().join("|");
}
