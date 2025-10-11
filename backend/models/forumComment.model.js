import mongoose from "mongoose";

const ForumCommentSchema = new mongoose.Schema({
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "ForumPost", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true },
    parentCommentId: { type: mongoose.Schema.Types.ObjectId, ref: "ForumComment", default: null, index: true },
    depth: { type: Number, default: 0, min: 0, max: 5 }, // Limit to 5 levels of nesting
    isAnonymous: { type: Boolean, default: false },
    likesCount: { type: Number, default: 0 },
    repliesCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
}, {
    timestamps: true
});

// Indexes for efficient querying
ForumCommentSchema.index({ postId: 1, createdAt: -1 });
ForumCommentSchema.index({ postId: 1, parentCommentId: 1 });
ForumCommentSchema.index({ parentCommentId: 1, createdAt: 1 });
ForumCommentSchema.index({ userId: 1, createdAt: -1 });

export const ForumComment = mongoose.model("ForumComment", ForumCommentSchema);
export default ForumComment;