/**
 * AI Rate Limiter Middleware
 * Prevents abuse and controls costs
 */

import rateLimit from 'express-rate-limit';
import AI_CONFIG from '../config/ai.config.js';

// Rate limiter for AI chat requests
export const aiChatLimiter = rateLimit({
  windowMs: AI_CONFIG.RATE_LIMIT.WINDOW_MINUTES * 60 * 1000,
  max: AI_CONFIG.RATE_LIMIT.PER_USER,
  message: {
    error: 'Too many AI requests. Please try again later.',
    retryAfter: AI_CONFIG.RATE_LIMIT.WINDOW_MINUTES,
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use user ID as key (set by auth middleware)
  keyGenerator: (req) => req.userId || 'anonymous',
  // Skip IPv6 validation since we're using user IDs
  skip: (req) => !req.userId,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many AI requests',
      message: `You've reached the limit of ${AI_CONFIG.RATE_LIMIT.PER_USER} requests per ${AI_CONFIG.RATE_LIMIT.WINDOW_MINUTES} minutes. Please try again later.`,
      retryAfter: AI_CONFIG.RATE_LIMIT.WINDOW_MINUTES * 60,
    });
  },
});

// Rate limiter for journal AI analysis (less strict)
export const journalAILimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 journal entries per 15 minutes
  message: {
    error: 'Too many journal submissions. Please try again later.',
  },
  keyGenerator: (req) => req.userId || 'anonymous',
  // Skip IPv6 validation since we're using user IDs
  skip: (req) => !req.userId,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many journal submissions',
      message: 'You\'ve created too many journal entries too quickly. Please take a moment before creating another entry.',
      retryAfter: 900, // 15 minutes
    });
  },
});

// Daily limit tracker (in-memory, could be moved to Redis in production)
const dailyUsageTracker = new Map();

/**
 * Track and limit daily AI usage per user
 */
export const dailyAILimiter = (req, res, next) => {
  const userId = req.userId;
  
  if (!userId) {
    return next();
  }

  const today = new Date().toDateString();
  const key = `${userId}:${today}`;
  
  const usage = dailyUsageTracker.get(key) || 0;
  
  if (usage >= AI_CONFIG.RATE_LIMIT.DAILY_LIMIT) {
    return res.status(429).json({
      error: 'Daily AI limit reached',
      message: `You've reached your daily limit of ${AI_CONFIG.RATE_LIMIT.DAILY_LIMIT} AI interactions. This limit resets at midnight.`,
      retryAfter: getSecondsUntilMidnight(),
    });
  }

  // Increment usage
  dailyUsageTracker.set(key, usage + 1);
  
  // Clean up old entries (run occasionally)
  if (Math.random() < 0.01) { // 1% chance
    cleanupOldDailyTracking();
  }

  next();
};

/**
 * Get seconds until midnight
 */
function getSecondsUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.floor((midnight - now) / 1000);
}

/**
 * Clean up old daily tracking entries
 */
function cleanupOldDailyTracking() {
  const today = new Date().toDateString();
  const keysToDelete = [];

  for (const [key] of dailyUsageTracker) {
    const [, date] = key.split(':');
    if (date !== today) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach(key => dailyUsageTracker.delete(key));
}

export default {
  aiChatLimiter,
  journalAILimiter,
  dailyAILimiter,
};
