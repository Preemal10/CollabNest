import { Types } from 'mongoose';
import { Task, Board, Project, type ITask } from '../models/index.js';
import { ApiError } from '../utils/errors.js';
import { activityService } from './activity.service.js';
import { notificationService } from './notification.service.js';
import { cache } from '../config/redis.js';
import { emitTaskCreated, emitTaskUpdated, emitTaskMoved, emitTaskDeleted } from '../websocket/emitters.js';

// Create task payload
interface CreateTaskPayload {
  title: string;
  description?: string;
  boardId: string;
  columnId: string;
  assignees?: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  startDate?: string;
  labels?: { name: string; color: string }[];
}

// Update task payload
interface UpdateTaskPayload {
  title?: string;
  description?: string;
  assignees?: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string | null;
  startDate?: string | null;
  estimatedHours?: number | null;
  isArchived?: boolean;
}

// Move task payload
interface MoveTaskPayload {
  columnId: string;
  order: number;
}

class TaskService {
  /**
   * Create a new task
   */
  async create(payload: CreateTaskPayload, userId: string): Promise<ITask> {
    // Verify board exists and get project
    const board = await Board.findById(payload.boardId);
    if (!board) {
      throw ApiError.notFound('Board');
    }

    // Verify column exists
    const column = board.getColumn(payload.columnId);
    if (!column) {
      throw ApiError.notFound('Column');
    }

    // Verify project access
    const project = await Project.findById(board.projectId);
    if (!project || !project.canEdit(userId)) {
      throw ApiError.insufficientPermissions('You do not have permission to create tasks');
    }

    // Get next order
    const order = await Task.getNextOrder(payload.boardId, payload.columnId);

    // Create task
    const task = new Task({
      title: payload.title,
      description: payload.description,
      boardId: new Types.ObjectId(payload.boardId),
      columnId: new Types.ObjectId(payload.columnId),
      order,
      assignees: payload.assignees?.map(id => new Types.ObjectId(id)) || [],
      priority: payload.priority || 'medium',
      dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
      startDate: payload.startDate ? new Date(payload.startDate) : undefined,
      createdBy: new Types.ObjectId(userId),
    });

    // Add labels if provided
    if (payload.labels) {
      payload.labels.forEach(label => {
        task.addLabel(label.name, label.color);
      });
    }

    await task.save();

    // Log activity
    await activityService.log({
      type: 'task.created',
      entityType: 'task',
      entityId: task._id,
      projectId: board.projectId.toString(),
      boardId: payload.boardId,
      taskId: task._id.toString(),
      userId,
      metadata: { title: task.title },
    });

    // Notify assignees
    if (payload.assignees && payload.assignees.length > 0) {
      for (const assigneeId of payload.assignees) {
        if (assigneeId !== userId) {
          await notificationService.notifyTaskAssigned(
            assigneeId,
            task._id.toString(),
            task.title,
            userId
          );
        }
      }
    }

    // Invalidate cache
    await this.invalidateCache(payload.boardId);

    const populatedTask = await task.populate([
      { path: 'assignees', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' },
    ]);

    // Emit real-time event
    emitTaskCreated(payload.boardId, populatedTask.toJSON() as unknown as import('@collabnest/shared').Task);

    return populatedTask;
  }

  /**
   * Get task by ID
   */
  async getById(taskId: string, userId: string): Promise<ITask> {
    const task = await Task.findById(taskId)
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    if (!task) {
      throw ApiError.notFound('Task');
    }

    // Verify access
    const board = await Board.findById(task.boardId);
    if (!board) {
      throw ApiError.notFound('Board');
    }

    const project = await Project.findById(board.projectId);
    if (!project || !project.canView(userId)) {
      throw ApiError.forbidden('You do not have access to this task');
    }

    return task;
  }

  /**
   * Get all tasks for a board
   */
  async getByBoard(boardId: string, userId: string): Promise<ITask[]> {
    // Verify board access
    const board = await Board.findById(boardId);
    if (!board) {
      throw ApiError.notFound('Board');
    }

    const project = await Project.findById(board.projectId);
    if (!project || !project.canView(userId)) {
      throw ApiError.forbidden('You do not have access to this board');
    }

    return Task.findByBoard(boardId);
  }

  /**
   * Get tasks assigned to user
   */
  async getAssignedToUser(userId: string): Promise<ITask[]> {
    return Task.findAssignedToUser(userId);
  }

  /**
   * Update task
   */
  async update(
    taskId: string,
    payload: UpdateTaskPayload,
    userId: string
  ): Promise<ITask> {
    const task = await Task.findById(taskId);

    if (!task) {
      throw ApiError.notFound('Task');
    }

    // Verify permission
    const board = await Board.findById(task.boardId);
    if (!board) {
      throw ApiError.notFound('Board');
    }

    const project = await Project.findById(board.projectId);
    if (!project || !project.canEdit(userId)) {
      throw ApiError.insufficientPermissions('You do not have permission to edit this task');
    }

    // Track changes for notifications
    const oldAssignees = new Set(task.assignees.map(a => a.toString()));
    const newAssignees = payload.assignees ? new Set(payload.assignees) : oldAssignees;

    // Update fields
    if (payload.title !== undefined) task.title = payload.title;
    if (payload.description !== undefined) task.description = payload.description;
    if (payload.priority !== undefined) task.priority = payload.priority;
    if (payload.dueDate !== undefined) {
      task.dueDate = payload.dueDate ? new Date(payload.dueDate) : undefined;
    }
    if (payload.startDate !== undefined) {
      task.startDate = payload.startDate ? new Date(payload.startDate) : undefined;
    }
    if (payload.estimatedHours !== undefined) {
      task.estimatedHours = payload.estimatedHours ?? undefined;
    }
    if (payload.isArchived !== undefined) task.isArchived = payload.isArchived;
    if (payload.assignees !== undefined) {
      task.assignees = payload.assignees.map(id => new Types.ObjectId(id)) as unknown as Types.Array<Types.ObjectId>;
    }

    await task.save();

    // Log activity
    await activityService.log({
      type: payload.isArchived ? 'task.archived' : 'task.updated',
      entityType: 'task',
      entityId: task._id,
      projectId: board.projectId.toString(),
      boardId: board._id.toString(),
      taskId: task._id.toString(),
      userId,
      metadata: { updates: Object.keys(payload) },
    });

    // Notify newly assigned users
    if (payload.assignees) {
      for (const assigneeId of payload.assignees) {
        if (!oldAssignees.has(assigneeId) && assigneeId !== userId) {
          await notificationService.notifyTaskAssigned(
            assigneeId,
            task._id.toString(),
            task.title,
            userId
          );
        }
      }
    }

    // Invalidate cache
    await this.invalidateCache(task.boardId.toString());

    // Emit real-time event
    emitTaskUpdated(task.boardId.toString(), taskId, payload as Record<string, unknown>, userId);

    return task.populate([
      { path: 'assignees', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' },
    ]);
  }

  /**
   * Move task to different column/position
   */
  async move(
    taskId: string,
    payload: MoveTaskPayload,
    userId: string
  ): Promise<ITask> {
    const task = await Task.findById(taskId);

    if (!task) {
      throw ApiError.notFound('Task');
    }

    // Verify permission
    const board = await Board.findById(task.boardId);
    if (!board) {
      throw ApiError.notFound('Board');
    }

    const project = await Project.findById(board.projectId);
    if (!project || !project.canEdit(userId)) {
      throw ApiError.insufficientPermissions('You do not have permission to move this task');
    }

    // Verify target column exists
    const targetColumn = board.getColumn(payload.columnId);
    if (!targetColumn) {
      throw ApiError.notFound('Column');
    }

    const fromColumnId = task.columnId.toString();
    const toColumnId = payload.columnId;
    const columnChanged = fromColumnId !== toColumnId;

    // Update task position
    task.columnId = new Types.ObjectId(payload.columnId);
    task.order = payload.order;
    await task.save();

    // Reorder other tasks in the target column
    await Task.updateMany(
      {
        boardId: task.boardId,
        columnId: payload.columnId,
        _id: { $ne: task._id },
        order: { $gte: payload.order },
        isArchived: false,
      },
      { $inc: { order: 1 } }
    );

    // Log activity
    await activityService.log({
      type: 'task.moved',
      entityType: 'task',
      entityId: task._id,
      projectId: board.projectId.toString(),
      boardId: board._id.toString(),
      taskId: task._id.toString(),
      userId,
      metadata: {
        fromColumnId,
        toColumnId,
        columnName: targetColumn.name,
        columnChanged,
      },
    });

    // Check if moved to "Done" column (simple completion detection)
    if (columnChanged && targetColumn.name.toLowerCase().includes('done')) {
      await activityService.log({
        type: 'task.completed',
        entityType: 'task',
        entityId: task._id,
        projectId: board.projectId.toString(),
        boardId: board._id.toString(),
        taskId: task._id.toString(),
        userId,
        metadata: { title: task.title },
      });
    }

    // Invalidate cache
    await this.invalidateCache(task.boardId.toString());

    // Emit real-time event
    emitTaskMoved(
      task.boardId.toString(),
      taskId,
      fromColumnId,
      toColumnId,
      payload.order,
      userId
    );

    return task.populate([
      { path: 'assignees', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' },
    ]);
  }

  /**
   * Delete task
   */
  async delete(taskId: string, userId: string): Promise<void> {
    const task = await Task.findById(taskId);

    if (!task) {
      throw ApiError.notFound('Task');
    }

    // Verify permission
    const board = await Board.findById(task.boardId);
    if (!board) {
      throw ApiError.notFound('Board');
    }

    const project = await Project.findById(board.projectId);
    if (!project || !project.canEdit(userId)) {
      throw ApiError.insufficientPermissions('You do not have permission to delete this task');
    }

    await Task.findByIdAndDelete(taskId);

    // Log activity
    await activityService.log({
      type: 'task.deleted',
      entityType: 'task',
      entityId: task._id,
      projectId: board.projectId.toString(),
      boardId: board._id.toString(),
      userId,
      metadata: { title: task.title },
    });

    // Invalidate cache
    await this.invalidateCache(task.boardId.toString());

    // Emit real-time event
    emitTaskDeleted(task.boardId.toString(), taskId, userId);

    // TODO: Delete related comments and attachments
  }

  /**
   * Add checklist item
   */
  async addChecklistItem(
    taskId: string,
    text: string,
    userId: string
  ): Promise<ITask> {
    const task = await Task.findById(taskId);

    if (!task) {
      throw ApiError.notFound('Task');
    }

    // Verify permission
    const board = await Board.findById(task.boardId);
    const project = await Project.findById(board?.projectId);

    if (!project || !project.canEdit(userId)) {
      throw ApiError.insufficientPermissions('You do not have permission to edit this task');
    }

    // Check limit
    if (task.checklist.length >= 50) {
      throw ApiError.conflict('Maximum of 50 checklist items');
    }

    task.addChecklistItem(text);
    await task.save();

    return task;
  }

  /**
   * Update checklist item
   */
  async updateChecklistItem(
    taskId: string,
    itemId: string,
    updates: { text?: string; isCompleted?: boolean },
    userId: string
  ): Promise<ITask> {
    const task = await Task.findById(taskId);

    if (!task) {
      throw ApiError.notFound('Task');
    }

    // Verify permission
    const board = await Board.findById(task.boardId);
    const project = await Project.findById(board?.projectId);

    if (!project || !project.canEdit(userId)) {
      throw ApiError.insufficientPermissions('You do not have permission to edit this task');
    }

    const updated = task.updateChecklistItem(itemId, {
      ...updates,
      completedBy: updates.isCompleted ? new Types.ObjectId(userId) : undefined,
    });

    if (!updated) {
      throw ApiError.notFound('Checklist item');
    }

    await task.save();

    return task;
  }

  /**
   * Delete checklist item
   */
  async deleteChecklistItem(
    taskId: string,
    itemId: string,
    userId: string
  ): Promise<ITask> {
    const task = await Task.findById(taskId);

    if (!task) {
      throw ApiError.notFound('Task');
    }

    // Verify permission
    const board = await Board.findById(task.boardId);
    const project = await Project.findById(board?.projectId);

    if (!project || !project.canEdit(userId)) {
      throw ApiError.insufficientPermissions('You do not have permission to edit this task');
    }

    const removed = task.removeChecklistItem(itemId);
    if (!removed) {
      throw ApiError.notFound('Checklist item');
    }

    await task.save();

    return task;
  }

  /**
   * Add label to task
   */
  async addLabel(
    taskId: string,
    name: string,
    color: string,
    userId: string
  ): Promise<ITask> {
    const task = await Task.findById(taskId);

    if (!task) {
      throw ApiError.notFound('Task');
    }

    // Verify permission
    const board = await Board.findById(task.boardId);
    const project = await Project.findById(board?.projectId);

    if (!project || !project.canEdit(userId)) {
      throw ApiError.insufficientPermissions('You do not have permission to edit this task');
    }

    // Check limit
    if (task.labels.length >= 10) {
      throw ApiError.conflict('Maximum of 10 labels per task');
    }

    task.addLabel(name, color);
    await task.save();

    return task;
  }

  /**
   * Remove label from task
   */
  async removeLabel(
    taskId: string,
    labelId: string,
    userId: string
  ): Promise<ITask> {
    const task = await Task.findById(taskId);

    if (!task) {
      throw ApiError.notFound('Task');
    }

    // Verify permission
    const board = await Board.findById(task.boardId);
    const project = await Project.findById(board?.projectId);

    if (!project || !project.canEdit(userId)) {
      throw ApiError.insufficientPermissions('You do not have permission to edit this task');
    }

    const removed = task.removeLabel(labelId);
    if (!removed) {
      throw ApiError.notFound('Label');
    }

    await task.save();

    return task;
  }

  /**
   * Invalidate cache
   */
  private async invalidateCache(boardId: string): Promise<void> {
    await cache.delPattern(`board:${boardId}:tasks:*`);
  }
}

export const taskService = new TaskService();
