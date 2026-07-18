'use client';
import { Menu, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface CompanionTopBarProps {
  onHistoryClick: () => void;
}

export function CompanionTopBar({ onHistoryClick }: CompanionTopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="absolute top-0 left-0 right-0 h-14 z-30 px-3 sm:px-4
                    flex items-center justify-between
                    bg-black/20 dark:bg-white/5 backdrop-blur-xl
                    border-b border-white/10">
      <button
        onClick={onHistoryClick}
        aria-label="Lịch sử chat"
        data-testid="hamburger-button"
        className="w-10 h-10 rounded-full flex items-center justify-center
                   bg-white/10 dark:bg-white/5
                   border border-white/20
                   text-stone-800 dark:text-gray-100
                   hover:bg-white/20 dark:hover:bg-white/10
                   transition-all active:scale-95 touch-manipulation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* iOS-style theme toggle pill */}
      <button
        onClick={toggleTheme}
        aria-label={isDark ? 'Chuyển nền sáng' : 'Chuyển nền tối'}
        aria-pressed={isDark}
        data-testid="theme-toggle"
        className="relative w-14 h-7 rounded-full
                   bg-stone-800 dark:bg-white
                   transition-colors duration-300 touch-manipulation"
      >
        <span
          className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full
                     bg-white dark:bg-stone-800 shadow-md
                     transition-transform duration-300
                     flex items-center justify-center
                     text-stone-800 dark:text-gray-100"
          style={{ transform: isDark ? 'translateX(28px)' : 'translateX(0)' }}
        >
          {isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
        </span>
      </button>
    </div>
  );
}