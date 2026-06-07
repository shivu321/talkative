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
app.disable("x-powered-by"); // Security: Disable signature disclosures

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

// Security: Custom in-memory rate-limiter middleware for consent route (preventing abuse/flooding)
const rateLimitWindow = 15 * 60 * 1000; // 15 minutes
const rateLimitMax = 100; // Limit each IP to 100 requests per window
const ipRequestMap = new Map();

const rateLimiter = (req, res, next) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const now = Date.now();
    
    if (!ipRequestMap.has(ip)) {
        ipRequestMap.set(ip, []);
    }
    
    const timestamps = ipRequestMap.get(ip).filter(t => now - t < rateLimitWindow);
    timestamps.push(now);
    ipRequestMap.set(ip, timestamps);
    
    if (timestamps.length > rateLimitMax) {
        logger.warn(`Rate limit exceeded for IP: ${ip}`);
        return res.status(429).json({ message: "Too many requests. Please try again later." });
    }
    next();
};

// Middleware
app.use(express.json({ limit: "10kb" })); // Security: Limit body size to prevent JSON DoS
app.use(cors(corsOptions));

// Routes
app.use("/consent", rateLimiter, consentRoutes);

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