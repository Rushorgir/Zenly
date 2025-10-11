import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { listRecentActivities } from "../controllers/activity.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", listRecentActivities);

export default router;
