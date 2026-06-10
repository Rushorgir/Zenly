import { supabase } from '../config/supabase.js';

// GET /activity?limit=2
export const listRecentActivities = async (req, res) => {
  try {
    const userId = req.userId;
    const limit = Math.min(parseInt(req.query.limit) || 2, 10);

    const { data: events, error } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('userId', userId)
      .in('name', ['journal.created', 'resource.viewed'])
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Normalize for frontend consumption
    const activities = events.map((e) => {
      const base = {
        id: e.id,
        type: e.name, // Mapping 'name' back to 'type' for frontend compatibility
        createdAt: e.createdAt
      };

      const meta = e.meta || {};

      if (e.name === 'journal.created') {
        return {
          ...base,
          kind: 'journal',
          journalId: meta.journalId,
          mood: meta.mood ?? null,
          preview: meta.preview || ''
        };
      }
      if (e.name === 'resource.viewed') {
        return {
          ...base,
          kind: 'resource',
          resourceId: meta.resourceId,
          resourceType: meta.resourceType,
          title: meta.title,
          url: meta.url
        };
      }
      return { ...base, kind: 'unknown', meta: e.meta };
    });

    res.json({ success: true, data: activities });
  } catch (err) {
    console.error('[Activity] listRecentActivities error:', err);
    res.status(500).json({ success: false, error: 'Failed to load recent activity' });
  }
};

export default { listRecentActivities };
