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
import {
    aiChatLimiter,
    dailyAILimiter,
    aiReadLimiter,
    aiConversationMutationLimiter,
    aiFeedbackLimiter
} from "../middleware/ai-rate-limiter.middleware.js";

const router = express.Router();

// All AI routes require authentication
router.use(authMiddleware);

// Apply daily limit to all AI routes
router.use(dailyAILimiter);

// Conversation management
router.post("/conversations", aiConversationMutationLimiter, createConversation);
router.get("/conversations", aiReadLimiter, listConversations);
router.get("/conversations/:id", aiReadLimiter, getConversation);
router.patch("/conversations/:id", aiConversationMutationLimiter, updateConversation);
router.patch("/conversations/migrate-types", aiConversationMutationLimiter, migrateConversationTypes); // Migration endpoint
router.delete("/conversations/:id", aiConversationMutationLimiter, deleteConversation);
router.delete("/conversations", aiConversationMutationLimiter, cleanupConversations); // Cleanup endpoint (for testing)

// Message operations (apply stricter rate limiting)
router.post("/conversations/:id/messages", aiChatLimiter, sendMessage);
router.get("/conversations/:id/messages/stream", aiChatLimiter, sendMessageStream); // SSE endpoint
router.get("/conversations/:id/messages", aiReadLimiter, getMessages);

// Message feedback
router.post("/messages/:id/feedback", aiFeedbackLimiter, provideFeedback);

export default router;