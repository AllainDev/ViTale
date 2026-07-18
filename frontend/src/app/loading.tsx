/**
 * Next.js App Router loading.tsx
 * Hiển thị khi page đang load (Suspense boundary tự động).
 * Design: Hoa sen nở + Logo VITALE + shimmer bar — thuần CSS, không JS nặng.
 */
export default function Loading() {
  return (
    <div className="vitale-loading-root">
      {/* Background gradient giấy dó */}
      <div className="vitale-loading-bg" />

      {/* Hoa sen SVG animation */}
      <div className="vitale-loading-lotus">
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Cánh hoa sen — stroke animation */}
          <path
            className="lotus-petal petal-1"
            d="M40 60 Q28 48 28 36 Q28 20 40 16 Q52 20 52 36 Q52 48 40 60Z"
            stroke="#0f3a2c"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            className="lotus-petal petal-2"
            d="M40 60 Q20 52 18 38 Q16 24 28 20 Q34 18 40 24"
            stroke="#0f3a2c"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            className="lotus-petal petal-3"
            d="M40 60 Q60 52 62 38 Q64 24 52 20 Q46 18 40 24"
            stroke="#0f3a2c"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            className="lotus-petal petal-4"
            d="M40 60 Q16 58 14 44 Q12 32 24 26 Q30 22 36 28"
            stroke="#c9a76d"
            strokeWidth="1.2"
            fill="none"
          />
          <path
            className="lotus-petal petal-5"
            d="M40 60 Q64 58 66 44 Q68 32 56 26 Q50 22 44 28"
            stroke="#c9a76d"
            strokeWidth="1.2"
            fill="none"
          />
          {/* Nhụy hoa */}
          <circle
            className="lotus-center"
            cx="40"
            cy="40"
            r="5"
            fill="#c9a76d"
            opacity="0"
          />
        </svg>
      </div>

      {/* Logo */}
      <div className="vitale-loading-logo">
        <span className="vitale-loading-dot" />
        <span className="vitale-loading-brand">VITALE</span>
        <span className="vitale-loading-dot" />
      </div>

      {/* Tagline */}
      <p className="vitale-loading-tagline">Đang thức tỉnh di sản...</p>

      {/* Shimmer bar */}
      <div className="vitale-loading-bar" aria-label="Đang tải">
        <div className="vitale-loading-shimmer" />
      </div>

      <style>{`
        .vitale-loading-root {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          z-index: 9999;
          background: #FBF8F3;
        }

        .vitale-loading-bg {
          position: absolute;
          inset: 0;
          background-color: #FBF8F3;
        }
        
        .vitale-loading-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 80% 60% at 30% 40%, rgba(201,167,109,0.12) 0%, transparent 60%),
                      radial-gradient(ellipse 60% 80% at 70% 60%, rgba(15,58,44,0.08) 0%, transparent 60%),
                      linear-gradient(145deg, #FBF8F3 0%, #F4EEE4 50%, #F0EBE0 100%);
        }

        .vitale-loading-bg::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url(/images/new-bg-texture.svg);
          background-size: cover;
          background-position: center;
          opacity: 0.18;
          mix-blend-mode: multiply;
        }

        /* ── Hoa sen ── */
        .vitale-loading-lotus {
          position: relative;
          z-index: 1;
          animation: lotus-appear 0.6s ease-out forwards;
        }

        @keyframes lotus-appear {
          from { opacity: 0; transform: scale(0.6); }
          to   { opacity: 1; transform: scale(1); }
        }

        .lotus-petal {
          stroke-dasharray: 200;
          stroke-dashoffset: 200;
        }

        .petal-1 { animation: draw-petal 0.7s ease-out 0.1s forwards; }
        .petal-2 { animation: draw-petal 0.6s ease-out 0.3s forwards; }
        .petal-3 { animation: draw-petal 0.6s ease-out 0.5s forwards; }
        .petal-4 { animation: draw-petal 0.5s ease-out 0.7s forwards; }
        .petal-5 { animation: draw-petal 0.5s ease-out 0.9s forwards; }

        @keyframes draw-petal {
          from { stroke-dashoffset: 200; }
          to   { stroke-dashoffset: 0; }
        }

        .lotus-center {
          animation: fade-center 0.4s ease-out 1.1s forwards;
        }

        @keyframes fade-center {
          from { opacity: 0; transform: scale(0); transform-origin: center; }
          to   { opacity: 1; transform: scale(1); transform-origin: center; }
        }

        /* ── Logo ── */
        .vitale-loading-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          opacity: 0;
          animation: fade-up 0.5s ease-out 0.5s forwards;
          position: relative;
          z-index: 1;
        }

        @keyframes fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .vitale-loading-brand {
          font-family: 'Noto Serif', serif;
          font-size: 28px;
          font-weight: 900;
          letter-spacing: 0.3em;
          color: #0f3a2c;
        }

        .vitale-loading-dot {
          display: inline-block;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #c9a76d;
        }

        /* ── Tagline ── */
        .vitale-loading-tagline {
          font-family: 'Noto Serif', serif;
          font-size: 13px;
          color: #6b6254;
          letter-spacing: 0.05em;
          opacity: 0;
          animation: fade-up 0.5s ease-out 0.9s forwards;
          position: relative;
          z-index: 1;
          margin: 0;
        }

        /* ── Shimmer bar ── */
        .vitale-loading-bar {
          width: 120px;
          height: 3px;
          background: #e8e0d4;
          border-radius: 999px;
          overflow: hidden;
          position: relative;
          z-index: 1;
          opacity: 0;
          animation: fade-up 0.4s ease-out 1.1s forwards;
        }

        .vitale-loading-shimmer {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, #c9a76d 50%, transparent 100%);
          animation: shimmer 1.8s ease-in-out infinite;
        }

        @keyframes shimmer {
          from { transform: translateX(-100%); }
          to   { transform: translateX(200%); }
        }

        @media (prefers-reduced-motion: reduce) {
          .lotus-petal,
          .lotus-center,
          .vitale-loading-logo,
          .vitale-loading-tagline,
          .vitale-loading-bar {
            animation: none;
            opacity: 1;
            stroke-dashoffset: 0;
          }
          .vitale-loading-shimmer {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
