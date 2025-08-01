import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// Column subdocument
export interface IColumn {
  _id: Types.ObjectId;
  name: string;
  color?: string;
  order: number;
  taskLimit?: number;
}

// Board document interface
export interface IBoard extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  projectId: Types.ObjectId;
  columns: IColumn[];
  isDefault: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  getColumn(columnId: string | Types.ObjectId): IColumn | undefined;
  addColumn(name: string, color?: string, taskLimit?: number): IColumn;
  removeColumn(columnId: string | Types.ObjectId): boolean;
  reorderColumns(columnIds: string[]): void;
}

// Static methods interface
interface IBoardModel extends Model<IBoard> {
  findByProject(projectId: string | Types.ObjectId): Promise<IBoard[]>;
  findDefaultBoard(projectId: string | Types.ObjectId): Promise<IBoard | null>;
}

// Default columns for new boards
export const DEFAULT_COLUMNS = [
  { name: 'To Do', color: '#6B7280' },
  { name: 'In Progress', color: '#3B82F6' },
  { name: 'Review', color: '#F59E0B' },
  { name: 'Done', color: '#10B981' },
];

// Column schema
const columnSchema = new Schema<IColumn>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 50,
    },
    color: {
      type: String,
      match: /^#[0-9A-Fa-f]{6}$/,
    },
    order: {
      type: Number,
      required: true,
      min: 0,
    },
    taskLimit: {
      type: Number,
      min: 0,
    },
  },
  { _id: true }
);

// Board schema
const boardSchema = new Schema<IBoard>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    columns: {
      type: [columnSchema],
      default: [],
    },
    isDefault: {
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
boardSchema.index({ projectId: 1, createdAt: -1 });
boardSchema.index({ projectId: 1, isDefault: 1 });

// Instance method to get column by ID
boardSchema.methods.getColumn = function (
  columnId: string | Types.ObjectId
): IColumn | undefined {
  const columnIdStr = columnId.toString();
  return this.columns.find(
    (col: IColumn) => col._id.toString() === columnIdStr
  );
};

// Instance method to add column
boardSchema.methods.addColumn = function (
  name: string,
  color?: string,
  taskLimit?: number
): IColumn {
  const maxOrder = this.columns.reduce(
    (max: number, col: IColumn) => Math.max(max, col.order),
    -1
  );

  const newColumn = {
    _id: new mongoose.Types.ObjectId(),
    name,
    color,
    order: maxOrder + 1,
    taskLimit,
  };

  this.columns.push(newColumn);
  return newColumn;
};

// Instance method to remove column
boardSchema.methods.removeColumn = function (
  columnId: string | Types.ObjectId
): boolean {
  const columnIdStr = columnId.toString();
  const initialLength = this.columns.length;
  
  this.columns = this.columns.filter(
    (col: IColumn) => col._id.toString() !== columnIdStr
  );

  // Reorder remaining columns
  this.columns.forEach((col: IColumn, index: number) => {
    col.order = index;
  });

  return this.columns.length < initialLength;
};

// Instance method to reorder columns
boardSchema.methods.reorderColumns = function (columnIds: string[]): void {
  const columnMap = new Map<string, IColumn>(
    this.columns.map((col: IColumn) => [col._id.toString(), col])
  );

  this.columns = columnIds
    .map((id, index) => {
      const col = columnMap.get(id);
      if (col) {
        (col as IColumn).order = index;
        return col;
      }
      return null;
    })
    .filter((col): col is IColumn => col !== null);
};

// Static method to find by project
boardSchema.statics.findByProject = function (
  projectId: string | Types.ObjectId
): Promise<IBoard[]> {
  return this.find({ projectId }).sort({ isDefault: -1, createdAt: 1 });
};

// Static method to find default board
boardSchema.statics.findDefaultBoard = function (
  projectId: string | Types.ObjectId
): Promise<IBoard | null> {
  return this.findOne({ projectId, isDefault: true });
};

// Pre-save middleware to set default columns for new boards
boardSchema.pre('save', function (next) {
  if (this.isNew && this.columns.length === 0) {
    this.columns = DEFAULT_COLUMNS.map((col, index) => ({
      _id: new mongoose.Types.ObjectId(),
      name: col.name,
      color: col.color,
      order: index,
    })) as unknown as Types.DocumentArray<IColumn>;
  }
  next();
});

// Create and export model
export const Board = mongoose.model<IBoard, IBoardModel>('Board', boardSchema);
