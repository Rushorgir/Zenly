import mongoose from "mongoose";

const ForumReactionSchema = new mongoose.Schema({
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "ForumPost", index: true },
    commentId: { type: mongoose.Schema.Types.ObjectId, ref: "ForumComment", index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["like", "support", "helpful"], default: "like" }
}, {
    timestamps: true
});

// Compound indexes to ensure one reaction per user per post/comment
ForumReactionSchema.index({ postId: 1, userId: 1 }, { unique: true, sparse: true });
ForumReactionSchema.index({ commentId: 1, userId: 1 }, { unique: true, sparse: true });

export const ForumReaction = mongoose.model("ForumReaction", ForumReactionSchema);
export default ForumReaction;