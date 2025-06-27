import { z } from 'zod';
import { PublicUserSchema } from './user.js';

// Task priority
export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

// Label schema
export const LabelSchema = z.object({
  _id: z.string(),
  name: z.string().min(1).max(30),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export type Label = z.infer<typeof LabelSchema>;

// Checklist item schema
export const ChecklistItemSchema = z.object({
  _id: z.string(),
  text: z.string().min(1).max(200),
  isCompleted: z.boolean().default(false),
  completedAt: z.string().datetime().optional(),
  completedBy: z.string().optional(),
});

export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

// Task schema
export const TaskSchema = z.object({
  _id: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  boardId: z.string(),
  columnId: z.string(),
  order: z.number().int().min(0),
  assignees: z.array(z.string()), // User IDs
  labels: z.array(LabelSchema),
  priority: TaskPrioritySchema.default('medium'),
  dueDate: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  estimatedHours: z.number().min(0).optional(),
  checklist: z.array(ChecklistItemSchema),
  attachmentCount: z.number().int().min(0).default(0),
  commentCount: z.number().int().min(0).default(0),
  isArchived: z.boolean().default(false),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Task = z.infer<typeof TaskSchema>;

// Task with populated assignees
export const TaskPopulatedSchema = TaskSchema.extend({
  assigneeUsers: z.array(PublicUserSchema),
  createdByUser: PublicUserSchema,
});

export type TaskPopulated = z.infer<typeof TaskPopulatedSchema>;

// Create task payload
export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  boardId: z.string(),
  columnId: z.string(),
  assignees: z.array(z.string()).optional(),
  priority: TaskPrioritySchema.optional(),
  dueDate: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  labels: z
    .array(
      z.object({
        name: z.string().min(1).max(30),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      })
    )
    .optional(),
});

export type CreateTaskPayload = z.infer<typeof CreateTaskSchema>;

// Update task payload
export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional(),
  assignees: z.array(z.string()).optional(),
  priority: TaskPrioritySchema.optional(),
  dueDate: z.string().datetime().nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  estimatedHours: z.number().min(0).nullable().optional(),
  isArchived: z.boolean().optional(),
});

export type UpdateTaskPayload = z.infer<typeof UpdateTaskSchema>;

// Move task payload (drag & drop)
export const MoveTaskSchema = z.object({
  columnId: z.string(),
  order: z.number().int().min(0),
});

export type MoveTaskPayload = z.infer<typeof MoveTaskSchema>;

// Bulk move tasks payload
export const BulkMoveTasksSchema = z.object({
  taskIds: z.array(z.string()),
  columnId: z.string(),
});

export type BulkMoveTasksPayload = z.infer<typeof BulkMoveTasksSchema>;

// Add checklist item payload
export const AddChecklistItemSchema = z.object({
  text: z.string().min(1).max(200),
});

export type AddChecklistItemPayload = z.infer<typeof AddChecklistItemSchema>;

// Update checklist item payload
export const UpdateChecklistItemSchema = z.object({
  text: z.string().min(1).max(200).optional(),
  isCompleted: z.boolean().optional(),
});

export type UpdateChecklistItemPayload = z.infer<typeof UpdateChecklistItemSchema>;

// Add label payload
export const AddLabelSchema = z.object({
  name: z.string().min(1).max(30),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export type AddLabelPayload = z.infer<typeof AddLabelSchema>;
