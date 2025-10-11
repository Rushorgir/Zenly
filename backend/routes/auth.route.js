import express from "express";
import { 
    login, 
    refresh, 
    requestPasswordReset, 
    resetPassword, 
    signup,
    verifyOTP,
    resendOTP,
    getMe,
    adminElevate
} from "../controllers/auth.controller.js";
import { validateSignup, validateLogin } from "../middleware/validation.middleware.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { signupLimiter, otpRequestLimiter, otpVerifyLimiter } from "../middleware/rateLimiter.middleware.js";

const router = express.Router();

// Signup & Verification
router.post("/signup", signupLimiter, validateSignup, signup);
router.post("/verify-otp", otpVerifyLimiter, verifyOTP);
router.post("/resend-otp", otpRequestLimiter, resendOTP);

// Login & Tokens
router.post("/login", validateLogin, login);
router.post("/refresh", refresh);

// Password Reset
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

// User Info
router.get("/me", authMiddleware, getMe);
router.post("/admin-elevate", authMiddleware, adminElevate);

export default router;