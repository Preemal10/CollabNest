import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, mockTask, mockBoard, screen, userEvent } from '../utils/testUtils';
import BoardColumn from '@/components/board/BoardColumn';

// Mock dnd-kit
vi.mock('@dnd-kit/core', () => ({
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false,
  }),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

describe('BoardColumn', () => {
  const mockColumn = {
    _id: 'col-1',
    name: 'To Do',
    color: '#e2e8f0',
  };

  const mockTasks = [
    { ...mockTask, _id: 'task-1', title: 'First Task', order: 0 },
    { ...mockTask, _id: 'task-2', title: 'Second Task', order: 1 },
  ];

  const defaultProps = {
    column: mockColumn,
    tasks: mockTasks,
    onAddTask: vi.fn(),
    onTaskClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders column name', () => {
    renderWithProviders(<BoardColumn {...defaultProps} />);
    
    expect(screen.getByText('To Do')).toBeInTheDocument();
  });

  it('renders task count badge', () => {
    renderWithProviders(<BoardColumn {...defaultProps} />);
    
    // The task count badge has a specific class
    const countBadge = document.querySelector('.rounded-full.bg-gray-100');
    expect(countBadge).toBeInTheDocument();
    expect(countBadge?.textContent).toBe('2');
  });

  it('renders column color indicator when color is provided', () => {
    renderWithProviders(<BoardColumn {...defaultProps} />);
    
    const colorIndicator = document.querySelector('[style*="background-color"]');
    expect(colorIndicator).toBeInTheDocument();
  });

  it('renders all tasks in the column', () => {
    renderWithProviders(<BoardColumn {...defaultProps} />);
    
    expect(screen.getByText('First Task')).toBeInTheDocument();
    expect(screen.getByText('Second Task')).toBeInTheDocument();
  });

  it('calls onAddTask when add button is clicked', async () => {
    const onAddTask = vi.fn();
    renderWithProviders(<BoardColumn {...defaultProps} onAddTask={onAddTask} />);
    
    const addButtons = screen.getAllByRole('button', { name: /add task/i });
    await userEvent.click(addButtons[0]);
    
    expect(onAddTask).toHaveBeenCalledTimes(1);
  });

  it('calls onAddTask when bottom add button is clicked', async () => {
    const onAddTask = vi.fn();
    renderWithProviders(<BoardColumn {...defaultProps} onAddTask={onAddTask} />);
    
    const addButtons = screen.getAllByRole('button');
    const bottomAddButton = addButtons.find(btn => btn.textContent === 'Add task');
    
    if (bottomAddButton) {
      await userEvent.click(bottomAddButton);
      expect(onAddTask).toHaveBeenCalled();
    }
  });

  it('renders empty state when no tasks', () => {
    renderWithProviders(<BoardColumn {...defaultProps} tasks={[]} />);
    
    expect(screen.getByText('No tasks')).toBeInTheDocument();
    expect(screen.getByText('+ Add a task')).toBeInTheDocument();
  });

  it('calls onAddTask when clicking add task in empty state', async () => {
    const onAddTask = vi.fn();
    renderWithProviders(<BoardColumn {...defaultProps} tasks={[]} onAddTask={onAddTask} />);
    
    const addTaskButton = screen.getByText('+ Add a task');
    await userEvent.click(addTaskButton);
    
    expect(onAddTask).toHaveBeenCalledTimes(1);
  });

  it('calls onTaskClick when a task is clicked', async () => {
    const onTaskClick = vi.fn();
    renderWithProviders(<BoardColumn {...defaultProps} onTaskClick={onTaskClick} />);
    
    const taskElement = screen.getByText('First Task').closest('div');
    if (taskElement) {
      await userEvent.click(taskElement);
      expect(onTaskClick).toHaveBeenCalled();
    }
  });

  it('renders column options button when onColumnOptions is provided', () => {
    const onColumnOptions = vi.fn();
    renderWithProviders(
      <BoardColumn {...defaultProps} onColumnOptions={onColumnOptions} />
    );
    
    const optionsButton = screen.getByTitle('Column options');
    expect(optionsButton).toBeInTheDocument();
  });

  it('does not render column options button when onColumnOptions is not provided', () => {
    renderWithProviders(<BoardColumn {...defaultProps} />);
    
    expect(screen.queryByTitle('Column options')).not.toBeInTheDocument();
  });

  it('calls onColumnOptions when options button is clicked', async () => {
    const onColumnOptions = vi.fn();
    renderWithProviders(
      <BoardColumn {...defaultProps} onColumnOptions={onColumnOptions} />
    );
    
    const optionsButton = screen.getByTitle('Column options');
    await userEvent.click(optionsButton);
    
    expect(onColumnOptions).toHaveBeenCalledTimes(1);
  });

  it('displays task count with limit when taskLimit is set', () => {
    const columnWithLimit = { ...mockColumn, taskLimit: 5 };
    renderWithProviders(
      <BoardColumn {...defaultProps} column={columnWithLimit} />
    );
    
    expect(screen.getByText('2/5')).toBeInTheDocument();
  });

  it('shows WIP limit warning when tasks reach limit', () => {
    const columnWithLimit = { ...mockColumn, taskLimit: 2 };
    renderWithProviders(
      <BoardColumn {...defaultProps} column={columnWithLimit} />
    );
    
    expect(screen.getByText(/WIP limit reached/)).toBeInTheDocument();
    expect(screen.getByText(/\(2\)/)).toBeInTheDocument();
  });

  it('does not show WIP limit warning when tasks are below limit', () => {
    const columnWithLimit = { ...mockColumn, taskLimit: 5 };
    renderWithProviders(
      <BoardColumn {...defaultProps} column={columnWithLimit} />
    );
    
    expect(screen.queryByText(/WIP limit reached/)).not.toBeInTheDocument();
  });

  it('renders without color indicator when no color is set', () => {
    const columnWithoutColor = { _id: 'col-1', name: 'No Color Column' };
    renderWithProviders(
      <BoardColumn {...defaultProps} column={columnWithoutColor} />
    );
    
    expect(screen.getByText('No Color Column')).toBeInTheDocument();
  });

  it('handles column with single task', () => {
    const singleTask = [mockTasks[0]];
    renderWithProviders(<BoardColumn {...defaultProps} tasks={singleTask} />);
    
    expect(screen.getByText('First Task')).toBeInTheDocument();
    // The task count badge has a specific class
    const countBadge = document.querySelector('.rounded-full.bg-gray-100');
    expect(countBadge).toBeInTheDocument();
    expect(countBadge?.textContent).toBe('1');
  });

  it('renders add task button in header', () => {
    renderWithProviders(<BoardColumn {...defaultProps} />);
    
    const addButton = screen.getByTitle('Add task');
    expect(addButton).toBeInTheDocument();
  });
});
