import request from 'supertest';
import express from 'express';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import { createTestUser, generateTestToken } from '../utils/testHelpers';
import { errorHandler } from '../../middleware/errorHandler';

// Mock the rate limiter BEFORE importing authRoutes
vi.mock('../../middleware/rateLimit.js', () => ({
  authLimiter: (_req: any, _res: any, next: any) => next(),
  standardLimiter: (_req: any, _res: any, next: any) => next(),
  uploadLimiter: (_req: any, _res: any, next: any) => next(),
  apiKeyLimiter: (_req: any, _res: any, next: any) => next(),
}));

// Import authRoutes AFTER mocking the rate limiter
import authRoutes from '../../routes/auth.routes';

// Create test Express app
const app = express();
app.use(express.json());
app.use('/auth', authRoutes);
app.use(errorHandler);

describe('Auth Routes', () => {
  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'newuser@test.com',
          name: 'New User',
          password: 'password123',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('newuser@test.com');
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.tokens.accessToken).toBeDefined();
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          name: 'Test User',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail with short password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@test.com',
          name: 'Test User',
          password: '123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@test.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail if email already exists', async () => {
      await createTestUser({ email: 'existing@test.com' });

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'existing@test.com',
          name: 'Another User',
          password: 'password123',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Pass the plain password - the User model pre-save hook will hash it
      await createTestUser({
        email: 'login@test.com',
        passwordHash: 'testpassword',
        oauthProvider: 'local',
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@test.com',
          password: 'testpassword',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.tokens).toBeDefined();
    });

    it('should fail with wrong password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@test.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail with non-existent email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user with valid token', async () => {
      const user = await createTestUser({ email: 'me@test.com' });
      const token = generateTestToken(user._id.toString());

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('me@test.com');
    });

    it('should fail without token', async () => {
      const response = await request(app).get('/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const user = await createTestUser({ email: 'logout@test.com' });
      const token = generateTestToken(user._id.toString());

      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should fail without token', async () => {
      const response = await request(app).post('/auth/logout');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/change-password', () => {
    it('should change password successfully', async () => {
      const oldPassword = 'oldpassword123';
      // Pass the plain password - the User model pre-save hook will hash it
      const user = await createTestUser({
        email: 'changepass@test.com',
        passwordHash: oldPassword,
        oauthProvider: 'local',
      });
      const token = generateTestToken(user._id.toString());

      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: oldPassword,
          newPassword: 'newpassword456',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should fail with wrong current password', async () => {
      // Pass the plain password - the User model pre-save hook will hash it
      const user = await createTestUser({
        email: 'wrongcurrent@test.com',
        passwordHash: 'realpassword',
        oauthProvider: 'local',
      });
      const token = generateTestToken(user._id.toString());

      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword456',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
