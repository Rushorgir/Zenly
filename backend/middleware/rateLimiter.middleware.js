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

// Rate limiter for login attempts
// Allows 10 login attempts per 15 minutes per IP
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: 'Too many login attempts. Please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});

// Rate limiter for token refresh
// Allows 60 refresh calls per 15 minutes per IP
export const tokenRefreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    message: {
        success: false,
        error: 'Too many refresh requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for password reset flow
export const passwordResetRequestLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: {
        success: false,
        error: 'Too many password reset requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: {
        success: false,
        error: 'Too many password reset attempts. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export default {
    otpRequestLimiter,
    otpVerifyLimiter,
    signupLimiter,
    loginLimiter,
    tokenRefreshLimiter,
    passwordResetRequestLimiter,
    passwordResetLimiter,
};
