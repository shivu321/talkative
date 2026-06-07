import {
    v4 as uuid
} from "uuid";
import Consent from "../models/Consent.js";
import logger from "../logger.js";
import crypto from "crypto";

export const saveConsent = async (req, res) => {
    try {
        logger.info("Received consent request");

        const {
            is18Plus,
            acceptedPrivacyPolicy,
            acceptedTerms,
            sessionId,
            gender
        } = req.body;

        // Security validation to prevent NoSQL injection and parameter pollution
        if (!sessionId || typeof sessionId !== "string" || sessionId.length > 50 || !/^[A-Za-z0-9]+$/.test(sessionId)) {
            logger.warn("Consent request with invalid or malicious sessionId format");
            return res.status(400).json({
                message: "Invalid session ID format"
            });
        }

        if (!gender || !["male", "female", "other"].includes(gender)) {
            return res.status(400).json({
                message: "Gender selection is required"
            });
        }

        if (!is18Plus || !acceptedPrivacyPolicy || !acceptedTerms) {
            logger.warn("Consent missing fields");
            return res.status(400).json({
                message: "All consents required"
            });
        }


        // Check if consent already exists
        let existingConsent = await Consent.findOne({
            sessionId
        });
        if (existingConsent) {
            existingConsent.gender = gender;
            existingConsent.handle = crypto.createHash("sha256").update(sessionId).digest("hex").slice(0, 12);
            await existingConsent.save();
            logger.info(`Consent already exists for sessionId=${sessionId}, updated gender and handle`);
            return res.status(200).json({
                success: true,
                sessionId: existingConsent?.sessionId,
                handle: existingConsent?.handle,
                message: "Consent already registered"
            });
        }

        const handle = crypto.createHash("sha256").update(sessionId).digest("hex").slice(0, 12);
        // Create new consent only if it does not exist
        const consent = new Consent({
            sessionId,
            is18Plus,
            acceptedPrivacyPolicy,
            acceptedTerms,
            gender,
            handle,
            ip: req.ip,
            userAgent: req.headers["user-agent"],
        });

        await consent.save();
        logger.info(`Consent saved for sessionId=${consent.sessionId}, handle=${consent.handle}`);

        res.status(201).json({
            success: true,
            sessionId: consent.sessionId,
            handle: consent.handle
        });
    } catch (e) {
        logger.error("Consent save failed: " + e.message);
        res.status(500).json({
            error: e.message
        });
    }
}; // End of saveConsent controller

export const restoreSession = async (req, res) => {
    try {
        let { handle } = req.body;
        if (!handle || typeof handle !== "string") {
            return res.status(400).json({ message: "Handle is required" });
        }
        
        // Remove prefix if present
        let cleanHandle = handle.trim();
        if (cleanHandle.startsWith("talkative_")) {
            cleanHandle = cleanHandle.substring("talkative_".length);
        }
        cleanHandle = cleanHandle.toLowerCase();

        if (!/^[a-z0-9]{12}$/.test(cleanHandle)) {
            return res.status(400).json({
                message: "Invalid handle format. Must be talkative_ followed by 12 characters."
            });
        }

        const consent = await Consent.findOne({ handle: cleanHandle });
        if (!consent) {
            return res.status(404).json({
                message: "Handle not found in system"
            });
        }

        logger.info(`Session restored for handle=${cleanHandle}`);
        return res.status(200).json({
            success: true,
            sessionId: consent.sessionId,
            message: "Session restored successfully"
        });
    } catch (e) {
        logger.error("Session restore failed: " + e.message);
        res.status(500).json({
            error: e.message
        });
    }
};

