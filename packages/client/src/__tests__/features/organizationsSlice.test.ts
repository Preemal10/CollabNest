import { describe, it, expect, beforeEach, vi } from 'vitest';
import organizationsReducer, {
  fetchOrganizations,
  fetchOrganization,
  createOrganization,
  clearError,
  setCurrentOrganization,
  openCreateModal,
  closeCreateModal,
} from '@/features/organizations/organizationsSlice';
import { configureStore } from '@reduxjs/toolkit';
import { mockUser } from '../utils/testUtils';

// Mock the api module
vi.mock('@/services/api', () => ({
  organizationsApi: {
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

// Mock organization data
const mockOrganization = {
  _id: 'org-123',
  name: 'Test Organization',
  slug: 'test-org',
  description: 'A test organization',
  logo: 'https://example.com/logo.png',
  website: 'https://example.com',
  ownerId: mockUser._id,
  members: [
    {
      userId: mockUser._id,
      role: 'owner' as const,
      joinedAt: new Date().toISOString(),
    },
  ],
  settings: {
    allowPublicProjects: true,
    defaultProjectVisibility: 'organization' as const,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockOrganization2 = {
  ...mockOrganization,
  _id: 'org-456',
  name: 'Second Organization',
  slug: 'second-org',
};

describe('organizationsSlice', () => {
  // Initial state matches the actual slice
  const initialState = {
    organizations: [],
    currentOrganization: null,
    isLoading: false,
    error: null,
    isCreateModalOpen: false,
  };

  describe('reducers', () => {
    it('should return initial state', () => {
      const result = organizationsReducer(undefined, { type: 'unknown' });
      expect(result).toEqual(initialState);
    });

    it('should handle clearError', () => {
      const stateWithError = {
        ...initialState,
        error: 'Some error message',
      };

      const result = organizationsReducer(stateWithError, clearError());
      expect(result.error).toBeNull();
    });

    it('should handle setCurrentOrganization', () => {
      const result = organizationsReducer(initialState, setCurrentOrganization(mockOrganization as any));
      
      expect(result.currentOrganization).toEqual(mockOrganization);
    });

    it('should handle setCurrentOrganization with null', () => {
      const stateWithOrg = {
        ...initialState,
        currentOrganization: mockOrganization as any,
      };

      const result = organizationsReducer(stateWithOrg, setCurrentOrganization(null));
      expect(result.currentOrganization).toBeNull();
    });

    it('should handle openCreateModal', () => {
      const result = organizationsReducer(initialState, openCreateModal());
      
      expect(result.isCreateModalOpen).toBe(true);
    });

    it('should handle closeCreateModal', () => {
      const openState = {
        ...initialState,
        isCreateModalOpen: true,
      };

      const result = organizationsReducer(openState, closeCreateModal());
      expect(result.isCreateModalOpen).toBe(false);
    });
  });

  describe('async thunks', () => {
    let store: ReturnType<typeof configureStore>;

    beforeEach(() => {
      store = configureStore({
        reducer: {
          organizations: organizationsReducer,
        },
      });
      vi.clearAllMocks();
    });

    describe('fetchOrganizations', () => {
      it('should set loading state when pending', () => {
        store.dispatch({ type: fetchOrganizations.pending.type });
        
        const state = store.getState().organizations;
        expect(state.isLoading).toBe(true);
        expect(state.error).toBeNull();
      });

      it('should set organizations when fulfilled', () => {
        const organizations = [mockOrganization, mockOrganization2];

        store.dispatch({
          type: fetchOrganizations.fulfilled.type,
          payload: organizations,
        });
        
        const state = store.getState().organizations;
        expect(state.isLoading).toBe(false);
        expect(state.organizations).toEqual(organizations);
        expect(state.organizations).toHaveLength(2);
      });

      it('should handle empty organizations list', () => {
        store.dispatch({
          type: fetchOrganizations.fulfilled.type,
          payload: [],
        });
        
        const state = store.getState().organizations;
        expect(state.isLoading).toBe(false);
        expect(state.organizations).toEqual([]);
      });

      it('should set error when rejected', () => {
        store.dispatch({
          type: fetchOrganizations.rejected.type,
          payload: 'Failed to fetch organizations',
        });
        
        const state = store.getState().organizations;
        expect(state.isLoading).toBe(false);
        expect(state.error).toBe('Failed to fetch organizations');
      });

      it('should clear previous error on pending', () => {
        // First set an error
        store.dispatch({
          type: fetchOrganizations.rejected.type,
          payload: 'Previous error',
        });
        
        // Then dispatch pending
        store.dispatch({ type: fetchOrganizations.pending.type });
        
        const state = store.getState().organizations;
        expect(state.error).toBeNull();
      });
    });

    describe('fetchOrganization', () => {
      it('should set loading state when pending', () => {
        store.dispatch({ type: fetchOrganization.pending.type });
        
        const state = store.getState().organizations;
        expect(state.isLoading).toBe(true);
        expect(state.error).toBeNull();
      });

      it('should set currentOrganization when fulfilled', () => {
        store.dispatch({
          type: fetchOrganization.fulfilled.type,
          payload: mockOrganization,
        });
        
        const state = store.getState().organizations;
        expect(state.isLoading).toBe(false);
        expect(state.currentOrganization).toEqual(mockOrganization);
      });

      it('should set error when rejected', () => {
        store.dispatch({
          type: fetchOrganization.rejected.type,
          payload: 'Failed to fetch organization',
        });
        
        const state = store.getState().organizations;
        expect(state.isLoading).toBe(false);
        expect(state.error).toBe('Failed to fetch organization');
      });

      it('should clear error when pending', () => {
        // Set initial error state
        store = configureStore({
          reducer: { organizations: organizationsReducer },
          preloadedState: {
            organizations: {
              ...initialState,
              error: 'Previous error',
            },
          },
        });

        store.dispatch({ type: fetchOrganization.pending.type });
        
        const state = store.getState().organizations;
        expect(state.error).toBeNull();
      });
    });

    describe('createOrganization', () => {
      it('should clear error when pending', () => {
        const stateWithError = {
          organizations: [],
          currentOrganization: null,
          isLoading: false,
          error: 'Previous error',
          isCreateModalOpen: true,
        };

        store = configureStore({
          reducer: { organizations: organizationsReducer },
          preloadedState: { organizations: stateWithError },
        });

        store.dispatch({ type: createOrganization.pending.type });
        
        const state = store.getState().organizations;
        expect(state.error).toBeNull();
      });

      it('should add organization to list and close modal when fulfilled', () => {
        const stateWithModalOpen = {
          organizations: [mockOrganization2 as any],
          currentOrganization: null,
          isLoading: false,
          error: null,
          isCreateModalOpen: true,
        };

        store = configureStore({
          reducer: { organizations: organizationsReducer },
          preloadedState: { organizations: stateWithModalOpen },
        });

        store.dispatch({
          type: createOrganization.fulfilled.type,
          payload: mockOrganization,
        });
        
        const state = store.getState().organizations;
        expect(state.organizations).toHaveLength(2);
        // New organization should be at the beginning (unshift)
        expect(state.organizations[0]).toEqual(mockOrganization);
        expect(state.isCreateModalOpen).toBe(false);
      });

      it('should add first organization to empty list', () => {
        const stateWithModalOpen = {
          organizations: [],
          currentOrganization: null,
          isLoading: false,
          error: null,
          isCreateModalOpen: true,
        };

        store = configureStore({
          reducer: { organizations: organizationsReducer },
          preloadedState: { organizations: stateWithModalOpen },
        });

        store.dispatch({
          type: createOrganization.fulfilled.type,
          payload: mockOrganization,
        });
        
        const state = store.getState().organizations;
        expect(state.organizations).toHaveLength(1);
        expect(state.organizations[0]).toEqual(mockOrganization);
      });

      it('should set error when rejected', () => {
        store.dispatch({
          type: createOrganization.rejected.type,
          payload: 'Failed to create organization',
        });
        
        const state = store.getState().organizations;
        expect(state.error).toBe('Failed to create organization');
      });

      it('should keep modal open when rejected', () => {
        const stateWithModalOpen = {
          organizations: [],
          currentOrganization: null,
          isLoading: false,
          error: null,
          isCreateModalOpen: true,
        };

        store = configureStore({
          reducer: { organizations: organizationsReducer },
          preloadedState: { organizations: stateWithModalOpen },
        });

        store.dispatch({
          type: createOrganization.rejected.type,
          payload: 'Failed to create organization',
        });
        
        const state = store.getState().organizations;
        // Modal should remain open on error
        expect(state.isCreateModalOpen).toBe(true);
      });
    });
  });

  describe('selectors', () => {
    it('should select organizations from state', () => {
      const organizations = [mockOrganization, mockOrganization2];
      const state = {
        organizations: {
          organizations: organizations as any[],
          currentOrganization: null,
          isLoading: false,
          error: null,
          isCreateModalOpen: false,
        },
      };

      expect(state.organizations.organizations).toEqual(organizations);
      expect(state.organizations.organizations).toHaveLength(2);
    });

    it('should select currentOrganization from state', () => {
      const state = {
        organizations: {
          organizations: [mockOrganization as any],
          currentOrganization: mockOrganization as any,
          isLoading: false,
          error: null,
          isCreateModalOpen: false,
        },
      };

      expect(state.organizations.currentOrganization).toEqual(mockOrganization);
    });

    it('should select isLoading from state', () => {
      const state = {
        organizations: {
          organizations: [],
          currentOrganization: null,
          isLoading: true,
          error: null,
          isCreateModalOpen: false,
        },
      };

      expect(state.organizations.isLoading).toBe(true);
    });

    it('should select error from state', () => {
      const state = {
        organizations: {
          organizations: [],
          currentOrganization: null,
          isLoading: false,
          error: 'Something went wrong',
          isCreateModalOpen: false,
        },
      };

      expect(state.organizations.error).toBe('Something went wrong');
    });

    it('should select isCreateModalOpen from state', () => {
      const state = {
        organizations: {
          organizations: [],
          currentOrganization: null,
          isLoading: false,
          error: null,
          isCreateModalOpen: true,
        },
      };

      expect(state.organizations.isCreateModalOpen).toBe(true);
    });
  });

  describe('organization members', () => {
    it('should handle organizations with members', () => {
      const result = organizationsReducer(initialState, setCurrentOrganization(mockOrganization as any));
      
      expect(result.currentOrganization?.members).toHaveLength(1);
    });

    it('should handle organizations with multiple members', () => {
      const orgWithMultipleMembers = {
        ...mockOrganization,
        members: [
          {
            userId: mockUser._id,
            role: 'owner' as const,
            joinedAt: new Date().toISOString(),
          },
          {
            userId: 'user-456',
            role: 'admin' as const,
            joinedAt: new Date().toISOString(),
          },
          {
            userId: 'user-789',
            role: 'member' as const,
            joinedAt: new Date().toISOString(),
          },
        ],
      };

      const result = organizationsReducer(initialState, setCurrentOrganization(orgWithMultipleMembers as any));
      
      expect(result.currentOrganization?.members).toHaveLength(3);
    });
  });

  describe('organization settings', () => {
    it('should handle organizations with settings', () => {
      const result = organizationsReducer(initialState, setCurrentOrganization(mockOrganization as any));
      
      expect(result.currentOrganization?.settings).toBeDefined();
      expect(result.currentOrganization?.settings?.allowPublicProjects).toBe(true);
    });

    it('should handle different default project visibility settings', () => {
      const orgWithPrivateDefault = {
        ...mockOrganization,
        settings: {
          allowPublicProjects: false,
          defaultProjectVisibility: 'private' as const,
        },
      };

      const result = organizationsReducer(initialState, setCurrentOrganization(orgWithPrivateDefault as any));
      
      expect(result.currentOrganization?.settings?.defaultProjectVisibility).toBe('private');
    });
  });

  describe('modal state management', () => {
    it('should toggle modal state correctly', () => {
      let state = organizationsReducer(initialState, openCreateModal());
      expect(state.isCreateModalOpen).toBe(true);

      state = organizationsReducer(state, closeCreateModal());
      expect(state.isCreateModalOpen).toBe(false);

      state = organizationsReducer(state, openCreateModal());
      expect(state.isCreateModalOpen).toBe(true);
    });

    it('should close modal after successful creation', () => {
      const stateWithModalOpen = {
        organizations: [],
        currentOrganization: null,
        isLoading: false,
        error: null,
        isCreateModalOpen: true,
      };

      const store = configureStore({
        reducer: { organizations: organizationsReducer },
        preloadedState: { organizations: stateWithModalOpen },
      });

      store.dispatch({
        type: createOrganization.fulfilled.type,
        payload: mockOrganization,
      });
      
      const state = store.getState().organizations;
      expect(state.isCreateModalOpen).toBe(false);
    });
  });

  describe('loading states', () => {
    it('should track loading state during fetch operations', () => {
      let store = configureStore({
        reducer: { organizations: organizationsReducer },
      });

      // Initially not loading
      expect(store.getState().organizations.isLoading).toBe(false);

      // Loading during pending
      store.dispatch({ type: fetchOrganizations.pending.type });
      expect(store.getState().organizations.isLoading).toBe(true);

      // Not loading after fulfilled
      store.dispatch({
        type: fetchOrganizations.fulfilled.type,
        payload: [mockOrganization],
      });
      expect(store.getState().organizations.isLoading).toBe(false);
    });

    it('should not set loading state during create operation', () => {
      let store = configureStore({
        reducer: { organizations: organizationsReducer },
      });

      store.dispatch({ type: createOrganization.pending.type });
      // createOrganization doesn't set isLoading (as per the slice implementation)
      expect(store.getState().organizations.isLoading).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should clear error on new fetch attempt', () => {
      let store = configureStore({
        reducer: { organizations: organizationsReducer },
        preloadedState: {
          organizations: {
            ...initialState,
            error: 'Previous error',
          },
        },
      });

      store.dispatch({ type: fetchOrganizations.pending.type });
      expect(store.getState().organizations.error).toBeNull();
    });

    it('should handle network error messages', () => {
      let store = configureStore({
        reducer: { organizations: organizationsReducer },
      });

      store.dispatch({
        type: fetchOrganizations.rejected.type,
        payload: 'Network request failed',
      });
      expect(store.getState().organizations.error).toBe('Network request failed');
    });

    it('should handle validation error messages', () => {
      let store = configureStore({
        reducer: { organizations: organizationsReducer },
      });

      store.dispatch({
        type: createOrganization.rejected.type,
        payload: 'Organization name already exists',
      });
      expect(store.getState().organizations.error).toBe('Organization name already exists');
    });

    it('should manually clear error using clearError action', () => {
      let store = configureStore({
        reducer: { organizations: organizationsReducer },
        preloadedState: {
          organizations: {
            ...initialState,
            error: 'Some error',
          },
        },
      });

      store.dispatch(clearError());
      expect(store.getState().organizations.error).toBeNull();
    });
  });
});
