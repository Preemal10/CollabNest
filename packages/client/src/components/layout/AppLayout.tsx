import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/hooks/useStore';
import { logout } from '@/features/auth/authSlice';
import { toggleSidebar, setTheme } from '@/features/ui/uiSlice';
import { fetchProjects } from '@/features/projects/projectsSlice';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  FolderIcon,
  Squares2X2Icon,
  Cog6ToothIcon,
  MoonIcon,
  SunIcon,
  ArrowRightOnRectangleIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import NotificationsPanel from '@/components/NotificationsPanel';

interface AppLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { sidebarOpen, theme } = useAppSelector((state) => state.ui);
  const { projects } = useAppSelector((state) => state.projects);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [projectsExpanded, setProjectsExpanded] = useState(true);

  // Fetch projects for sidebar
  useEffect(() => {
    dispatch(fetchProjects(undefined));
  }, [dispatch]);

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleToggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    dispatch(setTheme(newTheme));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => dispatch(toggleSidebar())}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-transform duration-200 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Sidebar header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Squares2X2Icon className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">CollabNest</span>
          </Link>
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => dispatch(toggleSidebar())}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}

          {/* Projects Section */}
          <div className="pt-4">
            <button
              onClick={() => setProjectsExpanded(!projectsExpanded)}
              className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <FolderIcon className="w-5 h-5" />
                Projects
              </div>
              <ChevronDownIcon
                className={clsx(
                  'w-4 h-4 transition-transform',
                  projectsExpanded ? 'rotate-0' : '-rotate-90'
                )}
              />
            </button>

            {projectsExpanded && (
              <div className="mt-1 ml-4 space-y-0.5">
                {projects.slice(0, 8).map((project) => {
                  const isActive = location.pathname.startsWith(`/projects/${project._id}`);
                  return (
                    <Link
                      key={project._id}
                      to={`/projects/${project._id}`}
                      className={clsx(
                        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: project.color || '#6366f1' }}
                      />
                      <span className="truncate">{project.name}</span>
                    </Link>
                  );
                })}
                {projects.length === 0 && (
                  <p className="px-3 py-2 text-xs text-gray-400">No projects yet</p>
                )}
                {projects.length > 8 && (
                  <Link
                    to="/dashboard"
                    className="block px-3 py-1.5 text-xs text-primary-500 hover:text-primary-600"
                  >
                    View all ({projects.length})
                  </Link>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* Sidebar footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="lg:ml-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
          <div className="h-full px-4 flex items-center justify-between">
            {/* Left side */}
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => dispatch(toggleSidebar())}
              >
                <Bars3Icon className="w-5 h-5" />
              </button>

              {/* Search */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search... (Ctrl+K)"
                  className="bg-transparent text-sm outline-none w-48 placeholder-gray-400"
                />
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Theme toggle */}
              <button
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={handleToggleTheme}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <SunIcon className="w-5 h-5" />
                ) : (
                  <MoonIcon className="w-5 h-5" />
                )}
              </button>

              {/* Notifications */}
              <NotificationsPanel />

              {/* User menu */}
              <div className="relative">
                <button
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                </button>

                {/* Dropdown */}
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                        <p className="font-medium text-sm">{user?.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      </div>
                      <div className="p-1">
                        <Link
                          to="/settings"
                          className="dropdown-item"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Cog6ToothIcon className="w-4 h-4 mr-2" />
                          Settings
                        </Link>
                        <button
                          className="dropdown-item text-red-600 dark:text-red-400 w-full"
                          onClick={handleLogout}
                        >
                          <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main>{children}</main>
      </div>
    </div>
  );
}
