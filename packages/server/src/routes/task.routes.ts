import { Router } from 'express';
import { z } from 'zod';
import { CreateTaskSchema, UpdateTaskSchema, MoveTaskSchema, AddChecklistItemSchema, UpdateChecklistItemSchema, AddLabelSchema } from '@collabnest/shared';
import { authenticate } from '../middleware/auth.js';
import { validate, mongoIdSchema } from '../middleware/validate.js';
import { asyncHandler } from '../utils/errors.js';
import { taskService } from '../services/task.service.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /tasks/board/:boardId
 * Get all tasks for a board
 */
const boardIdParamSchema = z.object({
  boardId: mongoIdSchema,
});

router.get(
  '/board/:boardId',
  validate(boardIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const tasks = await taskService.getByBoard(req.params.boardId!, req.user!._id);

    res.json({
      success: true,
      data: { tasks },
    });
  })
);

/**
 * GET /tasks/assigned
 * Get tasks assigned to current user
 */
router.get(
  '/assigned',
  asyncHandler(async (req, res) => {
    const tasks = await taskService.getAssignedToUser(req.user!._id);

    res.json({
      success: true,
      data: { tasks },
    });
  })
);

/**
 * POST /tasks
 * Create a new task
 */
router.post(
  '/',
  validate(CreateTaskSchema),
  asyncHandler(async (req, res) => {
    const task = await taskService.create(req.body, req.user!._id);

    res.status(201).json({
      success: true,
      data: { task },
      message: 'Task created successfully',
    });
  })
);

/**
 * GET /tasks/:id
 * Get task by ID
 */
const idParamSchema = z.object({
  id: mongoIdSchema,
});

router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const task = await taskService.getById(req.params.id!, req.user!._id);

    res.json({
      success: true,
      data: { task },
    });
  })
);

/**
 * PUT /tasks/:id
 * Update task
 */
router.put(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(UpdateTaskSchema),
  asyncHandler(async (req, res) => {
    const task = await taskService.update(req.params.id!, req.body, req.user!._id);

    res.json({
      success: true,
      data: { task },
      message: 'Task updated successfully',
    });
  })
);

/**
 * PATCH /tasks/:id/move
 * Move task to different column/position
 */
router.patch(
  '/:id/move',
  validate(idParamSchema, 'params'),
  validate(MoveTaskSchema),
  asyncHandler(async (req, res) => {
    const task = await taskService.move(req.params.id!, req.body, req.user!._id);

    res.json({
      success: true,
      data: { task },
      message: 'Task moved successfully',
    });
  })
);

/**
 * DELETE /tasks/:id
 * Delete task
 */
router.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    await taskService.delete(req.params.id!, req.user!._id);

    res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  })
);

// ==================
// Checklist Routes
// ==================

/**
 * POST /tasks/:id/checklist
 * Add checklist item
 */
router.post(
  '/:id/checklist',
  validate(idParamSchema, 'params'),
  validate(AddChecklistItemSchema),
  asyncHandler(async (req, res) => {
    const task = await taskService.addChecklistItem(
      req.params.id!,
      req.body.text,
      req.user!._id
    );

    res.status(201).json({
      success: true,
      data: { task },
      message: 'Checklist item added successfully',
    });
  })
);

/**
 * PUT /tasks/:id/checklist/:itemId
 * Update checklist item
 */
const checklistParamSchema = z.object({
  id: mongoIdSchema,
  itemId: mongoIdSchema,
});

router.put(
  '/:id/checklist/:itemId',
  validate(checklistParamSchema, 'params'),
  validate(UpdateChecklistItemSchema),
  asyncHandler(async (req, res) => {
    const task = await taskService.updateChecklistItem(
      req.params.id!,
      req.params.itemId!,
      req.body,
      req.user!._id
    );

    res.json({
      success: true,
      data: { task },
      message: 'Checklist item updated successfully',
    });
  })
);

/**
 * DELETE /tasks/:id/checklist/:itemId
 * Delete checklist item
 */
router.delete(
  '/:id/checklist/:itemId',
  validate(checklistParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const task = await taskService.deleteChecklistItem(
      req.params.id!,
      req.params.itemId!,
      req.user!._id
    );

    res.json({
      success: true,
      data: { task },
      message: 'Checklist item deleted successfully',
    });
  })
);

// ==================
// Label Routes
// ==================

/**
 * POST /tasks/:id/labels
 * Add label to task
 */
router.post(
  '/:id/labels',
  validate(idParamSchema, 'params'),
  validate(AddLabelSchema),
  asyncHandler(async (req, res) => {
    const task = await taskService.addLabel(
      req.params.id!,
      req.body.name,
      req.body.color,
      req.user!._id
    );

    res.status(201).json({
      success: true,
      data: { task },
      message: 'Label added successfully',
    });
  })
);

/**
 * DELETE /tasks/:id/labels/:labelId
 * Remove label from task
 */
const labelParamSchema = z.object({
  id: mongoIdSchema,
  labelId: mongoIdSchema,
});

router.delete(
  '/:id/labels/:labelId',
  validate(labelParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const task = await taskService.removeLabel(
      req.params.id!,
      req.params.labelId!,
      req.user!._id
    );

    res.json({
      success: true,
      data: { task },
      message: 'Label removed successfully',
    });
  })
);

export default router;
