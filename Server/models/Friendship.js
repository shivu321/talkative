import mongoose from "mongoose";

const friendshipSchema = new mongoose.Schema({
  requester: { // sessionId of the sender
    type: String,
    required: true,
  },
  receiver: { // sessionId of the receiver
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "declined"],
    default: "pending",
  },
  requesterAlias: {
    type: String,
    default: "",
  },
  receiverAlias: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure a user cannot send duplicate requests to the same person
friendshipSchema.index({ requester: 1, receiver: 1 }, { unique: true });

const Friendship = mongoose.models.Friendship || mongoose.model("Friendship", friendshipSchema);

export default Friendship;
