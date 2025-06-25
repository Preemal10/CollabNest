import { z } from 'zod';
import { PublicUserSchema } from './user.js';

// Project roles
export const ProjectRoleSchema = z.enum(['manager', 'editor', 'viewer']);
export type ProjectRole = z.infer<typeof ProjectRoleSchema>;

// Project member
export const ProjectMemberSchema = z.object({
  userId: z.string(),
  role: ProjectRoleSchema,
  joinedAt: z.string().datetime(),
});

export type ProjectMember = z.infer<typeof ProjectMemberSchema>;

// Project member with user details (populated)
export const ProjectMemberPopulatedSchema = ProjectMemberSchema.extend({
  user: PublicUserSchema,
});

export type ProjectMemberPopulated = z.infer<typeof ProjectMemberPopulatedSchema>;

// Project visibility
export const ProjectVisibilitySchema = z.enum(['private', 'organization', 'public']);
export type ProjectVisibility = z.infer<typeof ProjectVisibilitySchema>;

// Project schema
export const ProjectSchema = z.object({
  _id: z.string(),
  name: z.string().min(1).max(100),
  key: z.string().min(2).max(10),
  description: z.string().max(1000).optional(),
  organizationId: z.string().optional(), // Optional for standalone projects
  visibility: ProjectVisibilitySchema.default('private'),
  members: z.array(ProjectMemberSchema),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
  isArchived: z.boolean().default(false),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Project = z.infer<typeof ProjectSchema>;

// Create project payload
export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  organizationId: z.string().optional(), // Optional for standalone projects
  visibility: ProjectVisibilitySchema.default('private'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
});

export type CreateProjectPayload = z.infer<typeof CreateProjectSchema>;

// Update project payload
export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  visibility: ProjectVisibilitySchema.optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
  isArchived: z.boolean().optional(),
});

export type UpdateProjectPayload = z.infer<typeof UpdateProjectSchema>;

// Add project member payload
export const AddProjectMemberSchema = z.object({
  userId: z.string(),
  role: ProjectRoleSchema,
});

export type AddProjectMemberPayload = z.infer<typeof AddProjectMemberSchema>;
