import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    type: String,
    payload: mongoose.Schema.Types.Mixed,
    readAt: Date,
  },
  { timestamps: true },
);

NotificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", NotificationSchema);
export default Notification;
