import { signal } from '@preact/signals';

// Initialize authentication state from localStorage
export const isAuthenticated = signal<boolean>(!!localStorage.getItem('token'));

export const setAuthenticated = (value: boolean, token?: string) => {
  isAuthenticated.value = value;
  if (value && token) {
    localStorage.setItem('token', token);
  } else if (!value) {
    localStorage.removeItem('token');
  }
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('encryptionKey');
  isAuthenticated.value = false;
}; 