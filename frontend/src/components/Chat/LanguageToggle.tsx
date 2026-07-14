'use client';
import { useChat } from '@/context/ChatContext';

export function LanguageToggle() {
  const { language, setLanguage } = useChat();
  return (
    <div
      className="inline-flex rounded-full border border-stone-300 overflow-hidden text-xs font-medium"
      role="group"
      aria-label="Language toggle"
    >
      <button
        onClick={() => setLanguage('vi')}
        className={`px-3 py-1 transition ${
          language === 'vi'
            ? 'bg-emerald-800 text-white'
            : 'bg-white text-stone-600 hover:bg-stone-50'
        }`}
        aria-pressed={language === 'vi'}
      >
        VI
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 transition ${
          language === 'en'
            ? 'bg-emerald-800 text-white'
            : 'bg-white text-stone-600 hover:bg-stone-50'
        }`}
        aria-pressed={language === 'en'}
      >
        EN
      </button>
    </div>
  );
}