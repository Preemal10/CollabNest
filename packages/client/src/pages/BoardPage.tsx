import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  Cog6ToothIcon,
  UserPlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '@/hooks/useStore';
import { fetchBoardWithTasks, addColumn } from '@/features/boards/boardsSlice';
import { fetchProject } from '@/features/projects/projectsSlice';
import KanbanBoard from '@/components/board/KanbanBoard';
import TaskDetailModal from '@/components/board/TaskDetailModal';
import InviteMemberModal from '@/components/InviteMemberModal';
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
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBoardSettings, setShowBoardSettings] = useState(false);

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
          <button 
            className="btn-ghost"
            onClick={() => setShowInviteModal(true)}
          >
            <UserPlusIcon className="w-5 h-5 mr-2" />
            Share
          </button>
          <button 
            className="btn-ghost"
            onClick={() => setShowBoardSettings(true)}
          >
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
        <TaskDetailModal columnId={newTaskColumnId} onClose={() => setNewTaskColumnId(null)} />
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

      {/* Board Settings Modal */}
      {showBoardSettings && (
        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Board Settings</h3>
              <button
                onClick={() => setShowBoardSettings(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Board Name
                </label>
                <input
                  type="text"
                  value={currentBoard?.name || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={currentBoard?.description || ''}
                  disabled
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-white resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Columns
                </label>
                <div className="space-y-2">
                  {currentBoard?.columns.map((column) => (
                    <div key={column._id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      {column.color && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: column.color }}
                        />
                      )}
                      <span className="text-sm">{column.name}</span>
                      {column.taskLimit && (
                        <span className="text-xs text-gray-500">
                          (limit: {column.taskLimit})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowBoardSettings(false)}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {projectId && (
        <InviteMemberModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          projectId={projectId}
          onMemberAdded={() => dispatch(fetchProject(projectId))}
        />
      )}
    </div>
  );
}
