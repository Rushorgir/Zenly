/**
 * Forum Rate Limiter Middleware
 * Protects forum endpoints from abuse
 */

import rateLimit from 'express-rate-limit';

// Public read endpoints (list/get posts/comments) - per IP
export const forumReadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // up to 120 reads per minute per IP
  message: { error: 'Too many forum read requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Create post - per user
export const forumCreatePostLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // up to 10 posts per 15 minutes per user
  message: { error: 'You are creating posts too quickly. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip,
});

// Add comment - per user
export const forumCommentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // up to 60 comments per 15 minutes per user
  message: { error: 'You are commenting too quickly. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip,
});

// Likes (posts and comments) - per user
export const forumLikeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // up to 300 likes per 15 minutes per user
  message: { error: 'Too many like actions. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip,
});

// Reports - per user
export const forumReportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // up to 20 reports per hour per user
  message: { error: 'Too many reports. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip,
});

// Reactions add/remove - per user
export const forumReactionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // up to 300 reactions per 15 minutes per user
  message: { error: 'Too many reaction actions. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip,
});

export default {
  forumReadLimiter,
  forumCreatePostLimiter,
  forumCommentLimiter,
  forumLikeLimiter,
  forumReportLimiter,
  forumReactionLimiter,
};
