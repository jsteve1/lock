import { route } from 'preact-router';
import { isAuthenticated, setAuthenticated } from '../store/auth';

export default function Header() {
  const handleLogout = () => {
    setAuthenticated(false);
    route('/login');
  };

  return (
    <header class="bg-white dark:bg-gray-800 shadow">
      <div class="container mx-auto px-4">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <a href="/" class="text-xl font-bold text-gray-900 dark:text-white">
              Keep Clone
            </a>
          </div>
          
          <div class="flex items-center space-x-4">
            {isAuthenticated.value ? (
              <>
                <a
                  href="/notes/new"
                  class="btn btn-primary"
                >
                  New Note
                </a>
                <button
                  onClick={handleLogout}
                  class="btn btn-secondary"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <a
                  href="/login"
                  class="btn btn-secondary"
                >
                  Login
                </a>
                <a
                  href="/register"
                  class="btn btn-primary"
                >
                  Register
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 