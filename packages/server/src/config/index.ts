import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('localhost'),

  // Database
  MONGODB_URI: z.string().default('mongodb://localhost:27017/collabnest'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),

  // OAuth - Google
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:3001/api/auth/google/callback'),

  // Client
  CLIENT_URL: z.string().default('http://localhost:5173'),

  // File uploads
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.coerce.number().default(10 * 1024 * 1024), // 10MB

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000), // 1 minute
  RATE_LIMIT_MAX: z.coerce.number().default(100),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

// Parse and validate environment
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => e.path.join('.')).join(', ');
      console.error(`Environment validation failed. Missing or invalid: ${missingVars}`);
      
      // In development, provide helpful defaults for JWT secrets
      if (process.env['NODE_ENV'] !== 'production') {
        console.warn('Using development defaults for missing JWT secrets');
        return envSchema.parse({
          ...process.env,
          JWT_SECRET: process.env['JWT_SECRET'] || 'dev-jwt-secret-minimum-32-characters-long',
          JWT_REFRESH_SECRET: process.env['JWT_REFRESH_SECRET'] || 'dev-refresh-secret-minimum-32-chars',
        });
      }
      
      process.exit(1);
    }
    throw error;
  }
};

export const config = parseEnv();

// Derived configuration
export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';

// CORS origins
export const corsOrigins = isDevelopment
  ? [config.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173']
  : [config.CLIENT_URL];

// Export type for use in other files
export type Config = typeof config;
