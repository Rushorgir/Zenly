/**
 * AI Chat Controller (REDESIGNED)
 *
 * Complete rewrite with:
 * - SSE streaming support
 * - Better conversation management
 * - Robust error handling
 * - Message status tracking
 * - Context-aware responses
 */

import aiService from '../services/ai.service.js';

/**
 * Create a new conversation
 * POST /api/ai/conversations
 */
export const createConversation = async (req, res) => {
  try {
    const userId = req.userId;
    const conversation = await aiService.createConversation(req.body, userId);
    res.status(201).json({
      success: true,
      conversation: {
        _id: conversation._id,
        type: conversation.type,
        title: conversation.title,
        status: conversation.status,
        journalEntryId: conversation.journalEntryId,
        messageCount: conversation.messageCount,
        createdAt: conversation.createdAt
      }
    });
  } catch (error) {
    console.error('[AI CREATE] Create conversation error:', error);
    const status = error.status || 500;
    res.status(status).json({
      success: false,
      error: error.message || 'Failed to create conversation',
      ...(status === 400 && error.existingConversation
        ? { existingConversation: error.existingConversation }
        : {})
    });
  }
};

/**
 * Get conversation details
 * GET /api/ai/conversations/:id
 */
export const getConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const conversation = await aiService.getConversation(id, userId);
    res.json({
      success: true,
      conversation: {
        _id: conversation._id,
        type: conversation.type,
        title: conversation.title,
        summary: conversation.summary,
        status: conversation.status,
        journalEntry: conversation.journalEntryId,
        crisisDetected: conversation.crisisDetected,
        crisisLevel: conversation.crisisLevel,
        messageCount: conversation.messageCount,
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt
      }
    });
  } catch (error) {
    console.error('[AI Chat Controller] Get conversation error:', error);
    const status = error.status || 500;
    res
      .status(status)
      .json({ success: false, error: error.message || 'Failed to retrieve conversation' });
  }
};

/**
 * List user's conversations
 * GET /api/ai/conversations
 */
export const listConversations = async (req, res) => {
  try {
    const userId = req.userId;
    const { type, status, limit = 20, cursor } = req.query;

    console.log(`[AI LIST] ========================================`);
    console.log(`[AI LIST] Listing conversations for user ${userId}`);
    console.log(`[AI LIST] Query params:`, { type, status, limit, cursor });

    const { results, nextCursor, hasMore } = await aiService.listConversations(
      { type, status, limit, cursor },
      userId
    );
    res.json({
      success: true,
      conversations: results,
      pagination: { nextCursor, hasMore, limit: parseInt(limit) }
    });
  } catch (error) {
    console.error('[AI Chat Controller] List conversations error:', error);
    const status = error.status || 500;
    res
      .status(status)
      .json({ success: false, error: error.message || 'Failed to list conversations' });
  }
};

/**
 * Send message (non-streaming)
 * POST /api/ai/conversations/:id/messages
 */
export const sendMessage = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    // Validation
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message content is required'
      });
    }

    if (content.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Message too long (max 2000 characters)'
      });
    }

    const { userMessage, aiMessage, aiResponse } = await aiService.sendMessage(
      conversationId,
      content,
      userId
    );
    res.json({
      success: true,
      userMessage: {
        _id: userMessage._id,
        role: userMessage.role,
        content: userMessage.content,
        createdAt: userMessage.createdAt
      },
      aiMessage: {
        _id: aiMessage._id,
        role: aiMessage.role,
        content: aiMessage.content,
        createdAt: aiMessage.createdAt,
        isCrisis: aiResponse.metadata.isCrisis,
        riskLevel: aiResponse.metadata.riskLevel,
        resources: aiResponse.metadata.crisisResources
      }
    });
  } catch (error) {
    console.error('[AI Chat Controller] Send message error:', error);
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message || 'Failed to send message' });
  }
};

/**
 * Send message with streaming (SSE)
 * GET /api/ai/conversations/:id/messages/stream
 */
export const sendMessageStream = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const { content } = req.query; // Message in query for SSE
    const userId = req.userId;

    // Validation
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message content is required'
      });
    }

    await aiService.sendMessageStream(res, conversationId, content, userId);
  } catch (error) {
    console.error('[AI Chat Controller] Stream message error:', error);

    if (!res.headersSent) {
      const status = error.status || 500;
      res
        .status(status)
        .json({ success: false, error: error.message || 'Failed to stream message' });
    }
  }
};

/**
 * Get conversation messages
 * GET /api/ai/conversations/:id/messages
 */
export const getMessages = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const userId = req.userId;
    const { limit = 50, before, after } = req.query;
    const { results, hasMore } = await aiService.getMessages(conversationId, userId, {
      limit,
      before,
      after
    });
    res.json({
      success: true,
      messages: results,
      pagination: {
        hasMore,
        limit: parseInt(limit),
        before: hasMore ? results[0].createdAt : null,
        after: hasMore ? results[results.length - 1].createdAt : null
      }
    });
  } catch (error) {
    console.error('[AI Chat Controller] Get messages error:', error);
    const status = error.status || 500;
    res
      .status(status)
      .json({ success: false, error: error.message || 'Failed to retrieve messages' });
  }
};

/**
 * Update conversation (archive, etc.)
 * PATCH /api/ai/conversations/:id
 */
export const updateConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { status, title } = req.body;
    const updated = await aiService.updateConversation(id, userId, { status, title });
    res.json({ success: true, conversation: updated });
  } catch (error) {
    console.error('[AI Chat Controller] Update conversation error:', error);
    const status = error.status || 500;
    res
      .status(status)
      .json({ success: false, error: error.message || 'Failed to update conversation' });
  }
};

/**
 * Delete a conversation
 * DELETE /api/ai/conversations/:id
 */
export const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    console.log(`[AI DELETE] Starting delete for conversation ${id} by user ${userId}`);

    const result = await aiService.deleteConversation(id, userId);
    res.json({
      success: true,
      message: 'Conversation deleted successfully',
      deletedMessages: result.deletedMessages
    });
  } catch (error) {
    console.error('[AI DELETE] Delete conversation error:', error);
    const status = error.status || 500;
    res
      .status(status)
      .json({ success: false, error: error.message || 'Failed to delete conversation' });
  }
};

/**
 * Provide feedback on AI message
 * POST /api/ai/messages/:id/feedback
 */
export const provideFeedback = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.userId;
    const { rating, helpful, flagged, flagReason, comment } = req.body;

    await aiService.provideFeedback(messageId, userId, {
      rating,
      helpful,
      flagged,
      flagReason,
      comment
    });
    res.json({ success: true, message: 'Feedback recorded successfully' });
  } catch (error) {
    console.error('[AI Chat Controller] Provide feedback error:', error);
    const status = error.status || 500;
    res
      .status(status)
      .json({ success: false, error: error.message || 'Failed to record feedback' });
  }
};

/**
 * Delete all conversations for current user (cleanup endpoint for testing)
 * DELETE /api/ai/conversations
 */
export const cleanupConversations = async (req, res) => {
  try {
    const userId = req.userId;

    console.log(`[AI CLEANUP] Starting cleanup for user ${userId}...`);

    const result = await aiService.cleanupConversations(userId);
    res.json({
      success: true,
      message: `Deleted ${result.deletedConversations} conversations and ${result.deletedMessages} messages`,
      deletedConversations: result.deletedConversations,
      deletedMessages: result.deletedMessages
    });
  } catch (error) {
    console.error('[AI CLEANUP] Cleanup error:', error);
    const status = error.status || 500;
    res
      .status(status)
      .json({ success: false, error: error.message || 'Failed to cleanup conversations' });
  }
};

/**
 * Helper: Generate welcome message
 */
// No default welcome messages — conversations are created empty and assistant will respond to user input.

/**
 * Migrate legacy conversations without type to general-chat
 * PATCH /api/ai/conversations/migrate-types
 */
export const migrateConversationTypes = async (req, res) => {
  try {
    const userId = req.userId;
    const result = await aiService.migrateConversationTypes(userId);
    res.json({
      success: true,
      message: `Migrated ${result.migratedCount} conversations to general-chat type`,
      migratedCount: result.migratedCount,
      conversations:
        result.conversations?.map((c) => ({
          id: c._id,
          title: c.title,
          oldType: c.type || 'undefined',
          newType: 'general-chat'
        })) || []
    });
  } catch (error) {
    const status = error.status || 500;
    res
      .status(status)
      .json({ success: false, error: error.message || 'Failed to migrate conversation types' });
  }
};
