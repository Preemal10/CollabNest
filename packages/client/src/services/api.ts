import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type { 
  PublicUser, 
  AuthTokens, 
  CreateUserPayload, 
  LoginUserPayload,
  Organization,
  CreateOrganizationPayload,
  Project,
  CreateProjectPayload,
  UpdateProjectPayload,
  Board,
  CreateBoardPayload,
  Task,
  CreateTaskPayload,
  UpdateTaskPayload,
  MoveTaskPayload,
  Comment,
} from '@collabnest/shared';

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error: { message: string } }>) => {
    const originalRequest = error.config;
    
    // Handle 401 errors (token expired)
    if (error.response?.status === 401 && originalRequest) {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken) {
        try {
          // Attempt to refresh token
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          
          const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
          
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          
          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch {
          // Refresh failed, clear tokens
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }
    
    // Extract error message
    const message = error.response?.data?.error?.message || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

// API response types
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface AuthResponse {
  user: PublicUser;
  tokens: AuthTokens;
}

// Auth API
export const authApi = {
  async register(payload: CreateUserPayload): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', payload);
    return response.data.data;
  },

  async login(payload: LoginUserPayload): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', payload);
    return response.data.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async refresh(refreshToken: string): Promise<{ tokens: AuthTokens }> {
    const response = await api.post<ApiResponse<{ tokens: AuthTokens }>>('/auth/refresh', {
      refreshToken,
    });
    return response.data.data;
  },

  async me(): Promise<{ user: PublicUser }> {
    const response = await api.get<ApiResponse<{ user: PublicUser }>>('/auth/me');
    return response.data.data;
  },
};

// Organizations API
export const organizationsApi = {
  async list(): Promise<{ organizations: Organization[] }> {
    const response = await api.get<ApiResponse<{ organizations: Organization[] }>>('/organizations');
    return response.data.data;
  },

  async get(id: string): Promise<{ organization: Organization }> {
    const response = await api.get<ApiResponse<{ organization: Organization }>>(`/organizations/${id}`);
    return response.data.data;
  },

  async create(payload: CreateOrganizationPayload): Promise<{ organization: Organization }> {
    const response = await api.post<ApiResponse<{ organization: Organization }>>('/organizations', payload);
    return response.data.data;
  },
};

// Projects API
export const projectsApi = {
  async list(organizationId?: string): Promise<{ projects: Project[] }> {
    const params = organizationId ? { organizationId } : {};
    const response = await api.get<ApiResponse<{ projects: Project[] }>>('/projects', { params });
    return response.data.data;
  },

  async get(id: string): Promise<{ project: Project }> {
    const response = await api.get<ApiResponse<{ project: Project }>>(`/projects/${id}`);
    return response.data.data;
  },

  async create(payload: CreateProjectPayload): Promise<{ project: Project }> {
    const response = await api.post<ApiResponse<{ project: Project }>>('/projects', payload);
    return response.data.data;
  },

  async update(id: string, payload: UpdateProjectPayload): Promise<{ project: Project }> {
    const response = await api.put<ApiResponse<{ project: Project }>>(`/projects/${id}`, payload);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
  },
};

// Boards API
export const boardsApi = {
  async listByProject(projectId: string): Promise<{ boards: Board[] }> {
    const response = await api.get<ApiResponse<{ boards: Board[] }>>(`/boards/project/${projectId}`);
    return response.data.data;
  },

  async get(id: string): Promise<{ board: Board }> {
    const response = await api.get<ApiResponse<{ board: Board }>>(`/boards/${id}`);
    return response.data.data;
  },

  async create(payload: CreateBoardPayload): Promise<{ board: Board }> {
    const response = await api.post<ApiResponse<{ board: Board }>>('/boards', payload);
    return response.data.data;
  },

  async addColumn(boardId: string, payload: { name: string; color?: string }): Promise<{ board: Board }> {
    const response = await api.post<ApiResponse<{ board: Board }>>(`/boards/${boardId}/columns`, payload);
    return response.data.data;
  },

  async updateColumn(boardId: string, columnId: string, payload: { name?: string; color?: string }): Promise<{ board: Board }> {
    const response = await api.put<ApiResponse<{ board: Board }>>(`/boards/${boardId}/columns/${columnId}`, payload);
    return response.data.data;
  },

  async deleteColumn(boardId: string, columnId: string): Promise<{ board: Board }> {
    const response = await api.delete<ApiResponse<{ board: Board }>>(`/boards/${boardId}/columns/${columnId}`);
    return response.data.data;
  },

  async reorderColumns(boardId: string, columnIds: string[]): Promise<{ board: Board }> {
    const response = await api.put<ApiResponse<{ board: Board }>>(`/boards/${boardId}/columns/reorder`, { columnIds });
    return response.data.data;
  },
};

// Tasks API
export const tasksApi = {
  async listByBoard(boardId: string): Promise<{ tasks: Task[] }> {
    const response = await api.get<ApiResponse<{ tasks: Task[] }>>(`/tasks/board/${boardId}`);
    return response.data.data;
  },

  async get(id: string): Promise<{ task: Task }> {
    const response = await api.get<ApiResponse<{ task: Task }>>(`/tasks/${id}`);
    return response.data.data;
  },

  async create(payload: CreateTaskPayload): Promise<{ task: Task }> {
    const response = await api.post<ApiResponse<{ task: Task }>>('/tasks', payload);
    return response.data.data;
  },

  async update(id: string, payload: UpdateTaskPayload): Promise<{ task: Task }> {
    const response = await api.put<ApiResponse<{ task: Task }>>(`/tasks/${id}`, payload);
    return response.data.data;
  },

  async move(id: string, payload: MoveTaskPayload): Promise<{ task: Task }> {
    const response = await api.put<ApiResponse<{ task: Task }>>(`/tasks/${id}/move`, payload);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/tasks/${id}`);
  },

  async addLabel(id: string, payload: { name: string; color: string }): Promise<{ task: Task }> {
    const response = await api.post<ApiResponse<{ task: Task }>>(`/tasks/${id}/labels`, payload);
    return response.data.data;
  },

  async removeLabel(id: string, labelId: string): Promise<{ task: Task }> {
    const response = await api.delete<ApiResponse<{ task: Task }>>(`/tasks/${id}/labels/${labelId}`);
    return response.data.data;
  },

  async addChecklistItem(id: string, payload: { text: string }): Promise<{ task: Task }> {
    const response = await api.post<ApiResponse<{ task: Task }>>(`/tasks/${id}/checklist`, payload);
    return response.data.data;
  },

  async updateChecklistItem(id: string, itemId: string, payload: { text?: string; isCompleted?: boolean }): Promise<{ task: Task }> {
    const response = await api.put<ApiResponse<{ task: Task }>>(`/tasks/${id}/checklist/${itemId}`, payload);
    return response.data.data;
  },

  async deleteChecklistItem(id: string, itemId: string): Promise<{ task: Task }> {
    const response = await api.delete<ApiResponse<{ task: Task }>>(`/tasks/${id}/checklist/${itemId}`);
    return response.data.data;
  },

  async getMyTasks(): Promise<{ tasks: Task[] }> {
    const response = await api.get<ApiResponse<{ tasks: Task[] }>>('/tasks/assigned/me');
    return response.data.data;
  },
};

// Comments API
export const commentsApi = {
  async listByTask(taskId: string): Promise<{ comments: Comment[] }> {
    const response = await api.get<ApiResponse<{ comments: Comment[] }>>(`/comments/task/${taskId}`);
    return response.data.data;
  },

  async create(payload: { taskId: string; content: string; mentions?: string[] }): Promise<{ comment: Comment }> {
    const response = await api.post<ApiResponse<{ comment: Comment }>>('/comments', payload);
    return response.data.data;
  },

  async update(id: string, payload: { content: string; mentions?: string[] }): Promise<{ comment: Comment }> {
    const response = await api.put<ApiResponse<{ comment: Comment }>>(`/comments/${id}`, payload);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/comments/${id}`);
  },
};

// Activity type (simplified for client use)
interface Activity {
  _id: string;
  type: string;
  entityType: string;
  entityId: string;
  projectId?: string;
  boardId?: string;
  taskId?: string;
  userId: { _id: string; name: string; email: string; avatar?: string } | string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// Activities API
export const activitiesApi = {
  async getMyActivities(limit = 20): Promise<{ activities: Activity[] }> {
    const response = await api.get<ApiResponse<{ activities: Activity[] }>>(`/activities/me?limit=${limit}`);
    return response.data.data;
  },

  async getByProject(projectId: string, limit = 20): Promise<{ activities: Activity[] }> {
    const response = await api.get<ApiResponse<{ activities: Activity[] }>>(`/activities/project/${projectId}?limit=${limit}`);
    return response.data.data;
  },

  async getByBoard(boardId: string, limit = 20): Promise<{ activities: Activity[] }> {
    const response = await api.get<ApiResponse<{ activities: Activity[] }>>(`/activities/board/${boardId}?limit=${limit}`);
    return response.data.data;
  },

  async getByTask(taskId: string, limit = 20): Promise<{ activities: Activity[] }> {
    const response = await api.get<ApiResponse<{ activities: Activity[] }>>(`/activities/task/${taskId}?limit=${limit}`);
    return response.data.data;
  },
};

// Attachments API
export const attachmentsApi = {
  async listByTask(taskId: string): Promise<{ attachments: Attachment[] }> {
    const response = await api.get<ApiResponse<{ attachments: Attachment[] }>>(`/attachments/task/${taskId}`);
    return response.data.data;
  },

  async upload(taskId: string, file: File): Promise<{ attachment: Attachment }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ApiResponse<{ attachment: Attachment }>>(`/attachments/task/${taskId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  async get(id: string): Promise<{ attachment: Attachment }> {
    const response = await api.get<ApiResponse<{ attachment: Attachment }>>(`/attachments/${id}`);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/attachments/${id}`);
  },

  getDownloadUrl(id: string): string {
    const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
    return `${baseUrl}/attachments/${id}/download`;
  },
};

// Attachment type (simplified for client use)
interface Attachment {
  _id: string;
  taskId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: { _id: string; name: string; email: string; avatar?: string } | string;
  createdAt: string;
}

// Notifications API
export const notificationsApi = {
  async list(): Promise<{ notifications: Notification[] }> {
    const response = await api.get<ApiResponse<{ notifications: Notification[] }>>('/notifications');
    return response.data.data;
  },

  async getUnread(): Promise<{ notifications: Notification[] }> {
    const response = await api.get<ApiResponse<{ notifications: Notification[] }>>('/notifications/unread');
    return response.data.data;
  },

  async getUnreadCount(): Promise<{ count: number }> {
    const response = await api.get<ApiResponse<{ count: number }>>('/notifications/count');
    return response.data.data;
  },

  async markAsRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await api.patch('/notifications/read-all');
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },
};

// Notification type (simplified for client use)
interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  userId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// Export api instance for other services
export default api;
