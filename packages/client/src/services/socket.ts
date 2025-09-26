import { io, Socket } from 'socket.io-client';
import { store } from '@/store';
import {
  addTaskFromSocket,
  updateTaskFromSocket,
  moveTaskFromSocket,
  removeTaskFromSocket,
  addColumnFromSocket,
  updateColumnFromSocket,
  removeColumnFromSocket,
} from '@/features/boards/boardsSlice';

// Socket instance
let socket: Socket | null = null;

// Current subscribed board
let currentBoardId: string | null = null;

// Socket URL
const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

// Initialize socket connection
export function initializeSocket(): Socket {
  if (socket?.connected) {
    return socket;
  }

  const token = localStorage.getItem('accessToken');

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  // Connection events
  socket.on('connect', () => {
    console.log('[Socket] Connected');
    
    // Rejoin board if we were subscribed
    if (currentBoardId) {
      socket?.emit('join:board', { boardId: currentBoardId });
    }
  });

  socket.on('connect:success', (data) => {
    console.log('[Socket] Auth success:', data);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  // Task events
  socket.on('task:created', (task) => {
    store.dispatch(addTaskFromSocket(task));
  });

  socket.on('task:updated', ({ taskId, updates }) => {
    store.dispatch(updateTaskFromSocket({ taskId, updates }));
  });

  socket.on('task:moved', ({ taskId, toColumnId, order }) => {
    store.dispatch(moveTaskFromSocket({ taskId, toColumnId, order }));
  });

  socket.on('task:deleted', ({ taskId }) => {
    store.dispatch(removeTaskFromSocket(taskId));
  });

  // Board/Column events
  socket.on('board:column:created', ({ column }) => {
    store.dispatch(addColumnFromSocket(column));
  });

  socket.on('board:column:updated', ({ columnId, updates }) => {
    store.dispatch(updateColumnFromSocket({ columnId, updates }));
  });

  socket.on('board:column:deleted', ({ columnId }) => {
    store.dispatch(removeColumnFromSocket(columnId));
  });

  // Comment events
  socket.on('comment:created', ({ comment, taskId }) => {
    // Dispatch to comments state if needed
    console.log('[Socket] Comment created on task', taskId, comment);
  });

  // Notification events
  socket.on('notification:new', (notification) => {
    // Could dispatch to notifications state
    console.log('[Socket] New notification:', notification);
  });

  socket.on('notification:count', ({ unread }) => {
    console.log('[Socket] Unread notifications:', unread);
  });

  // Presence events
  socket.on('presence:joined', ({ userId, roomId }) => {
    console.log(`[Socket] User ${userId} joined ${roomId}`);
  });

  socket.on('presence:left', ({ userId, roomId }) => {
    console.log(`[Socket] User ${userId} left ${roomId}`);
  });

  socket.on('presence:users', ({ roomId, users }) => {
    console.log(`[Socket] Users in ${roomId}:`, users);
  });

  // Typing events
  socket.on('typing:users', ({ taskId, userIds }) => {
    console.log(`[Socket] Users typing on task ${taskId}:`, userIds);
  });

  return socket;
}

// Disconnect socket
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentBoardId = null;
  }
}

// Get socket instance
export function getSocket(): Socket | null {
  return socket;
}

// Check if connected
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

// Join a board room
export function joinBoard(boardId: string): void {
  if (!socket?.connected) {
    console.warn('[Socket] Not connected, cannot join board');
    return;
  }

  // Leave previous board if different
  if (currentBoardId && currentBoardId !== boardId) {
    socket.emit('leave:board', { boardId: currentBoardId });
  }

  socket.emit('join:board', { boardId });
  currentBoardId = boardId;
}

// Leave a board room
export function leaveBoard(boardId: string): void {
  if (socket?.connected) {
    socket.emit('leave:board', { boardId });
  }
  if (currentBoardId === boardId) {
    currentBoardId = null;
  }
}

// Join a project room
export function joinProject(projectId: string): void {
  if (socket?.connected) {
    socket.emit('join:project', { projectId });
  }
}

// Leave a project room
export function leaveProject(projectId: string): void {
  if (socket?.connected) {
    socket.emit('leave:project', { projectId });
  }
}

// Typing indicators
export function startTyping(taskId: string): void {
  if (socket?.connected) {
    socket.emit('typing:start', { taskId });
  }
}

export function stopTyping(taskId: string): void {
  if (socket?.connected) {
    socket.emit('typing:stop', { taskId });
  }
}

// Update presence
export function updatePresence(status: 'online' | 'away' | 'busy'): void {
  if (socket?.connected) {
    socket.emit('presence:update', { status });
  }
}

// Re-authenticate socket (after token refresh)
export function reauthenticateSocket(): void {
  const token = localStorage.getItem('accessToken');
  if (socket && token) {
    socket.auth = { token };
    socket.disconnect().connect();
  }
}

export default {
  initializeSocket,
  disconnectSocket,
  getSocket,
  isSocketConnected,
  joinBoard,
  leaveBoard,
  joinProject,
  leaveProject,
  startTyping,
  stopTyping,
  updatePresence,
  reauthenticateSocket,
};
