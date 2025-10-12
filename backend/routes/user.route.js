import express from "express";
import { getMe, updateMe, updateAvatar, changePassword } from "../controllers/user.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import {
	userProfileReadLimiter,
	userProfileUpdateLimiter,
	userAvatarUpdateLimiter,
	userPasswordChangeLimiter,
} from "../middleware/user-rate-limiter.middleware.js";

const router = express.Router();

// All user routes require authentication
router.use(authMiddleware);

router.get("/", userProfileReadLimiter, getMe);
router.patch("/", userProfileUpdateLimiter, updateMe);
router.put("/avatar", userAvatarUpdateLimiter, updateAvatar);
router.post("/password", userPasswordChangeLimiter, changePassword);

export default router;