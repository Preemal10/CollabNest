import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  CalendarIcon, 
  ChatBubbleLeftIcon, 
  PaperClipIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { format, isPast, isToday, isTomorrow } from 'date-fns';

interface TaskCardProps {
  task: {
    _id: string;
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    dueDate?: string;
    labels: Array<{ _id: string; name: string; color: string }>;
    checklist: Array<{ _id: string; isCompleted: boolean }>;
    assignees: Array<{ _id: string; name: string; avatar?: string }>;
    commentCount: number;
    attachmentCount: number;
  };
  onClick: () => void;
  isDragging?: boolean;
}

const priorityBorderColors = {
  low: 'border-l-gray-400',
  medium: 'border-l-blue-400',
  high: 'border-l-orange-400',
  urgent: 'border-l-red-400',
};

export default function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragging = isDragging || isSortableDragging;

  // Calculate due date display
  const getDueDateInfo = () => {
    if (!task.dueDate) return null;
    
    const dueDate = new Date(task.dueDate);
    const isOverdue = isPast(dueDate) && !isToday(dueDate);
    
    let dateText = format(dueDate, 'MMM d');
    if (isToday(dueDate)) dateText = 'Today';
    else if (isTomorrow(dueDate)) dateText = 'Tomorrow';

    return {
      text: dateText,
      isOverdue,
      isToday: isToday(dueDate),
      isTomorrow: isTomorrow(dueDate),
    };
  };

  const dueDateInfo = getDueDateInfo();

  // Calculate checklist progress
  const checklistTotal = task.checklist.length;
  const checklistCompleted = task.checklist.filter(item => item.isCompleted).length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={clsx(
        'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700',
        'p-3 cursor-pointer hover:shadow-md transition-shadow',
        'border-l-4',
        priorityBorderColors[task.priority],
        dragging && 'opacity-50 shadow-lg rotate-2'
      )}
    >
      {/* Labels */}
      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.slice(0, 3).map((label) => (
            <span
              key={label._id}
              className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
          {task.labels.length > 3 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
              +{task.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Title */}
      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
        {task.title}
      </h4>

      {/* Meta info row */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          {/* Due date */}
          {dueDateInfo && (
            <div
              className={clsx(
                'flex items-center gap-1',
                dueDateInfo.isOverdue && 'text-red-500',
                dueDateInfo.isToday && 'text-orange-500',
                dueDateInfo.isTomorrow && 'text-yellow-600'
              )}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>{dueDateInfo.text}</span>
            </div>
          )}

          {/* Checklist progress */}
          {checklistTotal > 0 && (
            <div
              className={clsx(
                'flex items-center gap-1',
                checklistCompleted === checklistTotal && 'text-green-500'
              )}
            >
              <CheckCircleIcon className="w-3.5 h-3.5" />
              <span>{checklistCompleted}/{checklistTotal}</span>
            </div>
          )}

          {/* Comments */}
          {task.commentCount > 0 && (
            <div className="flex items-center gap-1">
              <ChatBubbleLeftIcon className="w-3.5 h-3.5" />
              <span>{task.commentCount}</span>
            </div>
          )}

          {/* Attachments */}
          {task.attachmentCount > 0 && (
            <div className="flex items-center gap-1">
              <PaperClipIcon className="w-3.5 h-3.5" />
              <span>{task.attachmentCount}</span>
            </div>
          )}
        </div>

        {/* Assignees */}
        {task.assignees.length > 0 && (
          <div className="flex -space-x-2">
            {task.assignees.slice(0, 3).map((assignee) => (
              <div
                key={assignee._id}
                className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-medium ring-2 ring-white dark:ring-gray-800"
                title={assignee.name}
              >
                {assignee.avatar ? (
                  <img
                    src={assignee.avatar}
                    alt={assignee.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  assignee.name.charAt(0).toUpperCase()
                )}
              </div>
            ))}
            {task.assignees.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-medium ring-2 ring-white dark:ring-gray-800">
                +{task.assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
