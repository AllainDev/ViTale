'use client';
import { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { PersonaIndicator } from './PersonaIndicator';

const AvatarRenderer = dynamic(
  () => import('../AvatarRenderer'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[var(--color-mai-silk)]/40 border-t-[var(--color-mai-silk)] animate-spin" />
      </div>
    ),
  }
);

interface AvatarStageProps {
  animTag: 'idle' | 'talking';
  onAvatarLoaded: () => void;
}

/**
 * AvatarStage — small floating companion avatar (bottom-right, above input).
 * Mouse-follow for subtle interactivity. Sized to peek over the input bar.
 */
export function AvatarStage({ animTag, onAvatarLoaded }: AvatarStageProps) {
  // Track mouse position normalized to [-1, 1] for head follow
  const [look, setLook] = useState({ x: 0, y: 0 });
  const stageRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    setLook({ x, y });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setLook({ x: 0, y: 0 });
  }, []);

  return (
    <div
      ref={stageRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="fixed bottom-[110px] right-2 w-[290px] h-[470px] z-30 cursor-pointer"
      aria-label="Mai avatar (companion)"
    >
      {/* Soft glow halo behind avatar */}
      <div
        className="absolute inset-x-2 inset-y-10 rounded-full blur-3xl opacity-50"
        style={{
          background: 'radial-gradient(circle, rgba(255,209,181,0.55) 0%, rgba(255,214,229,0.3) 50%, transparent 70%)',
        }}
      />
      <AvatarRenderer
        lipsSyncEngine={null}
        animationTag={animTag}
        onAvatarLoaded={onAvatarLoaded}
        lookX={look.x}
        lookY={look.y}
        modelScale={2.7}
        modelPositionY={-0.5}
        cameraDistance={4.5}
      />
    </div>
  );
}