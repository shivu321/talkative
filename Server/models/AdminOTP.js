/**
 * models/AdminOTP.js
 * Temporary OTP store with 5-minute TTL.
 */
import mongoose from "mongoose";

const adminOTPSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true },
  otpHash: { type: String, required: true },   // SHA-256 of the raw OTP
  expiresAt: { type: Date, required: true },
});

// MongoDB TTL index — auto-deletes documents after expiresAt
adminOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AdminOTP = mongoose.models.AdminOTP || mongoose.model("AdminOTP", adminOTPSchema);
export default AdminOTP;
