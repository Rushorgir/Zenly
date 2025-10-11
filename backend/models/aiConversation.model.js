import mongoose from "mongoose";

const AIConversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    journalEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalEntry",
    },
    title: String,
  },
  {
    timestamps: true,
  },
);

AIConversationSchema.index({ userId: 1, createdAt: -1 });

export const AIConversation = mongoose.model(
  "AIConversation",
  AIConversationSchema,
);
export default AIConversation;
