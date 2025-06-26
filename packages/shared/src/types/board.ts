import { z } from 'zod';

// Column schema (embedded in Board)
export const ColumnSchema = z.object({
  _id: z.string(),
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  order: z.number().int().min(0),
  taskLimit: z.number().int().min(0).optional(), // WIP limit
});

export type Column = z.infer<typeof ColumnSchema>;

// Board schema
export const BoardSchema = z.object({
  _id: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  projectId: z.string(),
  columns: z.array(ColumnSchema),
  isDefault: z.boolean().default(false),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Board = z.infer<typeof BoardSchema>;

// Create board payload
export const CreateBoardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  projectId: z.string(),
  columns: z
    .array(
      z.object({
        name: z.string().min(1).max(50),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      })
    )
    .optional(),
});

export type CreateBoardPayload = z.infer<typeof CreateBoardSchema>;

// Update board payload
export const UpdateBoardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export type UpdateBoardPayload = z.infer<typeof UpdateBoardSchema>;

// Create column payload
export const CreateColumnSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  taskLimit: z.number().int().min(0).optional(),
});

export type CreateColumnPayload = z.infer<typeof CreateColumnSchema>;

// Update column payload
export const UpdateColumnSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  taskLimit: z.number().int().min(0).optional(),
});

export type UpdateColumnPayload = z.infer<typeof UpdateColumnSchema>;

// Reorder columns payload
export const ReorderColumnsSchema = z.object({
  columnIds: z.array(z.string()),
});

export type ReorderColumnsPayload = z.infer<typeof ReorderColumnsSchema>;

// Default board columns
export const DEFAULT_COLUMNS = [
  { name: 'To Do', color: '#6B7280' },
  { name: 'In Progress', color: '#3B82F6' },
  { name: 'Review', color: '#F59E0B' },
  { name: 'Done', color: '#10B981' },
] as const;
