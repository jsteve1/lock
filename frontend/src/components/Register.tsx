import { useState } from 'preact/hooks';
import { route } from 'preact-router';
import { authApi } from '../services/api';
import { setAuthenticated, startTokenRefresh } from '../store/auth';
import { getThemeClasses } from '../theme';
import { currentTheme } from '../store/theme';

interface RegisterProps {
  path?: string;
}

export default function Register({ path }: RegisterProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const theme = getThemeClasses();

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const data = await authApi.register(email, password);
      setAuthenticated(true, data.access_token, data.refresh_token);
      startTokenRefresh();
      route('/');
    } catch (error) {
      console.error('Registration error:', error);
      setError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Force component to re-render when theme changes
  currentTheme.value;

  return (
    <div class={`w-full min-h-screen flex items-center justify-center ${theme.paper}`}>
      <div class={`w-full max-w-md space-y-8 p-8 ${theme.paper} rounded-lg shadow-xl border ${theme.border}`}>
        <div class="text-center">
          <h2 class={`text-3xl font-bold ${theme.text}`}>Create an account</h2>
          <p class={`mt-2 ${theme.textSecondary}`}>
            Sign up to get started
          </p>
        </div>

        <form class="mt-8 space-y-6" onSubmit={handleSubmit} role="form">
          {error && (
            <div class="p-3 bg-red-500/10 text-red-500 rounded-md text-sm">
              {error}
            </div>
          )}

          <div class="space-y-4">
            <div>
              <label
                htmlFor="email"
                class={`block text-sm font-medium ${theme.textSecondary}`}
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                class={`mt-1 block w-full px-3 py-2 ${theme.paper} border ${theme.border} rounded-md ${theme.text} placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                class={`block text-sm font-medium ${theme.textSecondary}`}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                class={`mt-1 block w-full px-3 py-2 ${theme.paper} border ${theme.border} rounded-md ${theme.text} placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="••••••••"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                class={`block text-sm font-medium ${theme.textSecondary}`}
              >
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onInput={(e) => setConfirmPassword((e.target as HTMLInputElement).value)}
                class={`mt-1 block w-full px-3 py-2 ${theme.paper} border ${theme.border} rounded-md ${theme.text} placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              class={`w-full flex justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium ${theme.button} ${theme.buttonHover} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <div class="text-center">
            <p class={`text-sm ${theme.textSecondary}`}>
              Already have an account?{' '}
              <a href="/login" class={`underline ${theme.registerButton}`}>
                Sign in
              </a>
            </p>

          </div>
        </form>
      </div>
    </div>
  );
} 