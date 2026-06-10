import { supabase } from '../config/supabase.js';

const formatModel = (item) => {
  if (!item) return null;
  const { id, ...rest } = item;
  return { ...rest, _id: id };
};

// GET /admin/metrics/overview
export const metricsOverview = async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = supabase.from('metrics_daily').select('*').order('date', { ascending: true });

    if (from) query = query.gte('date', new Date(from).toISOString());
    if (to) query = query.lte('date', new Date(to).toISOString());

    const { data: metrics, error } = await query;
    if (error) throw error;

    res.json(metrics.map(formatModel));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /admin/risk-alerts
export const riskAlerts = async (req, res) => {
  try {
    const { data: alerts, error } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('name', 'risk')
      .order('createdAt', { ascending: false });

    if (error) throw error;
    res.json(alerts.map(formatModel));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /admin/users
export const listUsers = async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    let query = supabase
      .from('users')
      .select('id, email, firstName, lastName, role, createdAt')
      .limit(Number(limit));

    if (q) {
      query = query.ilike('email', `%${q}%`);
    }

    const { data: users, error } = await query;
    if (error) throw error;

    res.json(users.map(formatModel));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /admin/forum/reported-posts - Get all reported posts
export const getReportedPosts = async (req, res) => {
  try {
    const { data: reportedPosts, error } = await supabase
      .from('forum_posts')
      .select('*, userId:users(id, firstName, lastName)')
      .gt('reportCount', 0)
      .order('reportCount', { ascending: false })
      .order('createdAt', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: reportedPosts.map(formatModel) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /admin/forum/all-posts - Get ALL posts for admin management
export const getAllPosts = async (req, res) => {
  try {
    const { limit = 1000, skip = 0, search, category } = req.query;

    let query = supabase
      .from('forum_posts')
      .select('*, userId:users(id, firstName, lastName)', { count: 'exact' });

    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const {
      data: posts,
      count: total,
      error
    } = await query
      .order('createdAt', { ascending: false })
      .range(Number(skip), Number(skip) + Number(limit) - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: posts.map(formatModel),
      total: total || 0,
      hasMore: Number(skip) + posts.length < (total || 0)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /admin/forum/posts/:id - Delete a post (admin only)
export const deletePost = async (req, res) => {
  try {
    const { data: post, error: postError } = await supabase
      .from('forum_posts')
      .select('id')
      .eq('id', req.params.id)
      .single();

    if (postError || !post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    // Due to ON DELETE CASCADE on foreign keys in Postgres (if set),
    // deleting the post will automatically delete comments and reactions.
    // We will explicitly delete it here.
    const { error } = await supabase.from('forum_posts').delete().eq('id', req.params.id);

    if (error) throw error;

    // Emit Socket.IO event if available
    const io = req.app.get('io');
    if (io) {
      io.to('forum').emit('forum:postDelete', req.params.id);
    }

    res.json({ success: true, message: 'Post and associated data deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /admin/forum/posts/:id/dismiss-reports - Clear reports from a post
export const dismissReports = async (req, res) => {
  try {
    const { data: post, error: postError } = await supabase
      .from('forum_posts')
      .select('id')
      .eq('id', req.params.id)
      .single();

    if (postError || !post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const { data: updatedPost, error } = await supabase
      .from('forum_posts')
      .update({
        reports: [],
        reportCount: 0,
        isFlagged: false
      })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Reports dismissed successfully',
      data: formatModel(updatedPost)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
