import { useEffect, useState } from 'react';

export default function useTheme() {
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      // Ưu tiên lấy từ localStorage
      if (localStorage.getItem('theme') === 'dark') return 'dark';
      if (localStorage.getItem('theme') === 'light') return 'light';
      
      // Nếu chưa set, lấy theo giao diện máy tính
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'light'; // Mặc định là sáng
  });

  useEffect(() => {
    const root = window.document.documentElement; // Thẻ <html>
    if (theme === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return { theme, toggleTheme };
}
