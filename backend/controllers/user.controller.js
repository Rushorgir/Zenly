import bcrypt from 'bcrypt';
import { supabase } from '../config/supabase.js';

// Map Postgres row to client format
const formatUser = (user) => {
  if (!user) return null;
  const { id, passwordHash, verificationOTP, otpExpiry, otpAttempts, lastOTPSentAt, ...rest } =
    user;
  return { ...rest, _id: id };
};

// GET /users/me
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

// PATCH /users/me
export const updateMe = async (req, res) => {
  try {
    const { name, avatarUrl, university, firstName, lastName, academicYear } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (university !== undefined) updateData.university = university;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (academicYear !== undefined) updateData.academicYear = academicYear;

    const { data: updated, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.userId)
      .select('*')
      .single();

    if (error) throw error;

    res.json({ success: true, data: formatUser(updated) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /users/me/avatar
export const updateAvatar = async (req, res) => {
  try {
    const { avatarUrl } = req.body;

    const { data: updated, error } = await supabase
      .from('users')
      .update({ avatarUrl })
      .eq('id', req.userId)
      .select('*')
      .single();

    if (error) throw error;

    res.json({ success: true, data: formatUser(updated) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /users/me/password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long'
      });
    }

    // Get user with password hash
    const { data: user, error } = await supabase
      .from('users')
      .select('id, passwordHash')
      .eq('id', req.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Hash new password and update
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabase
      .from('users')
      .update({ passwordHash: newPasswordHash })
      .eq('id', user.id);

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
