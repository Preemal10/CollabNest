import { emitToBoard, emitToUser } from './index.js';
import type { Task, Comment, Notification } from '@collabnest/shared';

/**
 * Emit task created event to board room
 */
export function emitTaskCreated(boardId: string, task: Task): void {
  emitToBoard(boardId, 'task:created', task);
}

/**
 * Emit task updated event to board room
 */
export function emitTaskUpdated(
  boardId: string,
  taskId: string,
  updates: Record<string, unknown>,
  updatedBy: string
): void {
  emitToBoard(boardId, 'task:updated', {
    taskId,
    updates,
    updatedBy,
  });
}

/**
 * Emit task moved event to board room
 */
export function emitTaskMoved(
  boardId: string,
  taskId: string,
  fromColumnId: string,
  toColumnId: string,
  order: number,
  movedBy: string
): void {
  emitToBoard(boardId, 'task:moved', {
    taskId,
    fromColumnId,
    toColumnId,
    order,
    movedBy,
  });
}

/**
 * Emit task deleted event to board room
 */
export function emitTaskDeleted(boardId: string, taskId: string, deletedBy: string): void {
  emitToBoard(boardId, 'task:deleted', {
    taskId,
    deletedBy,
  });
}

/**
 * Emit comment created event to board room
 */
export function emitCommentCreated(boardId: string, taskId: string, comment: Comment): void {
  emitToBoard(boardId, 'comment:created', {
    comment,
    taskId,
  });
}

/**
 * Emit comment updated event to board room
 */
export function emitCommentUpdated(boardId: string, taskId: string, comment: Comment): void {
  emitToBoard(boardId, 'comment:updated', {
    comment,
    taskId,
  });
}

/**
 * Emit comment deleted event to board room
 */
export function emitCommentDeleted(boardId: string, taskId: string, commentId: string): void {
  emitToBoard(boardId, 'comment:deleted', {
    commentId,
    taskId,
  });
}

/**
 * Emit column created event to board room
 */
export function emitColumnCreated(
  boardId: string,
  column: { _id: string; name: string; color?: string; order: number }
): void {
  emitToBoard(boardId, 'board:column:created', {
    boardId,
    column,
  });
}

/**
 * Emit column updated event to board room
 */
export function emitColumnUpdated(
  boardId: string,
  columnId: string,
  updates: Record<string, unknown>
): void {
  emitToBoard(boardId, 'board:column:updated', {
    boardId,
    columnId,
    updates,
  });
}

/**
 * Emit column deleted event to board room
 */
export function emitColumnDeleted(boardId: string, columnId: string): void {
  emitToBoard(boardId, 'board:column:deleted', {
    boardId,
    columnId,
  });
}

/**
 * Emit columns reordered event to board room
 */
export function emitColumnsReordered(boardId: string, columnIds: string[]): void {
  emitToBoard(boardId, 'board:columns:reordered', {
    boardId,
    columnIds,
  });
}

/**
 * Emit notification to a specific user
 */
export function emitNotificationToUser(userId: string, notification: Notification): void {
  emitToUser(userId, 'notification:new', notification);
}

/**
 * Emit unread notification count to a specific user
 */
export function emitNotificationCount(userId: string, unread: number): void {
  emitToUser(userId, 'notification:count', { unread });
}
