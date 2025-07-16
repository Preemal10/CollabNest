import { Router } from 'express';
import passport from 'passport';
import { z } from 'zod';
import { CreateUserSchema, LoginUserSchema } from '@collabnest/shared';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../utils/errors.js';
import { authService } from '../services/auth.service.js';
import { config } from '../config/index.js';

const router = Router();

// Apply stricter rate limiting to auth routes
router.use(authLimiter);

/**
 * POST /auth/register
 * Register a new user with email/password
 */
router.post(
  '/register',
  validate(CreateUserSchema),
  asyncHandler(async (req, res) => {
    const { email, name, password } = req.body;

    const result = await authService.register({ email, name, password });

    res.status(201).json({
      success: true,
      data: result,
      message: 'User registered successfully',
    });
  })
);

/**
 * POST /auth/login
 * Login with email/password
 */
router.post(
  '/login',
  validate(LoginUserSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const result = await authService.login({ email, password });

    res.json({
      success: true,
      data: result,
      message: 'Login successful',
    });
  })
);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

router.post(
  '/refresh',
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    const result = await authService.refreshTokens(refreshToken);

    res.json({
      success: true,
      data: result,
      message: 'Token refreshed successfully',
    });
  })
);

/**
 * POST /auth/logout
 * Logout and invalidate refresh token
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    await authService.logout(req.user!._id);

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  })
);

/**
 * GET /auth/me
 * Get current authenticated user
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await authService.getCurrentUser(req.user!._id);

    res.json({
      success: true,
      data: { user: result.user.toPublicJSON() },
    });
  })
);

/**
 * PATCH /auth/me
 * Update current user profile
 */
const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar: z.string().url().optional(),
});

router.patch(
  '/me',
  authenticate,
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.updateProfile(req.user!._id, req.body);

    res.json({
      success: true,
      data: { user: result.user.toPublicJSON() },
      message: 'Profile updated successfully',
    });
  })
);

/**
 * POST /auth/change-password
 * Change password for local auth users
 */
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(req.user!._id, currentPassword, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  })
);

// ==================
// Google OAuth Routes
// ==================

/**
 * GET /auth/google
 * Initiate Google OAuth flow
 */
router.get(
  '/google',
  (req, res, next) => {
    if (!config.GOOGLE_CLIENT_ID) {
      return res.status(501).json({
        success: false,
        error: {
          code: 'NOT_CONFIGURED',
          message: 'Google OAuth is not configured',
        },
      });
    }
    next();
  },
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

/**
 * GET /auth/google/callback
 * Handle Google OAuth callback
 */
router.get(
  '/google/callback',
  (req, res, next) => {
    passport.authenticate('google', { session: false }, async (err, profile) => {
      try {
        if (err) {
          throw ApiError.internal('OAuth authentication failed');
        }

        if (!profile) {
          throw ApiError.unauthorized('Authentication cancelled');
        }

        // Process OAuth login
        const result = await authService.oauthLogin({
          provider: profile.provider,
          oauthId: profile.oauthId,
          email: profile.email,
          name: profile.name,
          avatar: profile.avatar,
        });

        // Redirect to frontend with tokens
        const params = new URLSearchParams({
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
        });

        res.redirect(`${config.CLIENT_URL}/auth/callback?${params.toString()}`);
      } catch (error) {
        // Redirect to frontend with error
        const params = new URLSearchParams({
          error: error instanceof ApiError ? error.message : 'Authentication failed',
        });
        res.redirect(`${config.CLIENT_URL}/auth/callback?${params.toString()}`);
      }
    })(req, res, next);
  }
);

export default router;
