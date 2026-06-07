/**
 * socket/handlers/friendChatHandler.js
 *
 * Handles the friend-to-friend chat lifecycle:
 *   friend-chat-request        — requester sends a chat invite
 *   friend-chat-request-response — target accepts/declines
 *   friend-chat-init           — direct init for offline history view
 *
 * All shared sub-steps (history fetch, room creation, matched emit) are
 * extracted into named helpers so the main event handlers stay readable.
 */

import logger from "../../logger.js";
import Friendship from "../../models/Friendship.js";
import Consent from "../../models/Consent.js";
import Message from "../../models/Message.js";
import ConnectionHistory from "../../models/ConnectionHistory.js";
import {
  activeUsers,
  handleToSessionId,
  getHandle,
  stripPrefix,
  setActiveUser,
  setRoom,
  getRoom,
  checkCooldown,
  setCooldown,
  pairKey,
} from "../store.js";

// ─── DB helpers ───────────────────────────────────────────────────────────────

/**
 * Find an accepted friendship between two handles (either direction).
 * @param {string} handleA
 * @param {string} handleB
 * @returns {Promise<object|null>}
 */
function findAcceptedFriendship(handleA, handleB) {
  return Friendship.findOne({
    $or: [
      { requester: handleA, receiver: handleB, status: "accepted" },
      { requester: handleB, receiver: handleA, status: "accepted" },
    ],
  });
}

/**
 * Resolve the gender for a handle from the Consent collection.
 * @param {string} handle
 * @returns {Promise<string>}
 */
async function getGenderForHandle(handle) {
  const doc = await Consent.findOne({ handle });
  return doc?.gender || "other";
}

/**
 * Fetch all messages exchanged between two handles, sorted oldest-first.
 * @param {string} handleA
 * @param {string} handleB
 * @returns {Promise<object[]>}
 */
function fetchChatHistory(handleA, handleB) {
  return Message.find({
    $or: [
      { senderId: handleA, receiverId: handleB },
      { senderId: handleB, receiverId: handleA },
    ],
  }).sort({ createdAt: 1 });
}

/**
 * Format raw message docs relative to one participant's perspective.
 * Messages sent by `myHandle` are labelled "me"; others keep their handle.
 *
 * @param {object[]} chatLogs
 * @param {string} myHandle
 * @returns {object[]}
 */
function formatLogsFor(chatLogs, myHandle) {
  return chatLogs.map((m) => ({
    from: m.senderId === myHandle ? "me" : m.senderId,
    text: m.text,
    createdAt: m.createdAt,
  }));
}

// ─── Room helpers ─────────────────────────────────────────────────────────────

/**
 * Create a Socket.IO room, update the rooms map, and mark both users as busy.
 *
 * @param {import('socket.io').Socket} socketA  The accepting user's socket
 * @param {string} sidA                          Their sessionId
 * @param {import('socket.io').Socket} socketB  The requesting user's socket
 * @param {string} sidB                          Their sessionId
 * @param {string} roomId
 */
function linkBothIntoRoom(socketA, sidA, socketB, sidB, roomId) {
  socketA.join(roomId);
  socketB.join(roomId);

  setRoom(roomId, {
    a: { socket: socketA, sessionId: sidA },
    b: { socket: socketB, sessionId: sidB },
    mode: "chat",
  });

  const stateA = activeUsers.get(sidA) || {};
  const stateB = activeUsers.get(sidB) || {};
  setActiveUser(sidA, { ...stateA, socket: socketA, status: "busy", roomId, mode: "chat" });
  setActiveUser(sidB, { ...stateB, socket: socketB, status: "busy", roomId, mode: "chat" });
}

/**
 * Emit "matched" to both sockets so each enters the chat view.
 *
 * @param {import('socket.io').Socket} socketA
 * @param {string} handleA
 * @param {string} genderA
 * @param {import('socket.io').Socket} socketB
 * @param {string} handleB
 * @param {string} genderB
 * @param {string} roomId
 * @param {object[]} logsForA
 * @param {object[]} logsForB
 */
function emitMatchedToBoth(socketA, handleA, genderA, socketB, handleB, genderB, roomId, logsForA, logsForB) {
  socketA.emit("matched", {
    roomId,
    partnerId: handleB,
    mode: "chat",
    messages: logsForA,
    isFriendChat: true,
    partnerGender: genderB,
  });
  socketB.emit("matched", {
    roomId,
    partnerId: handleA,
    mode: "chat",
    messages: logsForB,
    isFriendChat: true,
    partnerGender: genderA,
  });
}

// ─── Online-friend lookup ──────────────────────────────────────────────────────

/**
 * Resolve a handle to an online friend's socket + sessionId.
 * Returns null if the handle is offline or not connected.
 *
 * @param {string} targetHandle
 * @returns {{ socket: import('socket.io').Socket, sessionId: string }|null}
 */
function getOnlineFriendEntry(targetHandle) {
  const targetSid = handleToSessionId.get(targetHandle);
  if (!targetSid) return null;
  const state = activeUsers.get(targetSid);
  if (!state?.socket?.connected) return null;
  return { socket: state.socket, sessionId: targetSid };
}

// ─── Chat-request logic ───────────────────────────────────────────────────────

/**
 * Validate and dispatch a friend chat request.
 * Enforces the 5-minute cooldown and checks online status.
 *
 * @param {import('socket.io').Socket} socket  The requesting socket
 * @param {string} myHandle
 * @param {string} friendId  Raw value from client (may have talkative_ prefix)
 */
async function sendChatRequest(socket, myHandle, friendId) {
  const targetHandle = stripPrefix(friendId);
  const key = pairKey(myHandle, targetHandle);

  // Cooldown check
  const cooldown = checkCooldown(key);
  if (cooldown.blocked) {
    socket.emit("friend-chat-request-cooldown", {
      remaining: cooldown.remaining,
      message: `Please wait ${cooldown.remaining}s before sending another chat request.`,
    });
    return;
  }

  const friendship = await findAcceptedFriendship(myHandle, targetHandle);
  if (!friendship) {
    socket.emit("error", { code: "NOT_FRIENDS", message: "Not friends with this user" });
    return;
  }

  const friendEntry = getOnlineFriendEntry(targetHandle);
  if (!friendEntry) {
    socket.emit("friend-chat-request-declined", {
      friendId: targetHandle,
      reason: "offline",
      message: "Your friend is currently offline.",
    });
    return;
  }

  // Notify both parties without starting cooldown immediately
  friendEntry.socket.emit("friend-chat-incoming-request", { fromHandle: myHandle });
  socket.emit("friend-chat-request-sent", { toHandle: targetHandle });
  logger.info(`Chat request sent: ${myHandle} -> ${targetHandle}`);
}

/**
 * Handle a friend's response (accept / decline) to a chat request.
 *
 * @param {import('socket.io').Socket} socket  The responding socket (target user)
 * @param {string} mySid   sessionId of the responder
 * @param {string} myHandle  handle of the responder
 * @param {string} fromHandle  handle of the original requester
 * @param {boolean} accepted
 */
async function respondToChatRequest(socket, mySid, myHandle, fromHandle, accepted) {
  const targetHandle = stripPrefix(fromHandle);
  const requesterEntry = getOnlineFriendEntry(targetHandle);

  if (!accepted) {
    // Cooldown is activated ONLY when declined (disallowed)
    const key = pairKey(myHandle, targetHandle);
    setCooldown(key);

    requesterEntry?.socket.emit("friend-chat-request-declined", {
      friendId: myHandle,
      reason: "declined",
      message: "Your chat request was declined.",
    });
    logger.info(`Chat request declined: ${myHandle} declined ${targetHandle}. Cooldown activated.`);
    return;
  }

  logger.info(`Chat request accepted: ${myHandle} accepted ${targetHandle}`);

  const friendship = await findAcceptedFriendship(myHandle, targetHandle);
  if (!friendship || !requesterEntry) return;

  const [myGender, targetGender] = await Promise.all([
    getGenderForHandle(myHandle),
    getGenderForHandle(targetHandle),
  ]);

  const chatLogs = await fetchChatHistory(myHandle, targetHandle);
  const logsForMe = formatLogsFor(chatLogs, myHandle);
  const logsForTarget = formatLogsFor(chatLogs, targetHandle);

  const roomId = [myHandle, targetHandle].sort().join("_");
  linkBothIntoRoom(socket, mySid, requesterEntry.socket, requesterEntry.sessionId, roomId);
  emitMatchedToBoth(
    socket, myHandle, myGender,
    requesterEntry.socket, targetHandle, targetGender,
    roomId, logsForMe, logsForTarget
  );
}

/**
 * Handle direct friend-chat-init (offline history view / legacy path).
 *
 * @param {import('socket.io').Socket} socket
 * @param {string} sid  sessionId of the caller
 * @param {string} myHandle
 * @param {string} friendId  Raw value from client
 */
async function initFriendChat(socket, sid, myHandle, friendId) {
  const targetHandle = stripPrefix(friendId);
  const friendship = await findAcceptedFriendship(myHandle, targetHandle);
  const targetGender = await getGenderForHandle(targetHandle);
  const chatLogs = await fetchChatHistory(myHandle, targetHandle);
  const formattedLogs = formatLogsFor(chatLogs, myHandle);

  if (!friendship) {
    socket.emit("friend-chat-init-response", {
      isFriend: false,
      friendId: targetHandle,
      messages: [],
      isOnline: false,
    });
    return;
  }

  const friendEntry = getOnlineFriendEntry(targetHandle);
  const isOnline = !!friendEntry;

  if (isOnline) {
    const roomId = [myHandle, targetHandle].sort().join("_");
    linkBothIntoRoom(socket, sid, friendEntry.socket, friendEntry.sessionId, roomId);

    const myCurrentState = activeUsers.get(sid) || {};
    socket.emit("friend-chat-init-response", {
      isFriend: true,
      friendId: targetHandle,
      messages: formattedLogs,
      isOnline: true,
      roomId,
      partnerGender: targetGender,
    });

    socket.emit("matched", {
      roomId,
      partnerId: targetHandle,
      mode: "chat",
      messages: formattedLogs,
      isFriendChat: true,
      partnerGender: targetGender,
    });

    friendEntry.socket.emit("matched", {
      roomId,
      partnerId: myHandle,
      mode: "chat",
      messages: formattedLogs,
      isFriendChat: true,
      partnerGender: myCurrentState.gender || "other",
    });
  } else {
    socket.emit("friend-chat-init-response", {
      isFriend: true,
      friendId: targetHandle,
      messages: formattedLogs,
      isOnline: false,
      partnerGender: targetGender,
    });
  }
}


// ─── Location saving helper ───────────────────────────────────────────────────

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

// ─── Upgrade friend chat to video helper ───────────────────────────────────────

async function upgradeFriendChatToVideo(socketA, sidA, handleA, socketB, sidB, handleB, roomId) {
  const [genderA, genderB] = await Promise.all([
    getGenderForHandle(handleA),
    getGenderForHandle(handleB),
  ]);

  // Update room mode
  const room = getRoom(roomId);
  if (room) {
    room.mode = "video";
  }

  const stateA = activeUsers.get(sidA) || {};
  const stateB = activeUsers.get(sidB) || {};
  setActiveUser(sidA, { ...stateA, mode: "video" });
  setActiveUser(sidB, { ...stateB, mode: "video" });

  // Load chat history
  const chatLogs = await fetchChatHistory(handleA, handleB);
  const logsForA = formatLogsFor(chatLogs, handleA);
  const logsForB = formatLogsFor(chatLogs, handleB);

  // Emit matched with mode "video" to both to initiate WebRTC call
  socketA.emit("matched", {
    roomId,
    partnerId: handleB,
    mode: "video",
    messages: logsForA,
    isFriendChat: true,
    partnerGender: genderB,
  });
  socketB.emit("matched", {
    roomId,
    partnerId: handleA,
    mode: "video",
    messages: logsForB,
    isFriendChat: true,
    partnerGender: genderA,
  });
}

// ─── Attach handlers ──────────────────────────────────────────────────────────

/**
 * Attach friend-chat-related event listeners.
 * @param {import('socket.io').Socket} socket
 * @param {function(): boolean} ensureRegistered
 */
export function attachFriendChatHandlers(socket, ensureRegistered) {
  socket.on("friend-chat-request", async ({ friendId }) => {
    if (!ensureRegistered()) return;
    const myHandle = getHandle(socket.sessionId);
    try {
      await sendChatRequest(socket, myHandle, friendId);
    } catch (e) {
      logger.error("Friend chat request failed: " + e.message);
    }
  });

  socket.on("friend-chat-request-response", async ({ fromHandle, accepted }) => {
    if (!ensureRegistered()) return;
    const sid = socket.sessionId;
    const myHandle = getHandle(sid);
    try {
      await respondToChatRequest(socket, sid, myHandle, fromHandle, accepted);
    } catch (e) {
      logger.error("Friend chat accept failed: " + e.message);
    }
  });

  socket.on("friend-chat-init", async ({ friendId }) => {
    if (!ensureRegistered()) return;
    const sid = socket.sessionId;
    const myHandle = getHandle(sid);
    try {
      await initFriendChat(socket, sid, myHandle, friendId);
    } catch (e) {
      logger.error("Friend chat init failed: " + e.message);
    }
  });

  // ── Friend Video Chat switch events ──────────────────────────────────────────

  socket.on("friend-video-request", async ({ friendId, lat, lng }) => {
    if (!ensureRegistered()) return;
    const myHandle = getHandle(socket.sessionId);
    const targetHandle = stripPrefix(friendId);
    const friendEntry = getOnlineFriendEntry(targetHandle);

    try {
      // Save requester's location
      await saveUserLocation(socket.sessionId, lat, lng, "video");

      if (friendEntry) {
        friendEntry.socket.emit("friend-video-incoming-request", { fromHandle: myHandle });
        logger.info(`Friend video request sent from ${myHandle} to ${targetHandle}`);
      } else {
        socket.emit("friend-video-request-failed", { message: "Friend is offline" });
      }
    } catch (e) {
      logger.error("friend-video-request failed: " + e.message);
    }
  });

  socket.on("friend-video-request-response", async ({ fromHandle, accepted, lat, lng }) => {
    if (!ensureRegistered()) return;
    const sid = socket.sessionId;
    const myHandle = getHandle(sid);
    const targetHandle = stripPrefix(fromHandle);
    const requesterEntry = getOnlineFriendEntry(targetHandle);

    try {
      if (!accepted) {
        if (requesterEntry) {
          requesterEntry.socket.emit("friend-video-request-declined", { friendId: myHandle });
        }
        logger.info(`Friend video request declined by ${myHandle} for ${targetHandle}`);
        return;
      }

      // Save responder's location
      await saveUserLocation(sid, lat, lng, "video");

      if (requesterEntry) {
        const roomId = [myHandle, targetHandle].sort().join("_");
        await upgradeFriendChatToVideo(
          socket,
          sid,
          myHandle,
          requesterEntry.socket,
          requesterEntry.sessionId,
          targetHandle,
          roomId
        );
        logger.info(`Upgraded friend room ${roomId} to video mode`);
      }
    } catch (e) {
      logger.error("friend-video-request-response failed: " + e.message);
    }
  });

  socket.on("friend-video-cancel", ({ roomId }) => {
    if (!ensureRegistered()) return;
    const room = getRoom(roomId);
    if (!room) return;

    room.mode = "chat";

    const stateA = activeUsers.get(room.a.sessionId);
    const stateB = activeUsers.get(room.b.sessionId);
    if (stateA) setActiveUser(room.a.sessionId, { ...stateA, mode: "chat" });
    if (stateB) setActiveUser(room.b.sessionId, { ...stateB, mode: "chat" });

    room.a.socket.emit("friend-video-cancelled");
    room.b.socket.emit("friend-video-cancelled");
    logger.info(`Friend video call cancelled in room ${roomId}`);
  });
}
