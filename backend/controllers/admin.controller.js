import MetricsDaily from "../models/metricsDaily.model.js";
import AnalyticsEvent from "../models/analysticsEvent.model.js";
import User from "../models/user.model.js";
import ForumPost from "../models/forumPost.model.js";
import ForumComment from "../models/forumComment.model.js";
import ForumReaction from "../models/forumReaction.model.js";

// GET /admin/metrics/overview
export const metricsOverview = async (req, res) => {
    try {
        const { from, to } = req.query;
        const query = {};
        if (from || to) {
            query.date = {};
            if (from) query.date.$gte = new Date(from);
            if (to) query.date.$lte = new Date(to);
        }

        const metrics = await MetricsDaily.find(query).sort({ date: 1 });
        res.json(metrics);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /admin/risk-alerts
export const riskAlerts = async (req, res) => {
    try {
        const alerts = await AnalyticsEvent.find({ type: "risk" }).sort({ createdAt: -1 });
        res.json(alerts);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /admin/users
export const listUsers = async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;
        const query = {};
        if (q) query.email = new RegExp(q, "i");

        const users = await User.find(query).limit(Number(limit)).select("-passwordHash");
        res.json(users);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /admin/forum/reported-posts - Get all reported posts
export const getReportedPosts = async (req, res) => {
    try {
        const reportedPosts = await ForumPost.find({ 
            reportCount: { $gt: 0 } 
        })
        .populate('userId', 'firstName lastName')
        .populate('reports.userId', 'firstName lastName email')
        .sort({ reportCount: -1, createdAt: -1 });

        res.json({ success: true, data: reportedPosts });
    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};

// GET /admin/forum/all-posts - Get ALL posts for admin management
export const getAllPosts = async (req, res) => {
    try {
        const { limit = 1000, skip = 0, search, category } = req.query;
        let query = {};
        
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (category && category !== 'all') {
            query.category = category;
        }

        const posts = await ForumPost.find(query)
            .populate('userId', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip(Number(skip));

        const total = await ForumPost.countDocuments(query);

        res.json({ 
            success: true, 
            data: posts,
            total,
            hasMore: (Number(skip) + posts.length) < total
        });
    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};

// DELETE /admin/forum/posts/:id - Delete a post (admin only)
export const deletePost = async (req, res) => {
    try {
        const post = await ForumPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ success: false, error: "Post not found" });
        }

        // Delete all comments associated with the post
        await ForumComment.deleteMany({ postId: req.params.id });
        
        // Delete all reactions associated with the post
        await ForumReaction.deleteMany({ postId: req.params.id });
        
        // Delete the post
        await ForumPost.deleteOne({ _id: req.params.id });

        // Emit Socket.IO event if available
        const io = req.app.get('io');
        if (io) {
            io.to('forum').emit('forum:postDelete', req.params.id);
        }

        res.json({ success: true, message: "Post and associated data deleted successfully" });
    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};

// POST /admin/forum/posts/:id/dismiss-reports - Clear reports from a post
export const dismissReports = async (req, res) => {
    try {
        const post = await ForumPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ success: false, error: "Post not found" });
        }

        post.reports = [];
        post.reportCount = 0;
        post.isFlagged = false;
        await post.save();

        res.json({ success: true, message: "Reports dismissed successfully", data: post });
    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};
