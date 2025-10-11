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

export default {
    otpRequestLimiter,
    otpVerifyLimiter,
    signupLimiter
};
