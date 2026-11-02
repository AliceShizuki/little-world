/**
 * 世界地图
 *
 * 不是关卡选择页，是一张可以摊开看的绘本地图：
 * 八个区域在同一块土地上，由道路与河流连着，进哪个都由孩子决定。
 *
 * 宽屏是横开本的大地图；竖屏手机换成"书页"版式（两列四行），
 * 让每个区域都保持足够大的可点面积——而不是把大地图直接缩小。
 */

import { useEffect, useRef, useState } from 'react';
import { REGIONS, REGION_ORDER } from './regions';
import { useWorld } from './store';
import type { RegionId } from './types';

/** 地图上只有八个可去的区域：地下 / 树上是从森林进去的里层空间 */
type Spot = Record<string, { x: number; y: number }>;

/** 横版：一块大陆，八处地点 */
const SPOT_WIDE: Spot = {
  forest: { x: 300, y: 268 },
  farm: { x: 596, y: 402 },
  town: { x: 872, y: 316 },
  home: { x: 1092, y: 480 },
  site: { x: 700, y: 640 },
  seaside: { x: 330, y: 690 },
  underwater: { x: 1120, y: 762 },
  sky: { x: 1330, y: 208 },
};

/** 竖版：两列四行，节点更大 */
const SPOT_TALL: Spot = {
  forest: { x: 300, y: 240 },
  farm: { x: 700, y: 240 },
  town: { x: 300, y: 610 },
  home: { x: 700, y: 610 },
  site: { x: 300, y: 980 },
  seaside: { x: 700, y: 980 },
  underwater: { x: 300, y: 1350 },
  sky: { x: 700, y: 1350 },
};

const ROUTES: [RegionId, RegionId][] = [
  ['forest', 'farm'],
  ['farm', 'town'],
  ['town', 'home'],
  ['home', 'site'],
  ['site', 'seaside'],
  ['seaside', 'underwater'],
  ['underwater', 'sky'],
  ['forest', 'town'],
  ['home', 'sky'],
];

function NodeIcon({ r }: { r: RegionId }) {
  const c = '#5c4a3d';
  switch (r) {
    case 'forest':
      return (
        <g>
          <path d="M 0 -18 L 15 7 L -15 7 Z" fill={c} opacity={0.85} />
          <rect x={-2.6} y={5} width={5.2} height={10} fill={c} opacity={0.7} />
        </g>
      );
    case 'farm':
      return (
        <g>
          <path d="M -14 1 L 0 -13 L 14 1 Z" fill={c} opacity={0.85} />
          <rect x={-12} y={0} width={24} height={14} fill={c} opacity={0.6} />
        </g>
      );
    case 'seaside':
      return (
        <g>
          <rect x={-12} y={-6} width={8} height={19} rx={2} fill={c} opacity={0.85} />
          <path d="M -8 -6 L 0 -19 L 3.4 -6 Z" fill={c} opacity={0.6} />
        </g>
      );
    case 'town':
      return (
        <g>
          <rect x={-15} y={-8} width={13} height={19} fill={c} opacity={0.7} />
          <rect x={2} y={-15} width={13} height={26} fill={c} opacity={0.85} />
        </g>
      );
    case 'home':
      return (
        <g>
          <path d="M -15 1 L 0 -15 L 15 1 Z" fill={c} opacity={0.85} />
          <rect x={-11} y={0} width={22} height={14} rx={1.6} fill={c} opacity={0.55} />
        </g>
      );
    case 'site':
      return (
        <g>
          <path d="M -15 11 L -15 -7 L 11 -18 L 11 2" stroke={c} strokeWidth={3.2} fill="none" strokeLinecap="round" />
          <path d="M 2 -13 L 2 11" stroke={c} strokeWidth={3.2} strokeLinecap="round" />
        </g>
      );
    case 'underwater':
      return (
        <g>
          <ellipse cx={-1} cy={0} rx={14} ry={7.5} fill={c} opacity={0.8} />
          <path d="M -14 0 L -22 -7 L -22 7 Z" fill={c} opacity={0.6} />
          <circle cx={6} cy={-2} r={1.9} fill="#ffffff" />
        </g>
      );
    case 'sky':
      return (
        <g>
          <ellipse cx={-4} cy={2} rx={12} ry={7.5} fill={c} opacity={0.8} />
          <ellipse cx={8} cy={-3} rx={10} ry={6.5} fill={c} opacity={0.65} />
          <rect x={-6} y={9} width={3.2} height={8} fill={c} opacity={0.7} />
          <rect x={5} y={9} width={3.2} height={8} fill={c} opacity={0.7} />
        </g>
      );
    default:
      return null;
  }
}

export function WorldMap({ onClose }: { onClose: () => void }) {
  const { region, go } = useWorld();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(1200);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tall = w < 720;
  const spot = tall ? SPOT_TALL : SPOT_WIDE;
  const vb = tall ? '40 100 920 1340' : '60 60 1480 800';
  // 屏幕越窄，节点画得越大，保证手指点得准
  const r = tall ? 74 : w < 1000 ? 56 : 44;

  return (
    <div className="v3-map" onPointerDown={(e) => e.stopPropagation()} ref={wrapRef}>
      <svg viewBox={vb} className="v3-map-svg" role="img" aria-label="世界地图">
        <defs>
          <radialGradient id="mapPaper" cx="0.5" cy="0.4" r="0.8">
            <stop offset="0%" stopColor="#fdf7e8" />
            <stop offset="100%" stopColor="#f2e6cd" />
          </radialGradient>
          <linearGradient id="mapSea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c6e6f2" />
            <stop offset="100%" stopColor="#a8d8ea" />
          </linearGradient>
        </defs>

        <rect x={-200} y={-200} width={2000} height={2000} fill="url(#mapPaper)" />

        {tall ? (
          <g>
            {/* 书页式：一整块草地，四周留白 */}
            <rect x={80} y={120} width={840} height={1300} rx={40} fill="#d7e6c1" />
            <rect x={80} y={120} width={840} height={1300} rx={40} fill="none" stroke="#a8bf8c" strokeWidth={5} opacity={0.8} />
            {/* 一条河从左上流到右下 */}
            <path
              d="M 120 320 C 260 480, 300 520, 420 640 C 540 760, 560 900, 700 1030 C 800 1120, 840 1200, 900 1290"
              stroke="#8fcfe4"
              strokeWidth={16}
              fill="none"
              strokeLinecap="round"
              opacity={0.9}
            />
            <path
              d="M 120 320 C 260 480, 300 520, 420 640 C 540 760, 560 900, 700 1030 C 800 1120, 840 1200, 900 1290"
              stroke="#d9f2fb"
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
              opacity={0.8}
            />
            {ROUTES.map(([a, b]) => {
              const p1 = SPOT_TALL[a];
              const p2 = SPOT_TALL[b];
              return (
                <line
                  key={`${a}-${b}`}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="#e0cba4"
                  strokeWidth={9}
                  strokeDasharray="2 16"
                  strokeLinecap="round"
                  opacity={0.85}
                />
              );
            })}
          </g>
        ) : (
          <g>
            <path d="M -200 560 C 120 520 260 640 300 760 C 340 880 200 1100 -200 1100 Z" fill="url(#mapSea)" />
            <path d="M 980 640 C 1080 620 1180 700 1220 820 C 1250 920 1200 1100 1000 1100 Z" fill="url(#mapSea)" />
            <path
              d="M 210 180 C 420 120 700 150 860 200 C 1010 245 1180 200 1330 240 C 1470 276 1520 420 1470 560 C 1430 680 1300 760 1160 800 C 1000 850 820 830 700 780 C 560 720 420 760 340 660 C 270 570 180 460 190 340 C 195 280 200 210 210 180 Z"
              fill="#d7e6c1"
            />
            <path
              d="M 210 180 C 420 120 700 150 860 200 C 1010 245 1180 200 1330 240 C 1470 276 1520 420 1470 560 C 1430 680 1300 760 1160 800 C 1000 850 820 830 700 780 C 560 720 420 760 340 660 C 270 570 180 460 190 340 C 195 280 200 210 210 180 Z"
              fill="none"
              stroke="#a8bf8c"
              strokeWidth={5}
              opacity={0.8}
            />
            <g opacity={0.35} fill="#8fb07a">
              {[
                [420, 220],
                [470, 250],
                [520, 210],
                [1260, 320],
                [1320, 360],
                [240, 430],
                [290, 470],
              ].map(([x, y], i) => (
                <path key={i} d={`M ${x} ${y + 20} L ${x + 16} ${y - 12} L ${x + 32} ${y + 20} Z`} />
              ))}
            </g>
            <path
              d="M 330 300 C 420 380 500 400 600 430 C 680 452 620 540 520 600 C 440 650 380 660 340 690"
              stroke="#8fcfe4"
              strokeWidth={16}
              fill="none"
              strokeLinecap="round"
              opacity={0.9}
            />
            <path
              d="M 330 300 C 420 380 500 400 600 430 C 680 452 620 540 520 600 C 440 650 380 660 340 690"
              stroke="#d9f2fb"
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
              opacity={0.8}
            />
            {ROUTES.map(([a, b]) => {
              const p1 = SPOT_WIDE[a];
              const p2 = SPOT_WIDE[b];
              const mx = (p1.x + p2.x) / 2 + (p1.y - p2.y) * 0.16;
              const my = (p1.y + p2.y) / 2 + (p2.x - p1.x) * 0.16;
              return (
                <path
                  key={`${a}-${b}`}
                  d={`M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`}
                  stroke="#e0cba4"
                  strokeWidth={9}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="2 14"
                  opacity={0.9}
                />
              );
            })}
          </g>
        )}

        {/* 节点 */}
        {REGION_ORDER.map((id) => {
          const p = spot[id];
          const meta = REGIONS[id];
          const active = id === region;
          return (
            <g
              key={id}
              transform={`translate(${p.x} ${p.y})`}
              className="v3-map-node"
              onPointerDown={(e) => {
                e.stopPropagation();
                go(id);
                onClose();
              }}
              role="button"
              aria-label={meta.name}
            >
              {active && <circle r={r * 1.32} fill={meta.accent} opacity={0.34} className="v3-ring" />}
              <circle r={r} fill={meta.accent} stroke="#ffffff" strokeWidth={r * 0.11} />
              <circle r={r} fill="none" stroke="rgba(109,90,74,0.22)" strokeWidth={2} />
              <g transform={tall ? 'scale(2.1)' : undefined}>
                <NodeIcon r={id} />
              </g>
              <text
                y={r + (tall ? 46 : 26)}
                textAnchor="middle"
                fontSize={tall ? 34 : 22}
                fill="#6d5a4a"
                fontWeight={600}
                style={{ fontFamily: "'PingFang SC','Microsoft YaHei',sans-serif" }}
              >
                {meta.name}
              </text>
            </g>
          );
        })}

        {!tall && (
          <g opacity={0.5} stroke="#b9a888" strokeWidth={3} fill="none">
            <circle cx={120} cy={140} r={26} />
            <path d="M 120 100 L 120 180 M 80 140 L 160 140" />
          </g>
        )}
      </svg>

      <button
        className="v3-map-close"
        onPointerDown={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="关闭地图"
      >
        <svg viewBox="0 0 24 24" width="22" height="22">
          <path d="M 6 6 L 18 18 M 18 6 L 6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
