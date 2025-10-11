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

import AIConversation from '../models/aiConversation.model.js';
import AIMessage from '../models/aiMessage.model.js';
import JournalEntry from '../models/journalEntry.model.js';
import aiOrchestratorService from '../services/ai-orchestrator.service.js';
import streamingService from '../services/streaming.service.js';

/**
 * Create a new conversation
 * POST /api/ai/conversations
 */
export const createConversation = async (req, res) => {
  try {
    const { type = 'general-chat', journalEntryId, title } = req.body;
    const userId = req.userId;

    console.log(`[AI CREATE] User ${userId} attempting to create conversation, type: ${type}`);

    // Validation
    if (!['journal-reflection', 'general-chat'].includes(type)) {
      console.log(`[AI CREATE] Invalid conversation type: ${type}`);
      return res.status(400).json({
        success: false,
        error: 'Invalid conversation type'
      });
    }

    // If journal-based, verify journal exists and belongs to user
    if (type === 'journal-reflection') {
      if (!journalEntryId) {
        return res.status(400).json({
          success: false,
          error: 'Journal ID required for journal-reflection type'
        });
      }

      const journal = await JournalEntry.findOne({
        _id: journalEntryId,
        userId,
        deletedAt: null
      });

      if (!journal) {
        return res.status(404).json({
          success: false,
          error: 'Journal not found'
        });
      }
    }

    // Check if user has any empty conversations (prevent duplicates)
    // Only check for the SAME type of conversation (general-chat vs journal-reflection)
    // This allows journal reflections and general chats to coexist independently
    console.log(`[AI CREATE] Checking for existing empty ${type} conversations for user ${userId}...`);
    
    const query = {
      userId,
      type, // Only check for same type
      messageCount: 0
    };
    
    console.log(`[AI CREATE] Query:`, JSON.stringify(query));
    
    const emptyConversation = await AIConversation.findOne(query).sort({ createdAt: -1 });
    
    console.log(`[AI CREATE] Found empty conversation:`, emptyConversation ? {
      id: emptyConversation._id,
      title: emptyConversation.title,
      type: emptyConversation.type,
      messageCount: emptyConversation.messageCount,
      status: emptyConversation.status
    } : 'none');

    if (emptyConversation) {
      console.log(`[AI CREATE] Blocking creation - empty ${type} conversation already exists: ${emptyConversation._id}`);
      return res.status(400).json({
        success: false,
        error: `You already have an empty ${type === 'general-chat' ? 'chat' : 'journal reflection'} conversation. Please use that first.`,
        existingConversation: {
          _id: emptyConversation._id,
          title: emptyConversation.title,
          type: emptyConversation.type,
          status: emptyConversation.status
        }
      });
    }

    console.log(`[AI CREATE] No empty ${type} conversations found, creating new one...`);

    // Create conversation
    const conversation = await AIConversation.create({
      userId,
      type,
      journalEntryId: type === 'journal-reflection' ? journalEntryId : null,
      title: title || (type === 'journal-reflection' ? 'Journal Reflection' : 'Chat with AI'),
      status: 'active',
      context: {
        recentJournals: [],
        userPreferences: {},
        conversationGoals: [],
        topicsDiscussed: []
      },
      messageCount: 0,
      createdAt: new Date()
    });

    console.log(`[AI CREATE] Successfully created conversation ${conversation._id} for user ${userId}`);

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
    res.status(500).json({
      success: false,
      error: 'Failed to create conversation',
      details: error.message
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

    const conversation = await AIConversation.findOne({
      _id: id,
      userId
    }).populate('journalEntryId', 'content mood createdAt');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

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
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve conversation'
    });
  }
};

/**
 * List user's conversations
 * GET /api/ai/conversations
 */
export const listConversations = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      type,
      status,
      limit = 20,
      cursor
    } = req.query;

    console.log(`[AI LIST] ========================================`);
    console.log(`[AI LIST] Listing conversations for user ${userId}`);
    console.log(`[AI LIST] Query params:`, { type, status, limit, cursor });

    // Build query - ENFORCE type filter if provided
    let query;
    
    // CRITICAL: If type is specified, use $and to combine userId with type filter
    if (type) {
      // Match conversations that are:
      // 1. Belong to this user AND
      // 2. Either match the type OR have no type (legacy)
      query = {
        $and: [
          { userId },
          {
            $or: [
              { type: type }, // Explicit type match
              { type: { $exists: false } }, // Legacy conversations without type field
              { type: null } // Conversations with null type
            ]
          }
        ]
      };
      console.log(`[AI LIST] FILTERING by type: "${type}" (including legacy conversations without type)`);
    } else {
      query = { userId };
      console.log(`[AI LIST] WARNING: No type filter - showing ALL types`);
    }
    
    // Status filtering (excluding archived by default)
    if (status) {
      if (type) {
        query.$and.push({ status });
      } else {
        query.status = status;
      }
      console.log(`[AI LIST] FILTERING by status: "${status}"`);
    } else {
      if (type) {
        query.$and.push({ status: { $ne: 'archived' } });
      } else {
        query.status = { $ne: 'archived' };
      }
      console.log(`[AI LIST] FILTERING out archived conversations`);
    }
    
    if (cursor) {
      if (type) {
        query.$and.push({ _id: { $lt: cursor } });
      } else {
        query._id = { $lt: cursor };
      }
    }

    console.log(`[AI LIST] Final MongoDB query:`, JSON.stringify(query, null, 2));

    const conversations = await AIConversation.find(query)
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .limit(parseInt(limit) + 1)
      .lean();

    const hasMore = conversations.length > parseInt(limit);
    const results = hasMore ? conversations.slice(0, -1) : conversations;
    const nextCursor = hasMore ? results[results.length - 1]._id : null;

    console.log(`[AI LIST] Found ${results.length} conversations (hasMore: ${hasMore})`);
    console.log(`[AI LIST] ----------------------------------------`);
    
    if (results.length === 0) {
      console.log(`[AI LIST] No conversations found`);
    } else {
      results.forEach((c, idx) => {
        console.log(`[AI LIST] ${idx + 1}. ID: ${c._id}`);
        console.log(`[AI LIST]    Title: "${c.title}"`);
        console.log(`[AI LIST]    Type: ${c.type}`);
        console.log(`[AI LIST]    Messages: ${c.messageCount}`);
        console.log(`[AI LIST]    Status: ${c.status}`);
        console.log(`[AI LIST]    ---`);
      });
    }
    
    console.log(`[AI LIST] ========================================`);

    res.json({
      success: true,
      conversations: results,
      pagination: {
        nextCursor,
        hasMore,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('[AI Chat Controller] List conversations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list conversations'
    });
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

    // Verify conversation
    const conversation = await AIConversation.findOne({
      _id: conversationId,
      userId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    console.log(`[AI Chat Controller] Sending message in conversation: ${conversationId}`);

    // Save user message
    const userMessage = await AIMessage.create({
      conversationId,
      role: 'user',
      content: content.trim(),
      status: 'delivered',
      createdAt: new Date()
    });

    // Generate AI response
    const aiResponse = await aiOrchestratorService.generateChatResponse(
      conversationId,
      content.trim()
    );

    // Save AI message
    const aiMessage = await AIMessage.create({
      conversationId,
      role: 'assistant',
      content: aiResponse.content,
      status: 'delivered',
      aiMetadata: {
        ...aiResponse.metadata,
        promptTokens: 0, // TODO: Calculate actual tokens
        completionTokens: 0,
        totalTokens: 0,
        latencyMs: 0 // TODO: Track latency
      },
      createdAt: new Date()
    });

    // Update conversation
    await AIConversation.findByIdAndUpdate(conversationId, {
      $inc: { messageCount: 2 },
      lastMessageAt: new Date(),
      ...(aiResponse.metadata.isCrisis && {
        status: 'crisis',
        crisisDetected: true,
        crisisLevel: aiResponse.metadata.riskLevel,
        crisisTimestamp: new Date()
      })
    });

    console.log(`[AI Chat Controller] Message sent successfully`, {
      crisis: aiResponse.metadata.isCrisis,
      riskLevel: aiResponse.metadata.riskLevel
    });

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
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      details: error.message
    });
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

    console.log(`[AI Chat Controller] Starting streaming message in: ${conversationId}`);

    // Stream the response
    await streamingService.streamAIResponse(
      res,
      conversationId,
      content.trim(),
      userId
    );

  } catch (error) {
    console.error('[AI Chat Controller] Stream message error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to stream message'
      });
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
    const {
      limit = 50,
      before,
      after
    } = req.query;

    // Verify conversation
    const conversation = await AIConversation.findOne({
      _id: conversationId,
      userId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // Build query
    const query = { conversationId };
    
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    } else if (after) {
      query.createdAt = { $gt: new Date(after) };
    }

    const messages = await AIMessage.find(query)
      .sort({ createdAt: before ? -1 : 1 })
      .limit(parseInt(limit) + 1)
      .select('-__v')
      .lean();

    const hasMore = messages.length > parseInt(limit);
    const results = hasMore ? messages.slice(0, -1) : messages;

    // If we fetched in reverse (before), reverse again for chronological order
    if (before) {
      results.reverse();
    }

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
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve messages'
    });
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

    const conversation = await AIConversation.findOne({ _id: id, userId });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (title) updateData.title = title;
    updateData.updatedAt = new Date();

    const updated = await AIConversation.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    res.json({
      success: true,
      conversation: updated
    });

  } catch (error) {
    console.error('[AI Chat Controller] Update conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update conversation'
    });
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

    // Verify conversation exists and belongs to user
    const conversation = await AIConversation.findOne({ _id: id, userId });

    if (!conversation) {
      console.log(`[AI DELETE] Conversation ${id} not found for user ${userId}`);
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    console.log(`[AI DELETE] Found conversation ${id}, title: "${conversation.title}"`);
    console.log(`[AI DELETE] Deleting messages for conversation ${id}...`);

    // Delete all messages in this conversation first
    const messagesResult = await AIMessage.deleteMany({ conversationId: id });
    console.log(`[AI DELETE] Deleted ${messagesResult.deletedCount} messages`);

    // Now delete the conversation itself
    console.log(`[AI DELETE] Deleting conversation document ${id}...`);
    const conversationResult = await AIConversation.findByIdAndDelete(id);
    
    if (!conversationResult) {
      console.error(`[AI DELETE] Failed to delete conversation ${id} - not found in second query`);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete conversation'
      });
    }

    console.log(`[AI DELETE] Successfully deleted conversation ${id} and its ${messagesResult.deletedCount} messages`);

    res.json({
      success: true,
      message: 'Conversation deleted successfully',
      deletedMessages: messagesResult.deletedCount
    });

  } catch (error) {
    console.error('[AI DELETE] Delete conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete conversation',
      details: error.message
    });
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

    // Verify message belongs to user's conversation
    const message = await AIMessage.findById(messageId).populate({
      path: 'conversationId',
      select: 'userId'
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    if (message.conversationId.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Update feedback
    await AIMessage.findByIdAndUpdate(messageId, {
      'feedback.rating': rating,
      'feedback.helpful': helpful,
      'feedback.flagged': flagged,
      'feedback.flagReason': flagReason,
      'feedback.comment': comment,
      'feedback.createdAt': new Date()
    });

    res.json({
      success: true,
      message: 'Feedback recorded successfully'
    });

  } catch (error) {
    console.error('[AI Chat Controller] Provide feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record feedback'
    });
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

    // Find all conversations for this user
    const conversations = await AIConversation.find({ userId });
    const conversationIds = conversations.map(c => c._id);
    
    console.log(`[AI CLEANUP] Found ${conversations.length} conversations to delete`);
    conversations.forEach(c => {
      console.log(`[AI CLEANUP]   - ${c._id}: "${c.title}" (${c.messageCount} messages, status: ${c.status})`);
    });
    
    // Delete all messages from these conversations
    console.log(`[AI CLEANUP] Deleting messages...`);
    const messagesResult = await AIMessage.deleteMany({ conversationId: { $in: conversationIds } });
    console.log(`[AI CLEANUP] Deleted ${messagesResult.deletedCount} messages`);
    
    // Delete all conversations
    console.log(`[AI CLEANUP] Deleting conversations...`);
    const conversationsResult = await AIConversation.deleteMany({ userId });
    console.log(`[AI CLEANUP] Deleted ${conversationsResult.deletedCount} conversations`);

    console.log(`[AI CLEANUP] Cleanup complete for user ${userId}`);

    res.json({
      success: true,
      message: `Deleted ${conversationsResult.deletedCount} conversations and ${messagesResult.deletedCount} messages`,
      deletedConversations: conversationsResult.deletedCount,
      deletedMessages: messagesResult.deletedCount
    });

  } catch (error) {
    console.error('[AI CLEANUP] Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup conversations',
      details: error.message
    });
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

    console.log(`[AI MIGRATE] Starting type migration for user ${userId}...`);

    // Find all conversations without a type field or with null type
    const conversationsToMigrate = await AIConversation.find({
      userId,
      $or: [
        { type: { $exists: false } },
        { type: null }
      ]
    });

    console.log(`[AI MIGRATE] Found ${conversationsToMigrate.length} conversations without type`);

    if (conversationsToMigrate.length === 0) {
      return res.json({
        success: true,
        message: 'No conversations need migration',
        migratedCount: 0
      });
    }

    // Update all to general-chat (since they were created from AI chat page)
    const result = await AIConversation.updateMany(
      {
        userId,
        $or: [
          { type: { $exists: false } },
          { type: null }
        ]
      },
      {
        $set: { type: 'general-chat' }
      }
    );

    console.log(`[AI MIGRATE] Migrated ${result.modifiedCount} conversations to type: general-chat`);

    res.json({
      success: true,
      message: `Migrated ${result.modifiedCount} conversations to general-chat type`,
      migratedCount: result.modifiedCount,
      conversations: conversationsToMigrate.map(c => ({
        id: c._id,
        title: c.title,
        oldType: c.type || 'undefined',
        newType: 'general-chat'
      }))
    });

  } catch (error) {
    console.error('[AI MIGRATE] Migration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to migrate conversation types',
      details: error.message
    });
  }
};
