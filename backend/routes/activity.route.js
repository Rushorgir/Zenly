import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { activityReadLimiter } from "../middleware/activity-rate-limiter.middleware.js";
import { listRecentActivities } from "../controllers/activity.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", activityReadLimiter, listRecentActivities);

export default router;
