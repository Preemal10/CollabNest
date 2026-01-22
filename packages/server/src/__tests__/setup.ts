import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterEach, afterAll, vi } from 'vitest';

let mongoServer: MongoMemoryServer;

// Mock Redis BEFORE any imports - need to handle Redis.default constructor pattern
vi.mock('ioredis', () => {
  // Create a class that will be used as Redis.default
  class RedisMockClass {
    get = vi.fn().mockResolvedValue(null);
    set = vi.fn().mockResolvedValue('OK');
    del = vi.fn().mockResolvedValue(1);
    setex = vi.fn().mockResolvedValue('OK');
    incr = vi.fn().mockResolvedValue(1);
    expire = vi.fn().mockResolvedValue(1);
    keys = vi.fn().mockResolvedValue([]);
    quit = vi.fn().mockResolvedValue('OK');
    on = vi.fn().mockReturnThis();
    connect = vi.fn().mockResolvedValue(undefined);
    disconnect = vi.fn().mockResolvedValue(undefined);
  }

  return {
    default: {
      default: RedisMockClass,
    },
  };
});

// Mock websocket module
vi.mock('../websocket/index.js', () => ({
  getIO: vi.fn().mockReturnValue(null),
  initializeWebSocket: vi.fn(),
}));

// Mock websocket emitters
vi.mock('../websocket/emitters.js', () => ({
  emitTaskCreated: vi.fn(),
  emitTaskUpdated: vi.fn(),
  emitTaskMoved: vi.fn(),
  emitTaskDeleted: vi.fn(),
  emitColumnCreated: vi.fn(),
  emitColumnUpdated: vi.fn(),
  emitColumnDeleted: vi.fn(),
  emitCommentAdded: vi.fn(),
  emitCommentUpdated: vi.fn(),
  emitCommentDeleted: vi.fn(),
  emitNotification: vi.fn(),
}));

// Setup before all tests
beforeAll(async () => {
  // Create in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect to in-memory MongoDB
  await mongoose.connect(mongoUri);
});

// Cleanup after each test
afterEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Cleanup after all tests
afterAll(async () => {
  // Disconnect from MongoDB
  await mongoose.disconnect();
  
  // Stop in-memory MongoDB server
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Export for use in tests
export { mongoServer };
