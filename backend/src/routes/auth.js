import bcrypt from 'bcrypt';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, clearSession, issueSession } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { User } from '../models/User.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/email.js';
import { asyncHandler, publicUser } from '../utils/http.js';
import { createOneTimeToken, hashToken } from '../utils/tokens.js';

const router = Router();
const passwordSchema = z.string().min(10, 'Password must be at least 10 characters.').max(200)
  .regex(/[a-z]/, 'Password must contain a lowercase letter.')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
  .regex(/[0-9]/, 'Password must contain a number.');
const loginSchema = z.object({ username: z.string().trim().min(1).max(80), password: z.string().min(1).max(200) });
const registerSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{3,40}$/),
  email: z.string().trim().toLowerCase().email().max(254),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  password: passwordSchema,
});
const tokenSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) });
const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });
const resetSchema = tokenSchema.extend({ password: passwordSchema });

function isLocked(user) {
  return user.lockUntil && user.lockUntil > new Date();
}

async function setVerificationToken(user) {
  const { token, hash } = createOneTimeToken();
  user.emailVerificationTokenHash = hash;
  user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();
  await sendVerificationEmail(user, token);
}

router.post('/register', validate(registerSchema), asyncHandler(async (req, res) => {
  const existing = await User.findOne({ $or: [{ username: req.body.username }, { email: req.body.email }] });
  if (existing) return res.status(409).json({ message: 'An account with that username or email already exists.' });
  const user = await User.create({
    ...req.body,
    passwordHash: await bcrypt.hash(req.body.password, 12),
    emailVerified: false,
  });
  await setVerificationToken(user);
  return res.status(201).json({ message: 'Account created. Check your email to verify your account.' });
}));

router.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const user = await User.findOne({ username: req.body.username.toLowerCase() })
    .select('+passwordHash +failedLoginCount +lockUntil');
  const invalidCredentials = () => res.status(401).json({ message: 'Invalid username or password.' });
  if (!user || isLocked(user)) return invalidCredentials();

  const matches = await bcrypt.compare(req.body.password, user.passwordHash);
  if (!matches) {
    user.failedLoginCount += 1;
    if (user.failedLoginCount >= 5) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      user.failedLoginCount = 0;
    }
    await user.save();
    return invalidCredentials();
  }
  if (!user.emailVerified) return res.status(403).json({ message: 'Verify your email before signing in.' });

  user.failedLoginCount = 0;
  user.lockUntil = null;
  await user.save();
  const accessToken = issueSession(res, user);
  res.set('Cache-Control', 'no-store');
  return res.json({ user: publicUser(user), accessToken });
}));

router.post('/verify-email', validate(tokenSchema), asyncHandler(async (req, res) => {
  const user = await User.findOne({
    emailVerificationTokenHash: hashToken(req.body.token),
    emailVerificationExpiresAt: { $gt: new Date() },
  }).select('+emailVerificationTokenHash +emailVerificationExpiresAt');
  if (!user) return res.status(400).json({ message: 'This verification link is invalid or expired.' });
  user.emailVerified = true;
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpiresAt = null;
  await user.save();
  return res.json({ message: 'Email verified. You can now sign in.' });
}));

router.post('/forgot-password', validate(forgotSchema), asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+passwordResetTokenHash +passwordResetExpiresAt');
  if (user && user.emailVerified) {
    const { token, hash } = createOneTimeToken();
    user.passwordResetTokenHash = hash;
    user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
    await sendPasswordResetEmail(user, token);
  }
  return res.json({ message: 'If an eligible account exists, a reset email has been sent.' });
}));

router.post('/reset-password', validate(resetSchema), asyncHandler(async (req, res) => {
  const user = await User.findOne({
    passwordResetTokenHash: hashToken(req.body.token),
    passwordResetExpiresAt: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpiresAt');
  if (!user) return res.status(400).json({ message: 'This reset link is invalid or expired.' });
  user.passwordHash = await bcrypt.hash(req.body.password, 12);
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  user.failedLoginCount = 0;
  user.lockUntil = null;
  user.sessionVersion += 1;
  await user.save();
  return res.json({ message: 'Password updated. Sign in with your new password.' });
}));

router.post('/resend-verification', validate(forgotSchema), asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+emailVerificationTokenHash +emailVerificationExpiresAt');
  if (user && !user.emailVerified) await setVerificationToken(user);
  return res.json({ message: 'If an unverified account exists, a verification email has been sent.' });
}));

router.get('/me', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ user: publicUser(req.user) });
});

router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  req.user.sessionVersion += 1;
  await req.user.save();
  clearSession(res);
  res.status(204).end();
}));

export default router;
