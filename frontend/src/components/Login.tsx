import { useState } from 'preact/hooks';
import { route } from 'preact-router';
import { authApi } from '../services/api';
import { setAuthenticated, startTokenRefresh } from '../store/auth';
import { getThemeClasses } from '../theme';
import { currentTheme } from '../store/theme';

interface LoginProps {
  path?: string;
}

export default function Login({ path }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const toggleShowPassword = () => setShowPassword(prev => !prev);
  const theme = getThemeClasses();

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await authApi.login(email, password);
      setAuthenticated(true, data.access_token, data.refresh_token);
      startTokenRefresh();
      route('/');
    } catch (error) {
      console.error('Login error:', error);
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  currentTheme.value;

  const getLoginGradient = () => {
    switch (currentTheme.value) {
      case 'light':
        return 'bg-gradient-to-br from-white via-gray-50 to-gray-100';
      case 'dark':
        return 'bg-gradient-to-br from-[#202124] via-[#242528] to-[#2d2e30]';
      case 'night':
        return 'bg-gradient-to-br from-[#191919] via-[#1f1f1f] to-[#251a1a]';
      default:
        return theme.paper;
    }
  };

  return (
    <div class={`w-full min-h-screen flex items-center justify-center ${getLoginGradient()}`}>
      <div class={`w-full max-w-md space-y-8 p-8 ${theme.paper} rounded-lg shadow-xl border ${theme.border}`}>
        <div class="text-center">
          <h2 class={`text-3xl font-bold ${theme.text}`}>Welcome back</h2>
          <p class={`mt-2 ${theme.textSecondary}`}>
            Sign in to your account
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
              <div class="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                  class={`w-full px-3 py-2 ${theme.paper} border ${theme.border} rounded-md ${theme.text} placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="••••••••"
                />
                <button type="button" onClick={toggleShowPassword} class="absolute inset-y-0 right-0 pr-3 flex items-center bg-transparent border-0 focus:outline-none">
                  { showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5 transition-all duration-300">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-8.268-2.943-" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5 transition-all duration-300">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a10.05 10.05 0 012.293-3.71" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6.42 6.42A9.978 9.978 0 0112 5c4.477 0 8.268 2.943 9.542 7a10.05 10.05 0 01-4.293 5.585" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              class={`w-full flex justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium ${theme.button} ${theme.buttonHover} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div class="text-center">
            <p class={`text-sm ${theme.textSecondary}`}>
              Don't have an account?{' '}
              <a href="/register" class={`underline ${theme.registerButton}`}>
                Register
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
} 