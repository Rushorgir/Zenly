import rateLimit from 'express-rate-limit';

// Rate limiter for OTP generation/sending
// Allows 3 OTP requests per 15 minutes per IP
export const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 OTP requests per windowMs
  message: {
    success: false,
    error: 'Too many OTP requests. Please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false // Count all requests
  // Removed custom keyGenerator - using default IP-based key generation
});

// Rate limiter for OTP verification attempts
// Allows 5 verification attempts per 15 minutes per IP
export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 verification attempts per windowMs
  message: {
    success: false,
    error: 'Too many verification attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful verifications
  // Removed custom keyGenerator - using default IP-based key generation
});

// Rate limiter for signup attempts
// Allows 5 signup attempts per hour per IP
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 signup attempts per hour
  message: {
    success: false,
    error: 'Too many signup attempts. Please try again after an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
  // Removed custom keyGenerator - using default IP-based key generation
});

// Global API Rate Limiter
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per 15 minutes
  message: {
    success: false,
    error: 'Too many requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for Login attempts
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts
  message: {
    success: false,
    error: 'Too many login attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for Password Resets
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 requests per hour
  message: {
    success: false,
    error: 'Too many password reset attempts. Please try again after an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for creating forum posts
export const forumPostLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: 'Too many forum posts created. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip
});

// Rate limiter for adding comments
export const commentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: {
    success: false,
    error: 'Too many comments created. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip
});

// Rate limiter for liking / reacting
export const reactionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  message: {
    success: false,
    error: 'Too many reactions. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip
});

// Rate limiter for reporting posts
export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    success: false,
    error: 'Too many report requests. Please try again after an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip
});

// Rate limiter for mood logging
export const moodLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: 'Too many mood updates. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip
});

// Rate limiter for admin creations and edits
export const adminActionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    success: false,
    error: 'Too many admin operations. Please try again after an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip
});

export default {
  otpRequestLimiter,
  otpVerifyLimiter,
  signupLimiter,
  globalLimiter,
  loginLimiter,
  passwordResetLimiter,
  forumPostLimiter,
  commentLimiter,
  reactionLimiter,
  reportLimiter,
  moodLimiter,
  adminActionLimiter
};

