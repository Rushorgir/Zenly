import AnalyticsEvent from "../models/analysticsEvent.model.js";

// GET /activity?limit=2
export const listRecentActivities = async (req, res) => {
  try {
    const userId = req.userId;
    const limit = Math.min(parseInt(req.query.limit) || 2, 10);

    const events = await AnalyticsEvent.find({
      userId,
      type: { $in: ["journal.created", "resource.viewed"] },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Normalize for frontend consumption
    const activities = events.map((e) => {
      const base = {
        id: e._id,
        type: e.type,
        createdAt: e.createdAt,
      };
      if (e.type === "journal.created") {
        return {
          ...base,
          kind: "journal",
          journalId: e.meta?.journalId,
          mood: e.meta?.mood ?? null,
          preview: e.meta?.preview || "",
        };
      }
      if (e.type === "resource.viewed") {
        return {
          ...base,
          kind: "resource",
          resourceId: e.meta?.resourceId,
          resourceType: e.meta?.resourceType,
          title: e.meta?.title,
          url: e.meta?.url,
        };
      }
      return { ...base, kind: "unknown", meta: e.meta };
    });

    res.json({ success: true, data: activities });
  } catch (err) {
    console.error("[Activity] listRecentActivities error:", err);
    res.status(500).json({ success: false, error: "Failed to load recent activity" });
  }
};

export default { listRecentActivities };
