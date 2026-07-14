'use client';

/**
 * AnimatedBackground — light theme with soft floating color blobs.
 * Used behind the chat frame for a "wow" dynamic feel without overpowering content.
 *
 * Performance: blobs use CSS transform + filter:blur, no JS animation loop.
 * Uses globals.css keyframes (added below) instead of <style jsx> for App Router compat.
 * Accessibility: respects prefers-reduced-motion.
 */

export function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#FAFAFA] dark:bg-[#14152A] pointer-events-none transition-colors">
      {/* Soft base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FFFAF5] via-[#FAFAFA] to-[#F8F4FF]
                      dark:bg-gradient-to-br dark:from-[#1A1B35] dark:via-[#14152A] dark:to-[#1F1A2E]" />

      {/* Floating color blobs (light theme — pastel) */}
      <div className="dark:hidden">
        {LIGHT_BLOBS.map((blob, i) => (
          <BlobDiv key={i} blob={blob} index={i} />
        ))}
      </div>

      {/* Floating color blobs (dark theme — saturated silk/lotus/leaf/gold on dark) */}
      <div className="hidden dark:block">
        {DARK_BLOBS.map((blob, i) => (
          <BlobDiv key={i} blob={blob} index={i} />
        ))}
      </div>

      {/* Vignette at edges to keep focus center */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.04) 100%)',
        }}
      />
    </div>
  );
}

const LIGHT_BLOBS = [
  { color: '#FFD1B5', size: 520, left: '-8%', top: '12%', duration: 18, delay: '0s', opacity: 0.55 },
  { color: '#FFD6E5', size: 480, left: '78%', top: '8%', duration: 22, delay: '-4s', opacity: 0.50 },
  { color: '#C5F0DC', size: 600, left: '12%', top: '72%', duration: 25, delay: '-8s', opacity: 0.45 },
  { color: '#FFE5B5', size: 440, left: '72%', top: '68%', duration: 20, delay: '-12s', opacity: 0.50 },
];

const DARK_BLOBS = [
  { color: '#7A2A1F', size: 520, left: '-8%', top: '12%', duration: 18, delay: '0s', opacity: 0.55 }, // silk deep
  { color: '#5C2A3A', size: 480, left: '78%', top: '8%', duration: 22, delay: '-4s', opacity: 0.55 }, // lotus deep
  { color: '#1F3F32', size: 600, left: '12%', top: '72%', duration: 25, delay: '-8s', opacity: 0.45 }, // leaf deep
  { color: '#6B5424', size: 440, left: '72%', top: '68%', duration: 20, delay: '-12s', opacity: 0.50 }, // gold deep
];

function BlobDiv({ blob, index }: { blob: { color: string; size: number; left: string; top: string; duration: number; delay: string; opacity: number }; index: number }) {
  return (
    <div
      className={`absolute rounded-full ${index % 2 === 0 ? 'mai-blob-a' : 'mai-blob-b'}`}
      style={{
        left: blob.left,
        top: blob.top,
        width: blob.size,
        height: blob.size,
        background: `radial-gradient(circle, ${blob.color} 0%, transparent 70%)`,
        filter: 'blur(60px)',
        opacity: blob.opacity,
        animationDuration: `${blob.duration}s`,
        animationDelay: blob.delay,
        willChange: 'transform',
      }}
    />
  );
}