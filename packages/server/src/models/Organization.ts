import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// Organization member subdocument
export interface IOrganizationMember {
  userId: Types.ObjectId;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
}

// Organization document interface
export interface IOrganization extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  members: IOrganizationMember[];
  createdAt: Date;
  updatedAt: Date;

  // Methods
  isMember(userId: string | Types.ObjectId): boolean;
  getMemberRole(userId: string | Types.ObjectId): string | null;
  isOwner(userId: string | Types.ObjectId): boolean;
  isAdmin(userId: string | Types.ObjectId): boolean;
  canManageMembers(userId: string | Types.ObjectId): boolean;
}

// Static methods interface
interface IOrganizationModel extends Model<IOrganization> {
  findBySlug(slug: string): Promise<IOrganization | null>;
  findUserOrganizations(userId: string | Types.ObjectId): Promise<IOrganization[]>;
}

// Organization member schema
const organizationMemberSchema = new Schema<IOrganizationMember>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// Organization schema
const organizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9-]+$/,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    logo: {
      type: String,
      trim: true,
    },
    members: {
      type: [organizationMemberSchema],
      default: [],
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
organizationSchema.index({ 'members.userId': 1 });
organizationSchema.index({ createdAt: -1 });

// Instance method to check if user is a member
organizationSchema.methods.isMember = function (
  userId: string | Types.ObjectId
): boolean {
  const userIdStr = userId.toString();
  return this.members.some(
    (member: IOrganizationMember) => member.userId.toString() === userIdStr
  );
};

// Instance method to get member role
organizationSchema.methods.getMemberRole = function (
  userId: string | Types.ObjectId
): string | null {
  const userIdStr = userId.toString();
  const member = this.members.find(
    (m: IOrganizationMember) => m.userId.toString() === userIdStr
  );
  return member ? member.role : null;
};

// Instance method to check if user is owner
organizationSchema.methods.isOwner = function (
  userId: string | Types.ObjectId
): boolean {
  return this.getMemberRole(userId) === 'owner';
};

// Instance method to check if user is admin
organizationSchema.methods.isAdmin = function (
  userId: string | Types.ObjectId
): boolean {
  const role = this.getMemberRole(userId);
  return role === 'owner' || role === 'admin';
};

// Instance method to check if user can manage members
organizationSchema.methods.canManageMembers = function (
  userId: string | Types.ObjectId
): boolean {
  return this.isAdmin(userId);
};

// Static method to find by slug
organizationSchema.statics.findBySlug = function (
  slug: string
): Promise<IOrganization | null> {
  return this.findOne({ slug: slug.toLowerCase() });
};

// Static method to find user's organizations
organizationSchema.statics.findUserOrganizations = function (
  userId: string | Types.ObjectId
): Promise<IOrganization[]> {
  // Convert string to ObjectId for proper MongoDB query matching
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  return this.find({ 'members.userId': userObjectId }).sort({ createdAt: -1 });
};

// Create and export model
export const Organization = mongoose.model<IOrganization, IOrganizationModel>(
  'Organization',
  organizationSchema
);
