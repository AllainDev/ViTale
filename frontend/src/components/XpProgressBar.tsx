'use client';
import { useEffect, useRef } from 'react';

interface Props {
  currentXp: number;
  nextLevelXp: number;
  currentLevel: number;
  /** If true, animates the bar fill on mount */
  animate?: boolean;
}

/**
 * XpProgressBar — renders a golden gradient progress bar with level badge.
 * Uses CSS custom properties from globals.css, no Tailwind dependencies.
 */
export default function XpProgressBar({ currentXp, nextLevelXp, currentLevel, animate = true }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const prevLevelXp = currentLevel > 0
    ? Math.floor(100 * Math.pow(currentLevel, 1.5))
    : 0;

  // XP within current level bracket
  const xpInLevel   = currentXp - prevLevelXp;
  const xpNeeded    = nextLevelXp - prevLevelXp;
  const pct         = xpNeeded > 0 ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)) : 100;

  // Animate bar width from 0 → pct on mount
  useEffect(() => {
    if (!barRef.current || !animate) return;
    barRef.current.style.width = '0%';
    const raf = requestAnimationFrame(() => {
      if (barRef.current) barRef.current.style.width = `${pct}%`;
    });
    return () => cancelAnimationFrame(raf);
  }, [pct, animate]);

  return (
    <div style={{ width: '100%' }}>
      {/* Level + XP labels */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--brand-gold), var(--brand-gold-light))',
            color: 'var(--text-on-gold)',
            fontSize: '0.7rem',
            fontWeight: 800,
            flexShrink: 0,
          }}>
            {currentLevel}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Cấp độ
          </span>
        </div>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--brand-gold)' }}>{currentXp.toLocaleString()}</strong>
          {' / '}
          {nextLevelXp.toLocaleString()} XP
        </span>
      </div>

      {/* Track */}
      <div style={{
        height: 8,
        background: 'rgba(255,255,255,0.07)',
        borderRadius: 99,
        overflow: 'hidden',
        border: '1px solid rgba(201,167,109,0.12)',
      }}>
        {/* Fill */}
        <div
          ref={barRef}
          style={{
            height: '100%',
            width: animate ? '0%' : `${pct}%`,
            borderRadius: 99,
            background: 'linear-gradient(90deg, var(--brand-gold) 0%, var(--brand-gold-light) 100%)',
            transition: 'width 1.1s cubic-bezier(0.22, 1, 0.36, 1)',
            boxShadow: '0 0 8px rgba(201,167,109,0.5)',
          }}
        />
      </div>

      {/* Next level hint */}
      <div style={{ marginTop: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right' }}>
        Cần thêm <strong style={{ color: 'var(--text-secondary)' }}>{Math.max(0, nextLevelXp - currentXp).toLocaleString()} XP</strong> để lên cấp {currentLevel + 1}
      </div>
    </div>
  );
}
