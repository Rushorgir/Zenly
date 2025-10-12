/**
 * Journal Controller (REDESIGNED)
 * 
 * Complete rewrite with:
 * - Server-Sent Events for real-time analysis
 * - Optimized error handling
 * - Better validation
 * - Transaction support
 * - Queue-based AI processing
 */

import JournalEntry from '../models/journalEntry.model.js';
import AnalyticsEvent from '../models/analysticsEvent.model.js';
import AIConversation from '../models/aiConversation.model.js';
import aiOrchestratorService from '../services/ai-orchestrator.service.js';
import streamingService from '../services/streaming.service.js';

/**
 * Create a new journal entry
 * POST /api/journals
 */
export const createJournal = async (req, res) => {
  try {
    const { content, mood, tags } = req.body;
    const userId = req.userId;

    // Validation
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Journal content is required'
      });
    }

    if (content.length > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Journal content too long (max 10,000 characters)'
      });
    }

    if (mood && (mood < 1 || mood > 10)) {
      return res.status(400).json({
        success: false,
        error: 'Mood must be between 1 and 10'
      });
    }

    console.log(`[Journal Controller] Creating journal for user: ${userId}`);

    // Create journal entry
    const journal = await JournalEntry.create({
      userId,
      content: content.trim(),
      mood: mood || null,
      tags: tags || [],
      status: 'analyzing',
      createdAt: new Date()
    });

    console.log(`[Journal Controller] Journal created: ${journal._id}`);

    // Log analytics event for recent activity
    try {
      await AnalyticsEvent.create({
        userId,
        type: 'journal.created',
        meta: {
          journalId: journal._id,
          mood: mood || null,
          preview: content.trim().slice(0, 80)
        }
      });
    } catch (e) {
      console.warn('[Journal Controller] Failed to log journal.created event', e?.message);
    }

    // Start AI analysis in background (don't await)
    analyzeJournalInBackground(journal._id, userId);

    // Return immediately with journal
    res.status(201).json({
      success: true,
      message: 'Journal created successfully',
      journal: {
        _id: journal._id,
        content: journal.content,
        mood: journal.mood,
        tags: journal.tags,
        status: 'analyzing',
        createdAt: journal.createdAt
      },
      analysisStatus: 'processing',
      estimatedTime: '5-15 seconds'
    });

  } catch (error) {
    console.error('[Journal Controller] Create journal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create journal entry',
      details: error.message
    });
  }
};

/**
 * Background AI analysis function
 */
/**
 * Analyze journal in background (async)
 */
async function analyzeJournalInBackground(journalId, _userId) {
  try {
    console.log(`[Journal Controller] Starting background analysis: ${journalId}`);

    // Perform AI analysis
    const analysis = await aiOrchestratorService.analyzeJournal(journalId);

    // Update journal with analysis results
    await JournalEntry.findByIdAndUpdate(
      journalId,
      {
        status: 'analyzed',
        aiAnalysis: {
          summary: analysis.summary,
          insights: analysis.insights,
          sentiment: analysis.sentiment,
          riskAssessment: analysis.risk,
          themes: analysis.risk.factors || [],
          suggestedActions: analysis.suggestedActions,
          processedAt: new Date(),
          model: process.env.HUGGINGFACE_MODEL || 'zai-org/GLM-4.6'
        }
      },
      { new: true }
    );

    console.log('[Journal Controller] Analysis complete: %s', journalId, {
      sentiment: analysis.sentiment.label,
      riskLevel: analysis.risk.level
    });

    // NO LONGER creating a separate conversation!
    // Messages will be stored directly in the journal's reflectionMessages array
    console.log(`[Journal Controller] Journal analysis complete - ready for reflection messages`);

  } catch (error) {
    console.error('[Journal Controller] Background analysis error: %s', journalId, error);

    // Update journal status to error
    await JournalEntry.findByIdAndUpdate(journalId, {
      status: 'error',
      aiAnalysis: {
        error: error.message,
        processedAt: new Date()
      }
    });
  }
}

/**
 * Stream journal analysis progress (SSE)
 * GET /api/journals/:id/analyze-stream
 */
export const streamJournalAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Verify journal ownership
    const journal = await JournalEntry.findOne({ _id: id, userId });

    if (!journal) {
      return res.status(404).json({
        success: false,
        error: 'Journal not found'
      });
    }

    // Stream the analysis
    await streamingService.streamJournalAnalysis(res, id, userId);

  } catch (error) {
    console.error('[Journal Controller] Stream analysis error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to stream analysis'
      });
    }
  }
};

/**
 * Get single journal with analysis
 * GET /api/journals/:id
 */
export const getJournal = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const journal = await JournalEntry.findOne({
      _id: id,
      userId,
      deletedAt: null
    }).populate('conversationId', 'title summary status messageCount');

    if (!journal) {
      return res.status(404).json({
        success: false,
        error: 'Journal not found'
      });
    }

    res.json({
      success: true,
      journal: {
        _id: journal._id,
        content: journal.content,
        mood: journal.mood,
        tags: journal.tags,
        status: journal.status,
        aiAnalysis: journal.aiAnalysis,
        conversation: journal.conversationId,
        createdAt: journal.createdAt,
        updatedAt: journal.updatedAt
      }
    });

  } catch (error) {
    console.error('[Journal Controller] Get journal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve journal'
    });
  }
};

/**
 * List journals with pagination and filters
 * GET /api/journals
 */
export const listJournals = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      limit = 20,
      cursor,
      status,
      sentiment,
      riskLevel,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {
      userId,
      deletedAt: null
    };

    if (cursor) {
      query._id = { $lt: cursor };
    }

    if (status) {
      query.status = status;
    }

    if (sentiment) {
      query['aiAnalysis.sentiment.label'] = sentiment;
    }

    if (riskLevel) {
      query['aiAnalysis.riskAssessment.level'] = riskLevel;
    }

    // Execute query
    const journals = await JournalEntry.find(query)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(parseInt(limit) + 1)
      .select('-__v')
      .lean();

    // Check if there are more results
    const hasMore = journals.length > parseInt(limit);
    const results = hasMore ? journals.slice(0, -1) : journals;
    const nextCursor = hasMore ? results[results.length - 1]._id : null;

    // Get total count (for stats)
    const total = await JournalEntry.countDocuments({ userId, deletedAt: null });

    res.json({
      success: true,
      journals: results,
      pagination: {
        nextCursor,
        hasMore,
        total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('[Journal Controller] List journals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve journals'
    });
  }
};

/**
 * Update journal entry (re-triggers analysis)
 * PATCH /api/journals/:id
 */
export const updateJournal = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { content, mood, tags } = req.body;

    const journal = await JournalEntry.findOne({ _id: id, userId, deletedAt: null });

    if (!journal) {
      return res.status(404).json({
        success: false,
        error: 'Journal not found'
      });
    }

    // Check if content changed
    const contentChanged = content && content.trim() !== journal.content;

    // Update journal
    const updateData = {
      updatedAt: new Date()
    };

    if (content) updateData.content = content.trim();
    if (mood !== undefined) updateData.mood = mood;
    if (tags) updateData.tags = tags;

    // If content changed, re-trigger analysis
    if (contentChanged) {
      updateData.status = 'analyzing';
      updateData.aiAnalysis = null; // Clear old analysis
    }

    const updatedJournal = await JournalEntry.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    // Re-analyze if content changed
    if (contentChanged) {
      analyzeJournalInBackground(id, userId);
    }

    res.json({
      success: true,
      message: 'Journal updated successfully',
      journal: updatedJournal,
      reanalysis: contentChanged
    });

  } catch (error) {
    console.error('[Journal Controller] Update journal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update journal'
    });
  }
};

/**
 * Delete journal (soft delete)
 * DELETE /api/journals/:id
 */
export const deleteJournal = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const journal = await JournalEntry.findOne({ _id: id, userId, deletedAt: null });

    if (!journal) {
      return res.status(404).json({
        success: false,
        error: 'Journal not found'
      });
    }

    // Soft delete
    await JournalEntry.findByIdAndUpdate(id, {
      deletedAt: new Date()
    });

    // Also delete associated conversation (optional)
    if (journal.conversationId) {
      await AIConversation.findByIdAndUpdate(journal.conversationId, {
        status: 'archived'
      });
    }

    res.json({
      success: true,
      message: 'Journal deleted successfully'
    });

  } catch (error) {
    console.error('[Journal Controller] Delete journal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete journal'
    });
  }
};

/**
 * Get journal insights (analysis only)
 * GET /api/journals/:id/insights
 */
export const getJournalInsights = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const journal = await JournalEntry.findOne({
      _id: id,
      userId,
      deletedAt: null
    }).select('aiAnalysis status');

    if (!journal) {
      return res.status(404).json({
        success: false,
        error: 'Journal not found'
      });
    }

    if (journal.status === 'analyzing') {
      return res.json({
        success: true,
        status: 'processing',
        message: 'Analysis in progress'
      });
    }

    if (!journal.aiAnalysis) {
      return res.json({
        success: true,
        status: 'pending',
        message: 'Analysis not yet available'
      });
    }

    res.json({
      success: true,
      status: 'complete',
      insights: {
        summary: journal.aiAnalysis.summary,
        insights: journal.aiAnalysis.insights,
        sentiment: journal.aiAnalysis.sentiment,
        riskAssessment: journal.aiAnalysis.riskAssessment,
        suggestedActions: journal.aiAnalysis.suggestedActions
      }
    });

  } catch (error) {
    console.error('[Journal Controller] Get insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve insights'
    });
  }
};

/**
 * Get journal statistics
 * GET /api/journals/stats
 */
export const getJournalStats = async (req, res) => {
  try {
    const userId = req.userId;
    const { timeRange = '30d' } = req.query;

    const days = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const journals = await JournalEntry.find({
      userId,
      deletedAt: null,
      createdAt: { $gte: startDate }
    }).select('mood aiAnalysis createdAt');

    // Calculate stats
    const stats = {
      total: journals.length,
      avgMood: 0,
      sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
      riskDistribution: { low: 0, medium: 0, high: 0 },
      journalingStreak: 0
    };

    // Average mood
    const moodEntries = journals.filter(j => j.mood);
    if (moodEntries.length > 0) {
      stats.avgMood = (moodEntries.reduce((sum, j) => sum + j.mood, 0) / moodEntries.length).toFixed(1);
    }

    // Sentiment distribution
    journals.forEach(j => {
      const sentiment = j.aiAnalysis?.sentiment?.label;
      if (sentiment && stats.sentimentDistribution[sentiment] !== undefined) {
        stats.sentimentDistribution[sentiment]++;
      }
    });

    // Risk distribution
    journals.forEach(j => {
      const risk = j.aiAnalysis?.riskAssessment?.level;
      if (risk && stats.riskDistribution[risk] !== undefined) {
        stats.riskDistribution[risk]++;
      }
    });

    // Calculate journaling streak
    stats.journalingStreak = await calculateJournalingStreak(userId);

    res.json({
      success: true,
      stats,
      timeRange
    });

  } catch (error) {
    console.error('[Journal Controller] Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics'
    });
  }
};

/**
 * Helper: Calculate journaling streak
 */
async function calculateJournalingStreak(userId) {
  const journals = await JournalEntry.find({ userId, deletedAt: null })
    .sort({ createdAt: -1 })
    .select('createdAt')
    .lean();

  if (journals.length === 0) return 0;

  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < journals.length - 1; i++) {
    const current = new Date(journals[i].createdAt);
    current.setHours(0, 0, 0, 0);

    const next = new Date(journals[i + 1].createdAt);
    next.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((current - next) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streak++;
    } else if (diffDays > 1) {
      break;
    }
  }

  return streak;
}

/**
 * Get reflection messages for a journal
 * GET /api/journals/:id/messages
 */
export const getJournalMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const journal = await JournalEntry.findOne({
      _id: id,
      userId,
      deletedAt: null
    }).select('reflectionMessages');

    if (!journal) {
      return res.status(404).json({
        success: false,
        error: 'Journal not found'
      });
    }

    res.json({
      success: true,
      messages: journal.reflectionMessages || []
    });

  } catch (error) {
    console.error('[Journal Controller] Get messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get messages'
    });
  }
};

/**
 * Send a reflection message for a journal
 * POST /api/journals/:id/messages
 */
export const sendJournalMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message content is required'
      });
    }

    const journal = await JournalEntry.findOne({
      _id: id,
      userId,
      deletedAt: null
    });

    if (!journal) {
      return res.status(404).json({
        success: false,
        error: 'Journal not found'
      });
    }

    console.log(`[Journal Controller] Sending reflection message for journal: ${id}`);

    // Create user message
    const userMessage = {
      role: 'user',
      content: content.trim(),
      createdAt: new Date()
    };

    // Generate AI response using the orchestrator
    const aiOrchestratorService = (await import('../services/ai-orchestrator.service.js')).default;
    
    // Get context: journal content + previous messages
    const context = {
      journalContent: journal.content,
      previousMessages: journal.reflectionMessages || []
    };
    
    const aiResponse = await aiOrchestratorService.generateJournalReflection(
      content.trim(),
      context
    );

    // Create AI message
    const aiMessage = {
      role: 'assistant',
      content: aiResponse.content,
      createdAt: new Date(),
      aiMetadata: {
        isCrisis: aiResponse.metadata.isCrisis,
        riskLevel: aiResponse.metadata.riskLevel,
        model: aiResponse.metadata.model,
        tokensUsed: 0 // TODO: Calculate actual tokens
      }
    };

    // Add both messages to journal
    journal.reflectionMessages = journal.reflectionMessages || [];
    journal.reflectionMessages.push(userMessage, aiMessage);
    
    await journal.save();

    console.log(`[Journal Controller] Reflection message added successfully`);

    res.json({
      success: true,
      userMessage,
      aiMessage
    });

  } catch (error) {
    console.error('[Journal Controller] Send message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      details: error.message
    });
  }
};
