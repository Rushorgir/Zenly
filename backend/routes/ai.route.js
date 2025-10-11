import express from "express";
import { 
    cleanupConversations,
    createConversation,
    deleteConversation,
    getConversation, 
    getMessages,
    listConversations,
    migrateConversationTypes,
    provideFeedback,
    sendMessage,
    sendMessageStream,
    updateConversation
} from "../controllers/ai.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { aiChatLimiter, dailyAILimiter } from "../middleware/ai-rate-limiter.middleware.js";

const router = express.Router();

// All AI routes require authentication
router.use(authMiddleware);

// Apply daily limit to all AI routes
router.use(dailyAILimiter);

// Conversation management
router.post("/conversations", createConversation);
router.get("/conversations", listConversations);
router.get("/conversations/:id", getConversation);
router.patch("/conversations/:id", updateConversation);
router.patch("/conversations/migrate-types", migrateConversationTypes); // Migration endpoint
router.delete("/conversations/:id", deleteConversation);
router.delete("/conversations", cleanupConversations); // Cleanup endpoint (for testing)

// Message operations (apply stricter rate limiting)
router.post("/conversations/:id/messages", aiChatLimiter, sendMessage);
router.get("/conversations/:id/messages/stream", aiChatLimiter, sendMessageStream); // SSE endpoint
router.get("/conversations/:id/messages", getMessages);

// Message feedback
router.post("/messages/:id/feedback", provideFeedback);

export default router;