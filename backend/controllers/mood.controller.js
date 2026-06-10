import { supabase } from '../config/supabase.js';

const formatMood = (m) => {
  if (!m) return null;
  const { id, ...rest } = m;
  return { ...rest, _id: id };
};

// PUT /moods/today
export const upsertTodayMood = async (req, res) => {
  try {
    const { mood, notes } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateStr = today.toISOString().split('T')[0];

    // Try to find if exists
    const { data: existing } = await supabase
      .from('mood_logs')
      .select('id')
      .eq('userId', req.userId)
      .eq('date', dateStr)
      .single();

    let entry;
    if (existing) {
      const { data, error } = await supabase
        .from('mood_logs')
        .update({ mood, notes, updatedAt: new Date().toISOString() })
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw error;
      entry = data;
    } else {
      const { data, error } = await supabase
        .from('mood_logs')
        .insert({
          userId: req.userId,
          date: dateStr,
          mood,
          notes,
          createdAt: new Date().toISOString()
        })
        .select('*')
        .single();
      if (error) throw error;
      entry = data;
    }

    res.json(formatMood(entry));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /moods?from=&to=
export const listMoods = async (req, res) => {
  try {
    const { from, to } = req.query;

    let query = supabase
      .from('mood_logs')
      .select('*')
      .eq('userId', req.userId)
      .order('date', { ascending: true });

    if (from) {
      const fromDate = new Date(from).toISOString().split('T')[0];
      query = query.gte('date', fromDate);
    }
    if (to) {
      const toDate = new Date(to).toISOString().split('T')[0];
      query = query.lte('date', toDate);
    }

    const { data: moods, error } = await query;
    if (error) throw error;

    res.json(moods.map(formatMood));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
