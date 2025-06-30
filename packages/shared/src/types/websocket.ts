import { z } from 'zod';
import { TaskSchema } from './task.js';
import { CommentSchema } from './comment.js';
import { NotificationSchema } from './notification.js';

// Room types for Socket.io
export type RoomType = 'board' | 'project' | 'user';

// Helper to generate room names
export const getRoomName = (type: RoomType, id: string): string => `${type}:${id}`;

// Client to Server events
export const ClientEventsSchema = {
  // Room management
  'join:board': z.object({ boardId: z.string() }),
  'leave:board': z.object({ boardId: z.string() }),
  'join:project': z.object({ projectId: z.string() }),
  'leave:project': z.object({ projectId: z.string() }),

  // Task events (optimistic updates)
  'task:create': z.object({
    boardId: z.string(),
    columnId: z.string(),
    title: z.string(),
    tempId: z.string(), // Temporary ID for optimistic update
  }),
  'task:update': z.object({
    taskId: z.string(),
    updates: z.record(z.unknown()),
  }),
  'task:move': z.object({
    taskId: z.string(),
    columnId: z.string(),
    order: z.number(),
  }),
  'task:delete': z.object({
    taskId: z.string(),
  }),

  // Comment events
  'comment:create': z.object({
    taskId: z.string(),
    content: z.string(),
    tempId: z.string(),
  }),

  // Typing indicators
  'typing:start': z.object({
    taskId: z.string(),
  }),
  'typing:stop': z.object({
    taskId: z.string(),
  }),

  // Presence
  'presence:update': z.object({
    status: z.enum(['online', 'away', 'busy']),
  }),
};

// Server to Client events
export const ServerEventsSchema = {
  // Connection
  'connect:success': z.object({
    userId: z.string(),
    connectedAt: z.string().datetime(),
  }),
  'connect:error': z.object({
    message: z.string(),
  }),

  // Task events
  'task:created': TaskSchema,
  'task:updated': z.object({
    taskId: z.string(),
    updates: z.record(z.unknown()),
    updatedBy: z.string(),
  }),
  'task:moved': z.object({
    taskId: z.string(),
    fromColumnId: z.string(),
    toColumnId: z.string(),
    order: z.number(),
    movedBy: z.string(),
  }),
  'task:deleted': z.object({
    taskId: z.string(),
    deletedBy: z.string(),
  }),

  // Optimistic update confirmations
  'task:create:confirmed': z.object({
    tempId: z.string(),
    task: TaskSchema,
  }),
  'task:create:failed': z.object({
    tempId: z.string(),
    error: z.string(),
  }),

  // Comment events
  'comment:created': z.object({
    comment: CommentSchema,
    taskId: z.string(),
  }),
  'comment:updated': z.object({
    comment: CommentSchema,
    taskId: z.string(),
  }),
  'comment:deleted': z.object({
    commentId: z.string(),
    taskId: z.string(),
  }),
  'comment:create:confirmed': z.object({
    tempId: z.string(),
    comment: CommentSchema,
  }),

  // Typing indicators
  'typing:users': z.object({
    taskId: z.string(),
    userIds: z.array(z.string()),
  }),

  // Notifications
  'notification:new': NotificationSchema,
  'notification:count': z.object({
    unread: z.number(),
  }),

  // Presence
  'presence:users': z.object({
    roomId: z.string(),
    users: z.array(
      z.object({
        userId: z.string(),
        status: z.enum(['online', 'away', 'busy']),
        lastSeen: z.string().datetime(),
      })
    ),
  }),
  'presence:joined': z.object({
    userId: z.string(),
    roomId: z.string(),
  }),
  'presence:left': z.object({
    userId: z.string(),
    roomId: z.string(),
  }),

  // Board updates
  'board:column:created': z.object({
    boardId: z.string(),
    column: z.object({
      _id: z.string(),
      name: z.string(),
      color: z.string().optional(),
      order: z.number(),
    }),
  }),
  'board:column:updated': z.object({
    boardId: z.string(),
    columnId: z.string(),
    updates: z.record(z.unknown()),
  }),
  'board:column:deleted': z.object({
    boardId: z.string(),
    columnId: z.string(),
  }),
  'board:columns:reordered': z.object({
    boardId: z.string(),
    columnIds: z.array(z.string()),
  }),
};

// Type helpers for event handlers
export type ClientEvents = {
  [K in keyof typeof ClientEventsSchema]: z.infer<(typeof ClientEventsSchema)[K]>;
};

export type ServerEvents = {
  [K in keyof typeof ServerEventsSchema]: z.infer<(typeof ServerEventsSchema)[K]>;
};
