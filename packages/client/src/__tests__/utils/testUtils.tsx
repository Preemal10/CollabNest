import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authReducer from '@/features/auth/authSlice';
import boardsReducer from '@/features/boards/boardsSlice';
import projectsReducer from '@/features/projects/projectsSlice';
import organizationsReducer from '@/features/organizations/organizationsSlice';
import uiReducer from '@/features/ui/uiSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  boards: boardsReducer,
  projects: projectsReducer,
  organizations: organizationsReducer,
  ui: uiReducer,
});

// Create a custom render function that includes providers
interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: Partial<ReturnType<typeof rootReducer>>;
  store?: ReturnType<typeof setupStore>;
}

export function setupStore(preloadedState?: Partial<ReturnType<typeof rootReducer>>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
  });
}

export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState = {},
    store = setupStore(preloadedState),
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <BrowserRouter>{children}</BrowserRouter>
      </Provider>
    );
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// Mock user data
export const mockUser = {
  _id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  avatar: null,
  isEmailVerified: true,
  oauthProvider: 'local' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Mock project data
export const mockProject = {
  _id: 'project-123',
  name: 'Test Project',
  key: 'TP',
  description: 'A test project',
  owner: mockUser._id,
  members: [{ user: mockUser._id, role: 'owner' as const }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Mock board data
export const mockBoard = {
  _id: 'board-123',
  name: 'Test Board',
  projectId: mockProject._id,
  columns: [
    { _id: 'col-1', name: 'To Do', order: 0, color: '#e2e8f0' },
    { _id: 'col-2', name: 'In Progress', order: 1, color: '#fef3c7' },
    { _id: 'col-3', name: 'Done', order: 2, color: '#d1fae5' },
  ],
  createdBy: mockUser._id,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Mock task data
export const mockTask = {
  _id: 'task-123',
  title: 'Test Task',
  description: 'A test task description',
  boardId: mockBoard._id,
  columnId: 'col-1',
  order: 0,
  priority: 'medium' as const,
  labels: [{ _id: 'label-1', name: 'Bug', color: '#ef4444' }],
  assignees: [{ _id: mockUser._id, name: mockUser.name, email: mockUser.email }],
  checklist: [],
  commentCount: 2,
  attachmentCount: 1,
  isArchived: false,
  createdBy: { _id: mockUser._id, name: mockUser.name, email: mockUser.email },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Re-export testing library utilities
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
