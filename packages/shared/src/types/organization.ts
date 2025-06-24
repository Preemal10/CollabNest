import { z } from 'zod';
import { PublicUserSchema } from './user.js';

// Organization roles
export const OrganizationRoleSchema = z.enum(['owner', 'admin', 'member']);
export type OrganizationRole = z.infer<typeof OrganizationRoleSchema>;

// Organization member
export const OrganizationMemberSchema = z.object({
  userId: z.string(),
  role: OrganizationRoleSchema,
  joinedAt: z.string().datetime(),
});

export type OrganizationMember = z.infer<typeof OrganizationMemberSchema>;

// Organization member with user details (populated)
export const OrganizationMemberPopulatedSchema = OrganizationMemberSchema.extend({
  user: PublicUserSchema,
});

export type OrganizationMemberPopulated = z.infer<typeof OrganizationMemberPopulatedSchema>;

// Organization schema
export const OrganizationSchema = z.object({
  _id: z.string(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  logo: z.string().url().optional(),
  members: z.array(OrganizationMemberSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Organization = z.infer<typeof OrganizationSchema>;

// Create organization payload
export const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(500).optional(),
});

export type CreateOrganizationPayload = z.infer<typeof CreateOrganizationSchema>;

// Update organization payload
export const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  logo: z.string().url().optional(),
});

export type UpdateOrganizationPayload = z.infer<typeof UpdateOrganizationSchema>;

// Invite member payload
export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: OrganizationRoleSchema.exclude(['owner']),
});

export type InviteMemberPayload = z.infer<typeof InviteMemberSchema>;

// Update member role payload
export const UpdateMemberRoleSchema = z.object({
  userId: z.string(),
  role: OrganizationRoleSchema.exclude(['owner']),
});

export type UpdateMemberRolePayload = z.infer<typeof UpdateMemberRoleSchema>;
