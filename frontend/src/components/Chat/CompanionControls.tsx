'use client';
import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Camera, Share2 } from 'lucide-react';
import { useChat } from '@/context/ChatContext';
import { captureScreenshot } from './captureScreenshot';

interface CompanionControlsProps {
  onTranscript: (text: string) => void;
  targetRef: React.RefObject<HTMLElement | null>;
}

// Type for browser SpeechRecognition (not in TS stdlib yet)
type SpeechRecognitionInstance = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export function CompanionControls({ onTranscript, targetRef }: CompanionControlsProps) {
  const { language } = useChat();
  const [isListening, setIsListening] = useState(false);
  const [sttSupported, setSttSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) {
      setSttSupported(false);
      return;
    }
    const recognition = new SR();
    recognition.lang = language === 'vi' ? 'vi-VN' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
  }, [language, onTranscript]);

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleCamera = async () => {
    if (!targetRef.current) return;
    try {
      await captureScreenshot(targetRef.current);
    } catch (err) {
      console.error('[CompanionControls] screenshot failed', err);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'ViTale',
      text: language === 'vi' ? 'Nói chuyện với Mai' : 'Talk with Mai',
      url: typeof window !== 'undefined'
        ? `${window.location.origin}/?screen=assistant`
        : '/?screen=assistant',
    };
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // fallthrough to clipboard
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareData.url);
      console.info('[CompanionControls] link copied to clipboard');
    }
  };

  const labels = {
    voice: language === 'vi' ? 'Bật giọng nói' : 'Enable voice',
    camera: language === 'vi' ? 'Chụp màn hình' : 'Screenshot',
    share: language === 'vi' ? 'Chia sẻ' : 'Share',
  };

  const buttonBase = 'w-12 h-12 md:w-12 md:h-12 rounded-full flex items-center justify-center ' +
                     'bg-white/15 dark:bg-white/10 backdrop-blur-xl ' +
                     'border border-white/20 text-stone-700 dark:text-gray-200 ' +
                     'hover:bg-white/25 dark:hover:bg-white/15 ' +
                     'transition-all active:scale-95 touch-manipulation ' +
                     'shadow-md';

  return (
    <div className="w-full h-16 flex items-center justify-center gap-4 z-25
                    bg-black/10 dark:bg-transparent backdrop-blur-md">
      {sttSupported && (
        <button
          onClick={toggleVoice}
          aria-label={labels.voice}
          aria-pressed={isListening}
          data-testid="voice-button"
          className={buttonBase + (isListening
            ? ' ring-2 ring-red-500 animate-pulse'
            : '')}
        >
          {isListening
            ? <MicOff className="w-5 h-5" />
            : <Mic className="w-5 h-5" />}
        </button>
      )}
      <button
        onClick={handleCamera}
        aria-label={labels.camera}
        data-testid="camera-button"
        className={buttonBase}
      >
        <Camera className="w-5 h-5" />
      </button>
      <button
        onClick={handleShare}
        aria-label={labels.share}
        data-testid="share-button"
        className={buttonBase}
      >
        <Share2 className="w-5 h-5" />
      </button>
    </div>
  );
}