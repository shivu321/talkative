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
        ip: {
                type: String,
            },
            userAgent: {
                type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// ✅ Prevent OverwriteModelError
const Consent = mongoose.models.Consent || mongoose.model("Consent", consentSchema);

export default Consent;
