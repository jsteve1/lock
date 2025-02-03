export type Theme = 'light' | 'dark' | 'night';

export interface ThemeClasses {
  background: string;
  paper: string;
  text: string;
  textSecondary: string;
  border: string;
  borderHover: string;
  divider: string;
  button: string;
  buttonHover: string;
  svgStroke: string;
  registerButton: string;
}


const themes: Record<Theme, ThemeClasses> = {
  light: {
    background: 'bg-gray-100',
    paper: 'bg-white',
    text: 'text-gray-900 placeholder:text-gray-400',
    textSecondary: 'text-gray-600',
    border: 'border-gray-200',
    borderHover: 'hover:border-gray-300',
    divider: 'border-gray-200',
    button: 'bg-gray-100 text-gray-700',
    buttonHover: 'hover:bg-gradient-to-br hover:from-gray-100 hover:via-gray-200 hover:to-gray-300 hover:text-gray-900 hover:border-gray-400 hover:animate-gradient hover:bg-[length:200%_200%]',
    svgStroke: '#303030',
    registerButton: 'text-gray-500 hover:text-gray-400 font-bold underline'

  },
  dark: {
    background: 'bg-[#202124]',
    paper: 'bg-[#202124]',
    text: 'text-gray-200 placeholder:text-gray-400',
    textSecondary: 'text-gray-400',
    border: 'border-[#525355]',
    borderHover: 'hover:border-[#5f6368]',
    divider: 'border-[#525355]',
    button: 'bg-[#2d2e30] text-gray-200',
    buttonHover: 'hover:bg-gradient-to-br hover:from-[#35363a] hover:via-[#2d2e30] hover:to-[#202124] hover:text-gray-100 hover:border-gray-600 hover:animate-gradient hover:bg-[length:200%_200%]',  
    svgStroke: '#999999',
    registerButton: 'text-gray-500 hover:text-gray-400 font-bold underline'


  },
  night: {
    background: 'bg-[#191919]',
    paper: 'bg-[#191919]',
    text: 'text-red-600 placeholder:text-red-400',
    textSecondary: 'text-red-300',
    border: 'border-red-900',
    borderHover: 'hover:border-red-800',
    divider: 'border-red-900',
    button: 'text-red-400 bg-transparent border-red-900',
    svgStroke: '#e53e3e',
    buttonHover: 'hover:bg-gradient-to-br hover:from-red-600 hover:via-red-900 hover:to-black hover:text-red-50 hover:border-red-700 hover:animate-gradient hover:bg-[length:200%_200%] hover:border-red-700 focus:border-red-700 active:border-red-700',
    registerButton: 'text-red-500 hover:text-red-400 font-bold underline'
  }
};


export const getThemeClasses = (): ThemeClasses => {
  const theme = localStorage.getItem('theme') as Theme || 'light';
  return themes[theme];
}; 