import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate, mongoIdSchema } from '../middleware/validate.js';
import { asyncHandler, ApiError } from '../utils/errors.js';
import { activityService } from '../services/activity.service.js';
import { Project } from '../models/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /activities/me
 * Get activities for current user's projects
 */
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    // Get user's projects
    const projects = await Project.findUserProjects(req.user!._id);
    const projectIds = projects.map(p => p._id.toString());

    const activities = await activityService.getRecentActivities(projectIds, limit);

    res.json({
      success: true,
      data: { activities },
    });
  })
);

/**
 * GET /activities/project/:projectId
 * Get activities for a specific project
 */
const projectIdParamSchema = z.object({
  projectId: mongoIdSchema,
});

router.get(
  '/project/:projectId',
  validate(projectIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    // Verify project access
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project');
    }

    if (!project.canView(req.user!._id)) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    const activities = await activityService.getProjectActivities(projectId!, limit);

    res.json({
      success: true,
      data: { activities },
    });
  })
);

/**
 * GET /activities/board/:boardId
 * Get activities for a specific board
 */
const boardIdParamSchema = z.object({
  boardId: mongoIdSchema,
});

router.get(
  '/board/:boardId',
  validate(boardIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { boardId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const activities = await activityService.getBoardActivities(boardId!, limit);

    res.json({
      success: true,
      data: { activities },
    });
  })
);

/**
 * GET /activities/task/:taskId
 * Get activities for a specific task
 */
const taskIdParamSchema = z.object({
  taskId: mongoIdSchema,
});

router.get(
  '/task/:taskId',
  validate(taskIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const activities = await activityService.getTaskActivities(taskId!, limit);

    res.json({
      success: true,
      data: { activities },
    });
  })
);

export default router;
