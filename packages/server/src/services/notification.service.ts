import { Types } from 'mongoose';
import { Notification, User, type INotification, type NotificationType } from '../models/index.js';
import { cache } from '../config/redis.js';
import { CACHE_TTL } from '@collabnest/shared';
import { emitNotificationToUser, emitNotificationCount } from '../websocket/emitters.js';

class NotificationService {
  /**
   * Create a notification
   */
  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
    metadata?: Record<string, unknown>
  ): Promise<INotification> {
    const notification = await Notification.createNotification({
      userId: new Types.ObjectId(userId),
      type,
      title,
      message,
      link,
      metadata,
    });

    // Update cached unread count
    await this.invalidateUnreadCount(userId);

    // Emit real-time notification
    emitNotificationToUser(userId, notification.toJSON() as unknown as import('@collabnest/shared').Notification);
    
    // Also emit updated unread count
    const unreadCount = await Notification.countUnread(userId);
    emitNotificationCount(userId, unreadCount);

    return notification;
  }

  /**
   * Get notifications for user
   */
  async getByUser(userId: string, limit = 50): Promise<INotification[]> {
    return Notification.findByUser(userId, limit);
  }

  /**
   * Get unread notifications for user
   */
  async getUnreadByUser(userId: string): Promise<INotification[]> {
    return Notification.findUnreadByUser(userId);
  }

  /**
   * Get unread count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    // Try cache first
    const cached = await cache.get<number>(`notifications:${userId}:unread`);
    if (cached !== null) {
      return cached;
    }

    const count = await Notification.countUnread(userId);
    
    // Cache the count
    await cache.set(`notifications:${userId}:unread`, count, CACHE_TTL.NOTIFICATIONS);
    
    return count;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<INotification> {
    const notification = await Notification.findOne({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await notification.markAsRead();
    await this.invalidateUnreadCount(userId);

    return notification;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    await Notification.markAllAsRead(userId);
    await this.invalidateUnreadCount(userId);
  }

  /**
   * Delete notification
   */
  async delete(notificationId: string, userId: string): Promise<void> {
    await Notification.findOneAndDelete({
      _id: notificationId,
      userId,
    });
    await this.invalidateUnreadCount(userId);
  }

  // ==================
  // Helper Methods
  // ==================

  /**
   * Notify user of task assignment
   */
  async notifyTaskAssigned(
    userId: string,
    taskId: string,
    taskTitle: string,
    assignedByUserId: string
  ): Promise<void> {
    const assignedBy = await User.findById(assignedByUserId);
    const assignedByName = assignedBy?.name || 'Someone';

    await this.create(
      userId,
      'task.assigned',
      'New task assigned',
      `${assignedByName} assigned you to "${taskTitle}"`,
      `/tasks/${taskId}`,
      { taskId, assignedByUserId }
    );
  }

  /**
   * Notify user of mention in comment
   */
  async notifyCommentMention(
    userId: string,
    taskId: string,
    taskTitle: string,
    mentionedByUserId: string
  ): Promise<void> {
    const mentionedBy = await User.findById(mentionedByUserId);
    const mentionedByName = mentionedBy?.name || 'Someone';

    await this.create(
      userId,
      'comment.mention',
      'Mentioned in comment',
      `${mentionedByName} mentioned you in a comment on "${taskTitle}"`,
      `/tasks/${taskId}`,
      { taskId, mentionedByUserId }
    );
  }

  /**
   * Notify user of project invitation
   */
  async notifyProjectInvite(
    userId: string,
    projectId: string,
    projectName: string,
    invitedByUserId: string
  ): Promise<void> {
    const invitedBy = await User.findById(invitedByUserId);
    const invitedByName = invitedBy?.name || 'Someone';

    await this.create(
      userId,
      'project.invited',
      'Project invitation',
      `${invitedByName} invited you to join "${projectName}"`,
      `/projects/${projectId}`,
      { projectId, invitedByUserId }
    );
  }

  /**
   * Notify user of task due soon (within 24 hours)
   */
  async notifyTaskDueSoon(
    userId: string,
    taskId: string,
    taskTitle: string,
    dueDate: Date
  ): Promise<void> {
    await this.create(
      userId,
      'task.due_soon',
      'Task due soon',
      `"${taskTitle}" is due ${this.formatDueDate(dueDate)}`,
      `/tasks/${taskId}`,
      { taskId, dueDate: dueDate.toISOString() }
    );
  }

  /**
   * Notify user of overdue task
   */
  async notifyTaskOverdue(
    userId: string,
    taskId: string,
    taskTitle: string
  ): Promise<void> {
    await this.create(
      userId,
      'task.overdue',
      'Task overdue',
      `"${taskTitle}" is past its due date`,
      `/tasks/${taskId}`,
      { taskId }
    );
  }

  /**
   * Invalidate unread count cache
   */
  private async invalidateUnreadCount(userId: string): Promise<void> {
    await cache.del(`notifications:${userId}:unread`);
  }

  /**
   * Format due date for notification message
   */
  private formatDueDate(date: Date): string {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) {
      return 'in less than an hour';
    } else if (hours < 24) {
      return `in ${hours} hour${hours === 1 ? '' : 's'}`;
    } else {
      const days = Math.floor(hours / 24);
      return `in ${days} day${days === 1 ? '' : 's'}`;
    }
  }
}

export const notificationService = new NotificationService();
