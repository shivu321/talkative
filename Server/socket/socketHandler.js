// socket/socketHandler.js
import { v4 as uuidv4 } from "uuid";
import logger from "../logger.js";
import Message from "../models/Message.js";
import Friendship from "../models/Friendship.js";
import Consent from "../models/Consent.js";

const activeUsers = new Map(); // sessionId -> { socket, status, roomId?, mode? }
let queue = []; // array of sessionIds (we dedupe proactively)
const rooms = new Map(); // roomId -> { a:{socket,sessionId}, b:{socket,sessionId}, mode }
let matchScheduled = false;

function socketHandler(io) {
  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    const ensureRegistered = () => {
      const sid = socket.sessionId;
      if (!sid) return false;
      const state = activeUsers.get(sid);
      return !!(state && state.socket.id === socket.id);
    };

    // 1) Register user
    socket.on("register", ({ sessionId }) => {
      if (!sessionId) {
        return socket.emit("error", {
          code: "NO_SESSION",
          message: "sessionId required",
        });
      }

      const existing = activeUsers.get(sessionId);
      if (existing && existing.socket.id !== socket.id) {
        // remove from queue
        queue = queue.filter((sid) => sid !== sessionId);
        // if in room, teardown partner
        if (existing.status === "busy" && existing.roomId) {
          const roomId = existing.roomId;
          const room = rooms.get(roomId);
          if (room) {
            const partner = room.a.sessionId === sessionId ? room.b : room.a;
            partner.socket.emit("partner-left");
            partner.socket.leave(roomId);
            activeUsers.set(partner.sessionId, {
              socket: partner.socket,
              status: "idle",
              mode: partner.socket.mode || "video",
            });
            rooms.delete(roomId);
            logger.info(
              `Room ${roomId} closed due to duplicate login for ${sessionId}`
            );
          }
        }
        // disconnect previous socket
        try {
          existing.socket.disconnect(true);
        } catch {}
      }

      socket.sessionId = sessionId;
      if (!socket.mode) socket.mode = "video";

      activeUsers.set(sessionId, {
        socket,
        status: "idle",
        mode: socket.mode,
      });
      logger.info(`User registered: sessionId=${sessionId}`);
      socket.emit("registered", {
        sessionId,
      });

      // Check for updated policy consent
      Consent.findOne({ sessionId })
        .then((consentDoc) => {
          if (consentDoc) {
            // Save gender to active user state
            const state = activeUsers.get(sessionId);
            if (state) {
              state.gender = consentDoc.gender || "other";
              activeUsers.set(sessionId, state);
            }

            const policyUpdateDate = new Date("2026-06-07T00:00:00.000Z");
            if (consentDoc.createdAt < policyUpdateDate) {
              socket.emit("policy-updated-notification", {
                message: "Notice: Our Privacy Policy and Terms & Conditions were updated on June 7, 2026. Please review and accept the new terms.",
                updatedAt: "2026-06-07T00:00:00.000Z"
              });
            }
          }
        })
        .catch((err) => logger.error("Consent check failed: " + err.message));

      const totalOnline = activeUsers.size;
      io.emit("onlineCount", { total: totalOnline });
    });

    // 2) Join matchmaking queue
    socket.on("joinQueue", ({ sessionId, mode = "video" }) => {
      if (!sessionId)
        return socket.emit("error", {
          code: "NOT_REGISTERED",
          message: "Register first",
        });
      if (!socket.sessionId) socket.sessionId = sessionId;

      const user = activeUsers.get(sessionId);
      if (!user || user.socket.id !== socket.id) {
        return socket.emit("error", {
          code: "NOT_REGISTERED",
          message: "Register first",
        });
      }
      if (user.status === "busy") {
        return socket.emit("error", {
          code: "IN_CHAT",
          message: "Already in chat",
        });
      }

      const finalMode = mode || "video";
      socket.mode = finalMode;

      // If already queued, just confirm and schedule matching
      if (user.status === "queued") {
        activeUsers.set(sessionId, {
          socket,
          status: "queued",
          mode: finalMode,
        });
        dedupePushQueue(sessionId);
        socket.emit("queued");
        scheduleMatch();
        return;
      }

      // Move to queued
      activeUsers.set(sessionId, {
        socket,
        status: "queued",
        mode: finalMode,
      });
      dedupePushQueue(sessionId);

      socket.emit("queued");
      logger.info(`User queued: ${sessionId} | mode=${finalMode}`);

      scheduleMatch();
    });

    // Allow clients to leave queue without disconnecting
    socket.on("leaveQueue", () => {
      if (!ensureRegistered()) return;
      const sid = socket.sessionId;
      queue = queue.filter((id) => id !== sid);
      const state = activeUsers.get(sid);
      if (state?.status === "queued") {
        activeUsers.set(sid, {
          socket,
          status: "idle",
          mode: socket.mode || state.mode || "video",
        });
      }
      socket.emit("leftQueue");
      logger.info(`User left queue: ${sid}`);
    });

    // 3) Send chat message
    socket.on("message", async ({ roomId, text }) => {
      if (!ensureRegistered())
        return socket.emit("error", {
          code: "NOT_REGISTERED",
          message: "Register first",
        });
      if (!text?.trim()) return;

      const room = rooms.get(roomId);
      if (!room) return;
      const senderIsA = room.a.socket.id === socket.id;
      const senderIsB = room.b.socket.id === socket.id;
      if (!senderIsA && !senderIsB) return;

      const partner = senderIsA ? room.b : room.a;

      try {
        const doc = new Message({
          senderId: socket.sessionId,
          receiverId: partner.sessionId,
          text: text.trim(),
        });
        await doc.save();

        io.to(roomId).emit("message", {
          from: socket.sessionId,
          text: text.trim(),
          createdAt: doc.createdAt,
        });
      } catch (e) {
        logger.error("Message save failed: " + e.message);
        socket.emit("error", {
          code: "MSG_FAILED",
          message: "Failed to send message",
        });
      }
    });

    // 4) Typing indicator
    socket.on("typing", ({ roomId, typing }) => {
      if (!ensureRegistered()) return;
      const room = rooms.get(roomId);
      if (!room) return;
      const senderIsA = room.a.socket.id === socket.id;
      const senderIsB = room.b.socket.id === socket.id;
      if (!senderIsA && !senderIsB) return;
      const partner = senderIsA ? room.b : room.a;
      partner.socket.emit("typing", {
        from: socket.sessionId,
        typing: !!typing,
      });
    });

    // 5) Next / end chat
    socket.on("next", () => {
      if (!ensureRegistered())
        return socket.emit("error", {
          code: "NOT_REGISTERED",
          message: "Register first",
        });
      const state = activeUsers.get(socket.sessionId);
      leaveCurrentRoom(state, socket);

      // Rejoin queue automatically
      const mode = socket.mode || state?.mode || "video";
      activeUsers.set(socket.sessionId, {
        socket,
        status: "queued",
        mode,
      });
      dedupePushQueue(socket.sessionId);
      socket.emit("queued");

      scheduleMatch();
    });

    // 6) WebRTC signaling
    socket.on("webrtc-offer", ({ to, sdp }) => {
      if (!ensureRegistered()) return;
      relay(to, "webrtc-offer", {
        from: socket.sessionId,
        sdp,
      });
    });
    socket.on("webrtc-answer", ({ to, sdp }) => {
      if (!ensureRegistered()) return;
      relay(to, "webrtc-answer", {
        from: socket.sessionId,
        sdp,
      });
    });
    socket.on("webrtc-ice", ({ to, candidate }) => {
      if (!ensureRegistered()) return;
      relay(to, "webrtc-ice", {
        from: socket.sessionId,
        candidate,
      });
    });

    // ==========================================================================
    // Friendship System Socket Events
    // ==========================================================================

    // a) Send friend request
    socket.on("friend-request-send", async ({ toUserId }) => {
      if (!ensureRegistered()) return;
      const sid = socket.sessionId;
      if (!toUserId) return;

      const targetId = toUserId.replace(/^talkative_/, "").trim();

      if (sid === targetId) {
        return socket.emit("error", { code: "SELF_REQ", message: "You cannot add yourself" });
      }

      try {
        const targetUser = await Consent.findOne({ sessionId: targetId });
        if (!targetUser) {
          return socket.emit("error", { code: "USER_NOT_FOUND", message: "User handle not found" });
        }

        let friendship = await Friendship.findOne({
          $or: [
            { requester: sid, receiver: targetId },
            { requester: targetId, receiver: sid }
          ]
        });

        if (friendship) {
          if (friendship.status === "accepted") {
            return socket.emit("error", { code: "ALREADY_FRIENDS", message: "Already friends" });
          } else if (friendship.requester === sid) {
            return socket.emit("error", { code: "REQ_PENDING", message: "Friend request already sent" });
          } else {
            friendship.status = "accepted";
            await friendship.save();
            socket.emit("friend-request-accepted", { friendId: targetId });
            relay(targetId, "friend-request-accepted", { friendId: sid });
            return;
          }
        }

        friendship = new Friendship({
          requester: sid,
          receiver: targetId,
          status: "pending"
        });
        await friendship.save();

        logger.info(`Friend request sent: ${sid} -> ${targetId}`);
        socket.emit("friend-request-sent-success", { toUserId: targetId });
        relay(targetId, "friend-request-received", { fromUserId: sid });
      } catch (e) {
        logger.error("Friend request failed: " + e.message);
        socket.emit("error", { code: "REQ_FAILED", message: "Failed to send request" });
      }
    });

    // b) Accept friend request
    socket.on("friend-request-accept", async ({ fromUserId }) => {
      if (!ensureRegistered()) return;
      const sid = socket.sessionId;
      const targetId = fromUserId.replace(/^talkative_/, "").trim();

      try {
        const friendship = await Friendship.findOne({
          requester: targetId,
          receiver: sid,
          status: "pending"
        });

        if (!friendship) {
          return socket.emit("error", { code: "REQ_NOT_FOUND", message: "No pending request found" });
        }

        friendship.status = "accepted";
        await friendship.save();

        logger.info(`Friend request accepted: ${targetId} <-> ${sid}`);
        socket.emit("friend-request-accepted", { friendId: targetId });
        relay(targetId, "friend-request-accepted", { friendId: sid });
      } catch (e) {
        logger.error("Accept request failed: " + e.message);
      }
    });

    // c) Decline / Cancel request
    socket.on("friend-request-decline", async ({ fromUserId }) => {
      if (!ensureRegistered()) return;
      const sid = socket.sessionId;
      const targetId = fromUserId.replace(/^talkative_/, "").trim();

      try {
        await Friendship.deleteOne({
          $or: [
            { requester: targetId, receiver: sid, status: "pending" },
            { requester: sid, receiver: targetId, status: "pending" }
          ]
        });
        socket.emit("friend-request-declined", { friendId: targetId });
        relay(targetId, "friend-request-declined", { friendId: sid });
      } catch (e) {
        logger.error("Decline request failed: " + e.message);
      }
    });

    // d) Get requests lists
    socket.on("friend-requests-get", async () => {
      if (!ensureRegistered()) return;
      const sid = socket.sessionId;

      try {
        const requests = await Friendship.find({
          $or: [{ requester: sid }, { receiver: sid }]
        });

        const sent = requests.filter(r => r.requester === sid && r.status === "pending").map(r => r.receiver);
        const received = requests.filter(r => r.receiver === sid && r.status === "pending").map(r => r.requester);
        const friends = requests.filter(r => r.status === "accepted").map(r => r.requester === sid ? r.receiver : r.requester);

        socket.emit("friend-requests-list", { sent, received, friends });
      } catch (e) {
        logger.error("Fetch requests failed: " + e.message);
      }
    });

    // d2) Accept updated policy consent
    socket.on("policy-accepted", async () => {
      if (!ensureRegistered()) return;
      const sid = socket.sessionId;
      try {
        await Consent.updateOne({ sessionId: sid }, { createdAt: new Date() });
        logger.info(`User ${sid} accepted updated policies.`);
      } catch (e) {
        logger.error("Failed to update policy consent date: " + e.message);
      }
    });

    // e) Initialize friend chat session
    socket.on("friend-chat-init", async ({ friendId }) => {
      if (!ensureRegistered()) return;
      const sid = socket.sessionId;
      const targetId = friendId.replace(/^talkative_/, "").trim();

      try {
        const friendship = await Friendship.findOne({
          $or: [
            { requester: sid, receiver: targetId, status: "accepted" },
            { requester: targetId, receiver: sid, status: "accepted" }
          ]
        });

        const targetConsent = await Consent.findOne({ sessionId: targetId });
        const targetGender = targetConsent?.gender || "other";

        const chatLogs = await Message.find({
          $or: [
            { senderId: sid, receiverId: targetId },
            { senderId: targetId, receiverId: sid }
          ]
        }).sort({ createdAt: 1 });

        const formattedLogs = chatLogs.map(m => ({
          from: m.senderId === sid ? "me" : m.senderId,
          text: m.text,
          createdAt: m.createdAt
        }));

        if (!friendship) {
          return socket.emit("friend-chat-init-response", {
            isFriend: false,
            friendId: targetId,
            messages: [],
            isOnline: false
          });
        }

        const friendState = activeUsers.get(targetId);
        const isOnline = !!(friendState && friendState.socket?.connected);

        if (isOnline) {
          const roomId = [sid, targetId].sort().join("_");
          
          socket.join(roomId);
          friendState.socket.join(roomId);

          rooms.set(roomId, {
            a: { socket, sessionId: sid },
            b: { socket: friendState.socket, sessionId: targetId },
            mode: "chat"
          });

          // Preserve existing activeUsers fields including gender
          const myCurrentState = activeUsers.get(sid) || {};
          const friendCurrentState = activeUsers.get(targetId) || {};

          activeUsers.set(sid, { ...myCurrentState, socket, status: "busy", roomId, mode: "chat" });
          activeUsers.set(targetId, { ...friendCurrentState, socket: friendState.socket, status: "busy", roomId, mode: "chat" });

          socket.emit("friend-chat-init-response", {
            isFriend: true,
            friendId: targetId,
            messages: formattedLogs,
            isOnline: true,
            roomId,
            partnerGender: targetGender
          });

          // Reuse the core "matched" event so client matching loads the history cleanly
          socket.emit("matched", {
            roomId,
            partnerId: targetId,
            mode: "chat",
            messages: formattedLogs,
            isFriendChat: true,
            partnerGender: targetGender
          });

          friendState.socket.emit("matched", {
            roomId,
            partnerId: sid,
            mode: "chat",
            messages: formattedLogs,
            isFriendChat: true,
            partnerGender: myCurrentState.gender || "other"
          });
        } else {
          socket.emit("friend-chat-init-response", {
            isFriend: true,
            friendId: targetId,
            messages: formattedLogs,
            isOnline: false,
            partnerGender: targetGender
          });
        }
      } catch (e) {
        logger.error("Friend chat init failed: " + e.message);
      }
    });

    // 7) Disconnect
    socket.on("disconnect", () => {
      // prune from queue
      queue = queue.filter((sid) => {
        const u = activeUsers.get(sid);
        return u?.socket?.id !== socket.id;
      });

      const state = activeUsers.get(socket.sessionId);
      leaveCurrentRoom(state, socket);

      if (socket.sessionId) activeUsers.delete(socket.sessionId);
      logger.warn(`Socket disconnected: ${socket.id}`);
    });
  });

  function leaveCurrentRoom(state, socket) {
    if (!state || state.status !== "busy" || !state.roomId) return;
    const roomId = state.roomId;
    const room = rooms.get(roomId);
    if (!room) return;

    const isA = room.a.socket.id === socket.id;
    const partner = isA ? room.b : room.a;

    partner.socket.emit("partner-left");
    partner.socket.leave(roomId);
    activeUsers.set(partner.sessionId, {
      socket: partner.socket,
      status: "idle",
      mode: partner.socket.mode || "video",
    });

    socket.leave(roomId);
    activeUsers.set(socket.sessionId, {
      socket,
      status: "idle",
      mode: socket.mode || "video",
    });

    rooms.delete(roomId);
    logger.info(
      `Room ${roomId} closed. ${socket.sessionId} left; ${partner.sessionId} idle.`
    );
  }

  function scheduleMatch() {
    if (matchScheduled) return;
    matchScheduled = true;
    // Let the event loop settle to coalesce multiple joinQueue calls
    setImmediate(() => {
      matchScheduled = false;
      tryMatchFromQueue();
    });
  }

  function dedupePushQueue(sessionId) {
    if (!queue.includes(sessionId)) queue.push(sessionId);
  }

  function tryMatchFromQueue() {
    // filter valid queued users and ensure they still exist
    const validQueued = queue.filter((sid, idx, arr) => {
      if (arr.indexOf(sid) !== idx) return false;
      const u = activeUsers.get(sid);
      return !!(u && u.status === "queued" && u.socket?.connected);
    });

    if (validQueued.length < 2) return;

    // build buckets by mode
    const byMode = new Map();
    for (const sid of validQueued) {
      const u = activeUsers.get(sid);
      const m = u?.mode || "video";
      if (!byMode.has(m)) byMode.set(m, []);
      byMode.get(m).push(sid);
    }

    // try to match exhaustively across modes
    for (const [mode, sids] of byMode.entries()) {
      // shuffle Fisher-Yates
      for (let i = sids.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [sids[i], sids[j]] = [sids[j], sids[i]];
      }

      while (sids.length >= 2) {
        const aSid = sids.pop();
        const bSid = sids.pop();

        const aState = activeUsers.get(aSid);
        const bState = activeUsers.get(bSid);
        if (!aState || !bState) continue;
        if (aState.status !== "queued" || bState.status !== "queued") continue;
        if (!aState.socket?.connected || !bState.socket?.connected) continue;

        const sa = aState.socket;
        const sb = bState.socket;
        const roomId = uuidv4();

        sa.join(roomId);
        sb.join(roomId);

        rooms.set(roomId, {
          a: {
            socket: sa,
            sessionId: sa.sessionId,
          },
          b: {
            socket: sb,
            sessionId: sb.sessionId,
          },
          mode,
        });

        const myGender = aState.gender || "other";
        const partnerGender = bState.gender || "other";

        activeUsers.set(sa.sessionId, {
          ...aState,
          status: "busy",
          roomId,
          mode,
        });
        activeUsers.set(sb.sessionId, {
          ...bState,
          status: "busy",
          roomId,
          mode,
        });

        // Remove matched users from queue
        queue = queue.filter(
          (sid) => sid !== sa.sessionId && sid !== sb.sessionId
        );

        // Emit matched to both
        sa.emit("matched", {
          roomId,
          partnerId: sb.sessionId,
          partnerGender: partnerGender,
          mode,
        });
        sb.emit("matched", {
          roomId,
          partnerId: sa.sessionId,
          partnerGender: myGender,
          mode,
        });

        logger.info(
          `Room created ${roomId} for ${sa.sessionId} & ${sb.sessionId} | mode=${mode}`
        );
      }
    }
  }

  // Socket utility relayer
  function relay(toSessionId, event, payload) {
    const dest = activeUsers.get(toSessionId)?.socket;
    if (!dest) return;
    dest.emit(event, payload);
  }
}

export default socketHandler;
