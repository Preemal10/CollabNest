import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// Notification types
export type NotificationType =
  | 'task.assigned'
  | 'task.due_soon'
  | 'task.overdue'
  | 'task.completed'
  | 'comment.mention'
  | 'comment.reply'
  | 'project.invited'
  | 'project.role_changed'
  | 'organization.invited'
  | 'organization.role_changed';

// Notification document interface
export interface INotification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;

  // Methods
  markAsRead(): Promise<INotification>;
}

// Static methods interface
interface INotificationModel extends Model<INotification> {
  findByUser(userId: string | Types.ObjectId, limit?: number): Promise<INotification[]>;
  findUnreadByUser(userId: string | Types.ObjectId): Promise<INotification[]>;
  countUnread(userId: string | Types.ObjectId): Promise<number>;
  markAllAsRead(userId: string | Types.ObjectId): Promise<void>;
  createNotification(data: Partial<INotification>): Promise<INotification>;
}

// Notification schema
const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
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
      ],
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    link: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (_doc, ret) => {
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

// Indexes
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

// TTL index - auto-delete notifications older than 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Instance method to mark as read
notificationSchema.methods.markAsRead = async function () {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
  return this as unknown as INotification;
};

// Static method to find by user
notificationSchema.statics.findByUser = function (
  userId: string | Types.ObjectId,
  limit = 50
): Promise<INotification[]> {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to find unread by user
notificationSchema.statics.findUnreadByUser = function (
  userId: string | Types.ObjectId
): Promise<INotification[]> {
  return this.find({ userId, isRead: false })
    .sort({ createdAt: -1 });
};

// Static method to count unread
notificationSchema.statics.countUnread = function (
  userId: string | Types.ObjectId
): Promise<number> {
  return this.countDocuments({ userId, isRead: false });
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = async function (
  userId: string | Types.ObjectId
): Promise<void> {
  await this.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
};

// Static method to create notification
notificationSchema.statics.createNotification = function (
  data: Partial<INotification>
): Promise<INotification> {
  return this.create(data);
};

// Create and export model
export const Notification = mongoose.model<INotification, INotificationModel>(
  'Notification',
  notificationSchema
);
