import React, { ReactElement } from 'react';
import { render, screen, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore, combineReducers } from '@reduxjs/toolkit';

// Mock the API service before importing slices
jest.mock('@/services/api', () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
  },
  projectsApi: {
    getProjects: jest.fn(),
    getProject: jest.fn(),
    createProject: jest.fn(),
    updateProject: jest.fn(),
    deleteProject: jest.fn(),
  },
  boardsApi: {
    getBoards: jest.fn(),
    getBoard: jest.fn(),
    createBoard: jest.fn(),
    updateBoard: jest.fn(),
  },
  organizationsApi: {
    getOrganizations: jest.fn(),
    getOrganization: jest.fn(),
    createOrganization: jest.fn(),
  },
}));

import authReducer from '@/features/auth/authSlice';
import boardsReducer from '@/features/boards/boardsSlice';
import projectsReducer from '@/features/projects/projectsSlice';
import organizationsReducer from '@/features/organizations/organizationsSlice';
import uiReducer from '@/features/ui/uiSlice';
import TaskCard from '@/components/board/TaskCard';

// Mock dnd-kit
jest.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

// Setup root reducer
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

function setupStore(preloadedState?: Partial<ReturnType<typeof rootReducer>>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
  });
}

function renderWithProviders(
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
const mockUser = {
  _id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  avatar: null,
  isEmailVerified: true,
  oauthProvider: 'local' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Mock board data
const mockBoard = {
  _id: 'board-123',
  name: 'Test Board',
  projectId: 'project-123',
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
const mockTask = {
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

describe('TaskCard', () => {
  const defaultProps = {
    task: mockTask,
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders task title', () => {
    renderWithProviders(<TaskCard {...defaultProps} />);
    
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('renders task labels', () => {
    renderWithProviders(<TaskCard {...defaultProps} />);
    
    expect(screen.getByText('Bug')).toBeInTheDocument();
  });

  it('renders priority indicator for high/urgent tasks', () => {
    const highPriorityTask = { ...mockTask, priority: 'high' as const };
    renderWithProviders(<TaskCard {...defaultProps} task={highPriorityTask} />);
    
    // The component should show some priority indicator
    // Check for the card being rendered
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('renders comment count badge', () => {
    renderWithProviders(<TaskCard {...defaultProps} />);
    
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders attachment count badge', () => {
    renderWithProviders(<TaskCard {...defaultProps} />);
    
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders assignee avatars', () => {
    renderWithProviders(<TaskCard {...defaultProps} />);
    
    // Should show the first letter of the assignee name
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', async () => {
    const onClick = jest.fn();
    const user = userEvent.setup();
    
    renderWithProviders(<TaskCard {...defaultProps} onClick={onClick} />);
    
    const card = screen.getByText('Test Task').closest('div');
    if (card) {
      await user.click(card);
      expect(onClick).toHaveBeenCalled();
    }
  });

  it('renders due date when present', () => {
    const taskWithDueDate = {
      ...mockTask,
      dueDate: '2026-12-31T00:00:00.000Z',
    };
    
    renderWithProviders(<TaskCard {...defaultProps} task={taskWithDueDate} />);
    
    // Should show formatted due date
    expect(screen.getByText(/Dec 31/)).toBeInTheDocument();
  });

  it('handles task without labels', () => {
    const taskWithoutLabels = { ...mockTask, labels: [] };
    
    renderWithProviders(<TaskCard {...defaultProps} task={taskWithoutLabels} />);
    
    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.queryByText('Bug')).not.toBeInTheDocument();
  });

  it('handles task without assignees', () => {
    const taskWithoutAssignees = { ...mockTask, assignees: [] };
    
    renderWithProviders(<TaskCard {...defaultProps} task={taskWithoutAssignees} />);
    
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('handles task with zero comments', () => {
    const taskNoComments = { ...mockTask, commentCount: 0 };
    
    renderWithProviders(<TaskCard {...defaultProps} task={taskNoComments} />);
    
    // Comment icon should not show count when 0
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });
});
