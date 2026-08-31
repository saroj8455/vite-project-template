import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const isConfigured = Boolean(env.smtp.host && env.smtp.user && env.smtp.pass && env.smtp.from);
const transporter = isConfigured
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    })
  : null;

async function sendEmail({ to, subject, text, html }) {
  if (!transporter) {
    if (env.nodeEnv === 'production') throw new Error('Email delivery is not configured.');
    console.log(`[email preview] To: ${to}\nSubject: ${subject}\n${text}`);
    return;
  }
  await transporter.sendMail({ from: env.smtp.from, to, subject, text, html });
}

export function sendVerificationEmail(user, token) {
  const url = `${env.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  return sendEmail({
    to: user.email,
    subject: 'Verify your React Meet account',
    text: `Welcome ${user.firstName}. Verify your account: ${url}`,
    html: `<p>Welcome ${user.firstName}.</p><p><a href="${url}">Verify your account</a></p>`,
  });
}

export function sendPasswordResetEmail(user, token) {
  const url = `${env.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  return sendEmail({
    to: user.email,
    subject: 'Reset your React Meet password',
    text: `Reset your password within 30 minutes: ${url}`,
    html: `<p><a href="${url}">Reset your password</a>. This link expires in 30 minutes.</p>`,
  });
}
