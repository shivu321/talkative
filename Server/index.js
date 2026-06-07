import express from "express";
import mongoose from "mongoose";
import {
    createServer
} from "http";
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
const httpServer = createServer(app);
const allowedOrigins = [
    process.env.CLIENT_ORIGIN,
    "http://localhost:5173",
    "http://localhost:5174",
    "https://talkative.co.in"
].filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || origin.startsWith("http://localhost:")) {
            return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
};

const io = new Server(httpServer, {
    cors: {
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin) || origin.startsWith("http://localhost:")) {
                return callback(null, true);
            }
            return callback(new Error("Not allowed by CORS"));
        },
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    },
});

// Middleware
app.use(express.json());
app.use(cors(corsOptions));

// Routes
app.use("/consent", consentRoutes);

// ✅ MongoDB Connection
try {
    await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    logger.info("MongoDB connected successfully");
} catch (err) {
    logger.error("MongoDB connection error: " + err.message);
}

// DB events
mongoose.connection.on("connected", () => {
    logger.info("Mongoose connected to DB");
});
mongoose.connection.on("error", (err) => {
    logger.error("Mongoose error: " + err.message);
});
mongoose.connection.on("disconnected", () => {
    logger.warn("Mongoose disconnected");
});

// Graceful shutdown
process.on("SIGINT", async () => {
    await mongoose.connection.close();
    logger.info("Mongoose closed due to app termination");
    process.exit(0);
});

// ✅ Socket.io
socketHandler(io);

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
            logger.info(`🚀 Server running on http://localhost:${PORT}`);
});