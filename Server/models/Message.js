import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    senderId: {
            type: String,
            required: true,
        },
        receiverId: {
            type: String,
            required: true,
        },
        text: {
            type: String,
            required: true,
        },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// ✅ Prevent OverwriteModelError
const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);

export default Message;
