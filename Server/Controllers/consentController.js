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
