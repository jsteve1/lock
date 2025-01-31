import { route } from 'preact-router';
import { isAuthenticated, setAuthenticated } from '../store/auth';
import { useState } from 'preact/hooks';
import { colorMode, type ColorMode, getThemeClasses } from '../theme';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const theme = getThemeClasses();

  const handleLogout = () => {
    setAuthenticated(false);
    route('/login');
  };

  const handleThemeChange = () => {
    const modes: ColorMode[] = ['light', 'dark', 'night'];
    const currentIndex = modes.indexOf(colorMode.value);
    const nextIndex = (currentIndex + 1) % modes.length;
    colorMode.value = modes[nextIndex];
  };

  const getThemeIcon = () => {
    switch (colorMode.value) {
      case 'light':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'dark':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        );
      case 'night':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
          </svg>
        );
    }
  };

  return (
    <header class={`${theme.paper} border-b ${theme.border}`}>
      <div class="container mx-auto px-4">
        <div class="flex justify-between items-center h-16">
          {/* Logo */}
          <div class="flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              class={`p-2 rounded-full ${theme.text} hover:bg-gray-700`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span class={`ml-3 text-xl font-bold ${theme.text} select-none`}>
              Lock
            </span>
          </div>

          {/* Actions */}
          <div class="flex items-center space-x-4">
            {isAuthenticated.value ? (
              <>
                <button
                  onClick={() => route('/notes/new')}
                  class={`p-2 rounded-full ${theme.text} hover:bg-gray-700`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button
                  onClick={handleThemeChange}
                  class={`p-2 rounded-full ${theme.text} hover:bg-gray-700`}
                >
                  {getThemeIcon()}
                </button>
                <button
                  onClick={handleLogout}
                  class={`px-4 py-2 rounded-md ${theme.text} hover:bg-gray-700`}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => route('/login')}
                  class={`px-4 py-2 rounded-md ${theme.text} hover:bg-gray-700`}
                >
                  Login
                </button>
                <button
                  onClick={() => route('/register')}
                  class="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Side Menu */}
      {isMenuOpen && (
        <div
          class={`fixed inset-0 z-50 ${theme.paper}`}
          onClick={() => setIsMenuOpen(false)}
        >
          <div class={`w-64 h-full ${theme.paper} border-r ${theme.border}`}>
            <div class="p-4">
              <button
                onClick={() => { route('/'); setIsMenuOpen(false); }}
                class={`block w-full text-left px-4 py-2 rounded-md ${theme.text} hover:bg-gray-700`}
              >
                Notes
              </button>
              <button
                onClick={() => { route('/archive'); setIsMenuOpen(false); }}
                class={`block w-full text-left px-4 py-2 rounded-md ${theme.text} hover:bg-gray-700`}
              >
                Archive
              </button>
              <button
                onClick={() => { route('/trash'); setIsMenuOpen(false); }}
                class={`block w-full text-left px-4 py-2 rounded-md ${theme.text} hover:bg-gray-700`}
              >
                Trash
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
} 