/**
 * routes/adminRoutes.js
 *
 * Exposes routes for admin OTP authentication, login, and dashboard telemetry/data access.
 */
import express from "express";
import crypto from "crypto";
import nodemailer from "nodemailer";
import Consent from "../models/Consent.js";
import Message from "../models/Message.js";
import AdminOTP from "../models/AdminOTP.js";
import ConnectionHistory from "../models/ConnectionHistory.js";
import { activeUsers, getHandle } from "../socket/store.js";
import {
  requireAdminAuth,
  signAdminToken,
  signOTPToken,
  verifyOTPToken
} from "../middleware/adminAuth.js";
import logger from "../logger.js";

const router = express.Router();

// ─── Nodemailer Setup ─────────────────────────────────────────────────────────

function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "sandbox.smtp.mailtrap.io",
    port: parseInt(process.env.SMTP_PORT || "2525", 10),
    auth: { user, pass },
  });
}

// ─── Auth Endpoints ───────────────────────────────────────────────────────────

/**
 * Send OTP (always 123456 for testing as requested).
 * Route: POST /admin/otp/send
 */
router.post("/otp/send", async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "A valid email is required" });
  }

  try {
    const testOtp = "123456";
    const otpHash = crypto.createHash("sha256").update(testOtp).digest("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes TTL

    // Upsert the OTP document
    await AdminOTP.findOneAndUpdate(
      { email: email.toLowerCase() },
      { otpHash, expiresAt },
      { upsert: true, new: true }
    );

    const transporter = getTransporter();
    if (transporter) {
      const mailOptions = {
        from: '"Talkative Admin" <noreply@talkative.co.in>',
        to: email,
        subject: "Talkative Admin Panel - Verification OTP",
        text: `Your one-time passcode (OTP) for accessing the Talkative Admin Panel is: ${testOtp}\n\nThis OTP is valid for 5 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #6366f1; text-align: center;">Verification Required</h2>
            <p>You have requested access to the Talkative Admin Panel.</p>
            <p>Please enter the following One-Time Passcode (OTP) to proceed with login:</p>
            <div style="background-color: #f3f4f6; text-align: center; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #1f2937; margin: 20px 0; border-radius: 4px;">
              ${testOtp}
            </div>
            <p style="color: #6b7280; font-size: 12px; text-align: center;">This OTP is valid for 5 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      logger.info(`Verification OTP sent via Mailtrap to: ${email}`);
    } else {
      logger.warn(`SMTP credentials not set. Simulated OTP email sending for: ${email}`);
    }

    // Always log OTP for easy testing
    console.log(`\n--- [ADMIN OTP SIMULATION] Email: ${email} | OTP: ${testOtp} ---\n`);

    return res.json({ success: true, message: "OTP sent successfully (Check Mailtrap/Server Logs)" });
  } catch (err) {
    logger.error("OTP send error: " + err.message);
    return res.status(500).json({ error: "Failed to process OTP request" });
  }
});

/**
 * Verify OTP
 * Route: POST /admin/otp/verify
 */
router.post("/otp/verify", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  try {
    const formattedEmail = email.toLowerCase();
    const hash = crypto.createHash("sha256").update(otp).digest("hex");

    // Master override for the test OTP requested by the user
    const isMasterOtp = otp === "123456";

    const otpDoc = await AdminOTP.findOne({ email: formattedEmail });
    if (!isMasterOtp && (!otpDoc || otpDoc.otpHash !== hash || otpDoc.expiresAt < new Date())) {
      return res.status(400).json({ error: "Invalid or expired verification OTP" });
    }

    // Clean up OTP document on successful verify
    if (otpDoc) {
      await AdminOTP.deleteOne({ _id: otpDoc._id });
    }

    // Generate a temporary 10-minute token proving OTP verification
    const otpToken = signOTPToken(formattedEmail);
    return res.json({ success: true, otpToken });
  } catch (err) {
    logger.error("OTP verification error: " + err.message);
    return res.status(500).json({ error: "Failed to verify OTP" });
  }
});

/**
 * Credentials Login (Admin user: admin / admin@123)
 * Route: POST /admin/login
 */
router.post("/login", async (req, res) => {
  const { username, password, otpToken } = req.body;
  if (!username || !password || !otpToken) {
    return res.status(400).json({ error: "Username, password and OTP token are required" });
  }

  // 1. Verify OTP token
  const otpPayload = verifyOTPToken(otpToken);
  if (!otpPayload || !otpPayload.otpVerified) {
    return res.status(401).json({ error: "OTP validation expired or invalid. Please request a new OTP." });
  }

  // 2. Validate Credentials
  const expectedUser = process.env.ADMIN_USERNAME || "admin";
  const expectedPass = process.env.ADMIN_PASSWORD || "admin@123";

  if (username !== expectedUser || password !== expectedPass) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  // 3. Generate fully authenticated JWT
  const token = signAdminToken(username);
  return res.json({ success: true, token });
});

// ─── Data Access Endpoints (Gated by Admin JWT) ───────────────────────────────

/**
 * Retrieve admin stats
 * Route: GET /admin/stats
 */
router.get("/stats", requireAdminAuth, async (req, res) => {
  try {
    const totalSessions = await Consent.countDocuments();
    const totalMessages = await Message.countDocuments();
    const onlineCount = activeUsers.size;

    return res.json({
      success: true,
      stats: {
        totalSessions,
        totalMessages,
        onlineCount,
      },
    });
  } catch (err) {
    logger.error("Stats fetching error: " + err.message);
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
});

/**
 * Retrieve paginated and searchable consent sessions
 * Route: GET /admin/sessions
 */
router.get("/sessions", requireAdminAuth, async (req, res) => {
  const page = parseInt(req.query.page || "1", 10);
  const limit = parseInt(req.query.limit || "20", 10);
  const search = req.query.search || "";

  const query = {};
  if (search) {
    query.$or = [
      { sessionId: { $regex: search, $options: "i" } },
      { handle: { $regex: search, $options: "i" } },
      { ip: { $regex: search, $options: "i" } },
    ];
  }

  try {
    const total = await Consent.countDocuments(query);
    const sessions = await Consent.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.json({
      success: true,
      data: sessions,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error("Sessions listing error: " + err.message);
    return res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

/**
 * Retrieve paginated and searchable messages
 * Route: GET /admin/messages
 */
router.get("/messages", requireAdminAuth, async (req, res) => {
  const page = parseInt(req.query.page || "1", 10);
  const limit = parseInt(req.query.limit || "20", 10);
  const search = req.query.search || "";

  const query = {};
  if (search) {
    query.$or = [
      { senderId: { $regex: search, $options: "i" } },
      { receiverId: { $regex: search, $options: "i" } },
      { text: { $regex: search, $options: "i" } },
    ];
  }

  try {
    const total = await Message.countDocuments(query);
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.json({
      success: true,
      data: messages,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error("Messages listing error: " + err.message);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/**
 * Retrieve all messages for a specific session ID (identifying the user via handle)
 * Route: GET /admin/sessions/:sessionId/messages
 */
router.get("/sessions/:sessionId/messages", requireAdminAuth, async (req, res) => {
  const { sessionId } = req.params;

  try {
    // 1. Resolve session handle (either direct handle look up or derive SHA-256)
    const consent = await Consent.findOne({ sessionId });
    const handle = consent?.handle || getHandle(sessionId);

    if (!handle) {
      return res.status(404).json({ error: "Session handle could not be resolved" });
    }

    // 2. Query all messages where this handle is sender or receiver
    const logs = await Message.find({
      $or: [{ senderId: handle }, { receiverId: handle }],
    }).sort({ createdAt: 1 });

    return res.json({
      success: true,
      handle,
      sessionId,
      messages: logs,
    });
  } catch (err) {
    logger.error(`Session messages fetch error for ${sessionId}: ${err.message}`);
    return res.status(500).json({ error: "Failed to fetch chat logs for session" });
  }
});

/**
 * Retrieve location history for a specific session ID
 * Route: GET /admin/sessions/:sessionId/location-history
 */
router.get("/sessions/:sessionId/location-history", requireAdminAuth, async (req, res) => {
  const { sessionId } = req.params;

  try {
    const history = await ConnectionHistory.find({ sessionId }).sort({ createdAt: -1 });
    return res.json({
      success: true,
      sessionId,
      history,
    });
  } catch (err) {
    logger.error(`Session location history fetch error for ${sessionId}: ${err.message}`);
    return res.status(500).json({ error: "Failed to fetch location history for session" });
  }
});

export default router;
