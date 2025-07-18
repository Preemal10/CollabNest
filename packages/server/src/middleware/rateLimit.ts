import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';
import { ApiError } from '../utils/errors.js';

// Standard rate limiter
export const standardLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    const error = ApiError.rateLimited('Too many requests, please try again later');
    res.status(error.statusCode).json(error.toJSON());
  },
});

// Strict rate limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    const error = ApiError.rateLimited('Too many authentication attempts, please try again later');
    res.status(error.statusCode).json(error.toJSON());
  },
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Upload rate limiter
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    const error = ApiError.rateLimited('Upload limit reached, please try again later');
    res.status(error.statusCode).json(error.toJSON());
  },
});

// API key based rate limiter (for future use)
export const apiKeyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute for API key users
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use API key if present, otherwise fall back to IP
    return req.headers['x-api-key'] as string || req.ip || 'unknown';
  },
  handler: (_req, res) => {
    const error = ApiError.rateLimited('API rate limit exceeded');
    res.status(error.statusCode).json(error.toJSON());
  },
});
