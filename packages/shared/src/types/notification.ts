import { z } from 'zod';

// Notification types
export const NotificationTypeSchema = z.enum([
  'task.assigned',
  'task.due_soon',
  'task.overdue',
  'task.completed',
  'comment.mention',
  'comment.reply',
  'project.invited',
  'project.role_changed',
  'organization.invited',
  'organization.role_changed',
]);

export type NotificationType = z.infer<typeof NotificationTypeSchema>;

// Notification schema
export const NotificationSchema = z.object({
  _id: z.string(),
  userId: z.string(), // Recipient
  type: NotificationTypeSchema,
  title: z.string().max(200),
  message: z.string().max(500),
  link: z.string().optional(), // URL to navigate to
  metadata: z.record(z.unknown()).optional(),
  isRead: z.boolean().default(false),
  readAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
});

export type Notification = z.infer<typeof NotificationSchema>;

// Create notification payload (internal use)
export const CreateNotificationSchema = z.object({
  userId: z.string(),
  type: NotificationTypeSchema,
  title: z.string().max(200),
  message: z.string().max(500),
  link: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateNotificationPayload = z.infer<typeof CreateNotificationSchema>;

// Mark notifications as read payload
export const MarkNotificationsReadSchema = z.object({
  notificationIds: z.array(z.string()).optional(), // If empty, mark all as read
});

export type MarkNotificationsReadPayload = z.infer<typeof MarkNotificationsReadSchema>;

// Notification preferences schema
export const NotificationPreferencesSchema = z.object({
  email: z.object({
    taskAssigned: z.boolean().default(true),
    taskDueSoon: z.boolean().default(true),
    taskOverdue: z.boolean().default(true),
    commentMention: z.boolean().default(true),
    projectInvited: z.boolean().default(true),
    dailyDigest: z.boolean().default(false),
  }),
  inApp: z.object({
    taskAssigned: z.boolean().default(true),
    taskDueSoon: z.boolean().default(true),
    taskOverdue: z.boolean().default(true),
    taskCompleted: z.boolean().default(true),
    commentMention: z.boolean().default(true),
    commentReply: z.boolean().default(true),
    projectInvited: z.boolean().default(true),
  }),
});

export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

// Default notification preferences
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  email: {
    taskAssigned: true,
    taskDueSoon: true,
    taskOverdue: true,
    commentMention: true,
    projectInvited: true,
    dailyDigest: false,
  },
  inApp: {
    taskAssigned: true,
    taskDueSoon: true,
    taskOverdue: true,
    taskCompleted: true,
    commentMention: true,
    commentReply: true,
    projectInvited: true,
  },
};

// Notification count response
export const NotificationCountSchema = z.object({
  unread: z.number().int().min(0),
  total: z.number().int().min(0),
});

export type NotificationCount = z.infer<typeof NotificationCountSchema>;
