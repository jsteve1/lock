import { signal } from '@preact/signals';
import { authApi } from '../services/api';

// Initialize authentication state from localStorage
export const isAuthenticated = signal<boolean>(!!localStorage.getItem('token'));

export const setAuthenticated = (value: boolean, token?: string, refreshToken?: string) => {
  isAuthenticated.value = value;
  if (value && token) {
    localStorage.setItem('token', token);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
  } else if (!value) {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('encryptionKey');
  isAuthenticated.value = false;
};

// Function to refresh the access token
export const refreshToken = async (): Promise<boolean> => {
  try {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (!storedRefreshToken) {
      return false;
    }

    const data = await authApi.refreshToken(storedRefreshToken);
    setAuthenticated(true, data.access_token, data.refresh_token);
    return true;
  } catch (error) {
    console.error('Token refresh failed:', error);
    logout();
    return false;
  }
};

// Set up periodic token refresh
let refreshInterval: number | undefined;

export const startTokenRefresh = () => {
  // Clear any existing interval
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }

  // Refresh token every 10 minutes
  refreshInterval = window.setInterval(refreshToken, 10 * 60 * 1000);
};

export const stopTokenRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = undefined;
  }
}; 