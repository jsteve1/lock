import { route } from 'preact-router';
import { isAuthenticated, setAuthenticated } from '../store/auth';
import { useState } from 'preact/hooks';
import { getThemeClasses, Theme, ThemeClasses } from '../theme';
import { currentTheme, useSystemTheme } from '../store/theme';
import NoteEditorOverlay from './NoteEditorOverlay';
import { PcDisplay } from 'react-bootstrap-icons';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const theme: ThemeClasses = getThemeClasses();

  const handleLogout = () => {
    setAuthenticated(false);
    route('/login');
  };

  const handleThemeChange = () => {
    const modes: Theme[] = ['light', 'dark', 'night'];
    const currentIndex = useSystemTheme.value ? -1 : modes.indexOf(currentTheme.value);
    const nextIndex = (currentIndex + 1) % (modes.length + 1);
    
    if (nextIndex === modes.length) {
      // Switch to system theme
      useSystemTheme.value = true;
    } else {
      useSystemTheme.value = false;
      currentTheme.value = modes[nextIndex];
    }
  };

  const handleCreateNote = () => {
    setIsEditorOpen(true);
  };

  const getThemeIcon = () => {
    if (useSystemTheme.value) {
      return <PcDisplay className="h-6 w-6" />;
    }

    switch (currentTheme.value) {
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
    <>
      <header class={`fixed top-0 left-0 right-0 z-40 ${theme.paper} border-b ${theme.border}`}>
        <div class="flex items-center justify-between px-4 h-14">
          <div class="flex items-center gap-4">
            {isAuthenticated.value && (
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                class={`p-2 rounded-full ${theme.buttonHover}`}
              >
                <svg class="w-6 h-6" fill="none" stroke={theme.svgStroke} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <div class="flex items-center gap-2">
              <h1 class={`text-xl font-medium ${theme.text}`}>NoteLocker</h1>
            </div>
          </div>
          <div class="flex items-center gap-2">
            {isAuthenticated.value && (
              <button
                onClick={handleCreateNote}
                class={`p-2 rounded-full ${theme.buttonHover}`}
                title="Create new note"
              >
                <svg class="w-6 h-6" fill="none" stroke={theme.svgStroke} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
            <button
              onClick={handleThemeChange}
              class={`p-2 rounded-full ${theme.text} ${theme.buttonHover} ${useSystemTheme.value ? 'bg-blue-500/10' : ''}`}
              title={useSystemTheme.value ? 'Using system theme' : `Current theme: ${currentTheme.value}`}
            >
              {getThemeIcon()}
            </button>
            {isAuthenticated.value && (
              <button
                onClick={handleLogout}
                class={`px-4 py-2 rounded-md ${theme.text} border-none ${theme.buttonHover}`}
              >
                Logout
              </button>
            )}
          </div>
        </div>

        {/* Side Menu */}
        {isMenuOpen && isAuthenticated.value && (
          <>
            <div
              class="fixed inset-0 z-50 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setIsMenuOpen(false)}
            />
            <div 
              class={`fixed left-0 top-0 bottom-0 z-50 w-[300px] ${theme.paper} border-r ${theme.border} transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
              <div class="p-4">
                <button
                  onClick={() => { route('/'); setIsMenuOpen(false); }}
                  class={`block w-full text-left px-4 py-2 rounded-md ${theme.text} ${theme.buttonHover}`}
                >
                  Notes
                </button>
                <button
                  onClick={() => { route('/archive'); setIsMenuOpen(false); }}
                  class={`block w-full text-left px-4 py-2 rounded-md ${theme.text} ${theme.buttonHover}`}
                >
                  Archive
                </button>
                <button
                  onClick={() => { route('/trash'); setIsMenuOpen(false); }}
                  class={`block w-full text-left px-4 py-2 rounded-md ${theme.text} ${theme.buttonHover}`}
                >
                  Trash
                </button>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Note Editor Overlay */}
      {isEditorOpen && (
        <NoteEditorOverlay
          onClose={() => setIsEditorOpen(false)}
        />
      )}
    </>
  );
}