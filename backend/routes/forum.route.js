import express from "express";
import { 
  addComment, 
  addReaction, 
  createPost, 
  getPost, 
  listComments, 
  listPosts, 
  removeReaction,
  likePost,
  reportPost,
  likeComment
} from "../controllers/forum.controller.js";
import authMiddleware, { optionalAuth } from "../middleware/auth.middleware.js";
import {
  forumReadLimiter,
  forumCreatePostLimiter,
  forumCommentLimiter,
  forumLikeLimiter,
  forumReportLimiter,
  forumReactionLimiter,
} from "../middleware/forum-rate-limiter.middleware.js";
import { validateForumPost, validateComment } from "../middleware/validation.middleware.js";

const router = express.Router();

// Public routes (optional auth for viewing)
router.get("/posts", forumReadLimiter, optionalAuth, listPosts);
router.get("/posts/:id", forumReadLimiter, optionalAuth, getPost);
router.get("/posts/:id/comments", forumReadLimiter, optionalAuth, listComments);

// Protected routes
router.post("/posts", authMiddleware, forumCreatePostLimiter, validateForumPost, createPost);
router.post("/posts/:id/comments", authMiddleware, forumCommentLimiter, validateComment, addComment);
router.post("/posts/:id/like", authMiddleware, forumLikeLimiter, likePost);
router.post("/posts/:id/report", authMiddleware, forumReportLimiter, reportPost);
router.post("/comments/:id/like", authMiddleware, forumLikeLimiter, likeComment);

// Legacy support
router.post("/posts/:id/reactions", authMiddleware, forumReactionLimiter, addReaction);
router.delete("/reactions/:id", authMiddleware, forumReactionLimiter, removeReaction);

export default router;