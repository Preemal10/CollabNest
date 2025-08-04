import { Types } from 'mongoose';
import { Board, Project, type IBoard, type IColumn } from '../models/index.js';
import { ApiError } from '../utils/errors.js';
import { activityService } from './activity.service.js';
import { cache } from '../config/redis.js';
import { CACHE_TTL } from '@collabnest/shared';
import { emitColumnCreated, emitColumnUpdated, emitColumnDeleted, emitColumnsReordered } from '../websocket/emitters.js';

// Create board payload
interface CreateBoardPayload {
  name: string;
  description?: string;
  projectId: string;
  columns?: { name: string; color?: string }[];
}

// Update board payload
interface UpdateBoardPayload {
  name?: string;
  description?: string;
}

// Create column payload
interface CreateColumnPayload {
  name: string;
  color?: string;
  taskLimit?: number;
}

// Update column payload
interface UpdateColumnPayload {
  name?: string;
  color?: string;
  taskLimit?: number;
}

class BoardService {
  /**
   * Create a new board
   */
  async create(payload: CreateBoardPayload, userId: string): Promise<IBoard> {
    // Verify project access
    const project = await Project.findById(payload.projectId);
    if (!project) {
      throw ApiError.notFound('Project');
    }

    if (!project.canEdit(userId)) {
      throw ApiError.insufficientPermissions('You do not have permission to create boards');
    }

    // Create board
    const board = new Board({
      name: payload.name,
      description: payload.description,
      projectId: new Types.ObjectId(payload.projectId),
      createdBy: new Types.ObjectId(userId),
    });

    // Add custom columns if provided
    if (payload.columns && payload.columns.length > 0) {
      board.columns = payload.columns.map((col, index) => ({
        _id: new Types.ObjectId(),
        name: col.name,
        color: col.color,
        order: index,
      })) as unknown as Types.DocumentArray<IColumn>;
    }

    await board.save();

    // Log activity
    await activityService.log({
      type: 'board.created',
      entityType: 'board',
      entityId: board._id,
      projectId: payload.projectId,
      boardId: board._id.toString(),
      userId,
      metadata: { name: board.name },
    });

    // Invalidate cache
    await this.invalidateCache(payload.projectId);

    return board;
  }

  /**
   * Get board by ID
   */
  async getById(boardId: string, userId: string): Promise<IBoard> {
    // Try cache first
    const cached = await cache.get<IBoard>(`board:${boardId}`);
    if (cached) {
      // Verify access
      const project = await Project.findById(cached.projectId);
      if (project && project.canView(userId)) {
        return cached;
      }
    }

    const board = await Board.findById(boardId);

    if (!board) {
      throw ApiError.notFound('Board');
    }

    // Verify access
    const project = await Project.findById(board.projectId);
    if (!project || !project.canView(userId)) {
      throw ApiError.forbidden('You do not have access to this board');
    }

    // Cache board
    await cache.set(`board:${boardId}`, board.toJSON(), CACHE_TTL.BOARD);

    return board;
  }

  /**
   * Get all boards for a project
   */
  async getByProject(projectId: string, userId: string): Promise<IBoard[]> {
    // Verify project access
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project');
    }

    if (!project.canView(userId)) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    return Board.findByProject(projectId);
  }

  /**
   * Update board
   */
  async update(
    boardId: string,
    payload: UpdateBoardPayload,
    userId: string
  ): Promise<IBoard> {
    const board = await Board.findById(boardId);

    if (!board) {
      throw ApiError.notFound('Board');
    }

    // Verify permission
    const project = await Project.findById(board.projectId);
    if (!project || !project.canEdit(userId)) {
      throw ApiError.insufficientPermissions('You do not have permission to edit this board');
    }

    // Update fields
    Object.assign(board, payload);
    await board.save();

    // Log activity
    await activityService.log({
      type: 'board.updated',
      entityType: 'board',
      entityId: board._id,
      projectId: board.projectId.toString(),
      boardId: board._id.toString(),
      userId,
      metadata: { updates: Object.keys(payload) },
    });

    // Invalidate cache
    await this.invalidateCache(board.projectId.toString(), boardId);

    return board;
  }

  /**
   * Delete board
   */
  async delete(boardId: string, userId: string): Promise<void> {
    const board = await Board.findById(boardId);

    if (!board) {
      throw ApiError.notFound('Board');
    }

    // Cannot delete default board
    if (board.isDefault) {
      throw ApiError.conflict('Cannot delete the default board');
    }

    // Verify permission
    const project = await Project.findById(board.projectId);
    if (!project || !project.isManager(userId)) {
      throw ApiError.insufficientPermissions('Only project managers can delete boards');
    }

    await Board.findByIdAndDelete(boardId);

    // Log activity
    await activityService.log({
      type: 'board.deleted',
      entityType: 'board',
      entityId: board._id,
      projectId: board.projectId.toString(),
      userId,
      metadata: { name: board.name },
    });

    // Invalidate cache
    await this.invalidateCache(board.projectId.toString(), boardId);

    // TODO: Move tasks to default board or delete them
  }

  /**
   * Add column to board
   */
  async addColumn(
    boardId: string,
    payload: CreateColumnPayload,
    userId: string
  ): Promise<IBoard> {
    const board = await Board.findById(boardId);

    if (!board) {
      throw ApiError.notFound('Board');
    }

    // Verify permission
    const project = await Project.findById(board.projectId);
    if (!project || !project.canEdit(userId)) {
      throw ApiError.insufficientPermissions('You do not have permission to edit this board');
    }

    // Check column limit
    if (board.columns.length >= 20) {
      throw ApiError.conflict('Maximum of 20 columns per board');
    }

    // Add column
    const column = board.addColumn(payload.name, payload.color, payload.taskLimit);
    await board.save();

    // Log activity
    await activityService.log({
      type: 'column.created',
      entityType: 'column',
      entityId: column._id,
      projectId: board.projectId.toString(),
      boardId: board._id.toString(),
      userId,
      metadata: { name: payload.name },
    });

    // Invalidate cache
    await this.invalidateCache(board.projectId.toString(), boardId);

    // Emit real-time event
    emitColumnCreated(boardId, {
      _id: column._id.toString(),
      name: column.name,
      color: column.color,
      order: column.order,
    });

    return board;
  }

  /**
   * Update column
   */
  async updateColumn(
    boardId: string,
    columnId: string,
    payload: UpdateColumnPayload,
    userId: string
  ): Promise<IBoard> {
    const board = await Board.findById(boardId);

    if (!board) {
      throw ApiError.notFound('Board');
    }

    // Verify permission
    const project = await Project.findById(board.projectId);
    if (!project || !project.canEdit(userId)) {
      throw ApiError.insufficientPermissions('You do not have permission to edit this board');
    }

    // Find column
    const column = board.getColumn(columnId);
    if (!column) {
      throw ApiError.notFound('Column');
    }

    // Update column
    if (payload.name !== undefined) column.name = payload.name;
    if (payload.color !== undefined) column.color = payload.color;
    if (payload.taskLimit !== undefined) column.taskLimit = payload.taskLimit;

    await board.save();

    // Log activity
    await activityService.log({
      type: 'column.updated',
      entityType: 'column',
      entityId: new Types.ObjectId(columnId),
      projectId: board.projectId.toString(),
      boardId: board._id.toString(),
      userId,
      metadata: { updates: Object.keys(payload) },
    });

    // Invalidate cache
    await this.invalidateCache(board.projectId.toString(), boardId);

    // Emit real-time event
    emitColumnUpdated(boardId, columnId, payload as Record<string, unknown>);

    return board;
  }

  /**
   * Delete column
   */
  async deleteColumn(boardId: string, columnId: string, userId: string): Promise<IBoard> {
    const board = await Board.findById(boardId);

    if (!board) {
      throw ApiError.notFound('Board');
    }

    // Verify permission
    const project = await Project.findById(board.projectId);
    if (!project || !project.canEdit(userId)) {
      throw ApiError.insufficientPermissions('You do not have permission to edit this board');
    }

    // Cannot delete if only one column
    if (board.columns.length <= 1) {
      throw ApiError.conflict('Board must have at least one column');
    }

    // Find column name for logging
    const column = board.getColumn(columnId);
    if (!column) {
      throw ApiError.notFound('Column');
    }

    const columnName = column.name;

    // Remove column
    const removed = board.removeColumn(columnId);
    if (!removed) {
      throw ApiError.notFound('Column');
    }

    await board.save();

    // Log activity
    await activityService.log({
      type: 'column.deleted',
      entityType: 'column',
      entityId: new Types.ObjectId(columnId),
      projectId: board.projectId.toString(),
      boardId: board._id.toString(),
      userId,
      metadata: { name: columnName },
    });

    // Invalidate cache
    await this.invalidateCache(board.projectId.toString(), boardId);

    // Emit real-time event
    emitColumnDeleted(boardId, columnId);

    // TODO: Move tasks from deleted column

    return board;
  }

  /**
   * Reorder columns
   */
  async reorderColumns(
    boardId: string,
    columnIds: string[],
    userId: string
  ): Promise<IBoard> {
    const board = await Board.findById(boardId);

    if (!board) {
      throw ApiError.notFound('Board');
    }

    // Verify permission
    const project = await Project.findById(board.projectId);
    if (!project || !project.canEdit(userId)) {
      throw ApiError.insufficientPermissions('You do not have permission to edit this board');
    }

    // Verify all column IDs exist
    const existingIds = new Set(board.columns.map(c => c._id.toString()));
    const allExist = columnIds.every(id => existingIds.has(id));

    if (!allExist || columnIds.length !== board.columns.length) {
      throw ApiError.invalidInput('Invalid column IDs provided');
    }

    // Reorder columns
    board.reorderColumns(columnIds);
    await board.save();

    // Invalidate cache
    await this.invalidateCache(board.projectId.toString(), boardId);

    // Emit real-time event
    emitColumnsReordered(boardId, columnIds);

    return board;
  }

  /**
   * Invalidate cache
   */
  private async invalidateCache(projectId: string, boardId?: string): Promise<void> {
    if (boardId) {
      await cache.del(`board:${boardId}`);
    }
    await cache.delPattern(`boards:${projectId}:*`);
  }
}

export const boardService = new BoardService();
