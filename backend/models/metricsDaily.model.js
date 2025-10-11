import mongoose from "mongoose";

const MetricsDailySchema = new mongoose.Schema({
  date: { type: Date, unique: true, index: true },
  dau: Number,
  sessions: Number,
  journalCount: Number,
  distribution: Object,
});

export const MetricsDaily = mongoose.model("MetricsDaily", MetricsDailySchema);
export default MetricsDaily;
