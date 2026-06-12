/**
 * Memory & Context Management Service
 * Manages conversation history and journal context for AI interactions
 */

import AI_CONFIG from '../config/ai.config.js';
import groqService from './groq.service.js';
import { supabase } from '../config/supabase.js';

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
      const { data: messagesData } = await supabase.from('ai_messages')
        .select('*')
        .eq('conversationId', conversationId)
        .order('createdAt', { ascending: false })
        .limit(AI_CONFIG.CONTEXT.MAX_MESSAGES_IN_CONTEXT);

      const messages = messagesData || [];

      // Get recent journal entries for context
      const { data: journalEntriesData } = await supabase.from('journal_entries')
        .select('content, aiAnalysis, mood, tags, createdAt')
        .eq('userId', userId)
        .is('deletedAt', null)
        .order('createdAt', { ascending: false })
        .limit(AI_CONFIG.CONTEXT.MAX_JOURNAL_ENTRIES);

      const journalEntries = journalEntriesData || [];

      // Reverse messages to get chronological order
      messages.reverse();

      return {
        conversationHistory: messages.map((msg) => ({
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
      const { data: message } = await supabase.from('ai_messages').insert({
        conversationId,
        role,
        content,
        metadata,
        createdAt: new Date().toISOString()
      }).select().single();

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
      let query = supabase.from('ai_conversations').select('*').eq('userId', userId);
      if (journalEntryId) {
          query = query.eq('journalEntryId', journalEntryId);
      } else {
          query = query.is('journalEntryId', null);
      }
      let { data: conversation } = await query.order('createdAt', { ascending: false }).limit(1).single();

      // Create new if none exists
      if (!conversation) {
        const { data: newConv } = await supabase.from('ai_conversations').insert({
          userId,
          journalEntryId,
          title: 'New Conversation',
          createdAt: new Date().toISOString()
        }).select().single();
        conversation = newConv;
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

    messages.forEach((msg) => {
      totalText += msg.content + ' ';
    });

    journalEntries.forEach((entry) => {
      totalText += (entry.content || '').substring(0, 200) + ' ';
      totalText += (entry.aiSummary || '') + ' ';
    });

    return groqService.estimateTokens(totalText);
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
      const { data: recentJournalsData } = await supabase.from('journal_entries')
        .select('mood, tags, aiAnalysis')
        .eq('userId', userId)
        .is('deletedAt', null)
        .order('createdAt', { ascending: false })
        .limit(20);

      const recentJournals = (recentJournalsData || []).map(j => ({
        mood: j.mood,
        tags: j.tags,
        sentiment: j.aiAnalysis?.sentiment,
        riskLevel: j.aiAnalysis?.riskAssessment?.level
      }));

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

    const sentiments = journals.map((j) => j.sentiment).filter(Boolean);
    const positive = sentiments.filter((s) => s === 'positive').length;
    const negative = sentiments.filter((s) => s === 'negative').length;

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

    journals.forEach((j) => {
      if (j.tags && Array.isArray(j.tags)) {
        j.tags.forEach((tag) => {
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
      const { data: oldConversations } = await supabase.from('ai_conversations')
        .select('id')
        .lt('createdAt', cutoffDate.toISOString());

      if (oldConversations && oldConversations.length > 0) {
        const conversationIds = oldConversations.map(c => c.id);
        await supabase.from('ai_messages').delete().in('conversationId', conversationIds);
        await supabase.from('ai_conversations').delete().in('id', conversationIds);
        console.log(`Cleaned up ${conversationIds.length} old conversations`);
      }
    } catch (error) {
      console.error('Error cleaning up conversations:', error);
    }
  }
}

export default new MemoryService();
