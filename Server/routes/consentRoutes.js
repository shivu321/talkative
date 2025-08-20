import express from "express";
import {
    saveConsent
} from "../Controllers/consentController.js";

const router = express.Router();

// Consent route
router.post("/", saveConsent);

export default router;
