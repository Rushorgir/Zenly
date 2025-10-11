import ForumPost from "../models/forumPost.model.js";
import ForumComment from "../models/forumComment.model.js";
import ForumReaction from "../models/forumReaction.model.js";

// POST /forum/posts
export const createPost = async (req, res) => {
  try {
    const { title, content, tags, category, isAnonymous } = req.body;
    const post = await ForumPost.create({ 
      userId: req.userId, 
      title, 
      content, 
      tags, 
      category,
      isAnonymous: isAnonymous || false 
    });
    
    // Populate user info for socket emission
    await post.populate('userId', 'firstName lastName');
    
    // Emit real-time event to all connected clients
    const io = req.app.get('io');
    if (io) {
      io.to('forum').emit('forum:newPost', post);
      console.log('[Socket.IO] Emitted forum:newPost event');
    }
    
    res.status(201).json({ success: true, data: post });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// GET /forum/posts
export const listPosts = async (req, res) => {
  try {
    const { tag, q, category, sort = "-createdAt", limit = 100 } = req.query;
    let query = { deletedAt: null };
    if (tag) query.tags = tag;
    if (category && category !== 'all') query.category = category;
    if (q) query.$text = { $search: q };

    const posts = await ForumPost.find(query)
      .populate('userId', 'firstName lastName')
      .sort(sort)
      .limit(Number(limit));
    
    res.json({ success: true, data: posts });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// GET /forum/posts/:id
export const getPost = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id)
      .populate('userId', 'firstName lastName');
    if (!post) return res.status(404).json({ success: false, error: "Not found" });
    
    // Increment view count
    post.views += 1;
    await post.save();
    
    res.json({ success: true, data: post });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// POST /forum/posts/:id/like
export const likePost = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: "Post not found" });

    // Check if user already liked this post
    const existingReaction = await ForumReaction.findOne({
      postId: req.params.id,
      userId: req.userId,
      type: 'like'
    });

    let liked, likesCount;

    if (existingReaction) {
      // Unlike - remove reaction
      await ForumReaction.deleteOne({ _id: existingReaction._id });
      post.likesCount = Math.max(0, post.likesCount - 1);
      await post.save();
      liked = false;
      likesCount = post.likesCount;
    } else {
      // Like - add reaction
      await ForumReaction.create({
        postId: req.params.id,
        userId: req.userId,
        type: 'like'
      });
      post.likesCount += 1;
      await post.save();
      liked = true;
      likesCount = post.likesCount;
    }

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to('forum').emit('forum:postUpdate', {
        postId: req.params.id,
        updates: { likesCount }
      });
    }

    return res.json({ success: true, data: { liked, likesCount } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// POST /forum/posts/:id/report
export const reportPost = async (req, res) => {
  try {
    const { reason } = req.body;
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: "Post not found" });

    // Check if user already reported this post
    const alreadyReported = post.reports.some(
      report => report.userId.toString() === req.userId
    );

    if (alreadyReported) {
      return res.status(400).json({ success: false, error: "You have already reported this post" });
    }

    post.reports.push({
      userId: req.userId,
      reason: reason || "No reason provided",
      timestamp: new Date()
    });
    post.reportCount = post.reports.length;
    
    // Flag post if it has 3 or more reports
    if (post.reportCount >= 3) {
      post.isFlagged = true;
    }

    await post.save();
    res.json({ success: true, message: "Post reported successfully" });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// POST /forum/posts/:id/comments
export const addComment = async (req, res) => {
  try {
    const { content, parentCommentId, isAnonymous } = req.body;
    
    let depth = 0;
    if (parentCommentId) {
      const parentComment = await ForumComment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({ success: false, error: "Parent comment not found" });
      }
      depth = parentComment.depth + 1;
      
      // Enforce max depth of 5
      if (depth > 5) {
        return res.status(400).json({ success: false, error: "Maximum reply depth exceeded" });
      }
      
      // Increment parent's replies count
      parentComment.repliesCount += 1;
      await parentComment.save();
    }
    
    const comment = await ForumComment.create({ 
      postId: req.params.id, 
      userId: req.userId, 
      content,
      parentCommentId: parentCommentId || null,
      depth,
      isAnonymous: isAnonymous || false
    });
    
    // Increment post's comment count
    const post = await ForumPost.findById(req.params.id);
    if (post) {
      post.commentsCount += 1;
      await post.save();
    }
    
    // Populate user info before sending
    await comment.populate('userId', 'firstName lastName');
    
    res.status(201).json({ success: true, data: comment });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// GET /forum/posts/:id/comments
export const listComments = async (req, res) => {
  try {
    const { parentId } = req.query;
    
    let query = { 
      postId: req.params.id,
      isDeleted: false
    };
    
    // If parentId is provided, get replies to that comment
    // If parentId is 'null' or not provided, get top-level comments
    if (parentId && parentId !== 'null') {
      query.parentCommentId = parentId;
    } else {
      query.parentCommentId = null;
    }
    
    const comments = await ForumComment.find(query)
      .populate('userId', 'firstName lastName')
      .sort({ createdAt: 1 });
    
    res.json({ success: true, data: comments });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// POST /forum/comments/:id/like
export const likeComment = async (req, res) => {
  try {
    const comment = await ForumComment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, error: "Comment not found" });

    // Check if user already liked this comment
    const existingReaction = await ForumReaction.findOne({
      commentId: req.params.id,
      userId: req.userId,
      type: 'like'
    });

    if (existingReaction) {
      // Unlike
      await ForumReaction.deleteOne({ _id: existingReaction._id });
      comment.likesCount = Math.max(0, comment.likesCount - 1);
      await comment.save();
      return res.json({ success: true, data: { liked: false, likesCount: comment.likesCount } });
    } else {
      // Like
      await ForumReaction.create({
        commentId: req.params.id,
        userId: req.userId,
        type: 'like'
      });
      comment.likesCount += 1;
      await comment.save();
      return res.json({ success: true, data: { liked: true, likesCount: comment.likesCount } });
    }
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// POST /forum/posts/:id/reactions (legacy support)
export const addReaction = async (req, res) => {
  try {
    const reaction = await ForumReaction.create({ 
      postId: req.params.id, 
      userId: req.userId, 
      type: req.body.type 
    });
    res.status(201).json(reaction);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// DELETE /forum/reactions/:id (legacy support)
export const removeReaction = async (req, res) => {
  try {
    await ForumReaction.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
