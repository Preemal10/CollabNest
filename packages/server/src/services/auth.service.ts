import { User, type IUser, type PublicUser } from '../models/index.js';
import { generateTokens, verifyRefreshToken } from '../middleware/auth.js';
import { ApiError } from '../utils/errors.js';
import { cache } from '../config/redis.js';
import { CACHE_TTL } from '@collabnest/shared';

// Auth tokens interface
interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Auth response interface
interface AuthResponse {
  user: PublicUser;
  tokens: AuthTokens;
}

// Register payload
interface RegisterPayload {
  email: string;
  name: string;
  password: string;
}

// Login payload
interface LoginPayload {
  email: string;
  password: string;
}

// OAuth payload
interface OAuthPayload {
  provider: 'google' | 'github';
  oauthId: string;
  email: string;
  name: string;
  avatar?: string;
}

class AuthService {
  /**
   * Register a new user with email/password
   */
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { email, name, password } = payload;

    // Check if email already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw ApiError.alreadyExists('User', 'A user with this email already exists');
    }

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      name,
      passwordHash: password, // Will be hashed by pre-save middleware
      oauthProvider: 'local',
    });

    await user.save();

    // Generate tokens
    const tokens = generateTokens(user._id.toString(), user.email);

    // Cache the session
    await this.cacheSession(user._id.toString(), tokens.refreshToken);

    return {
      user: user.toPublicJSON(),
      tokens,
    };
  }

  /**
   * Login with email/password
   */
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { email, password } = payload;

    // Find user with password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    
    if (!user) {
      throw ApiError.invalidCredentials('Invalid email or password');
    }

    // Check if user uses OAuth
    if (user.oauthProvider !== 'local') {
      throw ApiError.invalidCredentials(
        `This account uses ${user.oauthProvider} login. Please sign in with ${user.oauthProvider}.`
      );
    }

    // Verify password
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      throw ApiError.invalidCredentials('Invalid email or password');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate tokens
    const tokens = generateTokens(user._id.toString(), user.email);

    // Cache the session
    await this.cacheSession(user._id.toString(), tokens.refreshToken);

    return {
      user: user.toPublicJSON(),
      tokens,
    };
  }

  /**
   * Login or register via OAuth
   */
  async oauthLogin(payload: OAuthPayload): Promise<AuthResponse> {
    const { provider, oauthId, email, name, avatar } = payload;

    // Try to find existing user by OAuth ID
    let user: IUser | null = await User.findOne({ oauthProvider: provider, oauthId });

    if (!user) {
      // Check if email exists with different provider
      const existingUser = await User.findByEmail(email);
      
      if (existingUser) {
        // Link accounts if email matches
        existingUser.oauthProvider = provider;
        existingUser.oauthId = oauthId;
        if (avatar && !existingUser.avatar) {
          existingUser.avatar = avatar;
        }
        existingUser.lastLoginAt = new Date();
        await existingUser.save();
        user = existingUser;
      } else {
        // Create new user
        const newUser = new User({
          email: email.toLowerCase(),
          name,
          avatar,
          oauthProvider: provider,
          oauthId,
          isEmailVerified: true, // OAuth emails are pre-verified
        });
        await newUser.save();
        user = newUser;
      }
    } else {
      // Update last login
      user.lastLoginAt = new Date();
      if (avatar && !user.avatar) {
        user.avatar = avatar;
      }
      await user.save();
    }

    // Generate tokens
    const tokens = generateTokens(user!._id.toString(), user!.email);

    // Cache the session
    await this.cacheSession(user!._id.toString(), tokens.refreshToken);

    return {
      user: user!.toPublicJSON(),
      tokens,
    };
  }

  /**
   * Refresh access token
   */
  async refreshTokens(refreshToken: string): Promise<{ tokens: AuthTokens }> {
    try {
      // Verify refresh token
      const payload = verifyRefreshToken(refreshToken);
      
      // Check if token is cached (not revoked)
      const cachedToken = await cache.get<string>(`session:${payload.userId}`);
      if (cachedToken !== refreshToken) {
        throw ApiError.invalidToken('Token has been revoked');
      }

      // Verify user still exists
      const user = await User.findById(payload.userId);
      if (!user) {
        throw ApiError.invalidToken('User not found');
      }

      // Generate new tokens
      const tokens = generateTokens(user._id.toString(), user.email);

      // Update cached session
      await this.cacheSession(user._id.toString(), tokens.refreshToken);

      return { tokens };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.invalidToken('Invalid or expired refresh token');
    }
  }

  /**
   * Logout - revoke refresh token
   */
  async logout(userId: string): Promise<void> {
    await cache.del(`session:${userId}`);
  }

  /**
   * Get current user
   */
  async getCurrentUser(userId: string): Promise<{ user: IUser }> {
    const user = await User.findById(userId);
    
    if (!user) {
      throw ApiError.notFound('User');
    }

    return { user };
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: { name?: string; avatar?: string }
  ): Promise<{ user: IUser }> {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw ApiError.notFound('User');
    }

    return { user };
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await User.findById(userId).select('+passwordHash');
    
    if (!user) {
      throw ApiError.notFound('User');
    }

    if (user.oauthProvider !== 'local') {
      throw ApiError.invalidInput('Cannot change password for OAuth accounts');
    }

    // Verify current password
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      throw ApiError.invalidCredentials('Current password is incorrect');
    }

    // Update password
    user.passwordHash = newPassword;
    await user.save();

    // Invalidate all sessions
    await cache.del(`session:${userId}`);
  }

  /**
   * Cache user session
   */
  private async cacheSession(userId: string, refreshToken: string): Promise<void> {
    await cache.set(`session:${userId}`, refreshToken, CACHE_TTL.SESSION);
  }
}

export const authService = new AuthService();
