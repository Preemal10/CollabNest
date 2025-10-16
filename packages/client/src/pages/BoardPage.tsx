import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  Cog6ToothIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '@/hooks/useStore';
import { fetchBoardWithTasks, addColumn } from '@/features/boards/boardsSlice';
import { fetchProject } from '@/features/projects/projectsSlice';
import KanbanBoard from '@/components/board/KanbanBoard';
import TaskDetailModal from '@/components/board/TaskDetailModal';
import { joinBoard, leaveBoard } from '@/services/socket';

export default function BoardPage() {
  const { projectId, boardId } = useParams<{ projectId: string; boardId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { currentBoard, isLoading, error, isTaskModalOpen } = useAppSelector(
    (state) => state.boards
  );
  const { currentProject } = useAppSelector((state) => state.projects);

  const [newTaskColumnId, setNewTaskColumnId] = useState<string | null>(null);
  const [showAddColumnInput, setShowAddColumnInput] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  // Fetch board and tasks
  useEffect(() => {
    if (boardId) {
      dispatch(fetchBoardWithTasks(boardId));
      joinBoard(boardId);
    }

    return () => {
      if (boardId) {
        leaveBoard(boardId);
      }
    };
  }, [boardId, dispatch]);

  // Fetch project if not already loaded
  useEffect(() => {
    if (projectId && (!currentProject || currentProject._id !== projectId)) {
      dispatch(fetchProject(projectId));
    }
  }, [projectId, currentProject, dispatch]);

  const handleAddTask = (columnId: string) => {
    setNewTaskColumnId(columnId);
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim() || !boardId) return;

    try {
      await dispatch(addColumn({
        boardId,
        payload: { name: newColumnName.trim() },
      })).unwrap();
      setNewColumnName('');
      setShowAddColumnInput(false);
    } catch (error) {
      console.error('Failed to add column:', error);
    }
  };

  if (isLoading && !currentBoard) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="btn-primary"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-4">
          <Link
            to={`/projects/${projectId}`}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              {currentProject && (
                <Link
                  to={`/projects/${projectId}`}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  {currentProject.name}
                </Link>
              )}
              <span className="text-gray-400">/</span>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {currentBoard?.name || 'Board'}
              </h1>
            </div>
            {currentBoard?.description && (
              <p className="text-sm text-gray-500 mt-0.5">{currentBoard.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="btn-ghost">
            <UserPlusIcon className="w-5 h-5 mr-2" />
            Share
          </button>
          <button className="btn-ghost">
            <Cog6ToothIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-800">
        <KanbanBoard
          onAddTask={handleAddTask}
          onAddColumn={() => setShowAddColumnInput(true)}
        />
      </div>

      {/* Task Modal for creating new tasks */}
      {newTaskColumnId && (
        <TaskDetailModal columnId={newTaskColumnId} />
      )}

      {/* Task Modal for editing (from Redux state) */}
      {isTaskModalOpen && !newTaskColumnId && (
        <TaskDetailModal />
      )}

      {/* Add Column Modal */}
      {showAddColumnInput && (
        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Column</h3>
            <input
              type="text"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              placeholder="Column name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddColumn();
                if (e.key === 'Escape') setShowAddColumnInput(false);
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddColumnInput(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddColumn}
                disabled={!newColumnName.trim()}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
              >
                Add Column
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
