import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// Label subdocument
export interface ILabel {
  _id: Types.ObjectId;
  name: string;
  color: string;
}

// Checklist item subdocument
export interface IChecklistItem {
  _id: Types.ObjectId;
  text: string;
  isCompleted: boolean;
  completedAt?: Date;
  completedBy?: Types.ObjectId;
}

// Task document interface
export interface ITask extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  boardId: Types.ObjectId;
  columnId: Types.ObjectId;
  order: number;
  assignees: Types.ObjectId[];
  labels: ILabel[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  startDate?: Date;
  estimatedHours?: number;
  checklist: IChecklistItem[];
  attachmentCount: number;
  commentCount: number;
  isArchived: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  isAssignee(userId: string | Types.ObjectId): boolean;
  addAssignee(userId: Types.ObjectId): boolean;
  removeAssignee(userId: string | Types.ObjectId): boolean;
  addLabel(name: string, color: string): ILabel;
  removeLabel(labelId: string | Types.ObjectId): boolean;
  addChecklistItem(text: string): IChecklistItem;
  updateChecklistItem(itemId: string | Types.ObjectId, updates: Partial<IChecklistItem>): boolean;
  removeChecklistItem(itemId: string | Types.ObjectId): boolean;
  getChecklistProgress(): { completed: number; total: number };
}

// Static methods interface
interface ITaskModel extends Model<ITask> {
  findByBoard(boardId: string | Types.ObjectId): Promise<ITask[]>;
  findByColumn(boardId: string | Types.ObjectId, columnId: string | Types.ObjectId): Promise<ITask[]>;
  findAssignedToUser(userId: string | Types.ObjectId): Promise<ITask[]>;
  getNextOrder(boardId: string | Types.ObjectId, columnId: string | Types.ObjectId): Promise<number>;
  reorderTasks(boardId: string | Types.ObjectId, columnId: string | Types.ObjectId, taskIds: string[]): Promise<void>;
}

// Label schema
const labelSchema = new Schema<ILabel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    color: {
      type: String,
      required: true,
      match: /^#[0-9A-Fa-f]{6}$/,
    },
  },
  { _id: true }
);

// Checklist item schema
const checklistItemSchema = new Schema<IChecklistItem>(
  {
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
    completedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: true }
);

// Task schema
const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 10000,
    },
    boardId: {
      type: Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
      index: true,
    },
    columnId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    order: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    assignees: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    labels: {
      type: [labelSchema],
      default: [],
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    dueDate: {
      type: Date,
    },
    startDate: {
      type: Date,
    },
    estimatedHours: {
      type: Number,
      min: 0,
    },
    checklist: {
      type: [checklistItemSchema],
      default: [],
    },
    attachmentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

// Indexes
taskSchema.index({ boardId: 1, columnId: 1, order: 1 });
taskSchema.index({ assignees: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ isArchived: 1 });
taskSchema.index({ title: 'text', description: 'text' });

// Instance method to check if user is assignee
taskSchema.methods.isAssignee = function (
  userId: string | Types.ObjectId
): boolean {
  const userIdStr = userId.toString();
  return this.assignees.some(
    (assignee: Types.ObjectId) => assignee.toString() === userIdStr
  );
};

// Instance method to add assignee
taskSchema.methods.addAssignee = function (userId: Types.ObjectId): boolean {
  if (this.isAssignee(userId)) return false;
  this.assignees.push(userId);
  return true;
};

// Instance method to remove assignee
taskSchema.methods.removeAssignee = function (
  userId: string | Types.ObjectId
): boolean {
  const userIdStr = userId.toString();
  const initialLength = this.assignees.length;
  this.assignees = this.assignees.filter(
    (assignee: Types.ObjectId) => assignee.toString() !== userIdStr
  );
  return this.assignees.length < initialLength;
};

// Instance method to add label
taskSchema.methods.addLabel = function (name: string, color: string): ILabel {
  const newLabel = {
    _id: new mongoose.Types.ObjectId(),
    name,
    color,
  };
  this.labels.push(newLabel);
  return newLabel;
};

// Instance method to remove label
taskSchema.methods.removeLabel = function (
  labelId: string | Types.ObjectId
): boolean {
  const labelIdStr = labelId.toString();
  const initialLength = this.labels.length;
  this.labels = this.labels.filter(
    (label: ILabel) => label._id.toString() !== labelIdStr
  );
  return this.labels.length < initialLength;
};

// Instance method to add checklist item
taskSchema.methods.addChecklistItem = function (text: string): IChecklistItem {
  const newItem = {
    _id: new mongoose.Types.ObjectId(),
    text,
    isCompleted: false,
  };
  this.checklist.push(newItem);
  return newItem;
};

// Instance method to update checklist item
taskSchema.methods.updateChecklistItem = function (
  itemId: string | Types.ObjectId,
  updates: Partial<IChecklistItem>
): boolean {
  const itemIdStr = itemId.toString();
  const item = this.checklist.find(
    (i: IChecklistItem) => i._id.toString() === itemIdStr
  );
  if (!item) return false;

  if (updates.text !== undefined) item.text = updates.text;
  if (updates.isCompleted !== undefined) {
    item.isCompleted = updates.isCompleted;
    item.completedAt = updates.isCompleted ? new Date() : undefined;
    item.completedBy = updates.completedBy;
  }
  return true;
};

// Instance method to remove checklist item
taskSchema.methods.removeChecklistItem = function (
  itemId: string | Types.ObjectId
): boolean {
  const itemIdStr = itemId.toString();
  const initialLength = this.checklist.length;
  this.checklist = this.checklist.filter(
    (item: IChecklistItem) => item._id.toString() !== itemIdStr
  );
  return this.checklist.length < initialLength;
};

// Instance method to get checklist progress
taskSchema.methods.getChecklistProgress = function (): {
  completed: number;
  total: number;
} {
  const total = this.checklist.length;
  const completed = this.checklist.filter(
    (item: IChecklistItem) => item.isCompleted
  ).length;
  return { completed, total };
};

// Static method to find by board
taskSchema.statics.findByBoard = function (
  boardId: string | Types.ObjectId
): Promise<ITask[]> {
  return this.find({ boardId, isArchived: false })
    .sort({ columnId: 1, order: 1 })
    .populate('assignees', 'name email avatar')
    .populate('createdBy', 'name email avatar');
};

// Static method to find by column
taskSchema.statics.findByColumn = function (
  boardId: string | Types.ObjectId,
  columnId: string | Types.ObjectId
): Promise<ITask[]> {
  return this.find({ boardId, columnId, isArchived: false })
    .sort({ order: 1 })
    .populate('assignees', 'name email avatar')
    .populate('createdBy', 'name email avatar');
};

// Static method to find tasks assigned to user
taskSchema.statics.findAssignedToUser = function (
  userId: string | Types.ObjectId
): Promise<ITask[]> {
  return this.find({ assignees: userId, isArchived: false })
    .sort({ dueDate: 1, priority: -1 })
    .populate('assignees', 'name email avatar');
};

// Static method to get next order for new task
taskSchema.statics.getNextOrder = async function (
  boardId: string | Types.ObjectId,
  columnId: string | Types.ObjectId
): Promise<number> {
  const lastTask = await this.findOne({ boardId, columnId, isArchived: false })
    .sort({ order: -1 })
    .select('order');
  return lastTask ? lastTask.order + 1 : 0;
};

// Static method to reorder tasks
taskSchema.statics.reorderTasks = async function (
  boardId: string | Types.ObjectId,
  columnId: string | Types.ObjectId,
  taskIds: string[]
): Promise<void> {
  const bulkOps = taskIds.map((taskId, index) => ({
    updateOne: {
      filter: { _id: taskId, boardId, columnId },
      update: { $set: { order: index } },
    },
  }));
  await this.bulkWrite(bulkOps);
};

// Create and export model
export const Task = mongoose.model<ITask, ITaskModel>('Task', taskSchema);
