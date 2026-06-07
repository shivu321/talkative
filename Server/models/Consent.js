import mongoose from "mongoose";

const consentSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        index: true, // 🔍 faster lookups by sessionId
    },
    acceptedPrivacyPolicy: {
        type: Boolean,
        required: true,
    },
    acceptedTerms: {
        type: Boolean,
        required: true,
    },
    is18Plus: {
        type: Boolean,
        required: true,
    },
    gender: {
        type: String,
        enum: ["male", "female", "other"],
        required: true,
    },
    handle: {
        type: String,
        index: true,
    },
    ip: {
        type: String,
    },
            userAgent: {
        type: String,
    },
    latitude: {
        type: Number,
    },
    longitude: {
        type: Number,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// ✅ Prevent OverwriteModelError
const Consent = mongoose.models.Consent || mongoose.model("Consent", consentSchema);

export default Consent;
