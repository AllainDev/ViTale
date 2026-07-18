'use client';

/**
 * AppBackground — Nền toàn trang cho ViTale.
 * Thiết kế "Trầm tích Di Sản": gradient giấy dó + floating blobs màu Việt Nam + vân giấy mờ.
 * Dùng CSS transform + filter:blur, không có JS animation loop.
 * Tuân thủ prefers-reduced-motion.
 */
export function AppBackground() {
  return (
    <div
      className="vitale-app-bg"
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}
    >
      {/* Lớp 1: Base gradient giấy dó */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(145deg, #FBF8F3 0%, #F6F0E8 35%, #F0EBE0 70%, #EDE5D8 100%)',
      }} />

      {/* Lớp 2: Texture ảnh giấy dó + hoa sen mờ */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url(/images/new-bg-texture.svg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.18,
        mixBlendMode: 'multiply',
      }} />

      {/* Lớp 3: Floating blobs — màu sắc di sản Việt Nam */}
      <div className="app-blob app-blob-1" /> {/* Đỏ son / son mài */}
      <div className="app-blob app-blob-2" /> {/* Xanh trầm / lá tre */}
      <div className="app-blob app-blob-3" /> {/* Vàng gốm / hoàng kim */}
      <div className="app-blob app-blob-4" /> {/* Hồng sen / nhị hoa */}
      <div className="app-blob app-blob-5" /> {/* Nâu đất / đất nung */}

      {/* Lớp 4: Hoa sen trang trí góc trên phải (wireframe mờ) */}
      <svg
        width="220" height="220"
        viewBox="0 0 220 220"
        style={{ position: 'absolute', top: -30, right: -30, opacity: 0.04 }}
        aria-hidden="true"
      >
        <g stroke="#0f3a2c" strokeWidth="1.2" fill="none">
          <path d="M110 180 Q85 155 85 125 Q85 90 110 75 Q135 90 135 125 Q135 155 110 180Z" />
          <path d="M110 180 Q62 162 55 135 Q48 108 70 92 Q82 86 95 96" />
          <path d="M110 180 Q158 162 165 135 Q172 108 150 92 Q138 86 125 96" />
          <path d="M110 180 Q45 170 40 142 Q35 116 58 102 Q68 95 80 104" />
          <path d="M110 180 Q175 170 180 142 Q185 116 162 102 Q152 95 140 104" />
          <path d="M110 180 Q32 175 30 148 Q28 120 52 110" />
          <path d="M110 180 Q188 175 190 148 Q192 120 168 110" />
          <circle cx="110" cy="110" r="12" />
          <circle cx="110" cy="110" r="20" strokeDasharray="4 3" />
        </g>
      </svg>

      {/* Lớp 5: Hoa văn thổ cẩm góc dưới trái */}
      <svg
        width="180" height="180"
        viewBox="0 0 180 180"
        style={{ position: 'absolute', bottom: -20, left: -20, opacity: 0.035 }}
        aria-hidden="true"
      >
        <g stroke="#c9a76d" strokeWidth="1" fill="none">
          <rect x="20" y="20" width="140" height="140" rx="4" />
          <rect x="35" y="35" width="110" height="110" rx="3" transform="rotate(15 90 90)" />
          <rect x="50" y="50" width="80" height="80" rx="2" />
          <line x1="20" y1="90" x2="160" y2="90" />
          <line x1="90" y1="20" x2="90" y2="160" />
          <path d="M20 20 L90 60 L160 20" />
          <path d="M20 160 L90 120 L160 160" />
          <circle cx="90" cy="90" r="18" />
          <circle cx="90" cy="90" r="8" />
        </g>
      </svg>

      {/* Lớp 6: Vignette nhẹ ở cạnh (tập trung vào content giữa) */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 60%, rgba(15,10,5,0.06) 100%)',
      }} />
    </div>
  );
}
