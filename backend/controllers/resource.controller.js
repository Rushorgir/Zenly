import { supabase } from '../config/supabase.js';

const formatModel = (item) => {
  if (!item) return null;
  const { id, ...rest } = item;
  return { ...rest, _id: id };
};

export const getFeaturedResources = async (req, res) => {
  try {
    const { data: videos } = await supabase
      .from('resources')
      .select('*')
      .eq('type', 'video')
      .eq('isFeatured', true)
      .eq('isActive', true)
      .order('priority', { ascending: false })
      .order('createdAt', { ascending: false })
      .limit(6);

    const { data: audios } = await supabase
      .from('resources')
      .select('*')
      .eq('type', 'audio')
      .eq('isFeatured', true)
      .eq('isActive', true)
      .order('priority', { ascending: false })
      .order('createdAt', { ascending: false })
      .limit(6);

    const { data: articles } = await supabase
      .from('resources')
      .select('*')
      .eq('type', 'article')
      .eq('isFeatured', true)
      .eq('isActive', true)
      .order('priority', { ascending: false })
      .order('createdAt', { ascending: false })
      .limit(6);

    res.status(200).json({
      success: true,
      data: {
        videos: videos?.map(formatModel) || [],
        audios: audios?.map(formatModel) || [],
        articles: articles?.map(formatModel) || []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const searchResources = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query parameter required' });
    }

    const { data: resources, error } = await supabase
      .from('resources')
      .select('*')
      .eq('isActive', true)
      .or(`title.ilike.%${query}%,tags.cs.{${query}}`)
      .order('isFeatured', { ascending: false })
      .order('priority', { ascending: false })
      .order('createdAt', { ascending: false })
      .limit(20);

    if (error) throw error;

    res.status(200).json({ success: true, data: resources.map(formatModel) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getResourceById = async (req, res) => {
  try {
    const { data: resource, error } = await supabase
      .from('resources')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !resource) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }
    res.status(200).json({ success: true, data: formatModel(resource) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const incrementViewCount = async (req, res) => {
  try {
    const { data: current, error: getError } = await supabase
      .from('resources')
      .select('viewCount, type, title, url')
      .eq('id', req.params.id)
      .single();

    if (getError || !current) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }

    const { data: resource, error: updateError } = await supabase
      .from('resources')
      .update({ viewCount: (current.viewCount || 0) + 1 })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    const io = req.app.get('io');
    if (io) {
      io.to('resources').emit('resource:viewUpdate', {
        resourceId: resource.id,
        viewCount: resource.viewCount
      });
    }

    try {
      if (req.userId) {
        await supabase.from('analytics_events').insert({
          userId: req.userId,
          name: 'resource.viewed',
          meta: {
            resourceId: resource.id,
            resourceType: resource.type,
            title: resource.title,
            url: resource.url
          },
          createdAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn('[Resource] Failed to log resource.viewed event', e?.message);
    }

    res.status(200).json({ success: true, data: formatModel(resource) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const markAsHelpful = async (req, res) => {
  try {
    const { action } = req.body;
    const increment = action === 'unlike' ? -1 : 1;

    const { data: current, error: getError } = await supabase
      .from('resources')
      .select('helpfulCount')
      .eq('id', req.params.id)
      .single();

    if (getError || !current) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }

    const { data: resource, error: updateError } = await supabase
      .from('resources')
      .update({ helpfulCount: (current.helpfulCount || 0) + increment })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    const io = req.app.get('io');
    if (io) {
      io.to('resources').emit('resource:likeUpdate', {
        resourceId: resource.id,
        helpfulCount: resource.helpfulCount,
        action
      });
    }

    res.status(200).json({ success: true, data: formatModel(resource) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createResource = async (req, res) => {
  try {
    const { data: resource, error } = await supabase
      .from('resources')
      .insert({ ...req.body, createdAt: new Date().toISOString() })
      .select('*')
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data: formatModel(resource) });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const updateResource = async (req, res) => {
  try {
    const { data: resource, error } = await supabase
      .from('resources')
      .update({ ...req.body, updatedAt: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }
    res.status(200).json({ success: true, data: formatModel(resource) });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const deleteResource = async (req, res) => {
  try {
    const { error } = await supabase.from('resources').delete().eq('id', req.params.id);

    if (error) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }
    res.status(200).json({ success: true, message: 'Resource deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllResources = async (req, res) => {
  try {
    const { data: videos } = await supabase
      .from('resources')
      .select('*')
      .eq('type', 'video')
      .eq('isActive', true)
      .order('isFeatured', { ascending: false })
      .order('priority', { ascending: false })
      .order('createdAt', { ascending: false });

    const { data: audios } = await supabase
      .from('resources')
      .select('*')
      .eq('type', 'audio')
      .eq('isActive', true)
      .order('isFeatured', { ascending: false })
      .order('priority', { ascending: false })
      .order('createdAt', { ascending: false });

    const { data: articles } = await supabase
      .from('resources')
      .select('*')
      .eq('type', 'article')
      .eq('isActive', true)
      .order('isFeatured', { ascending: false })
      .order('priority', { ascending: false })
      .order('createdAt', { ascending: false });

    res.status(200).json({
      success: true,
      data: {
        videos: videos?.map(formatModel) || [],
        audios: audios?.map(formatModel) || [],
        articles: articles?.map(formatModel) || []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
