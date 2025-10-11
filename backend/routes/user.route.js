import express from "express";
import { getMe, updateMe, updateAvatar, changePassword } from "../controllers/user.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

// All user routes require authentication
router.use(authMiddleware);

router.get("/", getMe);
router.patch("/", updateMe);
router.put("/avatar", updateAvatar);
router.post("/password", changePassword);

export default router;