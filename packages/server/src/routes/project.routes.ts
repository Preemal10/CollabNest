import { Router } from 'express';
import { z } from 'zod';
import { CreateProjectSchema, UpdateProjectSchema, AddProjectMemberSchema } from '@collabnest/shared';
import { authenticate } from '../middleware/auth.js';
import { validate, mongoIdSchema } from '../middleware/validate.js';
import { asyncHandler } from '../utils/errors.js';
import { projectService } from '../services/project.service.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /projects
 * Get all projects for the current user
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const projects = await projectService.getUserProjects(req.user!._id);

    res.json({
      success: true,
      data: { projects },
    });
  })
);

/**
 * GET /projects/organization/:organizationId
 * Get all projects for an organization
 */
const orgIdParamSchema = z.object({
  organizationId: mongoIdSchema,
});

router.get(
  '/organization/:organizationId',
  validate(orgIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const includeArchived = req.query['includeArchived'] === 'true';
    const projects = await projectService.getByOrganization(
      req.params.organizationId!,
      req.user!._id,
      includeArchived
    );

    res.json({
      success: true,
      data: { projects },
    });
  })
);

/**
 * POST /projects
 * Create a new project
 */
router.post(
  '/',
  validate(CreateProjectSchema),
  asyncHandler(async (req, res) => {
    const project = await projectService.create(req.body, req.user!._id);

    res.status(201).json({
      success: true,
      data: { project },
      message: 'Project created successfully',
    });
  })
);

/**
 * GET /projects/:id
 * Get project by ID
 */
const idParamSchema = z.object({
  id: mongoIdSchema,
});

router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const project = await projectService.getById(req.params.id!, req.user!._id);

    res.json({
      success: true,
      data: { project },
    });
  })
);

/**
 * PUT /projects/:id
 * Update project
 */
router.put(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(UpdateProjectSchema),
  asyncHandler(async (req, res) => {
    const project = await projectService.update(
      req.params.id!,
      req.body,
      req.user!._id
    );

    res.json({
      success: true,
      data: { project },
      message: 'Project updated successfully',
    });
  })
);

/**
 * DELETE /projects/:id
 * Delete project
 */
router.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    await projectService.delete(req.params.id!, req.user!._id);

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  })
);

/**
 * POST /projects/:id/members
 * Add member to project
 */
router.post(
  '/:id/members',
  validate(idParamSchema, 'params'),
  validate(AddProjectMemberSchema),
  asyncHandler(async (req, res) => {
    const project = await projectService.addMember(
      req.params.id!,
      req.body.userId,
      req.body.role,
      req.user!._id
    );

    res.status(201).json({
      success: true,
      data: { project },
      message: 'Member added successfully',
    });
  })
);

/**
 * DELETE /projects/:id/members/:userId
 * Remove member from project
 */
const memberParamSchema = z.object({
  id: mongoIdSchema,
  userId: mongoIdSchema,
});

router.delete(
  '/:id/members/:userId',
  validate(memberParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const project = await projectService.removeMember(
      req.params.id!,
      req.params.userId!,
      req.user!._id
    );

    res.json({
      success: true,
      data: { project },
      message: 'Member removed successfully',
    });
  })
);

/**
 * PATCH /projects/:id/members/:userId/role
 * Update member role
 */
const updateRoleSchema = z.object({
  role: z.enum(['manager', 'editor', 'viewer']),
});

router.patch(
  '/:id/members/:userId/role',
  validate(memberParamSchema, 'params'),
  validate(updateRoleSchema),
  asyncHandler(async (req, res) => {
    const project = await projectService.updateMemberRole(
      req.params.id!,
      req.params.userId!,
      req.body.role,
      req.user!._id
    );

    res.json({
      success: true,
      data: { project },
      message: 'Member role updated successfully',
    });
  })
);

export default router;
