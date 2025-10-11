import MoodLog from "../models/moodlog.model.js";

// PUT /moods/today
export const upsertTodayMood = async (req, res) => {
  try {
    const { mood, notes } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const entry = await MoodLog.findOneAndUpdate(
      { userId: req.userId, date: today },
      { mood, notes },
      { upsert: true, new: true },
    );

    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /moods?from=&to=
export const listMoods = async (req, res) => {
  try {
    const { from, to } = req.query;
    const query = { userId: req.userId };

    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    const moods = await MoodLog.find(query).sort({ date: 1 });
    res.json(moods);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
