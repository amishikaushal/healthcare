import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { db } from './database/db';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Routes
import authRoutes      from './routes/auth.routes'
import chatRoutes      from './routes/chat.routes'
import patientRoutes   from './routes/patient.routes';
import doctorRoutes    from './routes/doctor.routes';
import caregiverRoutes from './routes/caregiver.routes';
import documentRoutes  from './routes/document.routes';
import notificationRoutes from './routes/notification.routes';

const app: Application = express();

// ── Security Headers ──────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body & Compression ────────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

// ── Global Rate Limit ─────────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { success: false, message: 'Too many requests. Please slow down.' },
}));

// ── Auth Rate Limit ───────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.rateLimit.authMax,
  message: { success: false, message: 'Too many auth attempts. Try again later.' },
});

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/auth',      authLimiter, authRoutes)
app.use('/api/v1/chat',      chatRoutes)
app.use('/api/v1/doctor',    doctorRoutes)
app.use('/api/v1/caregiver', caregiverRoutes)
app.use('/api/v1/documents', documentRoutes)
app.use('/api/v1/notifications', notificationRoutes)
app.use('/api/v1',           patientRoutes);

// ── 404 & Error ───────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const start = async (): Promise<void> => {
  try {
    await db.testConnection();
    app.listen(config.port, () => {
      logger.info(`🚀 RecoveryOS server running on port ${config.port} [${config.env}]`);
    });
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
};

start();

export default app;
