import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import passport from './config/passport.js';
import { config, corsOrigins, isDevelopment } from './config/index.js';
import { errorHandler, notFoundHandler, standardLimiter } from './middleware/index.js';
import { httpLogStream } from './utils/logger.js';
import { isDatabaseConnected } from './config/database.js';
import { isRedisConnected } from './config/redis.js';

// Import routes
import apiRoutes from './routes/index.js';

// Create Express application
export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: isDevelopment ? false : undefined,
  }));

  // CORS configuration
  app.use(cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }));

  // Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Initialize Passport
  app.use(passport.initialize());

  // HTTP request logging
  app.use(morgan(isDevelopment ? 'dev' : 'combined', { stream: httpLogStream }));

  // Rate limiting (applied to all routes)
  app.use(standardLimiter);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        mongodb: isDatabaseConnected() ? 'connected' : 'disconnected',
        redis: isRedisConnected() ? 'connected' : 'disconnected',
      },
    });
  });

  // API routes
  app.use('/api', apiRoutes);

  // Static files for uploads (development only)
  if (isDevelopment) {
    app.use('/uploads', express.static(config.UPLOAD_DIR));
  }

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}
