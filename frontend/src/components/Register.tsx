import { useState } from 'preact/hooks';
import { route } from 'preact-router';
import { authApi } from '../services/api';
import { setAuthenticated } from '../store/auth';
import axios, { AxiosError } from 'axios';

interface RegisterProps {
  path?: string;
}

export default function Register({ path }: RegisterProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Attempting to register user...');
      await authApi.register(email, password);
      console.log('Registration successful, attempting login...');
      const data = await authApi.login(email, password);
      console.log('Login successful, setting token...');
      setAuthenticated(true, data.access_token);
      route('/');
    } catch (err) {
      console.error('Registration/Login error:', err);
      const error = err as AxiosError<{ detail?: string; message?: string }>;
      if (error.response) {
        console.error('Error response:', error.response.data);
        setError(`Failed to create account: ${error.response.data.detail || error.response.data.message || 'Unknown error'}`);
      } else if (error.request) {
        console.error('No response received:', error.request);
        setError('Failed to connect to the server. Please check if the backend is running.');
      } else {
        console.error('Error details:', error);
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main class="flex-1 flex items-center justify-center px-4 py-12 bg-gray-900">
      <div class="w-full max-w-md">
        <div class="bg-gray-800 rounded-lg shadow-xl p-8">
          <div class="text-center">
            <h2 class="text-3xl font-bold text-white">Create an account</h2>
            <p class="mt-2 text-gray-400">
              Start taking notes today
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
                  class="block text-sm font-medium text-gray-300"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                  class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  class="block text-sm font-medium text-gray-300"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                  class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  class="block text-sm font-medium text-gray-300"
                >
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onInput={(e) =>
                    setConfirmPassword((e.target as HTMLInputElement).value)
                  }
                  class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
            </div>

            <div class="text-center">
              <p class="text-sm text-gray-400">
                Already have an account?{' '}
                <a href="/login" class="text-blue-500 hover:text-blue-400">
                  Sign in
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
} 