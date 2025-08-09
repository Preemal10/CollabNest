import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// Comment document interface
export interface IComment extends Document {
  _id: Types.ObjectId;
  taskId: Types.ObjectId;
  userId: Types.ObjectId;
  content: string;
  mentions: Types.ObjectId[];
  isEdited: boolean;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Static methods interface
interface ICommentModel extends Model<IComment> {
  findByTask(taskId: string | Types.ObjectId): Promise<IComment[]>;
  countByTask(taskId: string | Types.ObjectId): Promise<number>;
}

// Comment schema
const commentSchema = new Schema<IComment>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 5000,
    },
    mentions: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
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
commentSchema.index({ taskId: 1, createdAt: -1 });

// Static method to find by task
commentSchema.statics.findByTask = function (
  taskId: string | Types.ObjectId
): Promise<IComment[]> {
  return this.find({ taskId })
    .sort({ createdAt: 1 })
    .populate('userId', 'name email avatar')
    .populate('mentions', 'name email avatar');
};

// Static method to count by task
commentSchema.statics.countByTask = function (
  taskId: string | Types.ObjectId
): Promise<number> {
  return this.countDocuments({ taskId });
};

// Post-save middleware to update task comment count
commentSchema.post('save', async function () {
  const Task = mongoose.model('Task');
  const count = await mongoose.model('Comment').countDocuments({
    taskId: this.taskId,
  });
  await Task.findByIdAndUpdate(this.taskId, { commentCount: count });
});

// Post-delete middleware to update task comment count
commentSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    const Task = mongoose.model('Task');
    const count = await mongoose.model('Comment').countDocuments({
      taskId: doc.taskId,
    });
    await Task.findByIdAndUpdate(doc.taskId, { commentCount: count });
  }
});

// Create and export model
export const Comment = mongoose.model<IComment, ICommentModel>(
  'Comment',
  commentSchema
);
