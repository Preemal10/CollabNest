import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config, corsOrigins } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { User } from '../models/index.js';
import type { ClientEvents, ServerEvents, RoomType } from '@collabnest/shared';

// Extended socket with user data
export interface AuthenticatedSocket extends Socket {
  userId: string;
  userName: string;
  userEmail: string;
}

// Connected users map for presence
const connectedUsers = new Map<string, Set<string>>(); // roomId -> Set<userId>
const userSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>

// Initialize Socket.io server
export function initializeWebSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, config.JWT_SECRET) as { sub: string };

      // Get user from database
      const user = await User.findById(decoded.sub);
      if (!user) {
        return next(new Error('User not found'));
      }

      // Attach user info to socket
      (socket as AuthenticatedSocket).userId = user._id.toString();
      (socket as AuthenticatedSocket).userName = user.name;
      (socket as AuthenticatedSocket).userEmail = user.email;

      next();
    } catch (error) {
      logger.error('Socket authentication failed:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const userId = authSocket.userId;

    logger.info(`User connected: ${userId} (socket: ${socket.id})`);

    // Track user socket
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Send connection success
    socket.emit('connect:success', {
      userId,
      connectedAt: new Date().toISOString(),
    });

    // Join user's personal room for notifications
    socket.join(`user:${userId}`);

    // === Room Management ===
    socket.on('join:board', async ({ boardId }: ClientEvents['join:board']) => {
      const roomId = `board:${boardId}`;
      socket.join(roomId);

      // Track presence
      if (!connectedUsers.has(roomId)) {
        connectedUsers.set(roomId, new Set());
      }
      connectedUsers.get(roomId)!.add(userId);

      // Notify others in the room
      socket.to(roomId).emit('presence:joined', { userId, roomId });

      // Send current users in room
      const usersInRoom = Array.from(connectedUsers.get(roomId) || []);
      socket.emit('presence:users', {
        roomId,
        users: usersInRoom.map(uid => ({
          userId: uid,
          status: 'online' as const,
          lastSeen: new Date().toISOString(),
        })),
      });

      logger.debug(`User ${userId} joined board ${boardId}`);
    });

    socket.on('leave:board', ({ boardId }: ClientEvents['leave:board']) => {
      const roomId = `board:${boardId}`;
      socket.leave(roomId);

      // Update presence
      const roomUsers = connectedUsers.get(roomId);
      if (roomUsers) {
        roomUsers.delete(userId);
        if (roomUsers.size === 0) {
          connectedUsers.delete(roomId);
        }
      }

      // Notify others
      socket.to(roomId).emit('presence:left', { userId, roomId });

      logger.debug(`User ${userId} left board ${boardId}`);
    });

    socket.on('join:project', ({ projectId }: ClientEvents['join:project']) => {
      const roomId = `project:${projectId}`;
      socket.join(roomId);
      logger.debug(`User ${userId} joined project ${projectId}`);
    });

    socket.on('leave:project', ({ projectId }: ClientEvents['leave:project']) => {
      const roomId = `project:${projectId}`;
      socket.leave(roomId);
      logger.debug(`User ${userId} left project ${projectId}`);
    });

    // === Typing Indicators ===
    const typingTimers = new Map<string, NodeJS.Timeout>();

    socket.on('typing:start', ({ taskId }: ClientEvents['typing:start']) => {
      const rooms = Array.from(socket.rooms).filter(r => r.startsWith('board:'));
      
      rooms.forEach(roomId => {
        socket.to(roomId).emit('typing:users', {
          taskId,
          userIds: [userId],
        });
      });

      // Auto-clear typing after 5 seconds
      const timerKey = `${userId}:${taskId}`;
      if (typingTimers.has(timerKey)) {
        clearTimeout(typingTimers.get(timerKey)!);
      }
      typingTimers.set(timerKey, setTimeout(() => {
        rooms.forEach(roomId => {
          socket.to(roomId).emit('typing:users', {
            taskId,
            userIds: [],
          });
        });
        typingTimers.delete(timerKey);
      }, 5000));
    });

    socket.on('typing:stop', ({ taskId }: ClientEvents['typing:stop']) => {
      const rooms = Array.from(socket.rooms).filter(r => r.startsWith('board:'));
      
      rooms.forEach(roomId => {
        socket.to(roomId).emit('typing:users', {
          taskId,
          userIds: [],
        });
      });

      const timerKey = `${userId}:${taskId}`;
      if (typingTimers.has(timerKey)) {
        clearTimeout(typingTimers.get(timerKey)!);
        typingTimers.delete(timerKey);
      }
    });

    // === Presence Updates ===
    socket.on('presence:update', ({ status }: ClientEvents['presence:update']) => {
      // Broadcast to all rooms user is in
      const rooms = Array.from(socket.rooms);
      rooms.forEach(roomId => {
        if (roomId !== socket.id) {
          socket.to(roomId).emit('presence:users', {
            roomId,
            users: [{
              userId,
              status,
              lastSeen: new Date().toISOString(),
            }],
          });
        }
      });
    });

    // === Disconnect ===
    socket.on('disconnect', (reason) => {
      logger.info(`User disconnected: ${userId} (${reason})`);

      // Remove from user sockets
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }

      // Remove from all rooms and notify
      connectedUsers.forEach((users, roomId) => {
        if (users.has(userId)) {
          // Only remove if no other sockets for this user
          if (!userSockets.has(userId)) {
            users.delete(userId);
            io.to(roomId).emit('presence:left', { userId, roomId });
          }
        }
      });

      // Clear typing timers
      typingTimers.forEach((timer, key) => {
        if (key.startsWith(userId)) {
          clearTimeout(timer);
        }
      });
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${userId}:`, error);
    });
  });

  logger.info('WebSocket server initialized');

  return io;
}

// Helper to get Socket.io instance
let ioInstance: Server | null = null;

export function setSocketInstance(io: Server): void {
  ioInstance = io;
}

export function getSocketInstance(): Server | null {
  return ioInstance;
}

// Emit to a specific room
export function emitToRoom(roomType: RoomType, roomId: string, event: string, data: unknown): void {
  if (ioInstance) {
    ioInstance.to(`${roomType}:${roomId}`).emit(event, data);
  }
}

// Emit to a specific user
export function emitToUser(userId: string, event: string, data: unknown): void {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit(event, data);
  }
}

// Emit to all sockets in a board room
export function emitToBoard(boardId: string, event: keyof ServerEvents, data: unknown): void {
  emitToRoom('board', boardId, event, data);
}

// Emit to all sockets in a project room
export function emitToProject(projectId: string, event: keyof ServerEvents, data: unknown): void {
  emitToRoom('project', projectId, event, data);
}
