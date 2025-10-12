import express from "express";
import { 
    listUsers, 
    metricsOverview, 
    riskAlerts, 
    getReportedPosts,
    getAllPosts,
    deletePost, 
    dismissReports 
} from "../controllers/admin.controller.js";
import authMiddleware, { requireRole } from "../middleware/auth.middleware.js";
import { adminReadLimiter, adminMutationLimiter } from "../middleware/admin-rate-limiter.middleware.js";

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(requireRole("admin"));

router.get("/metrics/overview", adminReadLimiter, metricsOverview);
router.get("/risk-alerts", adminReadLimiter, riskAlerts);
router.get("/users", adminReadLimiter, listUsers);

// Forum management routes
router.get("/forum/reported-posts", adminReadLimiter, getReportedPosts);
router.get("/forum/all-posts", adminReadLimiter, getAllPosts);
router.delete("/forum/posts/:id", adminMutationLimiter, deletePost);
router.post("/forum/posts/:id/dismiss-reports", adminMutationLimiter, dismissReports);

export default router;