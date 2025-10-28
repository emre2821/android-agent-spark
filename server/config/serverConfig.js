import logger from '../logger.js';

const normalizeOrigin = (origin) => origin.trim().replace(/\/$/, '');

const parseOrigins = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map(normalizeOrigin);

const defaultOrigins = ['http://localhost:5173'];

const allowedOriginsRaw = process.env.ALLOWED_ORIGINS ?? defaultOrigins.join(',');
const allowedOrigins = parseOrigins(allowedOriginsRaw);

export const serverConfig = {
  port: Number.parseInt(process.env.PORT ?? '3001', 10),
  allowedOrigins,
};

export const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
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
