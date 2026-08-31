import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    dummyJsonId: { type: Number, unique: true, sparse: true, index: true },
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    image: { type: String, default: '' },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    emailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, default: null, select: false },
    emailVerificationExpiresAt: { type: Date, default: null, select: false },
    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetExpiresAt: { type: Date, default: null, select: false },
    failedLoginCount: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, default: null, select: false },
    sessionVersion: { type: Number, default: 0 },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);
