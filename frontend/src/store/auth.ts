import { signal } from '@preact/signals';

export const isAuthenticated = signal<boolean>(!!localStorage.getItem('token'));

export const setAuthenticated = (value: boolean) => {
  isAuthenticated.value = value;
  if (!value) {
    localStorage.removeItem('token');
  }
}; 