import { Link } from 'react-router-dom';
import { 
  CheckCircleIcon, 
  UserGroupIcon, 
  BoltIcon,
  ArrowRightIcon 
} from '@heroicons/react/24/outline';

const features = [
  {
    name: 'Kanban Boards',
    description: 'Visualize your workflow with customizable boards and columns.',
    icon: CheckCircleIcon,
  },
  {
    name: 'Real-time Collaboration',
    description: 'Work together seamlessly with instant updates and live cursors.',
    icon: BoltIcon,
  },
  {
    name: 'Team Management',
    description: 'Organize teams, assign tasks, and track progress together.',
    icon: UserGroupIcon,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <CheckCircleIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">CollabNest</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="btn-ghost">
                Sign in
              </Link>
              <Link to="/register" className="btn-primary">
                Get Started
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Project Management
              <span className="block text-primary-600 mt-2">Made Collaborative</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              CollabNest brings your team together with real-time Kanban boards, 
              task management, and seamless collaboration tools.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn-primary text-lg px-8 py-3">
                Start for Free
                <ArrowRightIcon className="w-5 h-5 ml-2" />
              </Link>
              <Link to="/login" className="btn-secondary text-lg px-8 py-3">
                Sign In
              </Link>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.name}
                className="card p-6 text-center hover:shadow-card-hover transition-shadow"
              >
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center mx-auto">
                  <feature.icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{feature.name}</h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

        </div>
      
      </main>
    </div>
  );
}
