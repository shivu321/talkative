import {
    v4 as uuid
} from "uuid";
import Consent from "../models/Consent.js";
import logger from "../logger.js";

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
            await existingConsent.save();
            logger.info(`Consent already exists for sessionId=${sessionId}, updated gender`);
            return res.status(200).json({
                success: true,
                sessionId: existingConsent?.sessionId,
                message: "Consent already registered"
            });
        }

        // Create new consent only if it does not exist
        const consent = new Consent({
            sessionId,
            is18Plus,
            acceptedPrivacyPolicy,
            acceptedTerms,
            gender,
            ip: req.ip,
            userAgent: req.headers["user-agent"],
        });

        await consent.save();
        logger.info(`Consent saved for sessionId=${consent.sessionId}`);

        res.status(201).json({
            success: true,
            sessionId: consent.sessionId
        });
    } catch (e) {
        logger.error("Consent save failed: " + e.message);
        res.status(500).json({
            error: e.message
        });
    }
}; // End of saveConsent controller
