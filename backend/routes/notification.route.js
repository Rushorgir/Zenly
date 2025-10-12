import express from "express";
import { listNotifications, markRead } from "../controllers/notification.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { notificationListLimiter, notificationMarkReadLimiter } from "../middleware/notification-rate-limiter.middleware.js";

const router = express.Router();

// All notification routes require authentication
router.use(authMiddleware);

router.get("/", notificationListLimiter, listNotifications);
router.post("/mark-read", notificationMarkReadLimiter, markRead);

export default router;