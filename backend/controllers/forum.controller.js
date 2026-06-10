import forumService from '../services/forum.service.js';

// POST /forum/posts
export const createPost = async (req, res) => {
  try {
    const io = req.app.get('io');
    const post = await forumService.createPost(req.body, req.userId, io);
    res.status(201).json({ success: true, data: post });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
};

// GET /forum/posts
export const listPosts = async (req, res) => {
  try {
    const posts = await forumService.listPosts(req.query);
    res.json({ success: true, data: posts });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
};

// GET /forum/posts/:id
export const getPost = async (req, res) => {
  try {
    const post = await forumService.getPost(req.params.id);
    res.json({ success: true, data: post });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
};

// POST /forum/posts/:id/like
export const likePost = async (req, res) => {
  try {
    const io = req.app.get('io');
    const result = await forumService.likePost(req.params.id, req.userId, io);
    return res.json({ success: true, data: result });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
};

// POST /forum/posts/:id/report
export const reportPost = async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await forumService.reportPost(req.params.id, req.userId, reason);
    res.json({ success: true, message: result.message });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
};

// POST /forum/posts/:id/comments
export const addComment = async (req, res) => {
  try {
    const comment = await forumService.addComment(req.params.id, req.userId, req.body);
    res.status(201).json({ success: true, data: comment });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
};

// GET /forum/posts/:id/comments
export const listComments = async (req, res) => {
  try {
    const comments = await forumService.listComments(req.params.id, req.query.parentId);
    res.json({ success: true, data: comments });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
};

// POST /forum/comments/:id/like
export const likeComment = async (req, res) => {
  try {
    const result = await forumService.likeComment(req.params.id, req.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
};

// POST /forum/posts/:id/reactions (legacy support)
export const addReaction = async (req, res) => {
  try {
    const reaction = await forumService.addReaction(req.params.id, req.userId, req.body.type);
    res.status(201).json(reaction);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
};

// DELETE /forum/reactions/:id (legacy support)
export const removeReaction = async (req, res) => {
  try {
    const result = await forumService.removeReaction(req.params.id, req.userId);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
};
