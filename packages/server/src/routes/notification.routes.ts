import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate, mongoIdSchema } from '../middleware/validate.js';
import { asyncHandler } from '../utils/errors.js';
import { notificationService } from '../services/notification.service.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /notifications
 * Get all notifications for current user
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query['limit'] as string) || 50;
    const notifications = await notificationService.getByUser(req.user!._id, limit);

    res.json({
      success: true,
      data: { notifications },
    });
  })
);

/**
 * GET /notifications/unread
 * Get unread notifications for current user
 */
router.get(
  '/unread',
  asyncHandler(async (req, res) => {
    const notifications = await notificationService.getUnreadByUser(req.user!._id);

    res.json({
      success: true,
      data: { notifications },
    });
  })
);

/**
 * GET /notifications/count
 * Get unread notification count for current user
 */
router.get(
  '/count',
  asyncHandler(async (req, res) => {
    const count = await notificationService.getUnreadCount(req.user!._id);

    res.json({
      success: true,
      data: { unread: count },
    });
  })
);

/**
 * PATCH /notifications/:id/read
 * Mark notification as read
 */
const idParamSchema = z.object({
  id: mongoIdSchema,
});

router.patch(
  '/:id/read',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const notification = await notificationService.markAsRead(
      req.params.id!,
      req.user!._id
    );

    res.json({
      success: true,
      data: { notification },
    });
  })
);

/**
 * PATCH /notifications/read-all
 * Mark all notifications as read
 */
router.patch(
  '/read-all',
  asyncHandler(async (req, res) => {
    await notificationService.markAllAsRead(req.user!._id);

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  })
);

/**
 * DELETE /notifications/:id
 * Delete notification
 */
router.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    await notificationService.delete(req.params.id!, req.user!._id);

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  })
);

export default router;
