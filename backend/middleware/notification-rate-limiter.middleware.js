/**
 * Notification Rate Limiters
 * Throttle notification list and mark-read operations
 */

import rateLimit from 'express-rate-limit';

// List notifications - per user
export const notificationListLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 seconds
  max: 60, // up to 60 list calls per 30s per user
  message: { error: 'Too many notification requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip,
});

// Mark notifications as read - per user
export const notificationMarkReadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // up to 120 mark-read requests/min per user (batching is encouraged)
  message: { error: 'Too many mark-read requests. Please consolidate into fewer updates.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip,
});

export default {
  notificationListLimiter,
  notificationMarkReadLimiter,
};
