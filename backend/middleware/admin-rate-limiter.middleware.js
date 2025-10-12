/**
 * Admin Route Rate Limiters
 */

import rateLimit from 'express-rate-limit';

// Admin read endpoints - per admin user
export const adminReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 240,
  message: { error: 'Too many admin read requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip,
});

// Admin moderation/mutations
export const adminMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many admin actions. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip,
});

export default {
  adminReadLimiter,
  adminMutationLimiter,
};
