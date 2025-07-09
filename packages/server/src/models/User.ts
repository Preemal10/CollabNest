import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// User document interface
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  name: string;
  avatar?: string;
  passwordHash?: string;
  oauthProvider: 'local' | 'google' | 'github';
  oauthId?: string;
  isEmailVerified: boolean;
  lastLoginAt?: Date;
  notificationPreferences: {
    email: {
      taskAssigned: boolean;
      taskDueSoon: boolean;
      taskOverdue: boolean;
      commentMention: boolean;
      projectInvited: boolean;
      dailyDigest: boolean;
    };
    inApp: {
      taskAssigned: boolean;
      taskDueSoon: boolean;
      taskOverdue: boolean;
      taskCompleted: boolean;
      commentMention: boolean;
      commentReply: boolean;
      projectInvited: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  toPublicJSON(): PublicUser;
}

// Public user type (safe to expose)
export interface PublicUser {
  _id: string;
  email: string;
  name: string;
  avatar?: string;
}

// Static methods interface
interface IUserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
}

// Default notification preferences
const defaultNotificationPreferences = {
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

// User schema
const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    avatar: {
      type: String,
      trim: true,
    },
    passwordHash: {
      type: String,
      select: false, // Don't include by default in queries
    },
    oauthProvider: {
      type: String,
      enum: ['local', 'google', 'github'],
      default: 'local',
    },
    oauthId: {
      type: String,
      sparse: true, // Allow null, but unique when set
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
    },
    notificationPreferences: {
      type: Schema.Types.Mixed,
      default: defaultNotificationPreferences,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete (ret as any).passwordHash;
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

// Indexes
userSchema.index({ oauthProvider: 1, oauthId: 1 }, { sparse: true });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash') || !this.passwordHash) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.passwordHash) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Instance method to get public user data
userSchema.methods.toPublicJSON = function (): PublicUser {
  return {
    _id: this._id.toString(),
    email: this.email,
    name: this.name,
    avatar: this.avatar,
  };
};

// Static method to find by email
userSchema.statics.findByEmail = function (email: string): Promise<IUser | null> {
  return this.findOne({ email: email.toLowerCase() });
};

// Create and export model
export const User = mongoose.model<IUser, IUserModel>('User', userSchema);
