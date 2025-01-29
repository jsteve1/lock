import { Router, Route } from 'preact-router';
import { isAuthenticated } from './store/auth';
import Login from './components/Login';
import Register from './components/Register';
import Notes from './components/Notes';
import NoteEditor from './components/NoteEditor';
import Header from './components/Header';

export function App() {
  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main class="container mx-auto px-4 py-8">
        <Router>
          <Route path="/" component={isAuthenticated.value ? Notes : Login} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/notes/new" component={NoteEditor} />
          <Route path="/notes/:id" component={NoteEditor} />
        </Router>
      </main>
    </div>
  );
}
