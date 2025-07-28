import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// Project member subdocument
export interface IProjectMember {
  userId: Types.ObjectId;
  role: 'manager' | 'editor' | 'viewer';
  joinedAt: Date;
}

// Project document interface
export interface IProject extends Document {
  _id: Types.ObjectId;
  name: string;
  key: string;
  description?: string;
  organizationId?: Types.ObjectId; // Optional for standalone projects
  visibility: 'private' | 'organization' | 'public';
  members: IProjectMember[];
  color?: string;
  icon?: string;
  isArchived: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  isMember(userId: string | Types.ObjectId): boolean;
  getMemberRole(userId: string | Types.ObjectId): string | null;
  isManager(userId: string | Types.ObjectId): boolean;
  canEdit(userId: string | Types.ObjectId): boolean;
  canView(userId: string | Types.ObjectId): boolean;
}

// Static methods interface
interface IProjectModel extends Model<IProject> {
  findByOrganization(organizationId: string | Types.ObjectId): Promise<IProject[]>;
  findUserProjects(userId: string | Types.ObjectId): Promise<IProject[]>;
}

// Project member schema
const projectMemberSchema = new Schema<IProjectMember>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['manager', 'editor', 'viewer'],
      default: 'viewer',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// Project schema
const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    key: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 10,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: false, // Optional for standalone projects
      index: true,
    },
    visibility: {
      type: String,
      enum: ['private', 'organization', 'public'],
      default: 'private',
    },
    members: {
      type: [projectMemberSchema],
      default: [],
    },
    color: {
      type: String,
      match: /^#[0-9A-Fa-f]{6}$/,
    },
    icon: {
      type: String,
      maxlength: 50,
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
projectSchema.index({ 'members.userId': 1 });
projectSchema.index({ organizationId: 1, createdAt: -1 });
projectSchema.index({ createdBy: 1 });
projectSchema.index({ isArchived: 1 });

// Auto-generate key from name before validation
projectSchema.pre('validate', async function (next) {
  if (!this.key && this.name) {
    // Generate key from name (uppercase first letters of words, max 6 chars)
    let baseKey = this.name
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 4);
    
    // If too short, add more characters from first word
    if (baseKey.length < 2) {
      baseKey = this.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
    }

    // Make unique by adding a number if needed
    let key = baseKey;
    let counter = 1;
    const Project = this.constructor as IProjectModel;
    
    while (await Project.findOne({ key })) {
      key = `${baseKey}${counter}`;
      counter++;
    }
    
    this.key = key;
  }
  next();
});

// Instance method to check if user is a member
projectSchema.methods.isMember = function (
  userId: string | Types.ObjectId
): boolean {
  const userIdStr = userId.toString();
  return this.members.some(
    (member: IProjectMember) => member.userId.toString() === userIdStr
  );
};

// Instance method to get member role
projectSchema.methods.getMemberRole = function (
  userId: string | Types.ObjectId
): string | null {
  const userIdStr = userId.toString();
  const member = this.members.find(
    (m: IProjectMember) => m.userId.toString() === userIdStr
  );
  return member ? member.role : null;
};

// Instance method to check if user is manager
projectSchema.methods.isManager = function (
  userId: string | Types.ObjectId
): boolean {
  return this.getMemberRole(userId) === 'manager';
};

// Instance method to check if user can edit
projectSchema.methods.canEdit = function (
  userId: string | Types.ObjectId
): boolean {
  const role = this.getMemberRole(userId);
  return role === 'manager' || role === 'editor';
};

// Instance method to check if user can view
projectSchema.methods.canView = function (
  userId: string | Types.ObjectId
): boolean {
  if (this.visibility === 'public') return true;
  return this.isMember(userId);
};

// Static method to find by organization
projectSchema.statics.findByOrganization = function (
  organizationId: string | Types.ObjectId
): Promise<IProject[]> {
  return this.find({ organizationId, isArchived: false }).sort({ createdAt: -1 });
};

// Static method to find user's projects
projectSchema.statics.findUserProjects = function (
  userId: string | Types.ObjectId
): Promise<IProject[]> {
  // Convert string to ObjectId for proper MongoDB query matching
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  return this.find({
    'members.userId': userObjectId,
    isArchived: false,
  }).sort({ updatedAt: -1 });
};

// Create and export model
export const Project = mongoose.model<IProject, IProjectModel>(
  'Project',
  projectSchema
);
