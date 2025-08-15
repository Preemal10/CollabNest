import { ErrorCodes, ErrorStatusCodes, type ErrorCode } from '@collabnest/shared';

// Custom API Error class
export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
    isOperational = true
  ) {
    super(message);
    this.code = code;
    this.statusCode = ErrorStatusCodes[code];
    this.details = details;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  // Factory methods for common errors
  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(ErrorCodes.UNAUTHORIZED, message);
  }

  static invalidToken(message = 'Invalid token'): ApiError {
    return new ApiError(ErrorCodes.INVALID_TOKEN, message);
  }

  static tokenExpired(message = 'Token expired'): ApiError {
    return new ApiError(ErrorCodes.TOKEN_EXPIRED, message);
  }

  static invalidCredentials(message = 'Invalid credentials'): ApiError {
    return new ApiError(ErrorCodes.INVALID_CREDENTIALS, message);
  }

  static forbidden(message = 'Access forbidden'): ApiError {
    return new ApiError(ErrorCodes.FORBIDDEN, message);
  }

  static insufficientPermissions(message = 'Insufficient permissions'): ApiError {
    return new ApiError(ErrorCodes.INSUFFICIENT_PERMISSIONS, message);
  }

  static notFound(resource = 'Resource', message?: string): ApiError {
    return new ApiError(ErrorCodes.NOT_FOUND, message || `${resource} not found`);
  }

  static alreadyExists(resource = 'Resource', message?: string): ApiError {
    return new ApiError(ErrorCodes.ALREADY_EXISTS, message || `${resource} already exists`);
  }

  static conflict(message = 'Conflict'): ApiError {
    return new ApiError(ErrorCodes.CONFLICT, message);
  }

  static validationError(message: string, details?: Record<string, unknown>): ApiError {
    return new ApiError(ErrorCodes.VALIDATION_ERROR, message, details);
  }

  static invalidInput(message: string, details?: Record<string, unknown>): ApiError {
    return new ApiError(ErrorCodes.INVALID_INPUT, message, details);
  }

  static rateLimited(message = 'Too many requests'): ApiError {
    return new ApiError(ErrorCodes.RATE_LIMITED, message);
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(ErrorCodes.INTERNAL_ERROR, message, undefined, false);
  }

  static serviceUnavailable(message = 'Service unavailable'): ApiError {
    return new ApiError(ErrorCodes.SERVICE_UNAVAILABLE, message);
  }

  static fileTooLarge(message = 'File too large'): ApiError {
    return new ApiError(ErrorCodes.FILE_TOO_LARGE, message);
  }

  static invalidFileType(message = 'Invalid file type'): ApiError {
    return new ApiError(ErrorCodes.INVALID_FILE_TYPE, message);
  }

  // Convert to JSON response
  toJSON(): Record<string, unknown> {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

// Type guard for ApiError
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

import type { Request, Response, NextFunction, RequestHandler } from 'express';

// Wrap async route handlers to catch errors
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
