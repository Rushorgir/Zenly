/**
 * Context Builder Service
 * 
 * Builds rich, token-aware context for AI operations including:
 * - User profile and preferences
 * - Recent journal entries
 * - Conversation history
 * - Behavioral patterns
 * - Risk indicators
 */

import JournalEntry from '../models/journalEntry.model.js';
import AIConversation from '../models/aiConversation.model.js';
import AIMessage from '../models/aiMessage.model.js';
import User from '../models/user.model.js';

class ContextBuilder {
  constructor() {
    this.MAX_CONTEXT_TOKENS = 2000;
    this.TOKEN_PER_CHAR = 0.25; // Rough estimate: 1 token ≈ 4 chars
  }

  /**
   * Build comprehensive context for AI operations
   * @param {string} userId - User ID
   * @param {Object} options - Context building options
   * @returns {Promise<Object>} Rich context object
   */
  async buildContext(userId, options = {}) {
    const {
      includeJournals = true,
      includeConversations = false,
      maxJournals = 5,
      maxMessages = 10,
      timeRange = '30d'
    } = options;

    try {
      console.log(`[Context Builder] Building context for user: ${userId}`);

      const context = {
        user: null,
        recentJournals: [],
        conversationHistory: [],
        patterns: {},
        preferences: {},
        metadata: {
          builtAt: new Date(),
          timeRange,
          includedSources: []
        }
      };

      // Get user profile
      try {
        context.user = await this.getUserProfile(userId);
        context.metadata.includedSources.push('user-profile');
      } catch (error) {
        console.warn('[Context Builder] Failed to load user profile:', error.message);
      }

      // Get recent journals
      if (includeJournals) {
        try {
          context.recentJournals = await this.getRecentJournals(
            userId,
            maxJournals,
            timeRange
          );
          
          if (context.recentJournals.length > 0) {
            context.patterns = await this.analyzeJournalPatterns(context.recentJournals);
            context.metadata.includedSources.push('journal-history');
          }
        } catch (error) {
          console.warn('[Context Builder] Failed to load journals:', error.message);
        }
      }

      // Get conversation history
      if (includeConversations) {
        try {
          context.conversationHistory = await this.getRecentMessages(
            userId,
            maxMessages
          );
          
          if (context.conversationHistory.length > 0) {
            context.metadata.includedSources.push('conversation-history');
          }
        } catch (error) {
          console.warn('[Context Builder] Failed to load conversations:', error.message);
        }
      }

      // Extract preferences from history
      context.preferences = await this.extractPreferences(
        context.recentJournals,
        context.conversationHistory
      );

      console.log(`[Context Builder] Context built successfully:`, {
        journalsIncluded: context.recentJournals.length,
        messagesIncluded: context.conversationHistory.length,
        patternsFound: Object.keys(context.patterns).length
      });

      return context;

    } catch (error) {
      console.error('[Context Builder] Error building context:', error);
      return this.getMinimalContext(userId);
    }
  }

  /**
   * Build context specifically for conversations
   */
  async buildConversationContext(conversation) {
    try {
      // Get last N messages from this conversation
      const messages = await AIMessage.find({
        conversationId: conversation._id
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

      // Build base context
      const context = await this.buildContext(conversation.userId, {
        includeJournals: !!conversation.journalEntryId,
        includeConversations: false,
        maxJournals: 3
      });

      // Add conversation-specific data
      context.conversation = {
        type: conversation.type,
        messageCount: messages.length,
        messages: messages.reverse() // Chronological order
      };

      // If journal-based conversation, include the journal
      if (conversation.journalEntryId) {
        try {
          const journal = await JournalEntry.findById(conversation.journalEntryId).lean();
          if (journal) {
            context.currentJournal = {
              content: journal.content,
              mood: journal.mood,
              createdAt: journal.createdAt,
              analysis: journal.aiAnalysis
            };
            context.metadata.includedSources.push('current-journal');
          }
        } catch (error) {
          console.warn('[Context Builder] Failed to load conversation journal:', error.message);
        }
      }

      return context;

    } catch (error) {
      console.error('[Context Builder] Error building conversation context:', error);
      return { conversation: { messages: [] } };
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId) {
    const user = await User.findById(userId)
      .select('name email createdAt')
      .lean();

    if (!user) return null;

    return {
      name: user.name,
      joinedAt: user.createdAt
    };
  }

  /**
   * Get recent journal entries
   */
  async getRecentJournals(userId, limit = 5, timeRange = '30d') {
    const days = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const journals = await JournalEntry.find({
      userId,
      createdAt: { $gte: startDate },
      deletedAt: null
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('content mood createdAt aiAnalysis')
    .lean();

    return journals.map(j => ({
      content: j.content.substring(0, 500), // Truncate for token limit
      mood: j.mood,
      date: j.createdAt,
      sentiment: j.aiAnalysis?.sentiment,
      riskLevel: j.aiAnalysis?.riskAssessment?.level
    }));
  }

  /**
   * Get recent messages across all conversations
   */
  async getRecentMessages(userId, limit = 10) {
    // Get user's conversations
    const conversations = await AIConversation.find({ userId })
      .select('_id')
      .lean();

    const conversationIds = conversations.map(c => c._id);

    const messages = await AIMessage.find({
      conversationId: { $in: conversationIds }
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('role content createdAt')
    .lean();

    return messages.reverse().map(m => ({
      role: m.role,
      content: m.content.substring(0, 300), // Truncate
      date: m.createdAt
    }));
  }

  /**
   * Analyze patterns in journal entries
   */
  async analyzeJournalPatterns(journals) {
    if (!journals || journals.length === 0) {
      return {};
    }

    const patterns = {};

    // Mood trend
    const moods = journals.filter(j => j.mood).map(j => j.mood);
    if (moods.length > 0) {
      const avgMood = moods.reduce((a, b) => a + b, 0) / moods.length;
      const recentMood = moods.slice(0, 2).reduce((a, b) => a + b, 0) / Math.min(2, moods.length);
      
      patterns.moodTrend = recentMood > avgMood 
        ? 'improving' 
        : recentMood < avgMood 
          ? 'declining' 
          : 'stable';
      
      patterns.averageMood = avgMood.toFixed(1);
    }

    // Sentiment trend
    const sentiments = journals
      .filter(j => j.sentiment?.score !== undefined)
      .map(j => j.sentiment.score);
    
    if (sentiments.length > 0) {
      const avgSentiment = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
      patterns.sentimentTrend = avgSentiment > 0.2 
        ? 'positive' 
        : avgSentiment < -0.2 
          ? 'negative' 
          : 'neutral';
    }

    // Risk assessment
    const riskLevels = journals
      .filter(j => j.riskLevel)
      .map(j => j.riskLevel);
    
    if (riskLevels.length > 0) {
      const hasHighRisk = riskLevels.includes('high');
      const hasMediumRisk = riskLevels.includes('medium');
      
      patterns.recentRiskLevel = hasHighRisk 
        ? 'high' 
        : hasMediumRisk 
          ? 'medium' 
          : 'low';
    }

    // Common themes (simple keyword extraction)
    const allContent = journals.map(j => j.content).join(' ').toLowerCase();
    const keywords = ['stress', 'anxiety', 'depression', 'happy', 'sad', 'work', 'school', 'family', 'friends'];
    patterns.commonThemes = keywords.filter(keyword => 
      allContent.includes(keyword)
    );

    return patterns;
  }

  /**
   * Extract user preferences from history
   */
  async extractPreferences(journals, messages) {
    const preferences = {
      preferredTopics: [],
      communicationStyle: 'balanced', // supportive, analytical, balanced
      responseLength: 'medium' // short, medium, long
    };

    // Analyze message patterns to infer preferences
    if (messages.length > 0) {
      const userMessages = messages.filter(m => m.role === 'user');
      
      if (userMessages.length > 0) {
        const avgLength = userMessages.reduce((sum, m) => sum + m.content.length, 0) / userMessages.length;
        preferences.responseLength = avgLength < 100 ? 'short' : avgLength > 300 ? 'long' : 'medium';
      }
    }

    return preferences;
  }

  /**
   * Truncate context to fit token limit
   */
  truncateToTokenLimit(context, maxTokens = this.MAX_CONTEXT_TOKENS) {
    const estimatedTokens = this.estimateTokens(context);
    
    if (estimatedTokens <= maxTokens) {
      return context;
    }

    console.log(`[Context Builder] Truncating context from ~${estimatedTokens} to ${maxTokens} tokens`);

    // Priority order for truncation:
    // 1. Keep current conversation
    // 2. Keep most recent journal (if journal-based)
    // 3. Keep patterns
    // 4. Trim older journals
    // 5. Trim conversation history

    const truncated = { ...context };

    // Trim journal content
    if (truncated.recentJournals && truncated.recentJournals.length > 0) {
      truncated.recentJournals = truncated.recentJournals.slice(0, 2);
      truncated.recentJournals = truncated.recentJournals.map(j => ({
        ...j,
        content: j.content.substring(0, 200)
      }));
    }

    // Trim conversation history
    if (truncated.conversationHistory && truncated.conversationHistory.length > 0) {
      truncated.conversationHistory = truncated.conversationHistory.slice(-5);
      truncated.conversationHistory = truncated.conversationHistory.map(m => ({
        ...m,
        content: m.content.substring(0, 150)
      }));
    }

    return truncated;
  }

  /**
   * Estimate token count for context
   */
  estimateTokens(context) {
    const contextString = JSON.stringify(context);
    return Math.ceil(contextString.length * this.TOKEN_PER_CHAR);
  }

  /**
   * Format context for prompt injection
   */
  formatContextForPrompt(context) {
    let formatted = '';

    // User info
    if (context.user?.name) {
      formatted += `User: ${context.user.name}\n`;
    }

    // Current journal (if applicable)
    if (context.currentJournal) {
      formatted += `\nCurrent Journal Entry:\n"${context.currentJournal.content}"\n`;
      if (context.currentJournal.mood) {
        formatted += `Mood: ${context.currentJournal.mood}/10\n`;
      }
    }

    // Patterns
    if (context.patterns && Object.keys(context.patterns).length > 0) {
      formatted += `\nRecent Patterns:\n`;
      if (context.patterns.moodTrend) {
        formatted += `- Mood trend: ${context.patterns.moodTrend}\n`;
      }
      if (context.patterns.sentimentTrend) {
        formatted += `- Overall sentiment: ${context.patterns.sentimentTrend}\n`;
      }
      if (context.patterns.commonThemes?.length) {
        formatted += `- Common themes: ${context.patterns.commonThemes.join(', ')}\n`;
      }
    }

    // Recent conversation (if applicable)
    if (context.conversation?.messages?.length > 0) {
      formatted += `\nRecent Conversation:\n`;
      context.conversation.messages.slice(-5).forEach(msg => {
        formatted += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
    }

    return formatted.trim();
  }

  /**
   * Get minimal context (fallback)
   */
  getMinimalContext(userId) {
    return {
      user: { userId },
      recentJournals: [],
      conversationHistory: [],
      patterns: {},
      preferences: {},
      metadata: {
        builtAt: new Date(),
        includedSources: [],
        minimal: true
      }
    };
  }

  /**
   * Clear any caches (for testing)
   */
  clearCache() {
    // Future: Clear Redis cache
    console.log('[Context Builder] Cache cleared');
  }
}

export default new ContextBuilder();
