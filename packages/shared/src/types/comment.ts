import { z } from 'zod';
import { PublicUserSchema } from './user.js';

// Comment schema
export const CommentSchema = z.object({
  _id: z.string(),
  taskId: z.string(),
  userId: z.string(),
  content: z.string().min(1).max(5000),
  mentions: z.array(z.string()), // User IDs mentioned
  isEdited: z.boolean().default(false),
  editedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Comment = z.infer<typeof CommentSchema>;

// Comment with populated user
export const CommentPopulatedSchema = CommentSchema.extend({
  user: PublicUserSchema,
  mentionedUsers: z.array(PublicUserSchema),
});

export type CommentPopulated = z.infer<typeof CommentPopulatedSchema>;

// Create comment payload
export const CreateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  mentions: z.array(z.string()).optional(),
});

export type CreateCommentPayload = z.infer<typeof CreateCommentSchema>;

// Update comment payload
export const UpdateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  mentions: z.array(z.string()).optional(),
});

export type UpdateCommentPayload = z.infer<typeof UpdateCommentSchema>;
