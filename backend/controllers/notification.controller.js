import Notification from "../models/notification.model.js";

// GET /notifications
export const listNotifications = async (req, res) => {
  try {
    const { cursor, limit = 10 } = req.query;
    const query = { userId: req.userId };
    if (cursor) query._id = { $lt: cursor };

    const notifs = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit));
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /notifications/mark-read
export const markRead = async (req, res) => {
  try {
    const { ids } = req.body;
    await Notification.updateMany(
      { _id: { $in: ids }, userId: req.userId },
      { readAt: new Date() },
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
