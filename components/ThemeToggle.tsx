import React from 'react';
// Nếu bạn để file hook ở folder hooks:
import useTheme from '../hooks/useTheme'; 
// (Nếu bạn để ở services thì sửa thành: import useTheme from '../services/useTheme';)

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full transition-all duration-300
                 bg-cream text-textDark hover:bg-gray-200
                 dark:bg-slate-700 dark:text-yellow-400 dark:hover:bg-slate-600
                 shadow-sm border border-gray-200 dark:border-slate-600"
      aria-label="Chuyển chế độ tối/sáng"
      title={theme === 'light' ? "Bật chế độ tối" : "Bật chế độ sáng"}
    >
      {theme === 'light' ? (
        // Icon Mặt trăng (Moon)
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      ) : (
        // Icon Mặt trời (Sun)
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      )}
    </button>
  );
};

export default ThemeToggle;
