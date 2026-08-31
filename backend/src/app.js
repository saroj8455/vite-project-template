import cookieParser from 'cookie-parser';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env, isAllowedClientOrigin } from './config/env.js';
import authRoutes from './routes/auth.js';
import meetingRoutes from './routes/meetings.js';

const app = express();

app.set('etag', false);

function sendApiSummary(req, res) {
  res.set('Cache-Control', 'no-store');
  res.json({
    service: 'React Meet API',
    status: 'ok',
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      authentication: '/api/auth',
      meetings: '/api/meetings',
    },
  });
}

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || isAllowedClientOrigin(origin)) return callback(null, true);
    return callback(new Error('Request origin is not allowed.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
}));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use((req, res, next) => {
  const requestId = randomUUID();
  const startedAt = process.hrtime.bigint();
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    // Do not log request bodies, authorization headers, or cookie values.
    console.log(JSON.stringify({
      type: 'http_request',
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Math.round(durationMs),
      ipAddress: req.ip,
      origin: req.get('origin') || null,
      hasSessionCookie: Boolean(req.cookies.meet_session),
      hasBearerToken: Boolean(req.get('authorization')?.startsWith('Bearer ')),
      authTransport: req.get('authorization')?.startsWith('Bearer ')
        ? 'bearer'
        : req.cookies.meet_session ? 'cookie' : 'none',
    }));
  });

  next();
});
app.use((req, res, next) => {
  if (!['POST', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (!origin || isAllowedClientOrigin(origin)) return next();
  return res.status(403).json({ message: 'Request origin is not allowed.' });
});
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use('/api/auth/register', rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use('/api/auth/forgot-password', rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use('/api/auth/resend-verification', rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false }));

app.get('/', sendApiSummary);
app.get('/api', sendApiSummary);
app.get('/api/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ service: 'React Meet API', status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);

app.use((req, res) => res.status(404).json({ message: 'API route not found.' }));
app.use((error, req, res, next) => {
  console.error(error);
  if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid resource identifier.' });
  if (error.code === 11000) return res.status(409).json({ message: 'A record with this value already exists.' });
  const status = error.status && error.status < 500 ? error.status : 500;
  return res.status(status).json({ message: status === 500 ? 'Unexpected server error.' : error.message });
});

export default app;
