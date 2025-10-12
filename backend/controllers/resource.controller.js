import { Resource } from "../models/resource.model.js";
import AnalyticsEvent from "../models/analysticsEvent.model.js";
import _ from "lodash";

export const getFeaturedResources = async (req, res) => {
  try {
    const videos = await Resource.find({ type: 'video', isFeatured: true, isActive: true })
      .sort({ priority: -1, createdAt: -1 })
      .limit(6);
    
    const audios = await Resource.find({ type: 'audio', isFeatured: true, isActive: true })
      .sort({ priority: -1, createdAt: -1 })
      .limit(6);
    
    const articles = await Resource.find({ type: 'article', isFeatured: true, isActive: true })
      .sort({ priority: -1, createdAt: -1 })
      .limit(6);
    
    res.status(200).json({
      success: true,
      data: { videos, audios, articles }
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
    
    // Search only by title and tags (case-insensitive)
    const safeQuery = _.escapeRegExp(query);
    const searchRegex = new RegExp(safeQuery, 'i');
    
    const resources = await Resource.find({
      $or: [
        { title: searchRegex },
        { tags: searchRegex }
      ],
      isActive: true
    }).sort({ isFeatured: -1, priority: -1, createdAt: -1 }).limit(20);
    
    res.status(200).json({ success: true, data: resources });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getResourceById = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }
    res.status(200).json({ success: true, data: resource });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const incrementViewCount = async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    );
    if (!resource) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }
    
    // Emit Socket.IO event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.to('resources').emit('resource:viewUpdate', {
        resourceId: resource._id,
        viewCount: resource.viewCount
      });
    }
    
    // Log analytics event for recent activity (if user is authenticated)
    try {
      if (req.userId) {
        await AnalyticsEvent.create({
          userId: req.userId,
          type: 'resource.viewed',
          meta: {
            resourceId: resource._id,
            resourceType: resource.type,
            title: resource.title,
            url: resource.url
          }
        });
      }
    } catch (e) {
      console.warn('[Resource] Failed to log resource.viewed event', e?.message);
    }
    
    res.status(200).json({ success: true, data: resource });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const markAsHelpful = async (req, res) => {
  try {
    const { action } = req.body; // 'like' or 'unlike'
    const increment = action === 'unlike' ? -1 : 1;
    
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { $inc: { helpfulCount: increment } },
      { new: true }
    );
    if (!resource) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }
    
    // Emit Socket.IO event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.to('resources').emit('resource:likeUpdate', {
        resourceId: resource._id,
        helpfulCount: resource.helpfulCount,
        action
      });
    }
    
    res.status(200).json({ success: true, data: resource });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createResource = async (req, res) => {
  try {
    const resource = new Resource(req.body);
    await resource.save();
    res.status(201).json({ success: true, data: resource });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const updateResource = async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!resource) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }
    res.status(200).json({ success: true, data: resource });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findByIdAndDelete(req.params.id);
    if (!resource) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }
    res.status(200).json({ success: true, message: 'Resource deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllResources = async (req, res) => {
  try {
    const videos = await Resource.find({ type: 'video', isActive: true })
      .sort({ isFeatured: -1, priority: -1, createdAt: -1 });
    
    const audios = await Resource.find({ type: 'audio', isActive: true })
      .sort({ isFeatured: -1, priority: -1, createdAt: -1 });
    
    const articles = await Resource.find({ type: 'article', isActive: true })
      .sort({ isFeatured: -1, priority: -1, createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: { videos, audios, articles }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
