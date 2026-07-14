'use client';
import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Chuyển sang nền sáng' : 'Switch to dark mode'}
      aria-pressed={isDark}
      title={isDark ? 'Chuyển sang nền sáng' : 'Switch to dark mode'}
      className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                 bg-stone-100 hover:bg-stone-200
                 dark:bg-white/10 dark:hover:bg-white/20
                 text-stone-700 dark:text-amber-300
                 transition-colors"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}