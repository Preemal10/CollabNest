import { useState, useEffect } from 'react';
import {
  PlusCircleIcon,
  PencilSquareIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  TrashIcon,
  ChatBubbleLeftIcon,
  PaperClipIcon,
  UserPlusIcon,
  FolderPlusIcon,
  ViewColumnsIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import api from '@/services/api';

interface Activity {
  _id: string;
  type: string;
  entityType: string;
  entityId: string;
  projectId?: string;
  boardId?: string;
  taskId?: string;
  userId: { _id: string; name: string; email: string; avatar?: string } | string;
  metadata?: {
    title?: string;
    name?: string;
    columnName?: string;
    fromColumnId?: string;
    toColumnId?: string;
    updates?: string[];
    taskTitle?: string;
    filename?: string;
  };
  createdAt: string;
}

interface ActivityFeedProps {
  projectId?: string;
  taskId?: string;
  limit?: number;
  showTitle?: boolean;
  compact?: boolean;
}

// Activity type configurations
const activityConfig: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  getMessage: (activity: Activity) => string;
}> = {
  'task.created': {
    icon: PlusCircleIcon,
    color: 'bg-green-100 text-green-600',
    getMessage: (a) => `created task "${a.metadata?.title || 'Untitled'}"`,
  },
  'task.updated': {
    icon: PencilSquareIcon,
    color: 'bg-blue-100 text-blue-600',
    getMessage: (a) => `updated task "${a.metadata?.title || 'Untitled'}"`,
  },
  'task.moved': {
    icon: ArrowRightIcon,
    color: 'bg-purple-100 text-purple-600',
    getMessage: (a) => `moved task to "${a.metadata?.columnName || 'column'}"`,
  },
  'task.completed': {
    icon: CheckCircleIcon,
    color: 'bg-green-100 text-green-600',
    getMessage: (a) => `completed task "${a.metadata?.title || 'Untitled'}"`,
  },
  'task.deleted': {
    icon: TrashIcon,
    color: 'bg-red-100 text-red-600',
    getMessage: (a) => `deleted task "${a.metadata?.title || 'Untitled'}"`,
  },
  'task.archived': {
    icon: TrashIcon,
    color: 'bg-gray-100 text-gray-600',
    getMessage: (a) => `archived task "${a.metadata?.title || 'Untitled'}"`,
  },
  'comment.added': {
    icon: ChatBubbleLeftIcon,
    color: 'bg-indigo-100 text-indigo-600',
    getMessage: (a) => `commented on "${a.metadata?.taskTitle || 'a task'}"`,
  },
  'attachment.uploaded': {
    icon: PaperClipIcon,
    color: 'bg-yellow-100 text-yellow-600',
    getMessage: (a) => `uploaded a file to "${a.metadata?.taskTitle || 'a task'}"`,
  },
  'project.created': {
    icon: FolderPlusIcon,
    color: 'bg-green-100 text-green-600',
    getMessage: (a) => `created project "${a.metadata?.name || 'Untitled'}"`,
  },
  'board.created': {
    icon: ViewColumnsIcon,
    color: 'bg-blue-100 text-blue-600',
    getMessage: (a) => `created board "${a.metadata?.name || 'Untitled'}"`,
  },
  'column.created': {
    icon: PlusCircleIcon,
    color: 'bg-cyan-100 text-cyan-600',
    getMessage: (a) => `added column "${a.metadata?.name || 'Untitled'}"`,
  },
  'member.added': {
    icon: UserPlusIcon,
    color: 'bg-pink-100 text-pink-600',
    getMessage: () => `added a new team member`,
  },
};

const defaultConfig = {
  icon: PencilSquareIcon,
  color: 'bg-gray-100 text-gray-600',
  getMessage: (a: Activity) => `performed action on ${a.entityType}`,
};

export default function ActivityFeed({ projectId, taskId, limit = 20, showTitle = true, compact = false }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        let url: string;
        if (taskId) {
          url = `/activities/task/${taskId}?limit=${limit}`;
        } else if (projectId) {
          url = `/activities/project/${projectId}?limit=${limit}`;
        } else {
          url = `/activities/me?limit=${limit}`;
        }
        const response = await api.get(url);
        setActivities(response.data.data.activities || []);
      } catch (error) {
        console.error('Failed to fetch activities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [projectId, taskId, limit]);

  const getUserName = (userId: Activity['userId']): string => {
    return typeof userId === 'string' ? 'Someone' : userId.name;
  };

  if (isLoading) {
    return (
      <div className={clsx('flex justify-center', compact ? 'py-4' : 'py-8')}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={clsx('text-center', compact ? 'py-4' : 'py-8')}>
        <PencilSquareIcon className={clsx('text-gray-300 mx-auto mb-2', compact ? 'w-8 h-8' : 'w-10 h-10')} />
        <p className="text-sm text-gray-500">No activity yet</p>
      </div>
    );
  }

  return (
    <div>
      {showTitle && (
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
      )}
      
      <div className="flow-root">
        <ul className="-mb-8">
          {activities.map((activity, index) => {
            const config = activityConfig[activity.type] || defaultConfig;
            const Icon = config.icon;
            const isLast = index === activities.length - 1;

            return (
              <li key={activity._id}>
                <div className="relative pb-8">
                  {/* Connector line */}
                  {!isLast && (
                    <span
                      className="absolute left-4 top-8 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                      aria-hidden="true"
                    />
                  )}

                  <div className="relative flex items-start space-x-3">
                    {/* Icon */}
                    <div
                      className={clsx(
                        'relative flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-white dark:ring-gray-900',
                        config.color
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {getUserName(activity.userId)}
                        </span>{' '}
                        <span className="text-gray-600 dark:text-gray-400">
                          {config.getMessage(activity)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
