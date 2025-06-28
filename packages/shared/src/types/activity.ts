import { z } from 'zod';
import { PublicUserSchema } from './user.js';

// Activity types
export const ActivityTypeSchema = z.enum([
  // Task activities
  'task.created',
  'task.updated',
  'task.moved',
  'task.assigned',
  'task.unassigned',
  'task.completed',
  'task.reopened',
  'task.archived',
  'task.deleted',
  // Comment activities
  'comment.added',
  'comment.updated',
  'comment.deleted',
  // Attachment activities
  'attachment.uploaded',
  'attachment.deleted',
  // Board activities
  'board.created',
  'board.updated',
  'board.deleted',
  'column.created',
  'column.updated',
  'column.deleted',
  // Project activities
  'project.created',
  'project.updated',
  'project.archived',
  'project.member.added',
  'project.member.removed',
  'project.member.role_changed',
  // Organization activities
  'organization.created',
  'organization.updated',
  'organization.member.added',
  'organization.member.removed',
  'organization.member.role_changed',
]);

export type ActivityType = z.infer<typeof ActivityTypeSchema>;

// Entity types that activities can reference
export const EntityTypeSchema = z.enum([
  'task',
  'comment',
  'attachment',
  'board',
  'column',
  'project',
  'organization',
  'user',
]);

export type EntityType = z.infer<typeof EntityTypeSchema>;

// Activity metadata (varies by activity type)
export const ActivityMetadataSchema = z.record(z.unknown());

export type ActivityMetadata = z.infer<typeof ActivityMetadataSchema>;

// Activity schema
export const ActivitySchema = z.object({
  _id: z.string(),
  type: ActivityTypeSchema,
  entityType: EntityTypeSchema,
  entityId: z.string(),
  projectId: z.string().optional(),
  boardId: z.string().optional(),
  taskId: z.string().optional(),
  userId: z.string(), // User who performed the action
  metadata: ActivityMetadataSchema, // Additional context
  createdAt: z.string().datetime(),
});

export type Activity = z.infer<typeof ActivitySchema>;

// Activity with populated user
export const ActivityPopulatedSchema = ActivitySchema.extend({
  user: PublicUserSchema,
});

export type ActivityPopulated = z.infer<typeof ActivityPopulatedSchema>;

// Activity query params
export const ActivityQuerySchema = z.object({
  projectId: z.string().optional(),
  boardId: z.string().optional(),
  taskId: z.string().optional(),
  userId: z.string().optional(),
  type: ActivityTypeSchema.optional(),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(), // For pagination
});

export type ActivityQuery = z.infer<typeof ActivityQuerySchema>;

// Helper to generate activity message
export function getActivityMessage(activity: ActivityPopulated): string {
  const { type, user, metadata } = activity;
  const userName = user.name;

  const messages: Record<ActivityType, string> = {
    'task.created': `${userName} created a new task`,
    'task.updated': `${userName} updated the task`,
    'task.moved': `${userName} moved the task to ${metadata['columnName'] ?? 'another column'}`,
    'task.assigned': `${userName} assigned ${metadata['assigneeName'] ?? 'someone'} to the task`,
    'task.unassigned': `${userName} unassigned ${metadata['assigneeName'] ?? 'someone'} from the task`,
    'task.completed': `${userName} marked the task as complete`,
    'task.reopened': `${userName} reopened the task`,
    'task.archived': `${userName} archived the task`,
    'task.deleted': `${userName} deleted the task`,
    'comment.added': `${userName} added a comment`,
    'comment.updated': `${userName} edited a comment`,
    'comment.deleted': `${userName} deleted a comment`,
    'attachment.uploaded': `${userName} uploaded ${metadata['filename'] ?? 'a file'}`,
    'attachment.deleted': `${userName} deleted ${metadata['filename'] ?? 'a file'}`,
    'board.created': `${userName} created a new board`,
    'board.updated': `${userName} updated the board`,
    'board.deleted': `${userName} deleted the board`,
    'column.created': `${userName} added a new column`,
    'column.updated': `${userName} updated a column`,
    'column.deleted': `${userName} deleted a column`,
    'project.created': `${userName} created a new project`,
    'project.updated': `${userName} updated the project`,
    'project.archived': `${userName} archived the project`,
    'project.member.added': `${userName} added ${metadata['memberName'] ?? 'a member'} to the project`,
    'project.member.removed': `${userName} removed ${metadata['memberName'] ?? 'a member'} from the project`,
    'project.member.role_changed': `${userName} changed ${metadata['memberName'] ?? 'a member'}'s role`,
    'organization.created': `${userName} created a new organization`,
    'organization.updated': `${userName} updated the organization`,
    'organization.member.added': `${userName} added ${metadata['memberName'] ?? 'a member'} to the organization`,
    'organization.member.removed': `${userName} removed ${metadata['memberName'] ?? 'a member'} from the organization`,
    'organization.member.role_changed': `${userName} changed ${metadata['memberName'] ?? 'a member'}'s role`,
  };

  return messages[type] ?? `${userName} performed an action`;
}
