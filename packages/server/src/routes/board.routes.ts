import { Router } from 'express';
import { z } from 'zod';
import { CreateBoardSchema, UpdateBoardSchema, CreateColumnSchema, UpdateColumnSchema, ReorderColumnsSchema } from '@collabnest/shared';
import { authenticate } from '../middleware/auth.js';
import { validate, mongoIdSchema } from '../middleware/validate.js';
import { asyncHandler } from '../utils/errors.js';
import { boardService } from '../services/board.service.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /boards/project/:projectId
 * Get all boards for a project
 */
const projectIdParamSchema = z.object({
  projectId: mongoIdSchema,
});

router.get(
  '/project/:projectId',
  validate(projectIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const boards = await boardService.getByProject(req.params.projectId!, req.user!._id);

    res.json({
      success: true,
      data: { boards },
    });
  })
);

/**
 * POST /boards
 * Create a new board
 */
router.post(
  '/',
  validate(CreateBoardSchema),
  asyncHandler(async (req, res) => {
    const board = await boardService.create(req.body, req.user!._id);

    res.status(201).json({
      success: true,
      data: { board },
      message: 'Board created successfully',
    });
  })
);

/**
 * GET /boards/:id
 * Get board by ID
 */
const idParamSchema = z.object({
  id: mongoIdSchema,
});

router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const board = await boardService.getById(req.params.id!, req.user!._id);

    res.json({
      success: true,
      data: { board },
    });
  })
);

/**
 * PUT /boards/:id
 * Update board
 */
router.put(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(UpdateBoardSchema),
  asyncHandler(async (req, res) => {
    const board = await boardService.update(req.params.id!, req.body, req.user!._id);

    res.json({
      success: true,
      data: { board },
      message: 'Board updated successfully',
    });
  })
);

/**
 * DELETE /boards/:id
 * Delete board
 */
router.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    await boardService.delete(req.params.id!, req.user!._id);

    res.json({
      success: true,
      message: 'Board deleted successfully',
    });
  })
);

// ==================
// Column Routes
// ==================

/**
 * POST /boards/:id/columns
 * Add column to board
 */
router.post(
  '/:id/columns',
  validate(idParamSchema, 'params'),
  validate(CreateColumnSchema),
  asyncHandler(async (req, res) => {
    const board = await boardService.addColumn(req.params.id!, req.body, req.user!._id);

    res.status(201).json({
      success: true,
      data: { board },
      message: 'Column added successfully',
    });
  })
);

/**
 * PUT /boards/:id/columns/:columnId
 * Update column
 */
const columnParamSchema = z.object({
  id: mongoIdSchema,
  columnId: mongoIdSchema,
});

router.put(
  '/:id/columns/:columnId',
  validate(columnParamSchema, 'params'),
  validate(UpdateColumnSchema),
  asyncHandler(async (req, res) => {
    const board = await boardService.updateColumn(
      req.params.id!,
      req.params.columnId!,
      req.body,
      req.user!._id
    );

    res.json({
      success: true,
      data: { board },
      message: 'Column updated successfully',
    });
  })
);

/**
 * DELETE /boards/:id/columns/:columnId
 * Delete column
 */
router.delete(
  '/:id/columns/:columnId',
  validate(columnParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const board = await boardService.deleteColumn(
      req.params.id!,
      req.params.columnId!,
      req.user!._id
    );

    res.json({
      success: true,
      data: { board },
      message: 'Column deleted successfully',
    });
  })
);

/**
 * PUT /boards/:id/columns/reorder
 * Reorder columns
 */
router.put(
  '/:id/columns/reorder',
  validate(idParamSchema, 'params'),
  validate(ReorderColumnsSchema),
  asyncHandler(async (req, res) => {
    const board = await boardService.reorderColumns(
      req.params.id!,
      req.body.columnIds,
      req.user!._id
    );

    res.json({
      success: true,
      data: { board },
      message: 'Columns reordered successfully',
    });
  })
);

export default router;
