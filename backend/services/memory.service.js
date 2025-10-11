/**
 * Memory & Context Management Service
 * Manages conversation history and journal context for AI interactions
 */

import AIMessage from '../models/aiMessage.model.js';
import AIConversation from '../models/aiConversation.model.js';
import JournalEntry from '../models/journalEntry.model.js';
import AI_CONFIG from '../config/ai.config.js';
import huggingFaceService from './huggingface.service.js';

class MemoryService {
  /**
   * Get conversation context for AI chat
   * @param {string} conversationId
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async getConversationContext(conversationId, userId) {
    try {
      // Get recent messages from this conversation
      const messages = await AIMessage.find({ conversationId })
        .sort({ createdAt: -1 })
        .limit(AI_CONFIG.CONTEXT.MAX_MESSAGES_IN_CONTEXT)
        .lean();

      // Get recent journal entries for context
      const journalEntries = await JournalEntry.find({ 
        userId,
        deletedAt: null 
      })
        .sort({ createdAt: -1 })
        .limit(AI_CONFIG.CONTEXT.MAX_JOURNAL_ENTRIES)
        .select('content aiSummary mood tags createdAt')
        .lean();

      // Reverse messages to get chronological order
      messages.reverse();

      return {
        conversationHistory: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.createdAt
        })),
        journalContext: journalEntries,
        tokenCount: this.estimateContextTokens(messages, journalEntries)
      };
    } catch (error) {
      console.error('Error getting conversation context:', error);
      return {
        conversationHistory: [],
        journalContext: [],
        tokenCount: 0
      };
    }
  }

  /**
   * Save message to conversation
   * @param {string} conversationId
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content
   * @param {object} metadata
   * @returns {Promise<object>}
   */
  async saveMessage(conversationId, role, content, metadata = {}) {
    try {
      const message = await AIMessage.create({
        conversationId,
        role,
        content,
        metadata
      });

      return message;
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }

  /**
   * Create or get conversation
   * @param {string} userId
   * @param {string} journalEntryId - Optional
   * @returns {Promise<object>}
   */
  async getOrCreateConversation(userId, journalEntryId = null) {
    try {
      // Try to find active conversation
      let conversation = await AIConversation.findOne({
        userId,
        journalEntryId: journalEntryId || null,
        // Get most recent conversation
      }).sort({ createdAt: -1 });

      // Create new if none exists
      if (!conversation) {
        conversation = await AIConversation.create({
          userId,
          journalEntryId,
          title: 'New Conversation'
        });
      }

      return conversation;
    } catch (error) {
      console.error('Error getting/creating conversation:', error);
      throw error;
    }
  }

  /**
   * Estimate token count for context
   * @param {Array} messages
   * @param {Array} journalEntries
   * @returns {number}
   */
  estimateContextTokens(messages, journalEntries) {
    let totalText = '';
    
    messages.forEach(msg => {
      totalText += msg.content + ' ';
    });

    journalEntries.forEach(entry => {
      totalText += (entry.content || '').substring(0, 200) + ' ';
      totalText += (entry.aiSummary || '') + ' ';
    });

    return huggingFaceService.estimateTokens(totalText);
  }

  /**
   * Truncate context to fit within token limit
   * @param {object} context
   * @returns {object}
   */
  truncateContext(context) {
    const maxTokens = AI_CONFIG.CONTEXT.MAX_CONTEXT_TOKENS;
    
    while (context.tokenCount > maxTokens && context.conversationHistory.length > 1) {
      // Remove oldest message (but keep at least 1)
      context.conversationHistory.shift();
      context.tokenCount = this.estimateContextTokens(
        context.conversationHistory,
        context.journalContext
      );
    }

    return context;
  }

  /**
   * Get user preferences and patterns
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async getUserPreferences(userId) {
    try {
      // Analyze user's journal history for patterns
      const recentJournals = await JournalEntry.find({
        userId,
        deletedAt: null
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('mood tags sentiment riskLevel')
        .lean();

      // Extract patterns
      const moodPattern = this.extractMoodPattern(recentJournals);
      const commonTopics = this.extractCommonTopics(recentJournals);

      return {
        moodPattern,
        commonTopics,
        journalCount: recentJournals.length
      };
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return {
        moodPattern: 'unknown',
        commonTopics: [],
        journalCount: 0
      };
    }
  }

  /**
   * Extract mood pattern from journals
   * @param {Array} journals
   * @returns {string}
   */
  extractMoodPattern(journals) {
    if (journals.length === 0) return 'unknown';

    const sentiments = journals.map(j => j.sentiment).filter(Boolean);
    const positive = sentiments.filter(s => s === 'positive').length;
    const negative = sentiments.filter(s => s === 'negative').length;

    if (positive > negative * 1.5) return 'generally positive';
    if (negative > positive * 1.5) return 'struggling';
    return 'mixed';
  }

  /**
   * Extract common topics from tags
   * @param {Array} journals
   * @returns {Array}
   */
  extractCommonTopics(journals) {
    const tagCounts = {};
    
    journals.forEach(j => {
      if (j.tags && Array.isArray(j.tags)) {
        j.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => tag);
  }

  /**
   * Clean up old conversations (housekeeping)
   * @param {number} daysOld - Delete conversations older than this
   */
  async cleanupOldConversations(daysOld = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Delete old conversations and their messages
      const oldConversations = await AIConversation.find({
        createdAt: { $lt: cutoffDate }
      }).select('_id');

      const conversationIds = oldConversations.map(c => c._id);

      await AIMessage.deleteMany({ conversationId: { $in: conversationIds } });
      await AIConversation.deleteMany({ _id: { $in: conversationIds } });

      console.log(`Cleaned up ${conversationIds.length} old conversations`);
    } catch (error) {
      console.error('Error cleaning up conversations:', error);
    }
  }
}

export default new MemoryService();
