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

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(requireRole("admin"));

router.get("/metrics/overview", metricsOverview);
router.get("/risk-alerts", riskAlerts);
router.get("/users", listUsers);

// Forum management routes
router.get("/forum/reported-posts", getReportedPosts);
router.get("/forum/all-posts", getAllPosts);
router.delete("/forum/posts/:id", deletePost);
router.post("/forum/posts/:id/dismiss-reports", dismissReports);

export default router;