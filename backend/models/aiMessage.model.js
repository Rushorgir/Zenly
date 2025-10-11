import mongoose from "mongoose";

const AIMessageSchema = new mongoose.Schema({
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "AIConversation", index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    role: { type: String, enum: ["user", "assistant", "system"], required: true },
    content: String,
    metadata: {
        model: String,
        tokensUsed: Number,
        latencyMs: Number,
        isCrisis: Boolean,
        riskLevel: { type: String, enum: ["low", "medium", "high"] },
        topic: String,
        issue: String,
        hasJournalContext: Boolean,
        fallback: Boolean,
        fallbackReason: String,
    },
    feedback: {
        rating: { type: Number, min: 1, max: 5 },
        helpful: Boolean,
        flagged: Boolean,
        flagReason: String,
        comment: String,
        createdAt: Date,
    }
}, {
    timestamps: {
        createdAt: true,
        updatedAt: false
    }
});

AIMessageSchema.index({ conversationId: 1, createdAt: 1 });
AIMessageSchema.index({ "feedback.flagged": 1 });
AIMessageSchema.index({ "metadata.riskLevel": 1 });

export const AIMessage = mongoose.model("AIMessage", AIMessageSchema);
export default AIMessage;