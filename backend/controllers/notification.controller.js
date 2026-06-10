import { supabase } from '../config/supabase.js';

const formatModel = (item) => {
  if (!item) return null;
  const { id, ...rest } = item;
  return { ...rest, _id: id };
};

// GET /notifications
export const listNotifications = async (req, res) => {
  try {
    const { cursor, limit = 10 } = req.query;
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('userId', req.userId)
      .order('createdAt', { ascending: false });

    if (cursor) {
      query = query.lt('id', cursor);
    }

    const { data: notifs, error } = await query.limit(Number(limit));
    if (error) throw error;

    res.json(notifs.map(formatModel));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /notifications/mark-read
export const markRead = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !ids.length) {
      return res.json({ success: true });
    }

    const { error } = await supabase
      .from('notifications')
      .update({ readAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .in('id', ids)
      .eq('userId', req.userId);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
