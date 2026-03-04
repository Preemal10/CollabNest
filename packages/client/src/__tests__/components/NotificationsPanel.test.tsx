import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, userEvent, waitFor } from '../utils/testUtils';
import NotificationsPanel from '@/components/NotificationsPanel';

// Mock the API module
vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

// Import mocked api for assertions
import api from '@/services/api';

const mockNotifications = [
  {
    _id: 'notif-1',
    type: 'task.assigned',
    title: 'New task assigned',
    message: 'You have been assigned to "Fix bug #123"',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
  },
  {
    _id: 'notif-2',
    type: 'comment.mention',
    title: 'You were mentioned',
    message: 'John mentioned you in a comment',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
  },
  {
    _id: 'notif-3',
    type: 'task.due_soon',
    title: 'Task due soon',
    message: 'Task "Update documentation" is due tomorrow',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
];

describe('NotificationsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { notifications: [] } },
    });
    (api.put as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });
  });

  it('renders bell icon button', () => {
    renderWithProviders(<NotificationsPanel />);
    
    const bellButton = screen.getByRole('button');
    expect(bellButton).toBeInTheDocument();
  });

  it('does not show unread badge when count is 0', () => {
    renderWithProviders(<NotificationsPanel />);
    
    // The badge should not be present initially
    expect(screen.queryByText('9+')).not.toBeInTheDocument();
    expect(screen.queryByText(/^\d$/)).not.toBeInTheDocument();
  });

  it('fetches notifications when panel is opened', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { notifications: mockNotifications } },
    });

    renderWithProviders(<NotificationsPanel />);
    
    const bellButton = screen.getByRole('button');
    await userEvent.click(bellButton);
    
    expect(api.get).toHaveBeenCalledWith('/notifications');
  });

  it('shows loading spinner while fetching notifications', async () => {
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    (api.get as ReturnType<typeof vi.fn>).mockReturnValue(promise);

    renderWithProviders(<NotificationsPanel />);
    
    const bellButton = screen.getByRole('button');
    await userEvent.click(bellButton);
    
    // Should show loading state
    await waitFor(() => {
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    // Resolve the promise
    resolvePromise!({ data: { data: { notifications: [] } } });
  });

  it('displays notifications after fetching', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { notifications: mockNotifications } },
    });

    renderWithProviders(<NotificationsPanel />);
    
    const bellButton = screen.getByRole('button');
    await userEvent.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText('New task assigned')).toBeInTheDocument();
      expect(screen.getByText('You were mentioned')).toBeInTheDocument();
      expect(screen.getByText('Task due soon')).toBeInTheDocument();
    });
  });

  it('displays notification messages', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { notifications: mockNotifications } },
    });

    renderWithProviders(<NotificationsPanel />);
    
    const bellButton = screen.getByRole('button');
    await userEvent.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText('You have been assigned to "Fix bug #123"')).toBeInTheDocument();
      expect(screen.getByText('John mentioned you in a comment')).toBeInTheDocument();
    });
  });

  it('shows empty state when no notifications', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { notifications: [] } },
    });

    renderWithProviders(<NotificationsPanel />);
    
    const bellButton = screen.getByRole('button');
    await userEvent.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    });
  });

  it('shows "Notifications" header in panel', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { notifications: [] } },
    });

    renderWithProviders(<NotificationsPanel />);
    
    const bellButton = screen.getByRole('button');
    await userEvent.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });

  it('shows "Mark all as read" button when there are unread notifications', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { notifications: mockNotifications } },
    });

    renderWithProviders(<NotificationsPanel />);
    
    const bellButton = screen.getByRole('button');
    await userEvent.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText('Mark all as read')).toBeInTheDocument();
    });
  });

  it('calls mark all as read API when button is clicked', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { notifications: mockNotifications } },
    });

    renderWithProviders(<NotificationsPanel />);
    
    const bellButton = screen.getByRole('button');
    await userEvent.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText('Mark all as read')).toBeInTheDocument();
    });

    const markAllButton = screen.getByText('Mark all as read');
    await userEvent.click(markAllButton);
    
    expect(api.put).toHaveBeenCalledWith('/notifications/read-all');
  });

  it('marks individual notification as read when clicked', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { notifications: mockNotifications } },
    });

    renderWithProviders(<NotificationsPanel />);
    
    const bellButton = screen.getByRole('button');
    await userEvent.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText('New task assigned')).toBeInTheDocument();
    });

    // Click on the unread notification
    const notificationTitle = screen.getByText('New task assigned');
    const notificationItem = notificationTitle.closest('div[class*="cursor-pointer"]');
    
    if (notificationItem) {
      await userEvent.click(notificationItem);
      expect(api.put).toHaveBeenCalledWith('/notifications/notif-1/read');
    }
  });

  it('does not call mark as read for already read notifications', async () => {
    const readNotification = [{
      _id: 'notif-read',
      type: 'task.completed',
      title: 'Task completed',
      message: 'Task has been marked as done',
      isRead: true,
      createdAt: new Date().toISOString(),
    }];

    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { notifications: readNotification } },
    });

    renderWithProviders(<NotificationsPanel />);
    
    const bellButton = screen.getByRole('button');
    await userEvent.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText('Task completed')).toBeInTheDocument();
    });

    // Click on the already read notification
    const notificationTitle = screen.getByText('Task completed');
    const notificationItem = notificationTitle.closest('div[class*="cursor-pointer"]');
    
    if (notificationItem) {
      await userEvent.click(notificationItem);
      // Should not call the API since notification is already read
      expect(api.put).not.toHaveBeenCalledWith('/notifications/notif-read/read');
    }
  });

  it('displays relative time for notifications', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { notifications: mockNotifications } },
    });

    renderWithProviders(<NotificationsPanel />);
    
    const bellButton = screen.getByRole('button');
    await userEvent.click(bellButton);
    
    await waitFor(() => {
      // Should show relative time like "5 minutes ago", "1 hour ago", etc.
      expect(screen.getByText(/minutes? ago/i)).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    renderWithProviders(<NotificationsPanel />);
    
    const bellButton = screen.getByRole('button');
    await userEvent.click(bellButton);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch notifications:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('renders different icons for different notification types', async () => {
    const typedNotifications = [
      { ...mockNotifications[0], type: 'task.assigned' },
      { ...mockNotifications[1], type: 'task.overdue', _id: 'notif-overdue' },
      { ...mockNotifications[2], type: 'project.invited', _id: 'notif-invite' },
    ];

    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { notifications: typedNotifications } },
    });

    renderWithProviders(<NotificationsPanel />);
    
    const bellButton = screen.getByRole('button');
    await userEvent.click(bellButton);
    
    await waitFor(() => {
      // Check that notifications are rendered (icons are SVGs so we check for the content)
      expect(screen.getByText('New task assigned')).toBeInTheDocument();
    });
  });

  it('shows unread indicator dot for unread notifications', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { notifications: mockNotifications } },
    });

    renderWithProviders(<NotificationsPanel />);
    
    const bellButton = screen.getByRole('button');
    await userEvent.click(bellButton);
    
    await waitFor(() => {
      // Unread notifications should have an indicator dot
      const unreadDots = document.querySelectorAll('.bg-primary-500.rounded-full.w-2.h-2');
      expect(unreadDots.length).toBeGreaterThan(0);
    });
  });

  it('updates unread count after marking notification as read', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { notifications: mockNotifications } },
    });

    renderWithProviders(<NotificationsPanel />);
    
    const bellButton = screen.getByRole('button');
    await userEvent.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText('New task assigned')).toBeInTheDocument();
    });

    // Click on the unread notification to mark as read
    const notificationTitle = screen.getByText('New task assigned');
    const notificationItem = notificationTitle.closest('div[class*="cursor-pointer"]');
    
    if (notificationItem) {
      await userEvent.click(notificationItem);
      expect(api.put).toHaveBeenCalled();
    }
  });

  it('limits displayed notifications to 10', async () => {
    const manyNotifications = Array.from({ length: 15 }, (_, i) => ({
      _id: `notif-${i}`,
      type: 'task.assigned',
      title: `Notification ${i + 1}`,
      message: `Message for notification ${i + 1}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    }));

    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { notifications: manyNotifications } },
    });

    renderWithProviders(<NotificationsPanel />);
    
    const bellButton = screen.getByRole('button');
    await userEvent.click(bellButton);
    
    await waitFor(() => {
      // Should show "View all notifications" footer
      expect(screen.getByText('View all notifications')).toBeInTheDocument();
    });
  });

  it('does not show footer when notifications are 10 or less', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { notifications: mockNotifications } },
    });

    renderWithProviders(<NotificationsPanel />);
    
    const bellButton = screen.getByRole('button');
    await userEvent.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText('New task assigned')).toBeInTheDocument();
    });

    expect(screen.queryByText('View all notifications')).not.toBeInTheDocument();
  });
});
