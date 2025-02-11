import * as React from 'react';
import { PcDisplay } from 'react-bootstrap-icons';
const Header = () => {
  const { isSystemTheme, setTheme, manualTheme } = useTheme();

  const handleSystemThemeToggle = () => {
    if (!isSystemTheme) {
      // Activate system theme mode; detect OS preference
      const osPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(osPrefersDark ? 'dark' : 'light', { system: true });
    } else {
      // Deactivate system theme mode; revert to manual theme
      setTheme(manualTheme, { system: false });
    }
  };

  return (
    <header className="header">
      {/* ... existing header content ... */}
      <button
        onClick={handleSystemThemeToggle}
        className="system-theme-toggle-btn"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <PcDisplay size={24} />
      </button>
    </header>
  );
};

export default Header; 