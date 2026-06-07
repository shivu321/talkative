import express from "express";
import {
    saveConsent,
    restoreSession
} from "../Controllers/consentController.js";

const router = express.Router();

// Consent route
router.post("/", saveConsent);
router.post("/restore", restoreSession);

export default router;
