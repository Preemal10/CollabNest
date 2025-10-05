import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { PlusIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import TaskCard from './TaskCard';

interface Task {
  _id: string;
  title: string;
  description?: string;
  columnId: string;
  order: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  labels: Array<{ _id: string; name: string; color: string }>;
  checklist: Array<{ _id: string; isCompleted: boolean }>;
  assignees: Array<{ _id: string; name: string; avatar?: string }>;
  commentCount: number;
  attachmentCount: number;
}

interface BoardColumnProps {
  column: {
    _id: string;
    name: string;
    color?: string;
    taskLimit?: number;
  };
  tasks: Task[];
  onAddTask: () => void;
  onTaskClick: (task: Task) => void;
  onColumnOptions?: () => void;
}

export default function BoardColumn({
  column,
  tasks,
  onAddTask,
  onTaskClick,
  onColumnOptions,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column._id,
  });

  const taskIds = tasks.map((t) => t._id);
  const isOverLimit = column.taskLimit && tasks.length >= column.taskLimit;

  return (
    <div className="flex-shrink-0 w-72 flex flex-col max-h-full">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          {column.color && (
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: column.color }}
            />
          )}
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            {column.name}
          </h3>
          <span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
            {tasks.length}
            {column.taskLimit && `/${column.taskLimit}`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onAddTask}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Add task"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
          {onColumnOptions && (
            <button
              onClick={onColumnOptions}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Column options"
            >
              <EllipsisHorizontalIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* WIP limit warning */}
      {isOverLimit && (
        <div className="mb-2 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
          WIP limit reached ({column.taskLimit})
        </div>
      )}

      {/* Tasks container */}
      <div
        ref={setNodeRef}
        className={clsx(
          'flex-1 overflow-y-auto rounded-lg p-2 space-y-2 min-h-[100px]',
          'bg-gray-50 dark:bg-gray-800/50',
          isOver && 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-300 ring-inset'
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>

        {/* Empty state */}
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 text-gray-400">
            <p className="text-sm">No tasks</p>
            <button
              onClick={onAddTask}
              className="mt-2 text-sm text-primary-500 hover:text-primary-600"
            >
              + Add a task
            </button>
          </div>
        )}
      </div>

      {/* Add task button at bottom */}
      <button
        onClick={onAddTask}
        className="mt-2 w-full py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center gap-1 transition-colors"
      >
        <PlusIcon className="w-4 h-4" />
        Add task
      </button>
    </div>
  );
}
