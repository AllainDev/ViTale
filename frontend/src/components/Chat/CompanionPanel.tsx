'use client';
import { useRef, useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { AnimatedBackground } from './AnimatedBackground';
import { AvatarStage } from './AvatarStage';
import { CompanionTopBar } from './CompanionTopBar';
import { CompanionChatOverlay } from './CompanionChatOverlay';
import { CompanionControls } from './CompanionControls';
import { CompanionInput } from './CompanionInput';
import { ChatHistoryDrawer } from './ChatHistoryDrawer';

interface CompanionPanelProps {
  onHistoryToggle?: () => void; // optional now — panel manages its own drawer
}

export function CompanionPanel(_props: CompanionPanelProps = {}) {
  const { sendMessage, isStreaming } = useChat();
  const captureRef = useRef<HTMLDivElement>(null);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Derive avatar animation: idle unless streaming a response
  const avatarAnim = isStreaming ? 'talking' : 'idle';

  return (
    <div
      ref={captureRef}
      className="relative w-full h-full overflow-hidden"
      data-testid="companion-panel"
    >
      <AnimatedBackground />

      {/* 3D model full-screen center */}
      <AvatarStage
        animTag={avatarAnim}
        onAvatarLoaded={() => { /* no-op */ }}
        pointerRef={captureRef}
        position="fullscreen"
      />

      {/* Overlays */}
      <CompanionTopBar onHistoryClick={() => setIsHistoryOpen(true)} />

      <CompanionChatOverlay onSuggestionClick={(s) => sendMessage(s)} />

      <div className="absolute bottom-16 left-0 right-0 z-25">
        <CompanionControls
          onTranscript={(t) => setVoiceTranscript(t)}
          targetRef={captureRef}
        />
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-30">
        <CompanionInput
          onSend={(text) => sendMessage(text)}
          initialValue={voiceTranscript}
        />
      </div>

      {/* Chat history drawer (Gemini/GPT style) */}
      <ChatHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}