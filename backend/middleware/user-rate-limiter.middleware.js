/**
 * User Route Rate Limiters
 * Apply per-user limits to sensitive operations
 */

import rateLimit from 'express-rate-limit';

// General read of own profile
export const userProfileReadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // up to 60 reads/minute per user
  message: { error: 'Too many profile requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip,
});

// Update profile details
export const userProfileUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // up to 20 updates per 15 min per user
  message: { error: 'Too many profile updates. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip,
});

// Update avatar (heavier uploads)
export const userAvatarUpdateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // up to 10 avatar changes per hour per user
  message: { error: 'You are changing your avatar too frequently. Please wait and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip,
});

// Change password (sensitive)
export const userPasswordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // up to 5 password changes per hour per user
  message: { error: 'Too many password change attempts. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip,
});

export default {
  userProfileReadLimiter,
  userProfileUpdateLimiter,
  userAvatarUpdateLimiter,
  userPasswordChangeLimiter,
};
