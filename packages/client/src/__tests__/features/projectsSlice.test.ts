import { describe, it, expect, beforeEach, vi } from 'vitest';
import projectsReducer, {
  fetchProjects,
  fetchProject,
  createProject,
  updateProject,
  deleteProject,
  clearError,
  setCurrentProject,
  openCreateModal,
  closeCreateModal,
} from '@/features/projects/projectsSlice';
import { configureStore } from '@reduxjs/toolkit';
import { mockUser, mockProject } from '../utils/testUtils';

// Mock the api module
vi.mock('@/services/api', () => ({
  projectsApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock project with members (as returned from API)
const mockProjectWithMembers = {
  _id: 'project-123',
  name: 'Test Project',
  key: 'TP',
  description: 'A test project',
  color: '#3b82f6',
  icon: 'folder',
  organizationId: 'org-123',
  visibility: 'private' as const,
  status: 'active' as const,
  members: [
    {
      userId: { _id: mockUser._id, name: mockUser.name, email: mockUser.email },
      role: 'owner',
      joinedAt: new Date().toISOString(),
    },
  ],
  createdBy: { _id: mockUser._id, name: mockUser.name, email: mockUser.email },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockProjectWithMembers2 = {
  ...mockProjectWithMembers,
  _id: 'project-456',
  name: 'Second Project',
  key: 'SP',
};

describe('projectsSlice', () => {
  // Initial state matches the actual slice
  const initialState = {
    projects: [],
    currentProject: null,
    isLoading: false,
    error: null,
    isCreateModalOpen: false,
  };

  describe('reducers', () => {
    it('should return initial state', () => {
      const result = projectsReducer(undefined, { type: 'unknown' });
      expect(result).toEqual(initialState);
    });

    it('should handle clearError', () => {
      const stateWithError = {
        ...initialState,
        error: 'Some error message',
      };

      const result = projectsReducer(stateWithError, clearError());
      expect(result.error).toBeNull();
    });

    it('should handle setCurrentProject', () => {
      const result = projectsReducer(initialState, setCurrentProject(mockProjectWithMembers));
      
      expect(result.currentProject).toEqual(mockProjectWithMembers);
    });

    it('should handle setCurrentProject with null', () => {
      const stateWithProject = {
        ...initialState,
        currentProject: mockProjectWithMembers,
      };

      const result = projectsReducer(stateWithProject, setCurrentProject(null));
      expect(result.currentProject).toBeNull();
    });

    it('should handle openCreateModal', () => {
      const result = projectsReducer(initialState, openCreateModal());
      
      expect(result.isCreateModalOpen).toBe(true);
    });

    it('should handle closeCreateModal', () => {
      const openState = {
        ...initialState,
        isCreateModalOpen: true,
      };

      const result = projectsReducer(openState, closeCreateModal());
      expect(result.isCreateModalOpen).toBe(false);
    });
  });

  describe('async thunks', () => {
    let store: ReturnType<typeof configureStore>;

    beforeEach(() => {
      store = configureStore({
        reducer: {
          projects: projectsReducer,
        },
      });
      vi.clearAllMocks();
    });

    describe('fetchProjects', () => {
      it('should set loading state when pending', () => {
        store.dispatch({ type: fetchProjects.pending.type });
        
        const state = store.getState().projects;
        expect(state.isLoading).toBe(true);
        expect(state.error).toBeNull();
      });

      it('should set projects when fulfilled', () => {
        const projects = [mockProjectWithMembers, mockProjectWithMembers2];

        store.dispatch({
          type: fetchProjects.fulfilled.type,
          payload: projects,
        });
        
        const state = store.getState().projects;
        expect(state.isLoading).toBe(false);
        expect(state.projects).toEqual(projects);
        expect(state.projects).toHaveLength(2);
      });

      it('should set error when rejected', () => {
        store.dispatch({
          type: fetchProjects.rejected.type,
          payload: 'Failed to fetch projects',
        });
        
        const state = store.getState().projects;
        expect(state.isLoading).toBe(false);
        expect(state.error).toBe('Failed to fetch projects');
      });
    });

    describe('fetchProject', () => {
      it('should set loading state when pending', () => {
        store.dispatch({ type: fetchProject.pending.type });
        
        const state = store.getState().projects;
        expect(state.isLoading).toBe(true);
        expect(state.error).toBeNull();
      });

      it('should set currentProject when fulfilled', () => {
        store.dispatch({
          type: fetchProject.fulfilled.type,
          payload: mockProjectWithMembers,
        });
        
        const state = store.getState().projects;
        expect(state.isLoading).toBe(false);
        expect(state.currentProject).toEqual(mockProjectWithMembers);
      });

      it('should set error when rejected', () => {
        store.dispatch({
          type: fetchProject.rejected.type,
          payload: 'Failed to fetch project',
        });
        
        const state = store.getState().projects;
        expect(state.isLoading).toBe(false);
        expect(state.error).toBe('Failed to fetch project');
      });
    });

    describe('createProject', () => {
      it('should clear error when pending', () => {
        const stateWithError = {
          projects: [],
          currentProject: null,
          isLoading: false,
          error: 'Previous error',
          isCreateModalOpen: true,
        };

        store = configureStore({
          reducer: { projects: projectsReducer },
          preloadedState: { projects: stateWithError },
        });

        store.dispatch({ type: createProject.pending.type });
        
        const state = store.getState().projects;
        expect(state.error).toBeNull();
      });

      it('should add project to list and close modal when fulfilled', () => {
        const stateWithModalOpen = {
          projects: [mockProjectWithMembers2],
          currentProject: null,
          isLoading: false,
          error: null,
          isCreateModalOpen: true,
        };

        store = configureStore({
          reducer: { projects: projectsReducer },
          preloadedState: { projects: stateWithModalOpen },
        });

        store.dispatch({
          type: createProject.fulfilled.type,
          payload: mockProjectWithMembers,
        });
        
        const state = store.getState().projects;
        expect(state.projects).toHaveLength(2);
        // New project should be at the beginning (unshift)
        expect(state.projects[0]).toEqual(mockProjectWithMembers);
        expect(state.isCreateModalOpen).toBe(false);
      });

      it('should set error when rejected', () => {
        store.dispatch({
          type: createProject.rejected.type,
          payload: 'Failed to create project',
        });
        
        const state = store.getState().projects;
        expect(state.error).toBe('Failed to create project');
      });
    });

    describe('updateProject', () => {
      it('should update project in list when fulfilled', () => {
        const existingProjects = [mockProjectWithMembers, mockProjectWithMembers2];
        
        store = configureStore({
          reducer: { projects: projectsReducer },
          preloadedState: {
            projects: {
              projects: existingProjects,
              currentProject: null,
              isLoading: false,
              error: null,
              isCreateModalOpen: false,
            },
          },
        });

        const updatedProject = {
          ...mockProjectWithMembers,
          name: 'Updated Project Name',
        };

        store.dispatch({
          type: updateProject.fulfilled.type,
          payload: updatedProject,
        });
        
        const state = store.getState().projects;
        const project = state.projects.find(p => p._id === mockProjectWithMembers._id);
        expect(project?.name).toBe('Updated Project Name');
      });

      it('should update currentProject when it matches', () => {
        store = configureStore({
          reducer: { projects: projectsReducer },
          preloadedState: {
            projects: {
              projects: [mockProjectWithMembers],
              currentProject: mockProjectWithMembers,
              isLoading: false,
              error: null,
              isCreateModalOpen: false,
            },
          },
        });

        const updatedProject = {
          ...mockProjectWithMembers,
          description: 'Updated description',
        };

        store.dispatch({
          type: updateProject.fulfilled.type,
          payload: updatedProject,
        });
        
        const state = store.getState().projects;
        expect(state.currentProject?.description).toBe('Updated description');
      });

      it('should not update currentProject when it does not match', () => {
        store = configureStore({
          reducer: { projects: projectsReducer },
          preloadedState: {
            projects: {
              projects: [mockProjectWithMembers, mockProjectWithMembers2],
              currentProject: mockProjectWithMembers2,
              isLoading: false,
              error: null,
              isCreateModalOpen: false,
            },
          },
        });

        const updatedProject = {
          ...mockProjectWithMembers,
          name: 'Updated Name',
        };

        store.dispatch({
          type: updateProject.fulfilled.type,
          payload: updatedProject,
        });
        
        const state = store.getState().projects;
        // currentProject should remain unchanged
        expect(state.currentProject?._id).toBe(mockProjectWithMembers2._id);
        expect(state.currentProject?.name).toBe('Second Project');
      });

      it('should set error when rejected', () => {
        store.dispatch({
          type: updateProject.rejected.type,
          payload: 'Failed to update project',
        });
        
        const state = store.getState().projects;
        expect(state.error).toBe('Failed to update project');
      });
    });

    describe('deleteProject', () => {
      it('should remove project from list when fulfilled', () => {
        const existingProjects = [mockProjectWithMembers, mockProjectWithMembers2];
        
        store = configureStore({
          reducer: { projects: projectsReducer },
          preloadedState: {
            projects: {
              projects: existingProjects,
              currentProject: null,
              isLoading: false,
              error: null,
              isCreateModalOpen: false,
            },
          },
        });

        store.dispatch({
          type: deleteProject.fulfilled.type,
          payload: mockProjectWithMembers._id,
        });
        
        const state = store.getState().projects;
        expect(state.projects).toHaveLength(1);
        expect(state.projects[0]._id).toBe(mockProjectWithMembers2._id);
      });

      it('should clear currentProject when deleted project matches', () => {
        store = configureStore({
          reducer: { projects: projectsReducer },
          preloadedState: {
            projects: {
              projects: [mockProjectWithMembers],
              currentProject: mockProjectWithMembers,
              isLoading: false,
              error: null,
              isCreateModalOpen: false,
            },
          },
        });

        store.dispatch({
          type: deleteProject.fulfilled.type,
          payload: mockProjectWithMembers._id,
        });
        
        const state = store.getState().projects;
        expect(state.currentProject).toBeNull();
      });

      it('should not clear currentProject when deleted project does not match', () => {
        store = configureStore({
          reducer: { projects: projectsReducer },
          preloadedState: {
            projects: {
              projects: [mockProjectWithMembers, mockProjectWithMembers2],
              currentProject: mockProjectWithMembers2,
              isLoading: false,
              error: null,
              isCreateModalOpen: false,
            },
          },
        });

        store.dispatch({
          type: deleteProject.fulfilled.type,
          payload: mockProjectWithMembers._id,
        });
        
        const state = store.getState().projects;
        expect(state.currentProject?._id).toBe(mockProjectWithMembers2._id);
      });

      it('should set error when rejected', () => {
        store.dispatch({
          type: deleteProject.rejected.type,
          payload: 'Failed to delete project',
        });
        
        const state = store.getState().projects;
        expect(state.error).toBe('Failed to delete project');
      });
    });
  });

  describe('selectors', () => {
    it('should select projects from state', () => {
      const projects = [mockProjectWithMembers, mockProjectWithMembers2];
      const state = {
        projects: {
          projects,
          currentProject: null,
          isLoading: false,
          error: null,
          isCreateModalOpen: false,
        },
      };

      expect(state.projects.projects).toEqual(projects);
      expect(state.projects.projects).toHaveLength(2);
    });

    it('should select currentProject from state', () => {
      const state = {
        projects: {
          projects: [mockProjectWithMembers],
          currentProject: mockProjectWithMembers,
          isLoading: false,
          error: null,
          isCreateModalOpen: false,
        },
      };

      expect(state.projects.currentProject).toEqual(mockProjectWithMembers);
    });

    it('should select isLoading from state', () => {
      const state = {
        projects: {
          projects: [],
          currentProject: null,
          isLoading: true,
          error: null,
          isCreateModalOpen: false,
        },
      };

      expect(state.projects.isLoading).toBe(true);
    });

    it('should select error from state', () => {
      const state = {
        projects: {
          projects: [],
          currentProject: null,
          isLoading: false,
          error: 'Something went wrong',
          isCreateModalOpen: false,
        },
      };

      expect(state.projects.error).toBe('Something went wrong');
    });

    it('should select isCreateModalOpen from state', () => {
      const state = {
        projects: {
          projects: [],
          currentProject: null,
          isLoading: false,
          error: null,
          isCreateModalOpen: true,
        },
      };

      expect(state.projects.isCreateModalOpen).toBe(true);
    });
  });

  describe('project members', () => {
    it('should handle projects with populated member data', () => {
      const result = projectsReducer(initialState, setCurrentProject(mockProjectWithMembers));
      
      expect(result.currentProject?.members).toHaveLength(1);
      expect(result.currentProject?.members[0].role).toBe('owner');
      expect(typeof result.currentProject?.members[0].userId).toBe('object');
    });

    it('should handle projects with string userId references', () => {
      const projectWithStringIds = {
        ...mockProjectWithMembers,
        members: [
          {
            userId: 'user-123',
            role: 'owner',
            joinedAt: new Date().toISOString(),
          },
        ],
      };

      const result = projectsReducer(initialState, setCurrentProject(projectWithStringIds));
      
      expect(result.currentProject?.members).toHaveLength(1);
      expect(result.currentProject?.members[0].userId).toBe('user-123');
    });
  });

  describe('project status and visibility', () => {
    it('should handle different project statuses', () => {
      const archivedProject = {
        ...mockProjectWithMembers,
        status: 'archived' as const,
      };

      const result = projectsReducer(initialState, setCurrentProject(archivedProject));
      expect(result.currentProject?.status).toBe('archived');
    });

    it('should handle different visibility settings', () => {
      const publicProject = {
        ...mockProjectWithMembers,
        visibility: 'public' as const,
      };

      const result = projectsReducer(initialState, setCurrentProject(publicProject));
      expect(result.currentProject?.visibility).toBe('public');
    });
  });
});
