import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import otpGenerator from 'otp-generator';
import { supabase } from '../config/supabase.js';
import { sendVerificationEmail, sendWelcomeEmail } from '../services/email.service.js';

// Helper function to generate OTP
const generateOTP = () => {
  return otpGenerator.generate(6, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false
  });
};

// Map Postgres row to client format
const formatUser = (user) => {
  if (!user) return null;
  const { id, passwordHash, verificationOTP, otpExpiry, otpAttempts, lastOTPSentAt, ...rest } =
    user;
  return { ...rest, _id: id };
};

// POST /auth/signup
export const signup = async (req, res) => {
  try {
    const { email, password, name, firstName, lastName, university, academicYear } = req.body;

    // Check if user already exists
    const { data: existing, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      // Security: Don't reveal if email exists, but handle it appropriately
      if (existing.emailVerified) {
        return res.status(409).json({
          success: false,
          error: 'An account with this email already exists'
        });
      } else {
        // User exists but not verified - allow resending OTP
        return res.status(409).json({
          success: false,
          error: 'Email already registered. Please verify your email or request a new OTP.',
          requiresVerification: true,
          email: existing.email
        });
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Create user (unverified)
    const { data: user, error: createError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        passwordHash,
        name,
        firstName,
        lastName,
        university,
        academicYear,
        emailVerified: false,
        verificationOTP: otpHash,
        otpExpiry,
        otpAttempts: 0,
        lastOTPSentAt: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) throw createError;

    // Send OTP email
    try {
      await sendVerificationEmail(email, otp, name);
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      // Delete the user if email fails
      await supabase.from('users').delete().eq('id', user.id);
      return res.status(500).json({
        success: false,
        error: 'Failed to send verification email. Please try again.'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Signup successful! Please check your email for the verification code.',
      data: {
        email: user.email,
        requiresVerification: true
      }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /auth/verify-otp
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email and OTP are required'
      });
    }

    // Find user with OTP data
    const { data: user, error } = await supabase
      .from('users')
      .select(
        'id, email, name, role, emailVerified, verificationOTP, otpExpiry, otpAttempts, passwordHash'
      )
      .eq('email', email.toLowerCase())
      .single();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email already verified. Please login.'
      });
    }

    // Check if OTP exists
    if (!user.verificationOTP || !user.otpExpiry) {
      return res.status(400).json({
        success: false,
        error: 'No OTP found. Please request a new one.'
      });
    }

    // Check if OTP expired
    if (new Date() > new Date(user.otpExpiry)) {
      return res.status(400).json({
        success: false,
        error: 'OTP has expired. Please request a new one.',
        expired: true
      });
    }

    // Check attempts (max 5 attempts)
    if (user.otpAttempts >= 5) {
      return res.status(429).json({
        success: false,
        error: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    // Verify OTP
    const isValidOTP = await bcrypt.compare(otp, user.verificationOTP);

    if (!isValidOTP) {
      // Increment attempts
      const newAttempts = user.otpAttempts + 1;
      await supabase.from('users').update({ otpAttempts: newAttempts }).eq('id', user.id);

      return res.status(401).json({
        success: false,
        error: 'Invalid OTP. Please try again.',
        attemptsRemaining: 5 - newAttempts
      });
    }

    // OTP is valid - verify user
    await supabase
      .from('users')
      .update({
        emailVerified: true,
        emailVerifiedAt: new Date().toISOString(),
        verificationOTP: null,
        otpExpiry: null,
        otpAttempts: 0
      })
      .eq('id', user.id);

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.name).catch((err) =>
      console.error('Failed to send welcome email:', err)
    );

    // Generate tokens
    const accessToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_ACCESS_SECRET, {
      expiresIn: '15m'
    });
    const refreshToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Email verified successfully! Welcome to Zenly!',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: true
        }
      }
    });
  } catch (err) {
    console.error('OTP verification error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /auth/resend-otp
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, email, name, emailVerified, verificationOTP, otpExpiry, lastOTPSentAt')
      .eq('email', email.toLowerCase())
      .single();

    if (!user) {
      // Security: Don't reveal if email exists
      return res.status(400).json({
        success: false,
        error: 'Invalid request'
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email already verified. Please login.'
      });
    }

    // Rate limiting: Prevent sending OTP too frequently (60 seconds)
    if (user.lastOTPSentAt) {
      const timeSinceLastOTP = Date.now() - new Date(user.lastOTPSentAt).getTime();
      if (timeSinceLastOTP < 60 * 1000) {
        const waitTime = Math.ceil((60 * 1000 - timeSinceLastOTP) / 1000);
        return res.status(429).json({
          success: false,
          error: `Please wait ${waitTime} seconds before requesting a new OTP.`,
          waitTime
        });
      }
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Update user
    await supabase
      .from('users')
      .update({
        verificationOTP: otpHash,
        otpExpiry,
        otpAttempts: 0,
        lastOTPSentAt: new Date().toISOString()
      })
      .eq('id', user.id);

    // Send OTP email
    try {
      await sendVerificationEmail(email, otp, user.name);
    } catch (emailError) {
      console.error('Failed to resend OTP email:', emailError);
      return res.status(500).json({
        success: false,
        error: 'Failed to send verification email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'New verification code sent to your email'
    });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('id, email, name, role, emailVerified, passwordHash')
      .eq('email', email.toLowerCase())
      .single();

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        error: 'Please verify your email before logging in.',
        requiresVerification: true,
        email: user.email
      });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const accessToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_ACCESS_SECRET, {
      expiresIn: '15m'
    });
    const refreshToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Update last active
    await supabase.from('users').update({ lastActive: new Date().toISOString() }).eq('id', user.id);

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.emailVerified
        }
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /auth/refresh
export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const newAccess = jwt.sign(
      { id: decoded.id, role: decoded.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
    res.json({ success: true, data: { accessToken: newAccess } });
  } catch {
    res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
};

// POST /auth/request-password-reset
export const requestPasswordReset = async (req, res) => {
  res.json({ success: true, message: 'Not implemented yet' });
};

// POST /auth/reset-password
export const resetPassword = async (req, res) => {
  res.json({ success: true, message: 'Not implemented yet' });
};

// GET /auth/me
export const getMe = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.userId)
      .single();

    if (error || !user) throw new Error('User not found');
    res.json({ success: true, data: formatUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /auth/admin-elevate
export const adminElevate = async (req, res) => {
  try {
    const { password } = req.body;
    const expected = process.env.ADMIN_PASSWORD || 'qwertyuiop';

    if (!password || password !== expected) {
      return res.status(401).json({ success: false, error: 'Invalid admin password' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role, emailVerified')
      .eq('id', req.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Update role if not already admin
    if (user.role !== 'admin') {
      user.role = 'admin';
      await supabase.from('users').update({ role: 'admin' }).eq('id', user.id);
    }

    // Issue fresh tokens with updated role
    const accessToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_ACCESS_SECRET, {
      expiresIn: '15m'
    });
    const refreshToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Admin role granted',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.emailVerified
        }
      }
    });
  } catch (err) {
    console.error('Admin elevate error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
