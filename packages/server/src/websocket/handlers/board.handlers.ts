import { Server } from 'socket.io';
import { type AuthenticatedSocket } from '../index.js';
import { Board, Project } from '../../models/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Board-related WebSocket event handlers
 */
export function boardHandlers(io: Server, socket: AuthenticatedSocket): void {
  /**
   * Join a board room to receive real-time updates
   */
  socket.on('join:board', async (data: { boardId: string }) => {
    try {
      const { boardId } = data;

      // Verify board exists and user has access
      const board = await Board.findById(boardId);
      if (!board) {
        socket.emit('error', { message: 'Board not found' });
        return;
      }

      // Verify project access
      const project = await Project.findById(board.projectId);
      if (!project || !project.canView(socket.userId)) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      // Join the board room
      const roomName = `board:${boardId}`;
      socket.join(roomName);

      logger.debug(`User ${socket.userId} joined board ${boardId}`);

      // Notify others in the room
      socket.to(roomName).emit('presence:joined', {
        userId: socket.userId,
        roomId: roomName,
      });

      // Send current users in the room
      const sockets = await io.in(roomName).fetchSockets();
      const userIds = [...new Set(sockets.map((s) => (s as unknown as AuthenticatedSocket).userId))];

      socket.emit('presence:users', {
        roomId: roomName,
        users: userIds.map((id) => ({
          userId: id,
          status: 'online',
          lastSeen: new Date().toISOString(),
        })),
      });
    } catch (error) {
      logger.error('Error joining board:', error);
      socket.emit('error', { message: 'Failed to join board' });
    }
  });

  /**
   * Leave a board room
   */
  socket.on('leave:board', (data: { boardId: string }) => {
    const { boardId } = data;
    const roomName = `board:${boardId}`;

    socket.leave(roomName);
    logger.debug(`User ${socket.userId} left board ${boardId}`);

    // Notify others
    socket.to(roomName).emit('presence:left', {
      userId: socket.userId,
      roomId: roomName,
    });
  });

  /**
   * Join a project room
   */
  socket.on('join:project', async (data: { projectId: string }) => {
    try {
      const { projectId } = data;

      // Verify project access
      const project = await Project.findById(projectId);
      if (!project || !project.canView(socket.userId)) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      const roomName = `project:${projectId}`;
      socket.join(roomName);

      logger.debug(`User ${socket.userId} joined project ${projectId}`);
    } catch (error) {
      logger.error('Error joining project:', error);
      socket.emit('error', { message: 'Failed to join project' });
    }
  });

  /**
   * Leave a project room
   */
  socket.on('leave:project', (data: { projectId: string }) => {
    const { projectId } = data;
    socket.leave(`project:${projectId}`);
    logger.debug(`User ${socket.userId} left project ${projectId}`);
  });
}
