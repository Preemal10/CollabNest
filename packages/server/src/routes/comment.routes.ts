import { Router } from 'express';
import { z } from 'zod';
import { CreateCommentSchema, UpdateCommentSchema } from '@collabnest/shared';
import { authenticate } from '../middleware/auth.js';
import { validate, mongoIdSchema } from '../middleware/validate.js';
import { asyncHandler } from '../utils/errors.js';
import { commentService } from '../services/comment.service.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /comments/task/:taskId
 * Get all comments for a task
 */
const taskIdParamSchema = z.object({
  taskId: mongoIdSchema,
});

router.get(
  '/task/:taskId',
  validate(taskIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const comments = await commentService.getByTask(req.params.taskId!, req.user!._id);

    res.json({
      success: true,
      data: { comments },
    });
  })
);

/**
 * POST /comments
 * Create a new comment
 */
const createCommentBodySchema = z.object({
  taskId: mongoIdSchema,
  content: z.string().min(1).max(5000),
  mentions: z.array(mongoIdSchema).optional(),
});

router.post(
  '/',
  validate(createCommentBodySchema),
  asyncHandler(async (req, res) => {
    const comment = await commentService.create(req.body, req.user!._id);

    res.status(201).json({
      success: true,
      data: { comment },
      message: 'Comment added successfully',
    });
  })
);

/**
 * PUT /comments/:id
 * Update comment
 */
const idParamSchema = z.object({
  id: mongoIdSchema,
});

router.put(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(UpdateCommentSchema),
  asyncHandler(async (req, res) => {
    const comment = await commentService.update(
      req.params.id!,
      req.body,
      req.user!._id
    );

    res.json({
      success: true,
      data: { comment },
      message: 'Comment updated successfully',
    });
  })
);

/**
 * DELETE /comments/:id
 * Delete comment
 */
router.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    await commentService.delete(req.params.id!, req.user!._id);

    res.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  })
);

export default router;
