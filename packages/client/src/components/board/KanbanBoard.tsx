import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { PlusIcon } from '@heroicons/react/24/outline';
import BoardColumn from './BoardColumn';
import TaskCard from './TaskCard';
import { useAppDispatch, useAppSelector } from '@/hooks/useStore';
import { moveTask, optimisticMoveTask, openTaskModal } from '@/features/boards/boardsSlice';

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

interface KanbanBoardProps {
  onAddTask: (columnId: string) => void;
  onAddColumn?: () => void;
}

export default function KanbanBoard({ onAddTask, onAddColumn }: KanbanBoardProps) {
  const dispatch = useAppDispatch();
  const { currentBoard, tasksByColumn, isLoadingTasks } = useAppSelector(
    (state) => state.boards
  );

  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const taskId = active.id as string;
    
    // Find the task
    for (const tasks of Object.values(tasksByColumn)) {
      const task = tasks.find((t) => t._id === taskId);
      if (task) {
        setActiveTask(task as Task);
        break;
      }
    }
  }, [tasksByColumn]);

  // Handle drag over (for real-time visual feedback)
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find source column
    let sourceColumnId: string | null = null;
    for (const [columnId, tasks] of Object.entries(tasksByColumn)) {
      if (tasks.find((t) => t._id === activeId)) {
        sourceColumnId = columnId;
        break;
      }
    }

    // Determine target column
    let targetColumnId = overId;
    
    // If over is a task, find its column
    if (!currentBoard?.columns.find((c) => c._id === overId)) {
      for (const [columnId, tasks] of Object.entries(tasksByColumn)) {
        if (tasks.find((t) => t._id === overId)) {
          targetColumnId = columnId;
          break;
        }
      }
    }

    // No change needed if same column
    if (sourceColumnId === targetColumnId) return;

    // Optimistic update - move task to new column
    if (sourceColumnId && targetColumnId !== sourceColumnId) {
      dispatch(optimisticMoveTask({
        taskId: activeId,
        toColumnId: targetColumnId,
        newOrder: 0, // Will be recalculated
      }));
    }
  }, [tasksByColumn, currentBoard?.columns, dispatch]);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Determine target column
    let targetColumnId = overId;
    let newOrder = 0;

    // If dropped on a column directly
    if (currentBoard?.columns.find((c) => c._id === overId)) {
      targetColumnId = overId;
      const targetTasks = tasksByColumn[targetColumnId] || [];
      newOrder = targetTasks.length; // Add at end
    } else {
      // Dropped on another task - find its column and position
      for (const [columnId, tasks] of Object.entries(tasksByColumn)) {
        const taskIndex = tasks.findIndex((t) => t._id === overId);
        if (taskIndex !== -1) {
          targetColumnId = columnId;
          newOrder = taskIndex;
          break;
        }
      }
    }

    // Dispatch actual move to server
    dispatch(moveTask({
      id: taskId,
      payload: {
        columnId: targetColumnId,
        order: newOrder,
      },
    }));
  }, [currentBoard?.columns, tasksByColumn, dispatch]);

  // Handle task click
  const handleTaskClick = useCallback((task: Task) => {
    dispatch(openTaskModal(task as any));
  }, [dispatch]);

  if (!currentBoard) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No board selected
      </div>
    );
  }

  if (isLoadingTasks) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const sortedColumns = [...currentBoard.columns].sort((a, b) => a.order - b.order);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 px-4 h-full">
        {sortedColumns.map((column) => (
          <BoardColumn
            key={column._id}
            column={column}
            tasks={(tasksByColumn[column._id] || []) as Task[]}
            onAddTask={() => onAddTask(column._id)}
            onTaskClick={handleTaskClick}
          />
        ))}

        {/* Add column button */}
        {onAddColumn && (
          <div className="flex-shrink-0 w-72">
            <button
              onClick={onAddColumn}
              className="w-full h-12 flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Add column
            </button>
          </div>
        )}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeTask ? (
          <div className="w-72">
            <TaskCard
              task={activeTask}
              onClick={() => {}}
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
