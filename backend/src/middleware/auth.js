import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';

const COOKIE_NAME = 'meet_session';
const TOKEN_LIFETIME = '8h';

export function issueSession(res, user) {
  const token = jwt.sign(
    { sub: user.id, username: user.username, sessionVersion: user.sessionVersion },
    env.jwtSecret,
    { expiresIn: TOKEN_LIFETIME, issuer: 'react-meet-api', audience: 'react-meet-client' },
  );

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  });

  return token;
}

export function clearSession(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: '/',
  });
}

export async function getUserFromSessionToken(token) {
  const payload = jwt.verify(token, env.jwtSecret, {
    issuer: 'react-meet-api',
    audience: 'react-meet-client',
  });
  const user = await User.findById(payload.sub);
  if (!user || user.sessionVersion !== payload.sessionVersion) return null;
  return user;
}

export async function requireAuth(req, res, next) {
  try {
    const authorization = req.get('authorization');
    const bearerToken = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : null;
    const token = bearerToken || req.cookies[COOKIE_NAME];
    if (!token) return res.status(401).json({ message: 'Authentication required.' });

    const user = await getUserFromSessionToken(token);
    if (!user) {
      return res.status(401).json({ message: 'Session is no longer valid.' });
    }
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: 'Session is invalid or expired.' });
  }
}
