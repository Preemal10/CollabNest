import { Types } from 'mongoose';
import { Comment, Task, Board, Project, type IComment } from '../models/index.js';
import { ApiError } from '../utils/errors.js';
import { activityService } from './activity.service.js';
import { notificationService } from './notification.service.js';
import { emitCommentCreated, emitCommentUpdated, emitCommentDeleted } from '../websocket/emitters.js';

// Create comment payload
interface CreateCommentPayload {
  taskId: string;
  content: string;
  mentions?: string[];
}

// Update comment payload
interface UpdateCommentPayload {
  content: string;
  mentions?: string[];
}

class CommentService {
  /**
   * Create a new comment
   */
  async create(payload: CreateCommentPayload, userId: string): Promise<IComment> {
    // Verify task exists and get context
    const task = await Task.findById(payload.taskId);
    if (!task) {
      throw ApiError.notFound('Task');
    }

    // Verify access
    const board = await Board.findById(task.boardId);
    const project = await Project.findById(board?.projectId);

    if (!project || !project.canView(userId)) {
      throw ApiError.forbidden('You do not have access to this task');
    }

    // Create comment
    const comment = new Comment({
      taskId: new Types.ObjectId(payload.taskId),
      userId: new Types.ObjectId(userId),
      content: payload.content,
      mentions: payload.mentions?.map(id => new Types.ObjectId(id)) || [],
    });

    await comment.save();

    // Log activity
    await activityService.log({
      type: 'comment.added',
      entityType: 'comment',
      entityId: comment._id,
      projectId: board?.projectId.toString(),
      boardId: board?._id.toString(),
      taskId: payload.taskId,
      userId,
      metadata: { taskTitle: task.title },
    });

    // Notify mentioned users
    if (payload.mentions && payload.mentions.length > 0) {
      for (const mentionedUserId of payload.mentions) {
        if (mentionedUserId !== userId) {
          await notificationService.notifyCommentMention(
            mentionedUserId,
            task._id.toString(),
            task.title,
            userId
          );
        }
      }
    }

    const populatedComment = await comment.populate([
      { path: 'userId', select: 'name email avatar' },
      { path: 'mentions', select: 'name email avatar' },
    ]);

    // Emit real-time event
    if (board) {
      emitCommentCreated(
        board._id.toString(),
        payload.taskId,
        populatedComment.toJSON() as unknown as import('@collabnest/shared').Comment
      );
    }

    return populatedComment;
  }

  /**
   * Get comments for a task
   */
  async getByTask(taskId: string, userId: string): Promise<IComment[]> {
    // Verify task access
    const task = await Task.findById(taskId);
    if (!task) {
      throw ApiError.notFound('Task');
    }

    const board = await Board.findById(task.boardId);
    const project = await Project.findById(board?.projectId);

    if (!project || !project.canView(userId)) {
      throw ApiError.forbidden('You do not have access to this task');
    }

    return Comment.findByTask(taskId);
  }

  /**
   * Update comment
   */
  async update(
    commentId: string,
    payload: UpdateCommentPayload,
    userId: string
  ): Promise<IComment> {
    const comment = await Comment.findById(commentId);

    if (!comment) {
      throw ApiError.notFound('Comment');
    }

    // Only author can edit
    if (comment.userId.toString() !== userId) {
      throw ApiError.insufficientPermissions('You can only edit your own comments');
    }

    // Update comment
    comment.content = payload.content;
    comment.mentions = payload.mentions?.map(id => new Types.ObjectId(id)) || comment.mentions;
    comment.isEdited = true;
    comment.editedAt = new Date();

    await comment.save();

    // Log activity
    await activityService.log({
      type: 'comment.updated',
      entityType: 'comment',
      entityId: comment._id,
      taskId: comment.taskId.toString(),
      userId,
    });

    // Notify newly mentioned users
    if (payload.mentions) {
      const oldMentions = new Set(comment.mentions.map(m => m.toString()));
      for (const mentionedUserId of payload.mentions) {
        if (!oldMentions.has(mentionedUserId) && mentionedUserId !== userId) {
          const task = await Task.findById(comment.taskId);
          if (task) {
            await notificationService.notifyCommentMention(
              mentionedUserId,
              task._id.toString(),
              task.title,
              userId
            );
          }
        }
      }
    }

    const populatedComment = await comment.populate([
      { path: 'userId', select: 'name email avatar' },
      { path: 'mentions', select: 'name email avatar' },
    ]);

    // Emit real-time event
    const task = await Task.findById(comment.taskId);
    if (task) {
      const board = await Board.findById(task.boardId);
      if (board) {
        emitCommentUpdated(
          board._id.toString(),
          comment.taskId.toString(),
          populatedComment.toJSON() as unknown as import('@collabnest/shared').Comment
        );
      }
    }

    return populatedComment;
  }

  /**
   * Delete comment
   */
  async delete(commentId: string, userId: string): Promise<void> {
    const comment = await Comment.findById(commentId);

    if (!comment) {
      throw ApiError.notFound('Comment');
    }

    // Check permission - author or project manager can delete
    if (comment.userId.toString() !== userId) {
      const task = await Task.findById(comment.taskId);
      const board = await Board.findById(task?.boardId);
      const project = await Project.findById(board?.projectId);

      if (!project || !project.isManager(userId)) {
        throw ApiError.insufficientPermissions('You can only delete your own comments');
      }
    }

    await Comment.findByIdAndDelete(commentId);

    // Log activity
    await activityService.log({
      type: 'comment.deleted',
      entityType: 'comment',
      entityId: comment._id,
      taskId: comment.taskId.toString(),
      userId,
    });

    // Emit real-time event
    const task = await Task.findById(comment.taskId);
    if (task) {
      const board = await Board.findById(task.boardId);
      if (board) {
        emitCommentDeleted(board._id.toString(), comment.taskId.toString(), commentId);
      }
    }
  }
}

export const commentService = new CommentService();
