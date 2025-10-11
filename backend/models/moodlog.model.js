import mongoose from "mongoose";

const MoodLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    date: { type: Date, required: true },
    mood: Number,
    notes: String,
  },
  {
    timestamps: true,
  },
);

MoodLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export const MoodLog = mongoose.model("MoodLog", MoodLogSchema);
export default MoodLog;
