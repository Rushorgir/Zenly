/**
 * Journal Controller (Supabase Migrated)
 */

import { supabase } from '../config/supabase.js';
import aiOrchestratorService from '../services/ai-orchestrator.service.js';
import streamingService from '../services/streaming.service.js';

// Helper to map DB row to client format
const formatJournal = (j) => {
  if (!j) return null;
  const { id, userId, ...rest } = j;
  return { ...rest, _id: id, userId };
};

/**
 * Create a new journal entry
 * POST /api/journals
 */
export const createJournal = async (req, res) => {
  try {
    const { content, mood, tags } = req.body;
    const userId = req.userId;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Journal content is required' });
    }

    if (content.length > 10000) {
      return res
        .status(400)
        .json({ success: false, error: 'Journal content too long (max 10,000 characters)' });
    }

    if (mood && (mood < 1 || mood > 10)) {
      return res.status(400).json({ success: false, error: 'Mood must be between 1 and 10' });
    }

    console.log(`[Journal Controller] Creating journal for user: ${userId}`);

    const { data: journal, error } = await supabase
      .from('journal_entries')
      .insert({
        userId,
        content: content.trim(),
        mood: mood || null,
        tags: tags || [],
        status: 'analyzing',
        createdAt: new Date().toISOString()
      })
      .select('*')
      .single();

    if (error) throw error;

    console.log(`[Journal Controller] Journal created: ${journal.id}`);

    // Log analytics event
    try {
      await supabase.from('analytics_events').insert({
        userId,
        name: 'journal.created',
        meta: {
          journalId: journal.id,
          mood: mood || null,
          preview: content.trim().slice(0, 80)
        }
      });
    } catch (e) {
      console.warn('[Journal Controller] Failed to log journal.created event', e?.message);
    }

    // Start AI analysis in background
    analyzeJournalInBackground(journal.id, userId);

    res.status(201).json({
      success: true,
      message: 'Journal created successfully',
      journal: formatJournal(journal),
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
 * Analyze journal in background (async)
 */
async function analyzeJournalInBackground(journalId, _userId) {
  try {
    console.log(`[Journal Controller] Starting background analysis: ${journalId}`);

    const analysis = await aiOrchestratorService.analyzeJournal(journalId);

    await supabase
      .from('journal_entries')
      .update({
        status: 'analyzed',
        aiAnalysis: {
          summary: analysis.summary,
          insights: analysis.insights,
          sentiment: analysis.sentiment,
          riskAssessment: analysis.risk,
          themes: analysis.risk.factors || [],
          suggestedActions: analysis.suggestedActions,
          processedAt: new Date().toISOString(),
          model: process.env.HUGGINGFACE_MODEL || 'zai-org/GLM-4.6'
        }
      })
      .eq('id', journalId);

    console.log('[Journal Controller] Analysis complete: %s', journalId);
  } catch (error) {
    console.error('[Journal Controller] Background analysis error: %s', journalId, error);

    await supabase
      .from('journal_entries')
      .update({
        status: 'error',
        aiAnalysis: {
          error: error.message,
          processedAt: new Date().toISOString()
        }
      })
      .eq('id', journalId);
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

    const { data: journal } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('id', id)
      .eq('userId', userId)
      .single();

    if (!journal) {
      return res.status(404).json({ success: false, error: 'Journal not found' });
    }

    await streamingService.streamJournalAnalysis(res, id, userId);
  } catch (error) {
    console.error('[Journal Controller] Stream analysis error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Failed to stream analysis' });
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

    const { data: journal, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', id)
      .eq('userId', userId)
      .is('deletedAt', null)
      .single();

    if (error || !journal) {
      return res.status(404).json({ success: false, error: 'Journal not found' });
    }

    res.json({ success: true, journal: formatJournal(journal) });
  } catch (error) {
    console.error('[Journal Controller] Get journal error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve journal' });
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

    let query = supabase
      .from('journal_entries')
      .select('*', { count: 'exact' })
      .eq('userId', userId)
      .is('deletedAt', null);

    if (status) query = query.eq('status', status);
    // PostgREST JSON querying for sentiment and risk level
    if (sentiment) query = query.eq('aiAnalysis->sentiment->>label', sentiment);
    if (riskLevel) query = query.eq('aiAnalysis->riskAssessment->>level', riskLevel);

    // Apply sorting
    const isAscending = sortOrder !== 'desc';
    query = query.order(sortBy, { ascending: isAscending });

    // Handle cursor pagination
    if (cursor) {
      query = query.lt(sortBy, cursor); // assuming sorting by ID or Date, exact implementation may vary
    }

    const { data: journals, count, error } = await query.limit(parseInt(limit) + 1);

    if (error) throw error;

    const hasMore = journals.length > parseInt(limit);
    const results = hasMore ? journals.slice(0, -1) : journals;
    const nextCursor = hasMore ? results[results.length - 1][sortBy] : null;

    res.json({
      success: true,
      journals: results.map(formatJournal),
      pagination: {
        nextCursor,
        hasMore,
        total: count,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('[Journal Controller] List journals error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve journals' });
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

    const { data: journal } = await supabase
      .from('journal_entries')
      .select('content')
      .eq('id', id)
      .eq('userId', userId)
      .is('deletedAt', null)
      .single();

    if (!journal) {
      return res.status(404).json({ success: false, error: 'Journal not found' });
    }

    const contentChanged = content && content.trim() !== journal.content;
    const updateData = { updatedAt: new Date().toISOString() };

    if (content) updateData.content = content.trim();
    if (mood !== undefined) updateData.mood = mood;
    if (tags) updateData.tags = tags;

    if (contentChanged) {
      updateData.status = 'analyzing';
      updateData.aiAnalysis = null;
    }

    const { data: updatedJournal, error } = await supabase
      .from('journal_entries')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    if (contentChanged) {
      analyzeJournalInBackground(id, userId);
    }

    res.json({
      success: true,
      message: 'Journal updated successfully',
      journal: formatJournal(updatedJournal),
      reanalysis: contentChanged
    });
  } catch (error) {
    console.error('[Journal Controller] Update journal error:', error);
    res.status(500).json({ success: false, error: 'Failed to update journal' });
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

    const { error } = await supabase
      .from('journal_entries')
      .update({ deletedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('userId', userId)
      .is('deletedAt', null);

    if (error) throw error;

    res.json({ success: true, message: 'Journal deleted successfully' });
  } catch (error) {
    console.error('[Journal Controller] Delete journal error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete journal' });
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

    const { data: journal, error } = await supabase
      .from('journal_entries')
      .select('aiAnalysis, status')
      .eq('id', id)
      .eq('userId', userId)
      .is('deletedAt', null)
      .single();

    if (error || !journal) {
      return res.status(404).json({ success: false, error: 'Journal not found' });
    }

    if (journal.status === 'analyzing') {
      return res.json({ success: true, status: 'processing', message: 'Analysis in progress' });
    }

    if (!journal.aiAnalysis) {
      return res.json({ success: true, status: 'pending', message: 'Analysis not yet available' });
    }

    res.json({
      success: true,
      status: 'complete',
      insights: journal.aiAnalysis
    });
  } catch (error) {
    console.error('[Journal Controller] Get insights error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve insights' });
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

    const { data: journals, error } = await supabase
      .from('journal_entries')
      .select('mood, aiAnalysis, createdAt')
      .eq('userId', userId)
      .is('deletedAt', null)
      .gte('createdAt', startDate.toISOString())
      .order('createdAt', { ascending: false });

    if (error) throw error;

    const stats = {
      total: journals.length,
      avgMood: 0,
      sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
      riskDistribution: { low: 0, medium: 0, high: 0 },
      journalingStreak: 0
    };

    const moodEntries = journals.filter((j) => j.mood);
    if (moodEntries.length > 0) {
      stats.avgMood = (
        moodEntries.reduce((sum, j) => sum + j.mood, 0) / moodEntries.length
      ).toFixed(1);
    }

    journals.forEach((j) => {
      const sentiment = j.aiAnalysis?.sentiment?.label;
      if (sentiment && stats.sentimentDistribution[sentiment] !== undefined) {
        stats.sentimentDistribution[sentiment]++;
      }

      const risk = j.aiAnalysis?.riskAssessment?.level;
      if (risk && stats.riskDistribution[risk] !== undefined) {
        stats.riskDistribution[risk]++;
      }
    });

    stats.journalingStreak = calculateJournalingStreak(journals);

    res.json({ success: true, stats, timeRange });
  } catch (error) {
    console.error('[Journal Controller] Get stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve statistics' });
  }
};

/**
 * Helper: Calculate journaling streak from journals array
 */
function calculateJournalingStreak(journals) {
  if (!journals || journals.length === 0) return 0;

  // They are already sorted desc
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

    const { data: journal, error } = await supabase
      .from('journal_entries')
      .select('reflectionMessages')
      .eq('id', id)
      .eq('userId', userId)
      .is('deletedAt', null)
      .single();

    if (error || !journal) {
      return res.status(404).json({ success: false, error: 'Journal not found' });
    }

    res.json({ success: true, messages: journal.reflectionMessages || [] });
  } catch (error) {
    console.error('[Journal Controller] Get messages error:', error);
    res.status(500).json({ success: false, error: 'Failed to get messages' });
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
      return res.status(400).json({ success: false, error: 'Message content is required' });
    }

    const { data: journal, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', id)
      .eq('userId', userId)
      .is('deletedAt', null)
      .single();

    if (error || !journal) {
      return res.status(404).json({ success: false, error: 'Journal not found' });
    }

    const userMessage = {
      role: 'user',
      content: content.trim(),
      createdAt: new Date().toISOString()
    };

    const context = {
      journalContent: journal.content,
      previousMessages: journal.reflectionMessages || []
    };

    const aiResponse = await aiOrchestratorService.generateJournalReflection(
      content.trim(),
      context
    );

    const aiMessage = {
      role: 'assistant',
      content: aiResponse.content,
      createdAt: new Date().toISOString(),
      aiMetadata: {
        isCrisis: aiResponse.metadata.isCrisis,
        riskLevel: aiResponse.metadata.riskLevel,
        model: aiResponse.metadata.model,
        tokensUsed: 0
      }
    };

    const updatedMessages = [...(journal.reflectionMessages || []), userMessage, aiMessage];

    await supabase
      .from('journal_entries')
      .update({ reflectionMessages: updatedMessages })
      .eq('id', id);

    res.json({ success: true, userMessage, aiMessage });
  } catch (error) {
    console.error('[Journal Controller] Send message error:', error);
    res
      .status(500)
      .json({ success: false, error: 'Failed to send message', details: error.message });
  }
};
