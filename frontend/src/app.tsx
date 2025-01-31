import { Router } from 'preact-router';
import { useEffect } from 'preact/hooks';
import './app.css';
import Header from './components/Header';
import Login from './components/Login';
import Register from './components/Register';
import NotesList from './components/NotesList';
import NoteEditor from './components/NoteEditor';
import { Note } from './services/api';
import { signal } from '@preact/signals';
import { isAuthenticated } from './store/auth';
import { route } from 'preact-router';
import { getThemeClasses } from './theme';

export const notes = signal<Note[]>([]);

export function App() {
  useEffect(() => {
    // Check authentication on mount
    if (!isAuthenticated.value && window.location.pathname !== '/register') {
      route('/login');
    }
  }, []);

  // Handle route changes
  const handleRoute = (e: { url: string }) => {
    const publicRoutes = ['/login', '/register'];
    if (!isAuthenticated.value && !publicRoutes.includes(e.url)) {
      route('/login');
    }
  };

  const theme = getThemeClasses();

  return (
    <div class={`min-h-screen flex flex-col ${theme.background}`}>
      <Header />
      <main class="flex-1 container mx-auto py-6 px-4">
        <Router onChange={handleRoute}>
          <NotesList path="/" />
          <Login path="/login" />
          <Register path="/register" />
          <NoteEditor path="/notes/new" />
          <NoteEditor path="/notes/:id" />
        </Router>
      </main>
    </div>
  );
}
