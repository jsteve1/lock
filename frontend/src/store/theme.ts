import { signal } from '@preact/signals';
import type { Theme } from '../theme';

// Initialize theme from localStorage or default to 'light'
const storedTheme = localStorage.getItem('theme') as Theme;
export const currentTheme = signal<Theme>(storedTheme || 'light');

// Update localStorage when theme changes
currentTheme.subscribe(theme => {
  localStorage.setItem('theme', theme);
}); 