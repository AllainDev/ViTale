'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';

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
  animTag?: 'idle' | 'talking';
  onAvatarLoaded?: () => void;
  /** External ref to attach pointer-tracking listeners. Defaults to internal ref. */
  pointerRef?: React.RefObject<HTMLElement | null>;
  /** When true, renders a compact variant for mobile (smaller scene, simpler). */
  compact?: boolean;
  /** Optional override for the 3D model camera distance. */
  cameraDistance?: number;
  /** Layout mode:
   *   'inline'      — fills parent (default; used inside flex/grid items)
   *   'floating'    — fixed bottom-right; hidden on mobile (< md) — does NOT
   *                    shrink chat content; classic "companion beside chat" UX
   *   'fullscreen'  — absolute inset-0, centered, scale lớn (3.5). UI overlays
   *                    đè lên (glassmorphism). Dùng cho CompanionPanel.
   */
  position?: 'inline' | 'floating' | 'fullscreen';
}

/**
 * AvatarStage — Mai 3D companion. Always interactive:
 *   • Pointer-tracking: head/eyes follow finger/cursor anywhere on the page
 *     (or scoped to a `pointerRef` parent container).
 *   • Tap reactions:    tap avatar → random wave/smile/bow/talking animation
 *     (3-second cooldown, label appears above).
 *   • Speech synthesis: first tap also says "Chào bạn, mình là Mai" in VN.
 *   • Visual scale:    full (~260-340px wide) or compact (~80-160px mobile).
 *
 * Designed to live INSIDE the chat layout — never `fixed`, never in a modal
 * bubble. Coexists with chat content as a side rail (desktop) or compact
 * companion (mobile).
 */
export function AvatarStage({
  animTag = 'idle',
  onAvatarLoaded,
  pointerRef,
  compact = false,
  cameraDistance = 4.5,
  position = 'inline',
}: AvatarStageProps) {
  const [look, setLook] = useState({ x: 0, y: 0 });
  const lookTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // ── Pointer-tracking — attach to parentRef if provided, else stageRef.
  useEffect(() => {
    const target = (pointerRef?.current ?? stageRef.current);
    if (!target) return;

    let raf = 0;
    let pending = { x: 0, y: 0 };

    const handleMove = (clientX: number, clientY: number) => {
      const rect = target.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((clientY - rect.top) / rect.height) * 2 - 1;
      pending = {
        x: Math.max(-1, Math.min(1, x)),
        y: Math.max(-1, Math.min(1, y)),
      };
      if (!raf) {
        raf = requestAnimationFrame(() => {
          setLook(pending);
          raf = 0;
        });
      }
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]; if (t) handleMove(t.clientX, t.clientY);
    };
    const onLeave = () => {
      if (lookTimerRef.current) clearTimeout(lookTimerRef.current);
      lookTimerRef.current = setTimeout(() => setLook({ x: 0, y: 0 }), 1500);
    };

    target.addEventListener('mousemove', onMouseMove, { passive: true });
    target.addEventListener('touchmove', onTouchMove, { passive: true });
    target.addEventListener('mouseleave', onLeave);
    target.addEventListener('touchend', onLeave);
    return () => {
      target.removeEventListener('mousemove', onMouseMove);
      target.removeEventListener('touchmove', onTouchMove);
      target.removeEventListener('mouseleave', onLeave);
      target.removeEventListener('touchend', onLeave);
      if (raf) cancelAnimationFrame(raf);
      if (lookTimerRef.current) clearTimeout(lookTimerRef.current);
    };
  }, [pointerRef]);

  // ── Tap reactions (wave / smile / bow / talking).
  const [reactionLabel, setReactionLabel] = useState<string | null>(null);
  const tapDebounceRef = useRef(0);
  const greetedRef = useRef(false);

  const handleTap = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    e?.stopPropagation?.();
    const now = Date.now();
    if (now - tapDebounceRef.current < 600) return;
    tapDebounceRef.current = now;

    const pool: Array<{ label: string; anim: 'idle' | 'talking' }> = [
      { label: '👋 Mai đang vẫy tay',    anim: 'talking' },
      { label: '😊 Mai đang cười',         anim: 'idle'    },
      { label: '🙇 Mai đang cúi chào',     anim: 'talking' },
      { label: '💬 Mai đang nói chuyện',   anim: 'talking' },
    ];
    const r = pool[Math.floor(Math.random() * pool.length)];
    setReactionLabel(r.label);
    setTimeout(() => setReactionLabel(null), 2400);

    // One-shot VN greeting via Web Speech API.
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && !greetedRef.current) {
      try {
        const u = new SpeechSynthesisUtterance('Chào bạn, mình là Mai');
        u.lang = 'vi-VN'; u.rate = 1; u.pitch = 1.2; u.volume = 0.6;
        speechSynthesis.speak(u);
        greetedRef.current = true;
      } catch { /* ignore */ }
    }
  }, []);

  // ── Visual scale: if external animTag is 'talking', show that label.
  const externalReaction = animTag === 'talking' && !reactionLabel
    ? '💬 Mai đang trả lời'
    : reactionLabel;

  return (
    <div
      ref={stageRef}
      className={
        position === 'floating'
          ? 'hidden md:block fixed bottom-[110px] right-2 z-30 cursor-pointer select-none ' +
            'md:w-[260px] md:h-[420px] lg:w-[290px] lg:h-[470px]'
          : position === 'fullscreen'
          ? 'absolute inset-0 z-10 flex items-center justify-center cursor-pointer select-none ' +
            'pointer-events-none'
          : 'relative w-full h-full cursor-pointer select-none'
      }
      aria-label="Mai avatar (companion)"
      data-testid="avatar-stage"
    >
      <div className={position === 'fullscreen' ? 'pointer-events-auto w-full h-full relative' : 'contents'}>
      {/* Soft glow halo behind avatar */}
      <div
        className="absolute inset-x-2 inset-y-10 rounded-full blur-3xl opacity-50 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(255,209,181,0.55) 0%, rgba(255,214,229,0.3) 50%, transparent 70%)',
        }}
      />

      <AvatarRenderer
        lipsSyncEngine={null}
        animationTag={animTag}
        onAvatarLoaded={onAvatarLoaded ?? (() => { /* no-op */ })}
        lookX={look.x}
        lookY={look.y}
        modelScale={compact ? 1.6 : position === 'fullscreen' ? 3.1 : 2.7}
        modelPositionY={position === 'fullscreen' ? -0.7 : -0.5}
        cameraDistance={compact ? 3.2 : position === 'fullscreen' ? 4.8 : cameraDistance}
      />

      {/* Tap-reaction label (fades above avatar) */}
      {externalReaction && (
        <div
          key={externalReaction}
          className="absolute left-1/2 -translate-x-1/2 top-2
                     px-3 py-1 rounded-full bg-stone-900/70 backdrop-blur
                     border border-white/20 text-white text-xs font-medium
                     animate-[slide-up_200ms_ease-out] pointer-events-none
                     whitespace-nowrap"
        >
          {externalReaction}
        </div>
      )}

      {/* Invisible tap overlay (handles whole-area tap → reaction) */}
      <button
        onClick={handleTap}
        className="absolute inset-0 cursor-pointer bg-transparent"
        aria-label="Chạm Mai để tương tác"
      />
      </div>
    </div>
  );
}
