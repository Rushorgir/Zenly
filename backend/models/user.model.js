import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    email: { type: String, unique: true, lowercase: true, required: true, index: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    university: { type: String, trim: true },
    academicYear: { type: String },
    role: { type: String, enum: ["user", "admin", "moderator", "counselor"], default: "user", index: true },
    avatarUrl: String,
    
    // Email Verification Fields
    emailVerified: { type: Boolean, default: false, index: true },
    emailVerifiedAt: Date,
    verificationOTP: { type: String, select: false }, // Hashed OTP
    otpExpiry: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0, select: false },
    lastOTPSentAt: Date,
    
    isAnonymous: { type: Boolean, default: false },
    lastActive: { type: Date, default: Date.now },
    preferences: {
        notifications: { type: Boolean, default: true },
        emailUpdates: { type: Boolean, default: true },
        publicProfile: { type: Boolean, default: false }
    },
    counselorDetails: {
        title: String,
        specialties: [String],
        languages: [String],
        sessionTypes: [{ type: String, enum: ["video", "in-person"] }],
        availability: [String],
        bio: String,
        experience: String
    }
}, {
    timestamps: true
});

// Indexes for performance
UserSchema.index({ role: 1, createdAt: -1 });
UserSchema.index({ lastActive: -1 });

export const User = mongoose.model("User", UserSchema);
export default User;