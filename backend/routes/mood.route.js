import express from "express";
import { listMoods, upsertTodayMood } from "../controllers/mood.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

// All mood routes require authentication
router.use(authMiddleware);

router.put("/today", upsertTodayMood);
router.get("/", listMoods);

export default router;