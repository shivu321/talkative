/**
 * socket/handlers/registerHandler.js
 *
 * Handles the "register" socket event.
 *
 * Responsibilities:
 *  - Validate sessionId presence
 *  - Teardown any duplicate existing session
 *  - Register user in activeUsers / handleToSessionId
 *  - Check & emit policy-updated-notification
 *  - Broadcast updated online count
 */

import logger from "../../logger.js";
import Consent from "../../models/Consent.js";
import {
  activeUsers,
  handleToSessionId,
  getHandle,
  setActiveUser,
  deleteRoom,
  getRoom,
  queueState,
} from "../store.js";

// ─── Policy constants ─────────────────────────────────────────────────────────

const POLICY_UPDATE_DATE = new Date("2026-06-07T00:00:00.000Z");
const POLICY_MESSAGE =
  "Notice: Our Privacy Policy and Terms & Conditions were updated on June 7, 2026. " +
  "Please review and accept the new terms.";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Notify the socket if the user has not accepted the latest policy.
 * @param {import('socket.io').Socket} socket
 * @param {object} consentDoc  Mongoose document from Consent collection
 */
function notifyPolicyUpdateIfNeeded(socket, consentDoc) {
  if (consentDoc && consentDoc.createdAt < POLICY_UPDATE_DATE) {
    socket.emit("policy-updated-notification", {
      message: POLICY_MESSAGE,
      updatedAt: POLICY_UPDATE_DATE.toISOString(),
    });
  }
}

/**
 * Persist the user's gender from their consent document into activeUsers.
 * @param {string} sessionId
 * @param {object|null} consentDoc
 */
function hydrateGenderFromConsent(sessionId, consentDoc) {
  if (!consentDoc) return;
  const state = activeUsers.get(sessionId);
  if (state) {
    state.gender = consentDoc.gender || "other";
    activeUsers.set(sessionId, state);
  }
}

/**
 * Teardown a stale/duplicate session:
 *  - Remove from queue
 *  - Notify partner if in a room
 *  - Disconnect old socket
 *
 * @param {object} existing  The current UserEntry in activeUsers
 * @param {string} sessionId
 */
function teardownDuplicateSession(existing, sessionId) {
  // Remove from queue
  queueState.queue = queueState.queue.filter((sid) => sid !== sessionId);

  // If the user was mid-chat, notify the partner
  if (existing.status === "busy" && existing.roomId) {
    const room = getRoom(existing.roomId);
    if (room) {
      const partner =
        room.a.sessionId === sessionId ? room.b : room.a;
      partner.socket.emit("partner-left");
      partner.socket.leave(existing.roomId);
      setActiveUser(partner.sessionId, {
        socket: partner.socket,
        status: "idle",
        mode: partner.socket.mode || "video",
      });
      deleteRoom(existing.roomId);
      logger.info(
        `Room ${existing.roomId} closed due to duplicate login for ${sessionId}`
      );
    }
  }

  // Disconnect the old socket
  try {
    existing.socket.disconnect(true);
  } catch (_) {
    // ignore
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

/**
 * Attach the "register" event listener to a socket.
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
export function attachRegisterHandler(io, socket) {
  socket.on("register", ({ sessionId }) => {
    if (!sessionId) {
      socket.emit("error", { code: "NO_SESSION", message: "sessionId required" });
      return;
    }

    // Handle duplicate connections for the same sessionId
    const existing = activeUsers.get(sessionId);
    if (existing && existing.socket.id !== socket.id) {
      teardownDuplicateSession(existing, sessionId);
    }

    // Assign sessionId + default mode to this socket
    socket.sessionId = sessionId;
    if (!socket.mode) socket.mode = "video";

    // Register in state maps
    const handle = getHandle(sessionId);
    setActiveUser(sessionId, {
      socket,
      status: "idle",
      mode: socket.mode,
      handle,
    });
    handleToSessionId.set(handle, sessionId);

    logger.info(`User registered: sessionId=${sessionId}, handle=${handle}`);
    socket.emit("registered", { sessionId, handle });

    // Check consent document for gender + policy status
    Consent.findOne({ sessionId })
      .then((consentDoc) => {
        hydrateGenderFromConsent(sessionId, consentDoc);
        notifyPolicyUpdateIfNeeded(socket, consentDoc);
      })
      .catch((err) =>
        logger.error("Consent check failed: " + err.message)
      );

    // Broadcast updated online count to all clients
    io.emit("onlineCount", { total: activeUsers.size });
  });
}
