import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { ApiError } from '../utils/errors.js';
// Types are extended in types/express.d.ts

// JWT payload type
interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

// Extract token from Authorization header
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1] ?? null;
}

// Verify JWT and attach user to request
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      throw ApiError.unauthorized('No token provided');
    }

    // Verify token
    const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;

    // Attach user info to request
    req.user = {
      _id: payload.userId,
      email: payload.email,
      name: '', // Will be populated by route if needed
      avatar: undefined,
    };
    req.token = token;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(ApiError.tokenExpired());
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(ApiError.invalidToken());
    } else {
      next(error);
    }
  }
}

// Optional authentication - doesn't fail if no token
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (token) {
      const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
      req.user = {
        _id: payload.userId,
        email: payload.email,
        name: '',
        avatar: undefined,
      };
      req.token = token;
    }

    next();
  } catch {
    // Silently continue without user
    next();
  }
}

// Generate access token
export function generateAccessToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    config.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

// Generate refresh token
export function generateRefreshToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    config.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

// Verify refresh token
export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, config.JWT_REFRESH_SECRET) as JwtPayload;
}

// Generate both tokens
export function generateTokens(userId: string, email: string) {
  return {
    accessToken: generateAccessToken(userId, email),
    refreshToken: generateRefreshToken(userId, email),
    expiresIn: 15 * 60, // 15 minutes in seconds
  };
}
