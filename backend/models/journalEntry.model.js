import mongoose from "mongoose";

const JournalEntrySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, required: true },
    mood: { type: Number, min: 1, max: 10 },
    tags: [{ type: String, lowercase: true, trim: true }],
    
    // AI Analysis Results (new structure)
    status: { 
        type: String, 
        enum: ["draft", "analyzing", "analyzed", "error"], 
        default: "draft" 
    },
    aiAnalysis: {
        summary: String,
        insights: [String],
        sentiment: {
            score: Number,
            label: { type: String, enum: ["positive", "neutral", "negative"] },
            confidence: Number,
            primaryEmotions: [String],
            reasoning: String
        },
        riskAssessment: {
            level: { type: String, enum: ["low", "medium", "high"] },
            factors: [String],
            confidence: Number,
            isCrisis: Boolean
        },
        themes: [String],
        suggestedActions: [String],
        processedAt: Date,
        model: String,
        tokensUsed: Number,
        error: String
    },
    
    // AI Reflection Messages (embedded in journal - NO separate conversation needed!)
    reflectionMessages: [{
        role: { type: String, enum: ["user", "assistant"], required: true },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        aiMetadata: {
            isCrisis: Boolean,
            riskLevel: { type: String, enum: ["low", "medium", "high"] },
            model: String,
            tokensUsed: Number
        }
    }],
    
    // DEPRECATED: Remove this field - we don't need it anymore
    // conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "AIConversation" },
    
    // Metadata
    visibility: { type: String, enum: ["private", "shared"], default: "private" },
    deletedAt: Date,
}, {
    timestamps: true
});

// Indexes
JournalEntrySchema.index({ userId: 1, createdAt: -1 });
JournalEntrySchema.index({ userId: 1, deletedAt: 1 });
JournalEntrySchema.index({ userId: 1, status: 1 });
JournalEntrySchema.index({ tags: 1 });
JournalEntrySchema.index({ "aiAnalysis.riskAssessment.level": 1, createdAt: -1 });
JournalEntrySchema.index({ "aiAnalysis.sentiment.label": 1 });
// Removed conversationId index - no longer needed

export const JournalEntry = mongoose.model("JournalEntry", JournalEntrySchema);
export default JournalEntry;