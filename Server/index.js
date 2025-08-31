import express from "express";
import mongoose from "mongoose";
import http from "http";
import https from "https";
import fs from "fs";

import {
    Server
} from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import logger from "./logger.js";

import consentRoutes from "./routes/consentRoutes.js";
import socketHandler from "./socket/socketHandler.js";

dotenv.config();

const app = express();
let server;

// ✅ Toggle between HTTP & HTTPS
if (process.env.USE_SSL === "true") {
    const httpsOptions = {
        key: fs.readFileSync(process.env.SSL_KEY_FILE),
        cert: fs.readFileSync(process.env.SSL_CERT_FILE),
    };
    server = https.createServer(httpsOptions, app);
    logger.info("🔐 HTTPS server enabled");
} else {
    server = http.createServer(app);
    logger.info("🌐 HTTP server enabled");
}

// ✅ Socket.io setup
const io = new Server(server, {
            cors: {
        origin: process.env.CORS_ORIGIN || "https://api.talkative.co.in",
            methods: ["GET", "POST"],
            credentials: true,
        },
});

// ✅ Middleware
app.use(express.json());
app.use(
    cors({
        origin: process.env.FRONTEND_ORIGIN || "https://talkative.co.in",
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true,
    })
);

// ✅ Routes
app.use("/consent", consentRoutes);

// ✅ MongoDB Connection
try {
    await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    logger.info("✅ MongoDB connected successfully");
} catch (err) {
    logger.error("❌ MongoDB connection error: " + err.message);
}

// DB events
mongoose.connection.on("connected", () => {
    logger.info("🔗 Mongoose connected to DB");
});
mongoose.connection.on("error", (err) => {
    logger.error("⚠️ Mongoose error: " + err.message);
});
mongoose.connection.on("disconnected", () => {
    logger.warn("❌ Mongoose disconnected");
});

// Graceful shutdown
process.on("SIGINT", async () => {
    await mongoose.connection.close();
    logger.info("🛑 Mongoose closed due to app termination");
    process.exit(0);
});

// ✅ Socket.io handler
socketHandler(io);

// ✅ Start server
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";

server.listen(PORT, HOST, () => {
            logger.info(
                `🚀 Server running on ${process.env.USE_SSL === "true" ? "https" : "http"}://${HOST}:${PORT}`
            );
});
