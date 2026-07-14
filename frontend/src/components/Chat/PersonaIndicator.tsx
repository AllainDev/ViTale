'use client';
import { useChat } from '@/context/ChatContext';
import { LanguageToggle } from './LanguageToggle';
import { Sparkles } from 'lucide-react';

export function PersonaIndicator() {
  const { language } = useChat();
  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-center gap-3 px-4 py-2 rounded-full
                      bg-black/30 backdrop-blur-xl
                      border border-[var(--color-mai-silk)]/30
                      shadow-[0_0_32px_rgba(215,95,78,0.15)]">
        <span className="w-2 h-2 rounded-full bg-[var(--color-mai-silk)] animate-pulse" />
        <span className="font-serif text-sm font-bold text-[var(--color-mai-bone)] tracking-wide">
          Mai · {language === 'vi' ? 'Trợ lý Di sản' : 'Heritage Guide'}
        </span>
        <Sparkles className="w-3.5 h-3.5 text-[var(--color-mai-silk)]" />
        <div className="w-px h-4 bg-[var(--color-mai-bone)]/20" />
        <LanguageToggle />
        <div className="w-px h-4 bg-[var(--color-mai-bone)]/20" />
        <ThemeToggleInline />
      </div>
    </div>
  );
}

// Inline theme toggle (sun/moon) — co-located with language toggle
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

function ThemeToggleInline() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Chuyển nền sáng' : 'Chuyển nền tối'}
      aria-pressed={isDark}
      title={isDark ? 'Chuyển nền sáng' : 'Chuyển nền tối'}
      className="px-2 py-0.5 text-[10px] font-bold tracking-wider transition-colors
                 text-[var(--color-mai-bone)]/60 hover:text-[var(--color-mai-bone)]
                 hover:bg-white/5 rounded-sm flex items-center gap-1"
    >
      {isDark ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
    </button>
  );
}