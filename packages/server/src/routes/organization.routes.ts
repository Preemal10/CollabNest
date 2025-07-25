import { Router } from 'express';
import { z } from 'zod';
import { CreateOrganizationSchema, UpdateOrganizationSchema, InviteMemberSchema } from '@collabnest/shared';
import { authenticate } from '../middleware/auth.js';
import { validate, mongoIdSchema } from '../middleware/validate.js';
import { asyncHandler } from '../utils/errors.js';
import { organizationService } from '../services/organization.service.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /organizations
 * Get all organizations for the current user
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const organizations = await organizationService.getUserOrganizations(req.user!._id);

    res.json({
      success: true,
      data: { organizations },
    });
  })
);

/**
 * POST /organizations
 * Create a new organization
 */
router.post(
  '/',
  validate(CreateOrganizationSchema),
  asyncHandler(async (req, res) => {
    const organization = await organizationService.create(req.body, req.user!._id);

    res.status(201).json({
      success: true,
      data: { organization },
      message: 'Organization created successfully',
    });
  })
);

/**
 * GET /organizations/:id
 * Get organization by ID
 */
const idParamSchema = z.object({
  id: mongoIdSchema,
});

router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const organization = await organizationService.getById(req.params.id!, req.user!._id);

    res.json({
      success: true,
      data: { organization },
    });
  })
);

/**
 * GET /organizations/slug/:slug
 * Get organization by slug
 */
router.get(
  '/slug/:slug',
  asyncHandler(async (req, res) => {
    const organization = await organizationService.getBySlug(req.params.slug!, req.user!._id);

    res.json({
      success: true,
      data: { organization },
    });
  })
);

/**
 * PUT /organizations/:id
 * Update organization
 */
router.put(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(UpdateOrganizationSchema),
  asyncHandler(async (req, res) => {
    const organization = await organizationService.update(
      req.params.id!,
      req.body,
      req.user!._id
    );

    res.json({
      success: true,
      data: { organization },
      message: 'Organization updated successfully',
    });
  })
);

/**
 * DELETE /organizations/:id
 * Delete organization
 */
router.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    await organizationService.delete(req.params.id!, req.user!._id);

    res.json({
      success: true,
      message: 'Organization deleted successfully',
    });
  })
);

/**
 * POST /organizations/:id/members
 * Add member to organization
 */
router.post(
  '/:id/members',
  validate(idParamSchema, 'params'),
  validate(InviteMemberSchema),
  asyncHandler(async (req, res) => {
    const organization = await organizationService.addMember(
      req.params.id!,
      req.body,
      req.user!._id
    );

    res.status(201).json({
      success: true,
      data: { organization },
      message: 'Member added successfully',
    });
  })
);

/**
 * DELETE /organizations/:id/members/:userId
 * Remove member from organization
 */
const memberParamSchema = z.object({
  id: mongoIdSchema,
  userId: mongoIdSchema,
});

router.delete(
  '/:id/members/:userId',
  validate(memberParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const organization = await organizationService.removeMember(
      req.params.id!,
      req.params.userId!,
      req.user!._id
    );

    res.json({
      success: true,
      data: { organization },
      message: 'Member removed successfully',
    });
  })
);

/**
 * PATCH /organizations/:id/members/:userId/role
 * Update member role
 */
const updateRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
});

router.patch(
  '/:id/members/:userId/role',
  validate(memberParamSchema, 'params'),
  validate(updateRoleSchema),
  asyncHandler(async (req, res) => {
    const organization = await organizationService.updateMemberRole(
      req.params.id!,
      req.params.userId!,
      req.body.role,
      req.user!._id
    );

    res.json({
      success: true,
      data: { organization },
      message: 'Member role updated successfully',
    });
  })
);

/**
 * POST /organizations/:id/leave
 * Leave organization
 */
router.post(
  '/:id/leave',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    await organizationService.leave(req.params.id!, req.user!._id);

    res.json({
      success: true,
      message: 'You have left the organization',
    });
  })
);

/**
 * POST /organizations/:id/transfer-ownership
 * Transfer ownership to another member
 */
const transferOwnershipSchema = z.object({
  newOwnerId: mongoIdSchema,
});

router.post(
  '/:id/transfer-ownership',
  validate(idParamSchema, 'params'),
  validate(transferOwnershipSchema),
  asyncHandler(async (req, res) => {
    const organization = await organizationService.transferOwnership(
      req.params.id!,
      req.body.newOwnerId,
      req.user!._id
    );

    res.json({
      success: true,
      data: { organization },
      message: 'Ownership transferred successfully',
    });
  })
);

export default router;
