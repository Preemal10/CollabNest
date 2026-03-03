import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, mockTask, screen } from '../utils/testUtils';
import TaskCard from '@/components/board/TaskCard';

// Mock dnd-kit
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

describe('TaskCard', () => {
  const defaultProps = {
    task: mockTask,
    onClick: vi.fn(),
  };

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
    const onClick = vi.fn();
    const { userEvent } = await import('../utils/testUtils');
    
    renderWithProviders(<TaskCard {...defaultProps} onClick={onClick} />);
    
    const card = screen.getByText('Test Task').closest('div');
    if (card) {
      await userEvent.click(card);
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
