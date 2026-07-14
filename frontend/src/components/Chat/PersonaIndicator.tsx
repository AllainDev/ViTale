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
                      border border-mai-silk/30
                      shadow-[0_0_32px_rgba(215,95,78,0.15)]">
        <span className="w-2 h-2 rounded-full bg-mai-silk animate-pulse" />
        <span className="font-serif text-sm font-bold text-mai-bone tracking-wide">
          Mai · {language === 'vi' ? 'Trợ lý Di sản' : 'Heritage Guide'}
        </span>
        <Sparkles className="w-3.5 h-3.5 text-mai-silk" />
        <div className="w-px h-4 bg-mai-bone/20" />
        <LanguageToggle />
      </div>
    </div>
  );
}