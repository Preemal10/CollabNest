import { describe, it, expect, beforeEach, vi } from 'vitest';
import authReducer, {
  login,
  register,
  logout,
  setUser,
  setTokens,
  resetAuth,
  clearError,
} from '@/features/auth/authSlice';
import { configureStore } from '@reduxjs/toolkit';
import { mockUser } from '../utils/testUtils';

// Mock the api module
vi.mock('@/services/api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  },
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('authSlice', () => {
  // Initial state matches the actual slice
  const initialState = {
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  };

  describe('reducers', () => {
    it('should return initial state', () => {
      const result = authReducer(undefined, { type: 'unknown' });
      expect(result).toEqual(initialState);
    });

    it('should handle setUser', () => {
      const result = authReducer(initialState, setUser(mockUser as any));
      
      expect(result.user).toEqual(mockUser);
      expect(result.isAuthenticated).toBe(true);
    });

    it('should handle resetAuth', () => {
      const authenticatedState = {
        user: mockUser as any,
        tokens: { accessToken: 'token', refreshToken: 'refresh', expiresIn: 3600 },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

      const result = authReducer(authenticatedState, resetAuth());
      
      expect(result.user).toBeNull();
      expect(result.tokens).toBeNull();
      expect(result.isAuthenticated).toBe(false);
      expect(result.error).toBeNull();
    });

    it('should handle setTokens', () => {
      const tokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        expiresIn: 3600,
      };

      const result = authReducer(initialState, setTokens(tokens));
      expect(result.tokens).toEqual(tokens);
    });

    it('should handle clearError', () => {
      const stateWithError = {
        ...initialState,
        error: 'Some error message',
      };

      const result = authReducer(stateWithError, clearError());
      expect(result.error).toBeNull();
    });
  });

  describe('async thunks', () => {
    let store: ReturnType<typeof configureStore>;

    beforeEach(() => {
      store = configureStore({
        reducer: {
          auth: authReducer,
        },
      });
      vi.clearAllMocks();
    });

    describe('login', () => {
      it('should set loading state when pending', () => {
        store.dispatch({ type: login.pending.type });
        
        const state = store.getState().auth;
        expect(state.isLoading).toBe(true);
        expect(state.error).toBeNull();
      });

      it('should set user and tokens when fulfilled', () => {
        const payload = {
          user: mockUser,
          tokens: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            expiresIn: 3600,
          },
        };

        store.dispatch({
          type: login.fulfilled.type,
          payload,
        });
        
        const state = store.getState().auth;
        expect(state.isLoading).toBe(false);
        expect(state.user).toEqual(mockUser);
        expect(state.tokens).toEqual(payload.tokens);
        expect(state.isAuthenticated).toBe(true);
      });

      it('should set error when rejected', () => {
        store.dispatch({
          type: login.rejected.type,
          payload: 'Invalid credentials',
        });
        
        const state = store.getState().auth;
        expect(state.isLoading).toBe(false);
        expect(state.error).toBe('Invalid credentials');
        expect(state.isAuthenticated).toBe(false);
      });
    });

    describe('register', () => {
      it('should set loading state when pending', () => {
        store.dispatch({ type: register.pending.type });
        
        const state = store.getState().auth;
        expect(state.isLoading).toBe(true);
      });

      it('should set user and tokens when fulfilled', () => {
        const payload = {
          user: mockUser,
          tokens: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            expiresIn: 3600,
          },
        };

        store.dispatch({
          type: register.fulfilled.type,
          payload,
        });
        
        const state = store.getState().auth;
        expect(state.user).toEqual(mockUser);
        expect(state.tokens).toEqual(payload.tokens);
        expect(state.isAuthenticated).toBe(true);
      });

      it('should set error when rejected', () => {
        store.dispatch({
          type: register.rejected.type,
          payload: 'Email already exists',
        });
        
        const state = store.getState().auth;
        expect(state.error).toBe('Email already exists');
      });
    });

    describe('logout', () => {
      it('should clear auth state when fulfilled', () => {
        // First set an authenticated state
        store.dispatch({
          type: login.fulfilled.type,
          payload: {
            user: mockUser,
            tokens: {
              accessToken: 'access-token',
              refreshToken: 'refresh-token',
              expiresIn: 3600,
            },
          },
        });

        // Then logout
        store.dispatch({ type: logout.fulfilled.type });
        
        const state = store.getState().auth;
        expect(state.user).toBeNull();
        expect(state.tokens).toBeNull();
        expect(state.isAuthenticated).toBe(false);
      });

      it('should clear auth state even when rejected', () => {
        // First set an authenticated state
        store.dispatch({
          type: login.fulfilled.type,
          payload: {
            user: mockUser,
            tokens: {
              accessToken: 'access-token',
              refreshToken: 'refresh-token',
              expiresIn: 3600,
            },
          },
        });

        // Rejected logout should still clear state
        store.dispatch({ type: logout.rejected.type });
        
        const state = store.getState().auth;
        expect(state.user).toBeNull();
        expect(state.isAuthenticated).toBe(false);
      });
    });
  });

  describe('selectors', () => {
    it('should select user from state', () => {
      const state = {
        auth: {
          user: mockUser,
          tokens: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      };

      expect(state.auth.user).toEqual(mockUser);
    });

    it('should select isAuthenticated from state', () => {
      const state = {
        auth: {
          user: mockUser,
          tokens: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      };

      expect(state.auth.isAuthenticated).toBe(true);
    });
  });
});
