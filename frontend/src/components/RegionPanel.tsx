'use client';

/**
 * RegionPanel — Slide-in panel hiển thị danh sách checkpoint của 1 tỉnh.
 * Xuất hiện khi user bấm vào tỉnh trên bản đồ.
 */

import React from 'react';
import { X, MapPin, CheckCircle2, Circle, Star, ChevronRight } from 'lucide-react';
import type { GamificationCheckpoint } from '../lib/api';

interface Province {
  id: string;
  name: string;
  nameEn: string;
  region: string;
}

interface RegionPanelProps {
  province: Province | null;
  checkpoints: GamificationCheckpoint[];
  onClose: () => void;
  onItemClick: (cp: GamificationCheckpoint) => void;
  primaryColor?: string;
  secondaryColor?: string;
}

export default function RegionPanel({
  province,
  checkpoints,
  onClose,
  onItemClick,
  primaryColor = '#0f3a2c',
  secondaryColor = '#c9a76d',
}: RegionPanelProps) {
  const isOpen = province !== null;
  const visitedCount = checkpoints.filter(cp => cp.isVisited).length;
  const totalCount = checkpoints.length;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`region-panel-backdrop ${isOpen ? 'active' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`region-panel ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={province ? `Địa điểm tại ${province.name}` : undefined}
      >
        {province && (
          <>
            {/* Header */}
            <div className="region-panel-header" style={{ borderBottomColor: `${secondaryColor}40` }}>
              <div className="region-panel-title-group">
                <div
                  className="region-panel-icon"
                  style={{ background: `${primaryColor}15`, color: primaryColor }}
                >
                  <MapPin size={16} />
                </div>
                <div>
                  <h2 className="region-panel-title" style={{ color: primaryColor }}>
                    {province.name}
                  </h2>
                  <p className="region-panel-subtitle">
                    {visitedCount}/{totalCount} địa điểm đã ghé thăm
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="region-panel-close"
                aria-label="Đóng panel"
              >
                <X size={18} />
              </button>
            </div>

            {/* Progress bar */}
            <div className="region-panel-progress-wrap">
              <div className="region-panel-progress-bg">
                <div
                  className="region-panel-progress-fill"
                  style={{
                    width: totalCount > 0 ? `${(visitedCount / totalCount) * 100}%` : '0%',
                    backgroundColor: primaryColor,
                  }}
                />
              </div>
              <span className="region-panel-progress-label">
                {totalCount > 0 ? Math.round((visitedCount / totalCount) * 100) : 0}%
              </span>
            </div>

            {/* Checkpoint list */}
            <div className="region-panel-list">
              {checkpoints.length === 0 ? (
                <p className="region-panel-empty">Không có địa điểm nào.</p>
              ) : (
                checkpoints.map((cp) => (
                  <div
                    key={cp.id}
                    className={`region-panel-item ${cp.isVisited ? 'visited' : ''} cursor-pointer`}
                    style={cp.isVisited ? { borderLeftColor: primaryColor } : undefined}
                    onClick={() => onItemClick(cp)}
                  >
                    <div className="region-panel-item-icon">
                      {cp.isVisited ? (
                        <CheckCircle2 size={18} color={primaryColor} />
                      ) : (
                        <Circle size={18} color="#C8BFA8" />
                      )}
                    </div>
                    <div className="region-panel-item-content">
                      <p className="region-panel-item-name" style={{ color: cp.isVisited ? primaryColor : '#3d3428' }}>
                        {cp.name}
                      </p>
                      <p className="region-panel-item-region">{cp.region}</p>
                      {cp.hasDollBonus && (
                        <span
                          className="region-panel-item-badge"
                          style={{ background: `${secondaryColor}20`, color: secondaryColor }}
                        >
                          <Star size={10} fill={secondaryColor} />
                          Thưởng Búp bê
                        </span>
                      )}
                    </div>
                    {cp.distanceMeters !== undefined && (
                      <span className="region-panel-item-dist">
                        {cp.distanceMeters < 1000
                          ? `${cp.distanceMeters}m`
                          : `${(cp.distanceMeters / 1000).toFixed(1)}km`}
                      </span>
                    )}
                    <ChevronRight className="ml-2 text-stone-300 w-4 h-4 mt-2 shrink-0 group-hover:text-amber-600 transition-colors" />
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        .region-panel-backdrop {
          position: fixed; inset: 0; z-index: 40;
          background: rgba(15, 10, 5, 0.35);
          opacity: 0; pointer-events: none;
          transition: opacity 300ms ease;
          backdrop-filter: blur(3px);
        }
        .region-panel-backdrop.active {
          opacity: 1; pointer-events: auto;
        }

        /* Desktop: compact centered modal */
        .region-panel {
          position: fixed;
          left: 50%; top: 50%;
          transform: translate(-50%, -50%) scale(0.92);
          width: min(420px, 94vw);
          max-height: 70vh;
          z-index: 50;
          background: rgba(251, 248, 243, 0.98);
          backdrop-filter: blur(20px);
          box-shadow: 0 24px 64px rgba(15, 10, 5, 0.18), 0 4px 16px rgba(15, 10, 5, 0.08);
          display: flex; flex-direction: column;
          opacity: 0;
          transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 250ms ease;
          border-radius: 20px;
          border: 1px solid rgba(200, 191, 168, 0.45);
          overflow: hidden;
        }
        .region-panel.open {
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }

        /* Mobile: bottom sheet */
        @media (max-width: 640px) {
          .region-panel {
            left: 0; right: 0; bottom: 0; top: auto;
            transform: translateY(100%);
            opacity: 1;
            width: 100%; max-height: 72vh;
            border-radius: 20px 20px 0 0;
            border-left: none; border-right: none; border-bottom: none;
            border-top: 1px solid rgba(200,191,168,0.4);
            transition: transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .region-panel.open { transform: translateY(0); }
        }

        /* Inner elements */
        .region-panel-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 16px 14px;
          border-bottom: 1px solid;
          flex-shrink: 0;
        }
        .region-panel-title-group {
          display: flex; align-items: center; gap: 10px;
        }
        .region-panel-icon {
          width: 34px; height: 34px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .region-panel-title {
          font-family: 'Noto Serif', serif;
          font-size: 15px; font-weight: 800; margin: 0; line-height: 1.2;
        }
        .region-panel-subtitle {
          font-size: 11px; color: #8a7a60; margin: 2px 0 0;
        }
        .region-panel-close {
          width: 30px; height: 30px; border-radius: 8px;
          border: none; background: rgba(15,10,5,0.06);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #6b5a40; flex-shrink: 0;
          transition: background 200ms;
        }
        .region-panel-close:hover { background: rgba(15,10,5,0.12); }
        .region-panel-progress-wrap {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 16px;
          flex-shrink: 0;
        }
        .region-panel-progress-bg {
          flex: 1; height: 4px; background: #E8E0D0; border-radius: 999px; overflow: hidden;
        }
        .region-panel-progress-fill {
          height: 100%; border-radius: 999px;
          transition: width 600ms ease;
        }
        .region-panel-progress-label {
          font-size: 11px; font-weight: 700; color: #6b5a40; width: 32px; text-align: right;
        }
        .region-panel-list {
          flex: 1; overflow-y: auto; padding: 4px 0 4px;
          min-height: 0;
        }
        .region-panel-empty {
          text-align: center; color: #8a7a60; font-size: 13px; padding: 24px;
        }
        .region-panel-item {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 10px 16px;
          border-left: 3px solid transparent;
          transition: background 200ms;
        }
        .region-panel-item:hover { background: rgba(201,167,109,0.08); }
        .region-panel-item.visited { border-left-color: #0f3a2c22; }
        .region-panel-item-icon { flex-shrink: 0; margin-top: 1px; }
        .region-panel-item-content { flex: 1; min-width: 0; }
        .region-panel-item-name {
          font-size: 13px; font-weight: 600; margin: 0 0 2px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .region-panel-item-region {
          font-size: 10px; color: #8a7a60; margin: 0 0 3px;
        }
        .region-panel-item-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 2px 7px; border-radius: 999px;
          font-size: 10px; font-weight: 600;
        }
        .region-panel-item-dist {
          font-size: 11px; color: #8a7a60; flex-shrink: 0; padding-top: 2px;
        }
        .region-panel-footer {
          padding: 10px 16px 16px;
          border-top: 1px solid rgba(200,191,168,0.3);
          flex-shrink: 0;
        }
        .region-panel-checkin-btn {
          width: 100%; padding: 10px 16px; border-radius: 12px;
          border: none; color: white; font-size: 13px; font-weight: 700;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          cursor: pointer; transition: filter 200ms, transform 150ms;
        }
        .region-panel-checkin-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .region-panel-checkin-btn:active { transform: translateY(0); }
      `}</style>
    </>
  );
}
