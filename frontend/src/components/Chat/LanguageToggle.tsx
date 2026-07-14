'use client';
import { useChat } from '@/context/ChatContext';

export function LanguageToggle() {
  const { language, setLanguage } = useChat();
  const baseBtn = 'px-2.5 py-0.5 text-[10px] font-bold tracking-wider transition-colors';
  return (
    <div
      className="inline-flex rounded-full overflow-hidden border border-white/20"
      role="group"
      aria-label="Language toggle"
    >
      <button
        onClick={() => setLanguage('vi')}
        className={`${baseBtn} ${
          language === 'vi'
            ? 'bg-[var(--color-mai-silk)] text-[var(--color-mai-bone)]'
            : 'text-[var(--color-mai-bone)]/60 hover:text-[var(--color-mai-bone)] hover:bg-white/5'
        }`}
        aria-pressed={language === 'vi'}
      >
        VI
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`${baseBtn} ${
          language === 'en'
            ? 'bg-[var(--color-mai-silk)] text-[var(--color-mai-bone)]'
            : 'text-[var(--color-mai-bone)]/60 hover:text-[var(--color-mai-bone)] hover:bg-white/5'
        }`}
        aria-pressed={language === 'en'}
      >
        EN
      </button>
    </div>
  );
}
