import logger from '../logger.js';

const normalizeOrigin = (origin) => origin.trim().replace(/\/$/, '');

const parseOrigins = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map(normalizeOrigin);

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
];

const allowedOriginsRaw = process.env.ALLOWED_ORIGINS ?? defaultOrigins.join(',');
const allowedOrigins = parseOrigins(allowedOriginsRaw);

export const serverConfig = {
  port: Number.parseInt(process.env.PORT ?? '3001', 10),
  allowedOrigins,
};

export const corsOptions = {
  origin: (origin, callback) => {
    // By default, reject requests with no origin header for better security.
    // If you need to allow such requests, set ALLOW_NO_ORIGIN=true in your environment.
    const allowNoOrigin = process.env.ALLOW_NO_ORIGIN === 'true';
    if (!origin) {
      if (allowNoOrigin) {
        callback(null, true);
      } else {
        callback(new Error('Requests with no Origin header are not allowed by CORS policy.'));
      }
      return;
    }

    const normalized = normalizeOrigin(origin);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(normalized)) {
      callback(null, true);
      return;
    }

    logger.warn('Blocked request from unauthorized origin', { origin: normalized });
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
};
