import User from "../models/user.model.js";
import bcrypt from "bcrypt";

// GET /users/me
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("-passwordHash");
        res.json({ success: true, data: user });
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
        
        const updated = await User.findByIdAndUpdate(
            req.userId, 
            updateData, 
            { new: true }
        ).select("-passwordHash");
        
        res.json({ success: true, data: updated });
    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};

// PUT /users/me/avatar
export const updateAvatar = async (req, res) => {
    try {
        const { avatarUrl } = req.body;
        const updated = await User.findByIdAndUpdate(
            req.userId, 
            { avatarUrl }, 
            { new: true }
        ).select("-passwordHash");
        
        res.json({ success: true, data: updated });
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
                error: "Current password and new password are required" 
            });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ 
                success: false, 
                error: "New password must be at least 6 characters long" 
            });
        }
        
        // Get user with password hash
        const user = await User.findById(req.userId).select("+passwordHash");
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: "User not found" 
            });
        }
        
        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false, 
                error: "Current password is incorrect" 
            });
        }
        
        // Hash new password and update
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        user.passwordHash = newPasswordHash;
        await user.save();
        
        res.json({ 
            success: true, 
            message: "Password changed successfully" 
        });
    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};
