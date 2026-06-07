/**
 * socket/handlers/friendshipHandler.js
 *
 * Handles the full friendship lifecycle:
 *   friend-request-send, friend-request-accept, friend-request-decline,
 *   friend-requests-get, friend-alias-set, policy-accepted
 *
 * Each event is broken into a small async handler function, sharing
 * DB-query helpers to keep repetition minimal.
 */

import logger from "../../logger.js";
import Friendship from "../../models/Friendship.js";
import Consent from "../../models/Consent.js";
import {
  getHandle,
  stripPrefix,
  handleToSessionId,
  relayTo,
} from "../store.js";

// ─── DB helpers ───────────────────────────────────────────────────────────────

/**
 * Find an accepted friendship between two handles (in either direction).
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
 * Find any friendship (any status) between two handles.
 * @param {string} handleA
 * @param {string} handleB
 * @returns {Promise<object|null>}
 */
function findAnyFriendship(handleA, handleB) {
  return Friendship.findOne({
    $or: [
      { requester: handleA, receiver: handleB },
      { requester: handleB, receiver: handleA },
    ],
  });
}

/**
 * Fetch all friendship records involving a handle, then build
 * the { sent, received, friends } payload the client expects.
 *
 * @param {string} myHandle
 * @returns {Promise<{ sent: string[], received: string[], friends: object[] }>}
 */
async function buildFriendRequestsPayload(myHandle) {
  const records = await Friendship.find({
    $or: [{ requester: myHandle }, { receiver: myHandle }],
  });

  const sent = records
    .filter((r) => r.requester === myHandle && r.status === "pending")
    .map((r) => r.receiver);

  const received = records
    .filter((r) => r.receiver === myHandle && r.status === "pending")
    .map((r) => r.requester);

  const friends = records
    .filter((r) => r.status === "accepted")
    .map((r) => {
      const friendHandle = r.requester === myHandle ? r.receiver : r.requester;
      const friendAlias =
        r.requester === myHandle ? r.requesterAlias : r.receiverAlias;
      return { handle: friendHandle, alias: friendAlias || "" };
    });

  return { sent, received, friends };
}

/**
 * Fetch and emit the friend-requests-list event to the caller's socket.
 * Reused by multiple events that need to refresh the list after a change.
 *
 * @param {import('socket.io').Socket} socket
 * @param {string} myHandle
 */
async function emitFriendRequestsList(socket, myHandle) {
  const payload = await buildFriendRequestsPayload(myHandle);
  socket.emit("friend-requests-list", payload);
}

// ─── Individual event logic ───────────────────────────────────────────────────

/**
 * Handle "friend-request-send": validate + create or auto-accept a friendship.
 */
async function handleFriendRequestSend(socket, myHandle, toUserId) {
  if (!toUserId) return;

  const targetHandle = stripPrefix(toUserId);

  if (myHandle === targetHandle) {
    socket.emit("error", { code: "SELF_REQ", message: "You cannot add yourself" });
    return;
  }

  const targetUser = await Consent.findOne({ handle: targetHandle });
  if (!targetUser) {
    socket.emit("error", { code: "USER_NOT_FOUND", message: "User handle not found" });
    return;
  }

  const existing = await findAnyFriendship(myHandle, targetHandle);

  if (existing) {
    if (existing.status === "accepted") {
      socket.emit("error", { code: "ALREADY_FRIENDS", message: "Already friends" });
      return;
    }
    if (existing.requester === myHandle) {
      socket.emit("error", { code: "REQ_PENDING", message: "Friend request already sent" });
      return;
    }
    // Incoming request from target → auto-accept
    existing.status = "accepted";
    await existing.save();
    socket.emit("friend-request-accepted", { friendId: targetHandle });
    const targetSid = handleToSessionId.get(targetHandle);
    if (targetSid) relayTo(targetSid, "friend-request-accepted", { friendId: myHandle });
    return;
  }

  // New friendship
  const friendship = new Friendship({
    requester: myHandle,
    receiver: targetHandle,
    status: "pending",
  });
  await friendship.save();

  logger.info(`Friend request sent: ${myHandle} -> ${targetHandle}`);
  socket.emit("friend-request-sent-success", { toUserId: targetHandle });
  const targetSid = handleToSessionId.get(targetHandle);
  if (targetSid) relayTo(targetSid, "friend-request-received", { fromUserId: myHandle });
}

/**
 * Handle "friend-request-accept": accept an incoming pending request.
 */
async function handleFriendRequestAccept(socket, myHandle, fromUserId) {
  const targetHandle = stripPrefix(fromUserId);

  const friendship = await Friendship.findOne({
    requester: targetHandle,
    receiver: myHandle,
    status: "pending",
  });

  if (!friendship) {
    socket.emit("error", { code: "REQ_NOT_FOUND", message: "No pending request found" });
    return;
  }

  friendship.status = "accepted";
  await friendship.save();

  logger.info(`Friend request accepted: ${targetHandle} <-> ${myHandle}`);
  socket.emit("friend-request-accepted", { friendId: targetHandle });
  const targetSid = handleToSessionId.get(targetHandle);
  if (targetSid) relayTo(targetSid, "friend-request-accepted", { friendId: myHandle });
}

/**
 * Handle "friend-request-decline": delete a pending request in either direction.
 */
async function handleFriendRequestDecline(socket, myHandle, fromUserId) {
  const targetHandle = stripPrefix(fromUserId);

  await Friendship.deleteOne({
    $or: [
      { requester: targetHandle, receiver: myHandle, status: "pending" },
      { requester: myHandle, receiver: targetHandle, status: "pending" },
    ],
  });

  socket.emit("friend-request-declined", { friendId: targetHandle });
  const targetSid = handleToSessionId.get(targetHandle);
  if (targetSid) relayTo(targetSid, "friend-request-declined", { friendId: myHandle });
}

/**
 * Handle "friend-alias-set": update the calling user's alias for a friend.
 */
async function handleFriendAliasSet(socket, myHandle, friendId, alias) {
  const targetHandle = stripPrefix(friendId);
  const friendship = await findAcceptedFriendship(myHandle, targetHandle);

  if (!friendship) {
    socket.emit("error", { code: "NOT_FRIENDS", message: "Not friends with this user" });
    return;
  }

  const trimmedAlias = alias ? alias.trim().slice(0, 30) : "";
  if (friendship.requester === myHandle) {
    friendship.requesterAlias = trimmedAlias;
  } else {
    friendship.receiverAlias = trimmedAlias;
  }

  await friendship.save();
  logger.info(`Friend alias updated: ${myHandle} set alias for ${targetHandle} to "${alias}"`);

  // Refresh the caller's friend list
  await emitFriendRequestsList(socket, myHandle);
}

// ─── Attach handlers ──────────────────────────────────────────────────────────

/**
 * Attach all friendship-related event listeners.
 * @param {import('socket.io').Socket} socket
 * @param {function(): boolean} ensureRegistered
 */
export function attachFriendshipHandlers(socket, ensureRegistered) {
  socket.on("friend-request-send", async ({ toUserId }) => {
    if (!ensureRegistered()) return;
    const myHandle = getHandle(socket.sessionId);
    try {
      await handleFriendRequestSend(socket, myHandle, toUserId);
    } catch (e) {
      logger.error("Friend request send failed: " + e.message);
      socket.emit("error", { code: "REQ_FAILED", message: "Failed to send request" });
    }
  });

  socket.on("friend-request-accept", async ({ fromUserId }) => {
    if (!ensureRegistered()) return;
    const myHandle = getHandle(socket.sessionId);
    try {
      await handleFriendRequestAccept(socket, myHandle, fromUserId);
    } catch (e) {
      logger.error("Accept request failed: " + e.message);
    }
  });

  socket.on("friend-request-decline", async ({ fromUserId }) => {
    if (!ensureRegistered()) return;
    const myHandle = getHandle(socket.sessionId);
    try {
      await handleFriendRequestDecline(socket, myHandle, fromUserId);
    } catch (e) {
      logger.error("Decline request failed: " + e.message);
    }
  });

  socket.on("friend-requests-get", async () => {
    if (!ensureRegistered()) return;
    const myHandle = getHandle(socket.sessionId);
    try {
      await emitFriendRequestsList(socket, myHandle);
    } catch (e) {
      logger.error("Fetch requests failed: " + e.message);
    }
  });

  socket.on("friend-alias-set", async ({ friendId, alias }) => {
    if (!ensureRegistered()) return;
    const myHandle = getHandle(socket.sessionId);
    try {
      await handleFriendAliasSet(socket, myHandle, friendId, alias);
    } catch (e) {
      logger.error("Set friend alias failed: " + e.message);
      socket.emit("error", { code: "ALIAS_FAILED", message: "Failed to set alias" });
    }
  });

  socket.on("policy-accepted", async () => {
    if (!ensureRegistered()) return;
    try {
      await Consent.updateOne({ sessionId: socket.sessionId }, { createdAt: new Date() });
      logger.info(`User ${socket.sessionId} accepted updated policies.`);
    } catch (e) {
      logger.error("Failed to update policy consent date: " + e.message);
    }
  });
}
