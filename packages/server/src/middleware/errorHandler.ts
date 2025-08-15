import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError, isApiError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { isDevelopment } from '../config/index.js';

// Format Zod validation errors
function formatZodError(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }
  
  return formatted;
}

// Global error handler middleware
export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  if (isApiError(error) && error.isOperational) {
    logger.warn(`API Error: ${error.code} - ${error.message}`);
  } else {
    logger.error('Unhandled error:', error);
  }

  // Handle known API errors
  if (isApiError(error)) {
    res.status(error.statusCode).json(error.toJSON());
    return;
  }

  // Handle Zod validation errors
  // Note: We check by name because ZodError might come from different zod instances
  // (e.g., from @collabnest/shared vs server's zod)
  if (error instanceof ZodError || error.name === 'ZodError') {
    const apiError = ApiError.validationError('Validation failed', {
      fields: formatZodError(error as ZodError),
    });
    res.status(apiError.statusCode).json(apiError.toJSON());
    return;
  }

  // Handle Mongoose validation errors
  if (error.name === 'ValidationError') {
    const apiError = ApiError.validationError(error.message);
    res.status(apiError.statusCode).json(apiError.toJSON());
    return;
  }

  // Handle Mongoose cast errors (invalid ObjectId)
  if (error.name === 'CastError') {
    const apiError = ApiError.invalidInput('Invalid ID format');
    res.status(apiError.statusCode).json(apiError.toJSON());
    return;
  }

  // Handle Mongoose duplicate key errors
  if (error.name === 'MongoServerError' && (error as { code?: number }).code === 11000) {
    const apiError = ApiError.alreadyExists('Resource');
    res.status(apiError.statusCode).json(apiError.toJSON());
    return;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    const apiError = ApiError.invalidToken('Invalid token');
    res.status(apiError.statusCode).json(apiError.toJSON());
    return;
  }

  if (error.name === 'TokenExpiredError') {
    const apiError = ApiError.tokenExpired('Token has expired');
    res.status(apiError.statusCode).json(apiError.toJSON());
    return;
  }

  // Handle unknown errors
  const apiError = ApiError.internal(
    isDevelopment ? error.message : 'Something went wrong'
  );
  
  res.status(apiError.statusCode).json({
    ...apiError.toJSON(),
    ...(isDevelopment && { stack: error.stack }),
  });
}

// 404 handler for unmatched routes
export function notFoundHandler(req: Request, res: Response): void {
  const error = ApiError.notFound('Route', `Route ${req.method} ${req.path} not found`);
  res.status(error.statusCode).json(error.toJSON());
}
