import mongoose from "mongoose";

const ForumPostSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    category: { type: String, trim: true },
    tags: [{ type: String, lowercase: true, trim: true }],
    isAnonymous: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false, index: true },
    views: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    isModerated: { type: Boolean, default: false },
    isFlagged: { type: Boolean, default: false },
    reportCount: { type: Number, default: 0 },
    reports: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reason: String,
        timestamp: { type: Date, default: Date.now }
    }],
    deletedAt: Date,
}, {
    timestamps: true
});

ForumPostSchema.index({ createdAt: -1 });
ForumPostSchema.index({ isPinned: -1, createdAt: -1 });
ForumPostSchema.index({ category: 1, createdAt: -1 });
ForumPostSchema.index({ title: "text", content: "text" });
ForumPostSchema.index({ userId: 1, deletedAt: 1 });

export const ForumPost = mongoose.model("ForumPost", ForumPostSchema);
export default ForumPost;