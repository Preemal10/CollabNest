import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// Activity types
export type ActivityType =
  | 'task.created'
  | 'task.updated'
  | 'task.moved'
  | 'task.assigned'
  | 'task.unassigned'
  | 'task.completed'
  | 'task.reopened'
  | 'task.archived'
  | 'task.deleted'
  | 'comment.added'
  | 'comment.updated'
  | 'comment.deleted'
  | 'attachment.uploaded'
  | 'attachment.deleted'
  | 'board.created'
  | 'board.updated'
  | 'board.deleted'
  | 'column.created'
  | 'column.updated'
  | 'column.deleted'
  | 'project.created'
  | 'project.updated'
  | 'project.archived'
  | 'project.member.added'
  | 'project.member.removed'
  | 'project.member.role_changed'
  | 'organization.created'
  | 'organization.updated'
  | 'organization.member.added'
  | 'organization.member.removed'
  | 'organization.member.role_changed';

// Entity types
export type EntityType =
  | 'task'
  | 'comment'
  | 'attachment'
  | 'board'
  | 'column'
  | 'project'
  | 'organization'
  | 'user';

// Activity document interface
export interface IActivity extends Document {
  _id: Types.ObjectId;
  type: ActivityType;
  entityType: EntityType;
  entityId: Types.ObjectId;
  projectId?: Types.ObjectId;
  boardId?: Types.ObjectId;
  taskId?: Types.ObjectId;
  userId: Types.ObjectId;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// Static methods interface
interface IActivityModel extends Model<IActivity> {
  findByProject(projectId: string | Types.ObjectId, limit?: number): Promise<IActivity[]>;
  findByBoard(boardId: string | Types.ObjectId, limit?: number): Promise<IActivity[]>;
  findByTask(taskId: string | Types.ObjectId, limit?: number): Promise<IActivity[]>;
  findByUser(userId: string | Types.ObjectId, limit?: number): Promise<IActivity[]>;
  logActivity(data: Partial<IActivity>): Promise<IActivity>;
}

// Activity schema
const activitySchema = new Schema<IActivity>(
  {
    type: {
      type: String,
      required: true,
      enum: [
        'task.created', 'task.updated', 'task.moved', 'task.assigned',
        'task.unassigned', 'task.completed', 'task.reopened', 'task.archived',
        'task.deleted', 'comment.added', 'comment.updated', 'comment.deleted',
        'attachment.uploaded', 'attachment.deleted', 'board.created',
        'board.updated', 'board.deleted', 'column.created', 'column.updated',
        'column.deleted', 'project.created', 'project.updated', 'project.archived',
        'project.member.added', 'project.member.removed', 'project.member.role_changed',
        'organization.created', 'organization.updated', 'organization.member.added',
        'organization.member.removed', 'organization.member.role_changed',
      ],
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      enum: ['task', 'comment', 'attachment', 'board', 'column', 'project', 'organization', 'user'],
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
    },
    boardId: {
      type: Schema.Types.ObjectId,
      ref: 'Board',
      index: true,
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
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
activitySchema.index({ projectId: 1, createdAt: -1 });
activitySchema.index({ boardId: 1, createdAt: -1 });
activitySchema.index({ taskId: 1, createdAt: -1 });
activitySchema.index({ createdAt: -1 });

// TTL index - auto-delete activities older than 90 days
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Static method to find by project
activitySchema.statics.findByProject = function (
  projectId: string | Types.ObjectId,
  limit = 50
): Promise<IActivity[]> {
  return this.find({ projectId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'name email avatar');
};

// Static method to find by board
activitySchema.statics.findByBoard = function (
  boardId: string | Types.ObjectId,
  limit = 50
): Promise<IActivity[]> {
  return this.find({ boardId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'name email avatar');
};

// Static method to find by task
activitySchema.statics.findByTask = function (
  taskId: string | Types.ObjectId,
  limit = 50
): Promise<IActivity[]> {
  return this.find({ taskId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'name email avatar');
};

// Static method to find by user
activitySchema.statics.findByUser = function (
  userId: string | Types.ObjectId,
  limit = 50
): Promise<IActivity[]> {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to log activity
activitySchema.statics.logActivity = function (
  data: Partial<IActivity>
): Promise<IActivity> {
  return this.create(data);
};

// Create and export model
export const Activity = mongoose.model<IActivity, IActivityModel>(
  'Activity',
  activitySchema
);
