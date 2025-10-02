import { Link } from 'react-router-dom';
import { HomeIcon } from '@heroicons/react/24/outline';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-gray-200 dark:text-gray-800">404</h1>
        <h2 className="text-2xl font-bold mt-4">Page not found</h2>
        <p className="text-gray-500 mt-2 max-w-md">
          Sorry, we couldn't find the page you're looking for. 
          It might have been moved or doesn't exist.
        </p>
        <Link to="/" className="btn-primary mt-6 inline-flex">
          <HomeIcon className="w-5 h-5 mr-2" />
          Go back home
        </Link>
      </div>
    </div>
  );
}
