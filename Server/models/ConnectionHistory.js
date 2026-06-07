/**
 * models/ConnectionHistory.js
 *
 * Persists location telemetry timeline records. Logs every session match location.
 */
import mongoose from "mongoose";

const connectionHistorySchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  handle: {
    type: String,
    required: true,
    index: true,
  },
  mode: {
    type: String,
    enum: ["chat", "video"],
    required: true,
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  ip: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const ConnectionHistory = mongoose.models.ConnectionHistory || mongoose.model("ConnectionHistory", connectionHistorySchema);
export default ConnectionHistory;
