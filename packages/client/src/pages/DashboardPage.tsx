import { useEffect, useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import { useAppSelector, useAppDispatch } from '@/hooks/useStore';
import { 
  FolderIcon, 
  CheckCircleIcon, 
  ClockIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { fetchProjects, createProject } from '@/features/projects/projectsSlice';
import { tasksApi } from '@/services/api';
import ActivityFeed from '@/components/ActivityFeed';

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { projects, isLoading } = useAppSelector((state) => state.projects);

  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Fetch projects on mount
  useEffect(() => {
    dispatch(fetchProjects(undefined));
  }, [dispatch]);

  // Fetch my tasks
  useEffect(() => {
    tasksApi.getMyTasks()
      .then(res => setMyTasks(res.tasks || []))
      .catch(err => console.error('Failed to fetch tasks:', err));
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setIsCreating(true);
    try {
      await dispatch(createProject({
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || undefined,
      })).unwrap();
      setNewProjectName('');
      setNewProjectDescription('');
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const stats = [
    { name: 'Total Projects', value: projects.length.toString(), icon: FolderIcon, color: 'bg-blue-500' },
    { name: 'My Tasks', value: myTasks.length.toString(), icon: CheckCircleIcon, color: 'bg-green-500' },
    { name: 'Pending', value: myTasks.filter(t => !t.isArchived).length.toString(), icon: ClockIcon, color: 'bg-yellow-500' },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Welcome back, {user?.name || 'User'}!
        </h1>
        <p className="text-gray-500 mt-1">
          Here's what's happening with your projects today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="card p-6">
            <div className="flex items-center">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="card">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="font-semibold">Recent Projects</h2>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-ghost text-sm"
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              New
            </button>
          </div>
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : projects.length === 0 ? (
            <div className="p-8 text-center">
              <FolderIcon className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-gray-500 mt-2">No projects yet</p>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-primary mt-4"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Create Project
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {projects.slice(0, 5).map((project) => (
                <Link
                  key={project._id}
                  to={`/projects/${project._id}`}
                  className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {project.key && (
                          <span className="px-1.5 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 rounded">
                            {project.key}
                          </span>
                        )}
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {project.name}
                        </h3>
                      </div>
                      {project.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {project.members?.length || 1} member{(project.members?.length || 1) > 1 ? 's' : ''}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Assigned Tasks */}
        <div className="card">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="font-semibold">My Tasks</h2>
          </div>
          {myTasks.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircleIcon className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-gray-500 mt-2">No tasks assigned</p>
              <p className="text-sm text-gray-400 mt-1">
                Tasks assigned to you will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {myTasks.slice(0, 5).map((task) => (
                <div key={task._id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {task.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {task.priority} priority
                        {task.dueDate && ` · Due ${new Date(task.dueDate).toLocaleDateString()}`}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                      task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                      task.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="card mt-6">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold">Recent Activity</h2>
        </div>
        <div className="p-4">
          <ActivityFeed limit={15} showTitle={false} />
        </div>
      </div>

      {/* Create Project Modal */}
      <Transition appear show={isCreateModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsCreateModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white dark:bg-gray-900 shadow-xl transition-all">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <Dialog.Title className="text-lg font-semibold">
                      Create Project
                    </Dialog.Title>
                    <button
                      onClick={() => setIsCreateModalOpen(false)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handleCreateProject} className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Project Name *
                      </label>
                      <input
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white"
                        placeholder="My Awesome Project"
                        required
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white resize-none"
                        placeholder="What's this project about?"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(false)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isCreating || !newProjectName.trim()}
                        className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                      >
                        {isCreating ? 'Creating...' : 'Create Project'}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
