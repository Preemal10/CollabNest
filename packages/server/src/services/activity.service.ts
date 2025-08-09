import { Types } from 'mongoose';
import { Activity, type IActivity, type ActivityType, type EntityType } from '../models/index.js';
import { logger } from '../utils/logger.js';

// Log activity payload
interface LogActivityPayload {
  type: ActivityType;
  entityType: EntityType;
  entityId: Types.ObjectId | string;
  userId: string;
  projectId?: string;
  boardId?: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
}

class ActivityService {
  /**
   * Log an activity
   */
  async log(payload: LogActivityPayload): Promise<IActivity> {
    try {
      const activity = await Activity.logActivity({
        type: payload.type,
        entityType: payload.entityType,
        entityId: new Types.ObjectId(payload.entityId.toString()),
        userId: new Types.ObjectId(payload.userId),
        projectId: payload.projectId ? new Types.ObjectId(payload.projectId) : undefined,
        boardId: payload.boardId ? new Types.ObjectId(payload.boardId) : undefined,
        taskId: payload.taskId ? new Types.ObjectId(payload.taskId) : undefined,
        metadata: payload.metadata || {},
      });

      return activity;
    } catch (error) {
      // Don't throw - activity logging should not break main operations
      logger.error('Failed to log activity:', error);
      throw error;
    }
  }

  /**
   * Get activities for a project
   */
  async getProjectActivities(projectId: string, limit = 50): Promise<IActivity[]> {
    return Activity.findByProject(projectId, limit);
  }

  /**
   * Get activities for a board
   */
  async getBoardActivities(boardId: string, limit = 50): Promise<IActivity[]> {
    return Activity.findByBoard(boardId, limit);
  }

  /**
   * Get activities for a task
   */
  async getTaskActivities(taskId: string, limit = 50): Promise<IActivity[]> {
    return Activity.findByTask(taskId, limit);
  }

  /**
   * Get activities by user
   */
  async getUserActivities(userId: string, limit = 50): Promise<IActivity[]> {
    return Activity.findByUser(userId, limit);
  }

  /**
   * Get recent activities across projects user has access to
   */
  async getRecentActivities(
    projectIds: string[],
    limit = 50
  ): Promise<IActivity[]> {
    return Activity.find({
      projectId: { $in: projectIds.map(id => new Types.ObjectId(id)) },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'name email avatar');
  }
}

export const activityService = new ActivityService();
