/**
 * socket/handlers/webrtcHandler.js
 *
 * Handles WebRTC signaling relay events:
 *   webrtc-offer, webrtc-answer, webrtc-ice
 *
 * These are simple relay events — the server does not inspect the SDP/ICE
 * payloads, it only forwards them to the correct partner session.
 */

import { activeUsers } from "../store.js";

// ─── Relay helper ─────────────────────────────────────────────────────────────

/**
 * Forward a WebRTC signaling payload to the target session's socket.
 * @param {string} toSessionId  The handle/sessionId to relay to
 * @param {string} event        Socket event name
 * @param {object} payload      Data to forward
 * @param {string} fromSession  The sender's sessionId (used to set `from`)
 */
function relaySignal(toSessionId, event, payload, fromSession) {
  const dest = activeUsers.get(toSessionId)?.socket;
  if (dest) dest.emit(event, { ...payload, from: fromSession });
}

// ─── Event handlers ───────────────────────────────────────────────────────────

/**
 * Attach WebRTC signaling relay listeners.
 * @param {import('socket.io').Socket} socket
 * @param {function(): boolean} ensureRegistered
 */
export function attachWebRTCHandlers(socket, ensureRegistered) {
  socket.on("webrtc-offer", ({ to, sdp }) => {
    if (!ensureRegistered()) return;
    relaySignal(to, "webrtc-offer", { sdp }, socket.sessionId);
  });

  socket.on("webrtc-answer", ({ to, sdp }) => {
    if (!ensureRegistered()) return;
    relaySignal(to, "webrtc-answer", { sdp }, socket.sessionId);
  });

  socket.on("webrtc-ice", ({ to, candidate }) => {
    if (!ensureRegistered()) return;
    relaySignal(to, "webrtc-ice", { candidate }, socket.sessionId);
  });
}
