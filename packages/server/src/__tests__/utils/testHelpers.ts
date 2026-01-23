import { User, Project, Board, Task, Organization } from '../../models/index.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Test data factory
export const createTestUser = async (overrides: Record<string, any> = {}) => {
  const defaultData = {
    name: 'Test User',
    email: `test${Date.now()}@example.com`,
    passwordHash: await bcrypt.hash('password123', 10),
    isEmailVerified: true,
  };

  const user = await User.create({ ...defaultData, ...overrides });
  return user;
};

export const createTestOrganization = async (ownerId: string, overrides: Record<string, any> = {}) => {
  const timestamp = Date.now();
  const defaultData = {
    name: `Test Org ${timestamp}`,
    slug: `test-org-${timestamp}`,
    members: [{ userId: ownerId, role: 'owner' }],
  };

  const org = await Organization.create({ ...defaultData, ...overrides });
  return org;
};

export const createTestProject = async (
  ownerId: string,
  organizationId?: string,
  overrides: Record<string, any> = {}
) => {
  const timestamp = Date.now();
  const defaultData = {
    name: `Test Project ${timestamp}`,
    key: `TP${timestamp}`.slice(0, 10),
    createdBy: ownerId,
    organizationId,
    members: [{ userId: ownerId, role: 'manager' }],
  };

  const project = await Project.create({ ...defaultData, ...overrides });
  return project;
};

export const createTestBoard = async (
  projectId: string,
  createdBy: string,
  overrides = {}
) => {
  const defaultData = {
    name: `Test Board ${Date.now()}`,
    projectId,
    createdBy,
    columns: [
      { _id: new mongoose.Types.ObjectId(), name: 'To Do', order: 0 },
      { _id: new mongoose.Types.ObjectId(), name: 'In Progress', order: 1 },
      { _id: new mongoose.Types.ObjectId(), name: 'Done', order: 2 },
    ],
  };

  const board = await Board.create({ ...defaultData, ...overrides });
  return board;
};

export const createTestTask = async (
  boardId: string,
  columnId: string,
  createdBy: string,
  overrides = {}
) => {
  const defaultData = {
    title: `Test Task ${Date.now()}`,
    boardId,
    columnId,
    createdBy,
    priority: 'medium',
    order: 0,
  };

  const task = await Task.create({ ...defaultData, ...overrides });
  return task;
};

// Generate test JWT token - uses same default secret as config/index.ts
export const generateTestToken = (userId: string, email: string = 'test@example.com'): string => {
  const secret = process.env.JWT_SECRET || 'dev-jwt-secret-minimum-32-characters-long';
  return jwt.sign({ userId, email }, secret, { expiresIn: '1h' });
};

// Generate test refresh token - uses same default secret as config/index.ts
export const generateTestRefreshToken = (userId: string): string => {
  const secret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-minimum-32-chars';
  return jwt.sign({ userId }, secret, { expiresIn: '7d' });
};

// Clean up test data
export const cleanupTestData = async () => {
  await User.deleteMany({});
  await Project.deleteMany({});
  await Board.deleteMany({});
  await Task.deleteMany({});
  await Organization.deleteMany({});
};
