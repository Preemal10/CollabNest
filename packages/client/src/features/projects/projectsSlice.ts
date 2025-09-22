import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { UpdateProjectPayload } from '@collabnest/shared';
import { projectsApi } from '@/services/api';

// Project from API (with populated fields)
interface ProjectWithMembers {
  _id: string;
  name: string;
  key: string;
  description?: string;
  color?: string;
  icon?: string;
  organizationId: string;
  visibility: 'private' | 'organization' | 'public';
  status: 'active' | 'archived' | 'completed';
  members: Array<{
    userId: { _id: string; name: string; email: string; avatar?: string } | string;
    role: string;
    joinedAt: string;
  }>;
  createdBy?: { _id: string; name: string; email: string; avatar?: string };
  createdAt: string;
  updatedAt: string;
}

// Projects state interface
interface ProjectsState {
  projects: ProjectWithMembers[];
  currentProject: ProjectWithMembers | null;
  isLoading: boolean;
  error: string | null;
  isCreateModalOpen: boolean;
}

// Initial state
const initialState: ProjectsState = {
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,
  isCreateModalOpen: false,
};

// Async thunks
export const fetchProjects = createAsyncThunk(
  'projects/fetchAll',
  async (organizationId: string | undefined, { rejectWithValue }) => {
    try {
      const response = await projectsApi.list(organizationId);
      return response.projects as unknown as ProjectWithMembers[];
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch projects');
    }
  }
);

export const fetchProject = createAsyncThunk(
  'projects/fetchOne',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const response = await projectsApi.get(projectId);
      return response.project as unknown as ProjectWithMembers;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch project');
    }
  }
);

export const createProject = createAsyncThunk(
  'projects/create',
  async (payload: { name: string; description?: string; organizationId?: string }, { rejectWithValue }) => {
    try {
      const response = await projectsApi.create({
        name: payload.name,
        description: payload.description,
        organizationId: payload.organizationId,
        visibility: 'private',
      });
      return response.project as unknown as ProjectWithMembers;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create project');
    }
  }
);

export const updateProject = createAsyncThunk(
  'projects/update',
  async ({ id, payload }: { id: string; payload: UpdateProjectPayload }, { rejectWithValue }) => {
    try {
      const response = await projectsApi.update(id, payload);
      return response.project as unknown as ProjectWithMembers;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update project');
    }
  }
);

export const deleteProject = createAsyncThunk(
  'projects/delete',
  async (projectId: string, { rejectWithValue }) => {
    try {
      await projectsApi.delete(projectId);
      return projectId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete project');
    }
  }
);

// Projects slice
const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    setCurrentProject(state, action: PayloadAction<ProjectWithMembers | null>) {
      state.currentProject = action.payload;
    },
    openCreateModal(state) {
      state.isCreateModalOpen = true;
    },
    closeCreateModal(state) {
      state.isCreateModalOpen = false;
    },
  },
  extraReducers: (builder) => {
    // Fetch all projects
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.isLoading = false;
        state.projects = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch single project
    builder
      .addCase(fetchProject.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProject.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentProject = action.payload;
      })
      .addCase(fetchProject.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create project
    builder
      .addCase(createProject.pending, (state) => {
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.projects.unshift(action.payload);
        state.isCreateModalOpen = false;
      })
      .addCase(createProject.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Update project
    builder
      .addCase(updateProject.fulfilled, (state, action) => {
        const index = state.projects.findIndex(p => p._id === action.payload._id);
        if (index !== -1) {
          state.projects[index] = action.payload;
        }
        if (state.currentProject?._id === action.payload._id) {
          state.currentProject = action.payload;
        }
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Delete project
    builder
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.projects = state.projects.filter(p => p._id !== action.payload);
        if (state.currentProject?._id === action.payload) {
          state.currentProject = null;
        }
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setCurrentProject, openCreateModal, closeCreateModal } = projectsSlice.actions;
export default projectsSlice.reducer;
