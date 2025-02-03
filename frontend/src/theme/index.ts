import { signal } from '@preact/signals';

export type ColorMode = 'light' | 'dark' | 'night';

export const colorMode = signal<ColorMode>('dark');

export const themes = {
  light: {
    background: 'bg-white',
    paper: 'bg-white',
    text: 'text-gray-900',
    textSecondary: 'text-gray-600',
    border: 'border-gray-200',
    borderHover: 'hover:border-gray-300',
    divider: 'border-gray-200',
  },
  dark: {
    background: 'bg-[#202124]',
    paper: 'bg-[#2d2e31]',
    text: 'text-gray-100',
    textSecondary: 'text-gray-400',
    border: 'border-gray-700',
    borderHover: 'hover:border-gray-600',
    divider: 'border-gray-700',
  },
  night: {
    background: 'bg-[#1a1a1a]',
    paper: 'bg-[#262626]',
    text: 'text-red-400',
    textSecondary: 'text-red-300',
    border: 'border-red-600',
    borderHover: 'hover:border-red-600',
    divider: 'border-red-900',
  },
};

export const getThemeClasses = () => themes[colorMode.value]; 
