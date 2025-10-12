/**
 * Resource Rate Limiter Middleware
 * Provides per-route rate limiting to prevent abuse
 */

import rateLimit from 'express-rate-limit';

// Limit search queries per IP to reduce scraping/abuse
export const resourceSearchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // up to 30 searches per minute per IP
  message: {
    error: 'Too many search requests. Please slow down and try again soon.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limit view count increments per resource per IP
export const resourceViewLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // up to 60 view increments per minute per resource/IP
  message: {
    error: 'Too many view updates for this resource. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${req.params.id || 'unknown'}`,
});

// Limit helpful marks per resource, prefer user-bound key when available
export const resourceHelpfulLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // up to 10 helpful votes per hour per user/IP per resource
  message: {
    error: 'Too many helpful votes. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.userId ? `${req.userId}:${req.params.id}` : `${req.ip}:${req.params.id}`),
});

// Limit admin mutations to avoid accidental floods
export const resourceMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // up to 100 mutations per 15 minutes per IP
  message: {
    error: 'Too many resource changes. Please slow down and try again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default {
  resourceSearchLimiter,
  resourceViewLimiter,
  resourceHelpfulLimiter,
  resourceMutationLimiter,
};
