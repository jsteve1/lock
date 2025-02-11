import { signal } from '@preact/signals';
import type { Theme } from '../theme';

// Initialize theme from localStorage
const storedTheme = localStorage.getItem('theme') as Theme;
const storedSystemTheme = localStorage.getItem('useSystemTheme') === 'true';

export const currentTheme = signal<Theme>(storedTheme || 'light');
export const useSystemTheme = signal<boolean>(storedSystemTheme);

// Update localStorage when theme changes
currentTheme.subscribe(theme => {
  localStorage.setItem('theme', theme);
});

useSystemTheme.subscribe(isSystem => {
  localStorage.setItem('useSystemTheme', isSystem.toString());
  if (isSystem) {
    // Update theme based on system preference when system theme is enabled
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    currentTheme.value = prefersDark ? 'dark' : 'light';
  }
});

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (useSystemTheme.value) {
    currentTheme.value = e.matches ? 'dark' : 'light';
  }
}); 