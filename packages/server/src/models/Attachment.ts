import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// Attachment document interface
export interface IAttachment extends Document {
  _id: Types.ObjectId;
  taskId: Types.ObjectId;
  userId: Types.ObjectId;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  createdAt: Date;
}

// Static methods interface
interface IAttachmentModel extends Model<IAttachment> {
  findByTask(taskId: string | Types.ObjectId): Promise<IAttachment[]>;
  countByTask(taskId: string | Types.ObjectId): Promise<number>;
}

// Attachment schema
const attachmentSchema = new Schema<IAttachment>(
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
    },
    filename: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    originalFilename: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
      max: 10 * 1024 * 1024, // 10MB
    },
    url: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
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
attachmentSchema.index({ taskId: 1, createdAt: -1 });

// Static method to find by task
attachmentSchema.statics.findByTask = function (
  taskId: string | Types.ObjectId
): Promise<IAttachment[]> {
  return this.find({ taskId })
    .sort({ createdAt: -1 })
    .populate('userId', 'name email avatar');
};

// Static method to count by task
attachmentSchema.statics.countByTask = function (
  taskId: string | Types.ObjectId
): Promise<number> {
  return this.countDocuments({ taskId });
};

// Post-save middleware to update task attachment count
attachmentSchema.post('save', async function () {
  const Task = mongoose.model('Task');
  const count = await mongoose.model('Attachment').countDocuments({
    taskId: this.taskId,
  });
  await Task.findByIdAndUpdate(this.taskId, { attachmentCount: count });
});

// Post-delete middleware to update task attachment count
attachmentSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    const Task = mongoose.model('Task');
    const count = await mongoose.model('Attachment').countDocuments({
      taskId: doc.taskId,
    });
    await Task.findByIdAndUpdate(doc.taskId, { attachmentCount: count });
  }
});

// Create and export model
export const Attachment = mongoose.model<IAttachment, IAttachmentModel>(
  'Attachment',
  attachmentSchema
);
