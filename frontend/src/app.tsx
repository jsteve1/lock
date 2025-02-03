import { Router } from 'preact-router';
import { useEffect } from 'preact/hooks';
import './app.css';
import Header from './components/Header';
import Login from './components/Login';
import Register from './components/Register';
import NotesList from './components/NotesList';
import { Note } from './services/api';
import { signal } from '@preact/signals';
import { isAuthenticated, startTokenRefresh, stopTokenRefresh } from './store/auth';
import { route } from 'preact-router';
import { getThemeClasses } from './theme';
import { currentTheme } from './store/theme';

export const notes = signal<Note[]>([]);

export default function App() {
  useEffect(() => {
    // Check authentication on mount
    if (!isAuthenticated.value && window.location.pathname !== '/register') {
      route('/login');
    }

    // Start token refresh if user is authenticated
    if (isAuthenticated.value) {
      startTokenRefresh();
    }

    // Clean up on unmount
    return () => {
      stopTokenRefresh();
    };
  }, []);

  // Handle route changes
  const handleRoute = (e: { url: string }) => {
    const publicRoutes = ['/login', '/register'];
    if (!isAuthenticated.value && !publicRoutes.includes(e.url)) {
      route('/login');
    }
  };

  const theme = getThemeClasses();
  
  // Force re-render when theme changes
  currentTheme.value;

  return (
    <div class={`min-h-screen flex flex-col ${theme.background}`}>
      <Header />
      <main class={`flex-1 pt-16 pb-8 ${theme.background}`} style={{ height: '100%', padding: '0px' }}>
        <Router onChange={handleRoute}>
          <NotesList path="/" />
          <NotesList path="/archive" />
          <NotesList path="/trash" />
          <Login path="/login" />
          <Register path="/register" />
        </Router>
      </main>
    </div>
  );
}
