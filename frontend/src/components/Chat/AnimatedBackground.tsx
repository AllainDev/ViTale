'use client';

/**
 * AnimatedBackground — light theme with soft floating color blobs.
 * Used behind the chat frame for a "wow" dynamic feel without overpowering content.
 *
 * Performance: blobs use CSS transform + filter:blur, no JS animation loop.
 * Uses globals.css keyframes (added below) instead of <style jsx> for App Router compat.
 * Accessibility: respects prefers-reduced-motion.
 */

const BLOBS = [
  { color: '#FFD1B5', size: 520, left: '-8%', top: '12%', duration: 18, delay: '0s', opacity: 0.55 },
  { color: '#FFD6E5', size: 480, left: '78%', top: '8%', duration: 22, delay: '-4s', opacity: 0.50 },
  { color: '#C5F0DC', size: 600, left: '12%', top: '72%', duration: 25, delay: '-8s', opacity: 0.45 },
  { color: '#FFE5B5', size: 440, left: '72%', top: '68%', duration: 20, delay: '-12s', opacity: 0.50 },
];

export function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#FAFAFA] pointer-events-none">
      {/* Soft base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FFFAF5] via-[#FAFAFA] to-[#F8F4FF]" />

      {/* Floating color blobs (use global keyframes) */}
      {BLOBS.map((blob, i) => (
        <div
          key={i}
          className={`absolute rounded-full ${i % 2 === 0 ? 'mai-blob-a' : 'mai-blob-b'}`}
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
      ))}

      {/* Subtle grain texture overlay (paper-like) */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          mixBlendMode: 'multiply',
        }}
      />

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