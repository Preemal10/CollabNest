import { describe, it, expect } from 'vitest';
import { authService } from '../../services/auth.service.js';
import { User } from '../../models/index.js';
import { createTestUser } from '../utils/testHelpers.js';
import bcrypt from 'bcryptjs';

describe('AuthService', () => {
  describe('register', () => {
    it('should register a new user successfully', async () => {
      const payload = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'password123',
      };

      const result = await authService.register(payload);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(payload.email.toLowerCase());
      expect(result.user.name).toBe(payload.name);
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw error if email already exists', async () => {
      // Create existing user
      await createTestUser({ email: 'existing@example.com' });

      const payload = {
        email: 'existing@example.com',
        name: 'New User',
        password: 'password123',
      };

      await expect(authService.register(payload)).rejects.toThrow(
        'A user with this email already exists'
      );
    });

    it('should hash the password', async () => {
      const payload = {
        email: 'hashtest@example.com',
        name: 'Hash Test',
        password: 'password123',
      };

      await authService.register(payload);

      const user = await User.findOne({ email: payload.email }).select('+passwordHash');
      expect(user).toBeDefined();
      expect(user!.passwordHash).not.toBe(payload.password);
      
      // Verify password is correctly hashed
      const isMatch = await bcrypt.compare(payload.password, user!.passwordHash!);
      expect(isMatch).toBe(true);
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      // Create user with known password - pass plain password, model will hash it
      const password = 'testpassword123';
      await createTestUser({
        email: 'login@example.com',
        passwordHash: password, // Plain password - model's pre-save hook will hash it
        oauthProvider: 'local',
      });

      const result = await authService.login({
        email: 'login@example.com',
        password: password,
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('login@example.com');
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for wrong password', async () => {
      const password = 'correctpassword';
      await createTestUser({
        email: 'wrongpass@example.com',
        passwordHash: password, // Plain password - model will hash it
        oauthProvider: 'local',
      });

      await expect(
        authService.login({
          email: 'wrongpass@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for OAuth user trying to login with password', async () => {
      await createTestUser({
        email: 'oauth@example.com',
        oauthProvider: 'google',
        oauthId: '123456',
      });

      await expect(
        authService.login({
          email: 'oauth@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('This account uses google login');
    });

    it('should update lastLoginAt on successful login', async () => {
      const password = 'testpassword';
      const user = await createTestUser({
        email: 'lastlogin@example.com',
        passwordHash: password, // Plain password - model will hash it
        oauthProvider: 'local',
      });

      const beforeLogin = user.lastLoginAt;

      await authService.login({
        email: 'lastlogin@example.com',
        password: password,
      });

      const updatedUser = await User.findById(user._id);
      expect(updatedUser!.lastLoginAt).toBeDefined();
      if (beforeLogin) {
        expect(updatedUser!.lastLoginAt!.getTime()).toBeGreaterThan(beforeLogin.getTime());
      }
    });
  });

  describe('getCurrentUser', () => {
    it('should return user by ID', async () => {
      const user = await createTestUser({ email: 'getuser@example.com' });

      const result = await authService.getCurrentUser(user._id.toString());

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('getuser@example.com');
    });

    it('should throw error for non-existent user ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await expect(authService.getCurrentUser(fakeId)).rejects.toThrow('User not found');
    });
  });

  describe('updateProfile', () => {
    it('should update user name', async () => {
      const user = await createTestUser({
        email: 'update@example.com',
        name: 'Original Name',
      });

      const result = await authService.updateProfile(user._id.toString(), {
        name: 'Updated Name',
      });

      expect(result.user.name).toBe('Updated Name');
    });

    it('should update user avatar', async () => {
      const user = await createTestUser({ email: 'avatar@example.com' });

      const result = await authService.updateProfile(user._id.toString(), {
        avatar: 'https://example.com/avatar.jpg',
      });

      expect(result.user.avatar).toBe('https://example.com/avatar.jpg');
    });

    it('should throw error for non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await expect(
        authService.updateProfile(fakeId, { name: 'Test' })
      ).rejects.toThrow('User not found');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const oldPassword = 'oldpassword123';
      const newPassword = 'newpassword456';
      
      const user = await createTestUser({
        email: 'changepass@example.com',
        passwordHash: oldPassword, // Plain password - model will hash it
        oauthProvider: 'local',
      });

      await authService.changePassword(
        user._id.toString(),
        oldPassword,
        newPassword
      );

      // Verify new password works
      const updatedUser = await User.findById(user._id).select('+passwordHash');
      const isMatch = await bcrypt.compare(newPassword, updatedUser!.passwordHash!);
      expect(isMatch).toBe(true);
    });

    it('should throw error for incorrect current password', async () => {
      const password = 'correctpassword';
      
      const user = await createTestUser({
        email: 'wrongcurrent@example.com',
        passwordHash: password, // Plain password - model will hash it
        oauthProvider: 'local',
      });

      await expect(
        authService.changePassword(user._id.toString(), 'wrongpassword', 'newpassword')
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should throw error for OAuth user', async () => {
      const user = await createTestUser({
        email: 'oauthchange@example.com',
        oauthProvider: 'google',
        oauthId: '123456',
      });

      await expect(
        authService.changePassword(user._id.toString(), 'old', 'new')
      ).rejects.toThrow('Cannot change password for OAuth accounts');
    });
  });

  describe('logout', () => {
    it('should logout successfully without error', async () => {
      const user = await createTestUser({ email: 'logout@example.com' });

      // Logout should not throw
      await expect(authService.logout(user._id.toString())).resolves.not.toThrow();
    });
  });
});
