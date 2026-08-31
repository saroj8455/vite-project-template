import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const configDirectory = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(configDirectory, '../../.env'), quiet: true });

function required(name, fallback) {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const defaultPort = nodeEnv === 'production' ? 3000 : 8011;
const jwtSecret = required('JWT_SECRET');
const cookieSameSite = process.env.COOKIE_SAME_SITE || (nodeEnv === 'production' ? 'none' : 'lax');

if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long.');
}

if (!['lax', 'strict', 'none'].includes(cookieSameSite)) {
  throw new Error('COOKIE_SAME_SITE must be lax, strict, or none.');
}

export const env = Object.freeze({
  nodeEnv,
  port: Number(process.env.PORT || defaultPort),
  mongoUri: required('MONGODB_URI'),
  jwtSecret,
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim()),
  dummyJsonApiUrl: process.env.DUMMYJSON_API_URL || 'https://dummyjson.com',
  cookieSecure: process.env.COOKIE_SECURE === 'true' || nodeEnv === 'production',
  cookieSameSite,
  appUrl: process.env.APP_URL || 'http://localhost:5173/meetv1',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== 'false',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || '',
  },
});

export function isAllowedClientOrigin(origin) {
  if (env.clientOrigins.includes(origin)) return true;
  if (env.nodeEnv === 'production') return false;
  try {
    const url = new URL(origin);
    const isPrivateIpv4 = /^(10|127)\.|^192\.168\.|^172\.(1[6-9]|2\d|3[0-1])\./.test(url.hostname);
    return ['http:', 'https:'].includes(url.protocol) && (url.hostname === 'localhost' || isPrivateIpv4);
  } catch {
    return false;
  }
}

if (nodeEnv === 'production' && (!env.smtp.host || !env.smtp.user || !env.smtp.pass || !env.smtp.from)) {
  throw new Error('SMTP_HOST, SMTP_USER, SMTP_PASS, and MAIL_FROM are required in production.');
}
