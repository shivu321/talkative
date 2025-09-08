// socket/socketHandler.js
import { v4 as uuidv4 } from "uuid";
import logger from "../logger.js";
import Message from "../models/Message.js";

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

        activeUsers.set(sa.sessionId, {
          socket: sa,
          status: "busy",
          roomId,
          mode,
        });
        activeUsers.set(sb.sessionId, {
          socket: sb,
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
          mode,
        });
        sb.emit("matched", {
          roomId,
          partnerId: sa.sessionId,
          mode,
        });

        logger.info(
          `Room created ${roomId} for ${sa.sessionId} & ${sb.sessionId} | mode=${mode}`
        );
      }
    }
  }

  function relay(toSessionId, event, payload) {
    const dest = activeUsers.get(toSessionId)?.socket;
    if (!dest) return;
    dest.emit(event, payload);
  }
}

export default socketHandler;
