/**
 * Journal Route Rate Limiters
 */

import rateLimit from 'express-rate-limit';

// Listing journals and fetching single journal/insights/stats - per user
export const journalReadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // generous read limit per minute per user
  message: { error: 'Too many journal read requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip,
});

// Deleting journals - per user
export const journalDeleteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // up to 30 deletes per 15 minutes per user
  message: { error: 'Too many delete operations. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip,
});

export default {
  journalReadLimiter,
  journalDeleteLimiter,
};
