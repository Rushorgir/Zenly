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
import { validateForumPost, validateComment } from "../middleware/validation.middleware.js";

const router = express.Router();

// Public routes (optional auth for viewing)
router.get("/posts", optionalAuth, listPosts);
router.get("/posts/:id", optionalAuth, getPost);
router.get("/posts/:id/comments", optionalAuth, listComments);

// Protected routes
router.post("/posts", authMiddleware, validateForumPost, createPost);
router.post("/posts/:id/comments", authMiddleware, validateComment, addComment);
router.post("/posts/:id/like", authMiddleware, likePost);
router.post("/posts/:id/report", authMiddleware, reportPost);
router.post("/comments/:id/like", authMiddleware, likeComment);

// Legacy support
router.post("/posts/:id/reactions", authMiddleware, addReaction);
router.delete("/reactions/:id", authMiddleware, removeReaction);

export default router;