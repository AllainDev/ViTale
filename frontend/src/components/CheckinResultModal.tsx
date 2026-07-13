'use client';
import { useEffect, useRef } from 'react';
import type { CheckinResult } from '../lib/api';

interface Props {
  result: CheckinResult | null;
  onClose: () => void;
  onShareStory?: () => void;
}

/**
 * CheckinResultModal — full-screen celebration overlay shown after a
 * successful gamification check-in.
 *
 * Shows: XP awarded, level-up celebration, stamp info, doll info, story CTA.
 * Auto-closes after 8 s. User can also dismiss manually or share story.
 */
export default function CheckinResultModal({ result, onClose, onShareStory }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!result) return;
    if (result.success) {
      timerRef.current = setTimeout(onClose, 8000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [result, onClose]);

  if (!result) return null;

  const isLevelUp = result.leveledUp;
  const isError = !result.success;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(10, 11, 15, 0.88)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: isLevelUp ? '1px solid var(--brand-gold)' : '1px solid var(--border-gold)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          maxWidth: 400,
          width: '100%',
          boxShadow: isLevelUp ? '0 0 48px rgba(201,167,109,0.4)' : 'var(--shadow-md)',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '0.75rem', right: '0.75rem',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: '1.2rem', lineHeight: 1,
          }}
          aria-label="Đóng"
        >
          ✕
        </button>

        {/* Main icon */}
        <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem', lineHeight: 1 }}>
          {isError ? '⚠️' : isLevelUp ? '🎉' : result.hasDollBonus ? '🎎' : '📍'}
        </div>

        {/* Headline */}
        <h2 style={{
          fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem',
          color: isError ? 'var(--text-primary)' : isLevelUp ? 'var(--brand-gold)' : 'var(--text-primary)',
          fontFamily: 'var(--font-display)',
        }}>
          {isError
            ? 'Check-in thất bại'
            : isLevelUp
              ? `Lên cấp ${result.currentLevel}! 🌟`
              : result.isNewStamp
                ? 'Check-in thành công!'
                : result.hasDollBonus
                  ? 'Nhận điểm búp bê!'
                  : 'Check-in thành công!'}
        </h2>

        <p style={{ color: isError ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          {isError ? (result.errorMessage || 'Vui lòng đến gần địa điểm hơn để check-in.') : (
            <>
              {result.checkpointName}
              {result.checkpointRegion && (
                <span style={{ color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                  · {result.checkpointRegion}
                </span>
              )}
            </>
          )}
        </p>

        {/* XP chip (only if success) */}
        {!isError && (
          <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.6rem 1.25rem',
          borderRadius: 'var(--radius-full)',
          background: 'linear-gradient(135deg, rgba(201,167,109,0.2), rgba(228,201,138,0.1))',
          border: '1px solid var(--border-gold)',
          marginBottom: '1.25rem',
        }}>
          <span style={{ fontSize: '1.1rem' }}>⚡</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-gold)' }}>
            +{result.xpAwarded} XP
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            (Tổng: {(result.totalXp || 0).toLocaleString()})
          </span>
        </div>
        )}

        {/* Doll info */}
        {!isError && result.dollName && (
          <div style={{
            padding: '0.65rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(201,167,109,0.08)',
            border: '1px solid rgba(201,167,109,0.2)',
            marginBottom: '1.25rem',
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
          }}>
            🎎 <strong style={{ color: 'var(--brand-gold)' }}>{result.dollName}</strong>
            {result.dollRegion && <span style={{ color: 'var(--text-muted)' }}> · {result.dollRegion}</span>}
          </div>
        )}

        {/* Level-up banner */}
        {!isError && isLevelUp && (
          <div style={{
            padding: '0.65rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(201,167,109,0.2), rgba(228,201,138,0.08))',
            border: '1px solid var(--border-gold)',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            color: 'var(--brand-gold)',
            fontWeight: 600,
          }}>
            🌟 Chào mừng bạn lên Cấp {result.currentLevel}!
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {!isError && result.storyAssetUrl && onShareStory && (
            <button
              onClick={onShareStory}
              style={{
                padding: '0.65rem 1.4rem',
                borderRadius: 'var(--radius-full)',
                background: 'linear-gradient(135deg, var(--brand-gold), var(--brand-gold-light))',
                color: 'var(--text-on-gold)',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              📸 Chia sẻ Story
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '0.65rem 1.4rem',
              borderRadius: 'var(--radius-full)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
