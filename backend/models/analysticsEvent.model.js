import mongoose from "mongoose";

const AnalyticsEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: String,
    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

AnalyticsEventSchema.index({ createdAt: 1 });

export const AnalyticsEvent = mongoose.model(
  "AnalyticsEvent",
  AnalyticsEventSchema,
);
export default AnalyticsEvent;
