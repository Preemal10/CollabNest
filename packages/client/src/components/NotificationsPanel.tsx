import { Fragment, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import {
  BellIcon,
  UserPlusIcon,
  ChatBubbleLeftIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import api from '@/services/api';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'task.assigned': UserPlusIcon,
  'task.due_soon': ExclamationCircleIcon,
  'task.overdue': ExclamationCircleIcon,
  'task.completed': CheckCircleIcon,
  'comment.mention': ChatBubbleLeftIcon,
  'project.invited': UserPlusIcon,
};

const typeColors: Record<string, string> = {
  'task.assigned': 'bg-blue-100 text-blue-600',
  'task.due_soon': 'bg-yellow-100 text-yellow-600',
  'task.overdue': 'bg-red-100 text-red-600',
  'task.completed': 'bg-green-100 text-green-600',
  'comment.mention': 'bg-purple-100 text-purple-600',
  'project.invited': 'bg-indigo-100 text-indigo-600',
};

export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.data.notifications);
      setUnreadCount(response.data.data.notifications.filter((n: Notification) => !n.isRead).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(
        notifications.map((n) =>
          n._id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getIcon = (type: string) => {
    const Icon = typeIcons[type] || BellIcon;
    return Icon;
  };

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <Popover.Button
            onClick={() => !open && fetchNotifications()}
            className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
          >
            <BellIcon className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Popover.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute right-0 z-50 mt-2 w-80 sm:w-96 origin-top-right">
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-primary-500 hover:text-primary-600 font-medium"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {/* Notifications list */}
                <div className="max-h-96 overflow-y-auto">
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-12 text-center">
                      <BellIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((notification) => {
                      const Icon = getIcon(notification.type);
                      return (
                        <div
                          key={notification._id}
                          onClick={() => !notification.isRead && markAsRead(notification._id)}
                          className={clsx(
                            'flex gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-b-0',
                            !notification.isRead && 'bg-primary-50/50 dark:bg-primary-900/10'
                          )}
                        >
                          <div
                            className={clsx(
                              'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                              typeColors[notification.type] || 'bg-gray-100 text-gray-600'
                            )}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDistanceToNow(new Date(notification.createdAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary-500 mt-2" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 10 && (
                  <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-center">
                    <button className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                      View all notifications
                    </button>
                  </div>
                )}
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}
