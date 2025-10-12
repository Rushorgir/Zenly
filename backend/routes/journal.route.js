import express from "express";
import { 
    createJournal, 
    deleteJournal, 
    getJournal, 
    getJournalInsights,
    getJournalStats,
    getJournalMessages,
    listJournals, 
    sendJournalMessage,
    streamJournalAnalysis,
    updateJournal 
} from "../controllers/journal.controller.js";
import authMiddleware, { sseAuthMiddleware } from "../middleware/auth.middleware.js";
import { validateJournal } from "../middleware/validation.middleware.js";
import { journalAILimiter } from "../middleware/ai-rate-limiter.middleware.js";
import { journalReadLimiter, journalDeleteLimiter } from "../middleware/journal-rate-limiter.middleware.js";

const router = express.Router();

// Journal CRUD (all require authentication)
router.post("/", authMiddleware, validateJournal, journalAILimiter, createJournal);
router.get("/", authMiddleware, journalReadLimiter, listJournals);
router.get("/stats", authMiddleware, journalReadLimiter, getJournalStats); // Must come before /:id
router.get("/:id", authMiddleware, journalReadLimiter, getJournal);
router.get("/:id/insights", authMiddleware, journalReadLimiter, getJournalInsights);
router.get("/:id/analyze-stream", sseAuthMiddleware, journalAILimiter, streamJournalAnalysis); // SSE endpoint - accepts token in query

// Journal Reflection Messages (embedded in journal - NO separate conversation!)
router.get("/:id/messages", authMiddleware, getJournalMessages);
router.post("/:id/messages", authMiddleware, journalAILimiter, sendJournalMessage);

router.patch("/:id", authMiddleware, journalAILimiter, updateJournal);
router.delete("/:id", authMiddleware, journalDeleteLimiter, deleteJournal);

export default router;