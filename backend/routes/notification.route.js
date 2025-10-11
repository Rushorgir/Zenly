import express from "express";
import { listNotifications, markRead } from "../controllers/notification.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

// All notification routes require authentication
router.use(authMiddleware);

router.get("/", listNotifications);
router.post("/mark-read", markRead);

export default router;