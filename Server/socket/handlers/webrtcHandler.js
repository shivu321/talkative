import { activeUsers, handleToSessionId, getHandle } from "../store.js";
import Consent from "../../models/Consent.js";
import ConnectionHistory from "../../models/ConnectionHistory.js";
import logger from "../../logger.js";

// ─── Location helper ──────────────────────────────────────────────────────────

async function saveUserLocation(sessionId, latitude, longitude, mode) {
  if (latitude !== undefined && longitude !== undefined) {
    await Consent.findOneAndUpdate({ sessionId }, { latitude, longitude });
    const handle = getHandle(sessionId);
    const activeUser = activeUsers.get(sessionId);
    const ip = activeUser?.socket?.handshake?.address || "";
    await ConnectionHistory.create({
      sessionId,
      handle,
      mode,
      latitude,
      longitude,
      ip,
    });
    logger.info(`Recorded location history for handle=${handle} | mode=${mode} | lat=${latitude}, lng=${longitude}`);
  }
}

// ─── Relay helper ─────────────────────────────────────────────────────────────

/**
 * Forward a WebRTC signaling payload to the target session's socket.
 * Resolves the recipient's handle to sessionId.
 * @param {string} toHandle     The recipient's handle
 * @param {string} event        Socket event name
 * @param {object} payload      Data to forward
 * @param {string} fromSession  The sender's sessionId
 */
function relaySignal(toHandle, event, payload, fromSession) {
  const targetSid = handleToSessionId.get(toHandle) || toHandle;
  const dest = activeUsers.get(targetSid)?.socket;
  if (dest) {
    dest.emit(event, { ...payload, from: getHandle(fromSession) });
  }
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

  socket.on("save-video-location", async ({ lat, lng }) => {
    if (!ensureRegistered()) return;
    try {
      await saveUserLocation(socket.sessionId, lat, lng, "video");
    } catch (e) {
      logger.error("Failed to save video location: " + e.message);
    }
  });

  socket.on("save-chat-location", async ({ lat, lng }) => {
    if (!ensureRegistered()) return;
    try {
      await saveUserLocation(socket.sessionId, lat, lng, "chat");
    } catch (e) {
      logger.error("Failed to save chat location: " + e.message);
    }
  });
}

