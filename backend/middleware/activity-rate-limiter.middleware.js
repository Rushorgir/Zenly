/**
 * Activity Route Rate Limiter
 */

import rateLimit from 'express-rate-limit';

export const activityReadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 240, // up to 240 reads per minute per user
  message: { error: 'Too many activity requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip,
});

export default {
  activityReadLimiter,
};
