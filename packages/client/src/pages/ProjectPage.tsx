import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  Cog6ToothIcon,
  UserPlusIcon,
  PlusIcon,
  ViewColumnsIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '@/hooks/useStore';
import { fetchProject } from '@/features/projects/projectsSlice';
import { fetchBoardsByProject, createBoard } from '@/features/boards/boardsSlice';
import InviteMemberModal from '@/components/InviteMemberModal';

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { currentProject, isLoading: projectLoading, error: projectError } = useAppSelector(
    (state) => state.projects
  );
  const { boards, isLoading: boardsLoading } = useAppSelector((state) => state.boards);

  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);

  useEffect(() => {
    if (projectId) {
      dispatch(fetchProject(projectId));
      dispatch(fetchBoardsByProject(projectId));
    }
  }, [projectId, dispatch]);

  const handleCreateBoard = async () => {
    if (!newBoardName.trim() || !projectId) return;

    setIsCreatingBoard(true);
    try {
      const result = await dispatch(createBoard({
        name: newBoardName.trim(),
        description: newBoardDescription.trim() || undefined,
        projectId,
      })).unwrap();
      
      setShowCreateBoard(false);
      setNewBoardName('');
      setNewBoardDescription('');
      
      // Navigate to the new board
      navigate(`/projects/${projectId}/boards/${result._id}`);
    } catch (error) {
      console.error('Failed to create board:', error);
    } finally {
      setIsCreatingBoard(false);
    }
  };

  const isLoading = projectLoading || boardsLoading;

  if (isLoading && !currentProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (projectError) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-red-500 mb-4">{projectError}</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary">
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              {currentProject?.key && (
                <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 rounded">
                  {currentProject.key}
                </span>
              )}
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentProject?.name}
              </h1>
            </div>
            {currentProject?.description && (
              <p className="text-gray-500 mt-1">{currentProject.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            className="btn-ghost"
            onClick={() => setShowInviteModal(true)}
          >
            <UserPlusIcon className="w-5 h-5 mr-2" />
            Invite
          </button>
          <button className="btn-ghost">
            <Cog6ToothIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ViewColumnsIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{boards.length}</p>
              <p className="text-sm text-gray-500">Boards</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <ClockIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{currentProject?.members?.length || 1}</p>
              <p className="text-sm text-gray-500">Members</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <ClockIcon className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">-</p>
              <p className="text-sm text-gray-500">Tasks In Progress</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">-</p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Boards Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Boards</h2>
          <button
            onClick={() => setShowCreateBoard(true)}
            className="btn-primary"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            New Board
          </button>
        </div>

        {boards.length === 0 ? (
          <div className="card p-12 text-center">
            <ViewColumnsIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No boards yet
            </h3>
            <p className="text-gray-500 mb-4">
              Create your first board to start organizing tasks
            </p>
            <button
              onClick={() => setShowCreateBoard(true)}
              className="btn-primary"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Board
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => (
              <Link
                key={board._id}
                to={`/projects/${projectId}/boards/${board._id}`}
                className="card p-4 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-primary-600">
                      {board.name}
                    </h3>
                    {board.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {board.description}
                      </p>
                    )}
                  </div>
                  {board.isDefault && (
                    <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                  <span>{board.columns.length} columns</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Members Section */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Team Members</h2>
        <div className="card">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {currentProject?.members?.map((member: any) => (
              <div key={member.userId?._id || member.userId} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium">
                    {member.userId?.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {member.userId?.name || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-500">{member.userId?.email}</p>
                  </div>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded capitalize">
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Board Modal */}
      {showCreateBoard && (
        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create New Board</h3>
              <button
                onClick={() => setShowCreateBoard(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Board Name *
                </label>
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="Enter board name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newBoardName.trim()) handleCreateBoard();
                    if (e.key === 'Escape') setShowCreateBoard(false);
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newBoardDescription}
                  onChange={(e) => setNewBoardDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCreateBoard(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBoard}
                disabled={!newBoardName.trim() || isCreatingBoard}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
              >
                {isCreatingBoard ? 'Creating...' : 'Create Board'}
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
