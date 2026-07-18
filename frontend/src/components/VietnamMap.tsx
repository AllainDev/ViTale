import React, { useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import simpleMapsData from '../data/simplemaps-vietnam.json';

interface Province {
  id: string;
  name: string;
  nameEn: string;
  type: string;
  region: string;
  cx: number;
  cy: number;
  merged: string[];
}

import vietnamProvincesData from '../data/vietnam-provinces-2025.json';

const PROVINCES = vietnamProvincesData.provinces;

interface VietnamMapProps {
  checkpoints: any[];
  selectedProvinceId: string | null;
  onProvinceClick: (province: Province, cps: any[]) => void;
  primaryColor?: string;
  secondaryColor?: string;
}

function normalizeRegion(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getCustomProvinceForSimpleMaps(simpleName: string, provinces: Province[]) {
  if (!simpleName) return undefined;
  
  if (simpleName === 'Đông Nam Bộ') simpleName = 'Đồng Nai';
  if (simpleName === 'Đông Bắc') simpleName = 'Bắc Kạn';
  if (simpleName === 'Đồng Bằng Sông Hồng') simpleName = 'Hưng Yên';
  if (simpleName === 'Hồ Chí Minh city') simpleName = 'TP. Hồ Chí Minh';
  if (simpleName === 'Hải Phòng') simpleName = 'Hải Phòng';
  
  const normalizedTopo = normalizeRegion(simpleName);
  return provinces.find(p => 
    p.merged.some(m => {
      const nm = normalizeRegion(m);
      return nm === normalizedTopo || nm.includes(normalizedTopo) || normalizedTopo.includes(nm);
    })
  );
}

export default function VietnamMap({
  checkpoints,
  selectedProvinceId,
  onProvinceClick,
  primaryColor = "#0f3a2c",
  secondaryColor = "#c9a76d"
}: VietnamMapProps) {
  const [hoveredProvId, setHoveredProvId] = useState<string | null>(null);

  const activeProvinceIds = new Set<string>();
  if (selectedProvinceId) activeProvinceIds.add(selectedProvinceId);
  if (hoveredProvId) activeProvinceIds.add(hoveredProvId);

  const visitedProvinceIds = new Set<string>();
  const hasCheckpointProvinceIds = new Set<string>();
  checkpoints.forEach(cp => {
    const normRegion = normalizeRegion(cp.region);
    const match = PROVINCES.find(p => {
      const normProv = normalizeRegion(p.name);
      return normRegion === normProv || normRegion.includes(normProv) || normProv.includes(normRegion);
    });
    if (match) {
      hasCheckpointProvinceIds.add(match.id);
      if (cp.isVisited) visitedProvinceIds.add(match.id);
    }
  });

  const totalProvinces = PROVINCES.length;
  const visitedCount = visitedProvinceIds.size;
  const visitedPercent = Math.round((visitedCount / totalProvinces) * 100) || 0;

  // We group the paths by their custom province ID so we can render labels accurately.
  const customProvCenters: Record<string, { x: number, y: number, count: number }> = {};
  
  const simpleMapsPaths = (simpleMapsData as any).paths;
  const simpleMapsNames = (simpleMapsData as any).names;
  const simpleMapsBBox = (simpleMapsData as any).state_bbox_array;
  
  Object.keys(simpleMapsPaths).forEach(key => {
    const name = simpleMapsNames[key];
    const customProv = getCustomProvinceForSimpleMaps(name, PROVINCES);
    if (customProv) {
      if (!customProvCenters[customProv.id]) {
         customProvCenters[customProv.id] = { x: 0, y: 0, count: 0 };
      }
      const bbox = simpleMapsBBox[key];
      if (bbox) {
         customProvCenters[customProv.id].x += Number(bbox.cx);
         customProvCenters[customProv.id].y += Number(bbox.cy);
         customProvCenters[customProv.id].count++;
      }
    }
  });

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={8}
        centerOnInit
        wheel={{ step: 0.02 }}
        doubleClick={{ step: 0.5 }}
      >
        <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
          <svg viewBox="0 0 1000 1000" style={{ width: '100%', height: '100%', maxHeight: '80vh' }}>
            <g>
              {Object.keys(simpleMapsPaths).map(key => {
                const pathD = simpleMapsPaths[key];
                const name = simpleMapsNames[key];
                const customProv = getCustomProvinceForSimpleMaps(name, PROVINCES);
                
                if (!customProv) return null;

                const isActive = activeProvinceIds.has(customProv.id);
                const isVisited = visitedProvinceIds.has(customProv.id);
                const hasCheckpoints = hasCheckpointProvinceIds.has(customProv.id);

                let fill = "rgba(200,191,168,0.3)";
                if (isActive) fill = "rgba(202, 150, 60, 0.95)";
                else if (isVisited) fill = "rgba(102, 187, 106, 0.75)";
                else if (hasCheckpoints) fill = "rgba(202, 168, 80, 0.65)";

                return (
                  <path
                    key={key}
                    d={pathD}
                    fill={fill}
                    stroke="rgba(255, 255, 255, 0.35)"
                    strokeWidth={1}
                    onClick={() => {
                      const normalizedProvName = normalizeRegion(customProv.name); const cps = checkpoints.filter(c => { const normRegion = normalizeRegion(c.region); return normRegion === normalizedProvName || normRegion.includes(normalizedProvName) || normalizedProvName.includes(normRegion); });
                      onProvinceClick(customProv, cps);
                    }}
                    onMouseEnter={() => setHoveredProvId(customProv.id)}
                    onMouseLeave={() => setHoveredProvId(null)}
                    style={{ cursor: 'pointer', transition: 'fill 0.2s ease-in-out' }}
                  >
                    <title>{customProv.name}</title>
                  </path>
                );
              })}
            </g>
            <g pointerEvents="none">
              {PROVINCES.map(prov => {
                const center = customProvCenters[prov.id];
                if (!center || center.count === 0) return null;
                const cx = center.x / center.count;
                const cy = center.y / center.count;
                const isHovered = activeProvinceIds.has(prov.id);
                return (
                  <text
                    key={`label-${prov.id}`}
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    fill={isHovered ? "#fff" : "rgba(0,0,0,0.5)"}
                    fontSize={isHovered ? 12 : 7}
                    fontWeight={isHovered ? "bold" : "normal"}
                    style={{ transition: 'all 0.2s ease-in-out', textShadow: isHovered ? '0px 0px 3px rgba(0,0,0,0.8)' : 'none' }}
                  >
                    {prov.name}
                  </text>
                );
              })}
            </g>
          </svg>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
