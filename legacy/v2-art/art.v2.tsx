/**
 * 共享美术库
 *
 * 八个区域的背景与固定道具全部由这里拼装，颜色统一取自 theme.ts。
 * 每个组件都接受 view（相机视野），并且画得比视野更大一圈——
 * 这样在竖屏手机上多出来的天空与地面不会露出空白。
 */

import type { ReactNode } from 'react';
import { C } from '../theme';
import type { Eco, Phase, Season, View, Weather } from './types';

const OUT = 'rgba(109,90,74,0.35)';
const ST = { stroke: OUT, strokeWidth: 2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

/* ───────────────────────── 天空 ───────────────────────── */

const SKY: Record<Phase, [string, string, string]> = {
  dawn: ['#cfe0f2', '#f7dcc8', '#fdf3e0'],
  day: ['#bfe0f5', '#d8edfa', '#fdf2e0'],
  sunset: ['#e9b7b0', '#f6cfa8', '#fbe7c8'],
  night: ['#141c3f', '#25305c', '#4c4a78'],
};

export function Sky({ view, phase, weather, children }: { view: View; phase: Phase; weather: Weather; children?: ReactNode }) {
  const [a, b, c] = SKY[phase];
  const id = `sky-${phase}`;
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={a} />
          <stop offset="62%" stopColor={b} />
          <stop offset="100%" stopColor={c} />
        </linearGradient>
      </defs>
      <rect x={view.x - 200} y={view.y - 300} width={view.w + 400} height={view.h + 600} fill={`url(#${id})`} />
      {/* 云的光晕 */}
      {phase !== 'night' && (
        <ellipse
          cx={view.x + view.w * 0.7}
          cy={view.y + view.h * 0.22}
          rx={view.w * 0.3}
          ry={view.h * 0.18}
          fill="#ffffff"
          opacity={weather === 'rain' || weather === 'snow' ? 0.06 : 0.16}
          filter="url(#softBlur)"
        />
      )}
      {children}
    </g>
  );
}

/** 星星：只有夜里出现，各自闪烁节奏不同 */
export function Stars({ view, phase }: { view: View; phase: Phase }) {
  if (phase !== 'night') return null;
  return (
    <g>
      {Array.from({ length: 56 }, (_, i) => {
        const rx = ((i * 9301 + 49297) % 233280) / 233280;
        const ry = ((i * 4271 + 12345) % 199999) / 199999;
        const x = view.x + rx * view.w;
        const y = view.y + ry * view.h * 0.66;
        const r = 1.2 + ((i * 37) % 10) / 7;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={r}
            fill="#fff4cf"
            className="v3-twinkle"
            style={{ animationDelay: `${(i % 13) * 0.42}s`, animationDuration: `${3.4 + (i % 5) * 0.7}s` }}
          />
        );
      })}
    </g>
  );
}

/* ───────────────────────── 地面 ───────────────────────── */

export function Hills({
  view,
  horizon,
  far = '#cfdfc4',
  mid = '#bcd7ab',
}: {
  view: View;
  horizon: number;
  far?: string;
  mid?: string;
}) {
  const x0 = view.x - 200;
  const w = view.w + 400;
  return (
    <g>
      <path
        d={`M ${x0} ${horizon + 30} C ${x0 + w * 0.2} ${horizon - 90}, ${x0 + w * 0.42} ${horizon - 40}, ${x0 + w * 0.6} ${horizon - 70} C ${x0 + w * 0.8} ${horizon - 100}, ${x0 + w * 0.9} ${horizon - 30}, ${x0 + w} ${horizon - 40} L ${x0 + w} ${horizon + 400} L ${x0} ${horizon + 400} Z`}
        fill={far}
      />
      <path
        d={`M ${x0} ${horizon + 70} C ${x0 + w * 0.25} ${horizon + 10}, ${x0 + w * 0.5} ${horizon + 60}, ${x0 + w * 0.72} ${horizon + 20} C ${x0 + w * 0.86} ${horizon - 4}, ${x0 + w * 0.95} ${horizon + 50}, ${x0 + w} ${horizon + 40} L ${x0 + w} ${horizon + 500} L ${x0} ${horizon + 500} Z`}
        fill={mid}
      />
    </g>
  );
}

export function Ground({
  view,
  top,
  near = C.grass,
  far = C.grassFar,
  edge,
}: {
  view: View;
  top: number;
  near?: string;
  far?: string;
  edge?: string;
}) {
  const x0 = view.x - 200;
  const w = view.w + 400;
  const bottom = view.y + view.h + 300;
  return (
    <g>
      <rect x={x0} y={top} width={w} height={bottom - top} fill={far} />
      <path
        d={`M ${x0} ${top + 26} C ${x0 + w * 0.22} ${top - 6}, ${x0 + w * 0.46} ${top + 34}, ${x0 + w * 0.68} ${top + 6} C ${x0 + w * 0.84} ${top - 12}, ${x0 + w * 0.94} ${top + 22}, ${x0 + w} ${top + 12} L ${x0 + w} ${bottom} L ${x0} ${bottom} Z`}
        fill={near}
      />
      {edge && (
        <path
          d={`M ${x0} ${top + 26} C ${x0 + w * 0.22} ${top - 6}, ${x0 + w * 0.46} ${top + 34}, ${x0 + w * 0.68} ${top + 6} C ${x0 + w * 0.84} ${top - 12}, ${x0 + w * 0.94} ${top + 22}, ${x0 + w} ${top + 12}`}
          stroke={edge}
          strokeWidth={7}
          fill="none"
          opacity={0.5}
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

/* ───────────────────────── 植物 ───────────────────────── */

export type TreeKind = 'oak' | 'pine' | 'willow' | 'birch' | 'bare';

export function Tree({
  x,
  y,
  s = 1,
  kind = 'oak',
  season = 'summer',
  night = false,
}: {
  x: number;
  y: number;
  s?: number;
  kind?: TreeKind;
  season?: Season;
  night?: boolean;
}) {
  const leaf = season === 'autumn' ? '#e0a35f' : season === 'winter' ? '#b9c7c4' : night ? C.leafNight : C.leaf;
  const leafD = season === 'autumn' ? '#c9834a' : season === 'winter' ? '#a3b1ae' : night ? '#5d8158' : C.leafDark;
  const leafL = season === 'autumn' ? '#f0bd7c' : season === 'winter' ? '#cfdad8' : night ? '#6f9a68' : C.leafLight;

  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {kind === 'pine' ? (
        <>
          <rect x={-8} y={-40} width={16} height={40} rx={3} fill={C.trunkDark} />
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={`M 0 ${-180 + i * 46} L ${52 - i * 12} ${-40 + i * 46} L ${-52 + i * 12} ${-40 + i * 46} Z`}
              fill={i % 2 ? leafD : leaf}
              {...ST}
            />
          ))}
        </>
      ) : kind === 'willow' ? (
        <>
          <path d="M -9 0 C -8 -40 -6 -70 -4 -96 L 8 -96 C 8 -70 9 -40 12 0 Z" fill="url(#trunkGrad)" {...ST} />
          <g>
            {Array.from({ length: 10 }, (_, i) => {
              const dx = -46 + i * 10;
              const len = 62 + (i % 3) * 26;
              return (
                <path
                  key={i}
                  className="v3-sway"
                  d={`M ${dx} -118 C ${dx * 1.1} -90, ${dx * 1.25} ${-118 + len * 0.7}, ${dx * 1.15} ${-118 + len}`}
                  stroke={leaf}
                  strokeWidth={3}
                  fill="none"
                  strokeLinecap="round"
                  style={{ animationDelay: `${i * 0.3}s` }}
                />
              );
            })}
            <ellipse cx={0} cy={-134} rx={52} ry={34} fill={leaf} />
            <ellipse cx={-16} cy={-146} rx={24} ry={14} fill={leafL} opacity={0.7} />
          </g>
        </>
      ) : kind === 'bare' ? (
        <>
          <path d="M -10 0 C -8 -50 -6 -90 -4 -120 L 8 -120 C 8 -90 9 -50 12 0 Z" fill={C.trunk} {...ST} />
          <path d="M 0 -118 C -22 -150 -40 -158 -54 -164 M 2 -124 C 24 -156 42 -164 56 -170 M 0 -100 C -18 -126 -30 -134 -40 -142" stroke={C.trunk} strokeWidth={6} fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M -14 2 C -16 -6 -10 -46 -8 -92 L 8 -92 C 8 -46 12 -6 18 2 C 10 6 -6 6 -14 2 Z" fill={kind === 'birch' ? '#f0ece2' : 'url(#trunkGrad)'} {...ST} />
          {kind === 'birch' && <path d="M -6 -30 L 4 -26 M -8 -54 L 6 -49 M 2 -74 L 8 -70" stroke="#b9ab97" strokeWidth={2} strokeLinecap="round" />}
          <path d="M -2 -84 C -22 -104 -34 -112 -46 -116 M 4 -88 C 22 -108 34 -114 46 -118" stroke={C.trunk} strokeWidth={6} fill="none" strokeLinecap="round" />
          <g className="v3-sway-slow">
            <ellipse cx={-38} cy={-140} rx={38} ry={32} fill={leafD} />
            <ellipse cx={34} cy={-146} rx={40} ry={34} fill={leaf} />
            <ellipse cx={-2} cy={-172} rx={42} ry={34} fill={leaf} />
            <ellipse cx={-22} cy={-166} rx={20} ry={13} fill={leafL} opacity={0.75} />
            <ellipse cx={26} cy={-176} rx={16} ry={10} fill="#ffffff" opacity={0.2} />
          </g>
        </>
      )}
    </g>
  );
}

export function Bush({ x, y, s = 1, color = C.leaf, dark = C.leafDark }: { x: number; y: number; s?: number; color?: string; dark?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={-16} cy={-16} rx={20} ry={16} fill={dark} />
      <ellipse cx={14} cy={-14} rx={18} ry={14} fill={color} />
      <ellipse cx={0} cy={-26} rx={22} ry={17} fill={color} />
      <ellipse cx={-6} cy={-30} rx={10} ry={6} fill="#ffffff" opacity={0.22} />
    </g>
  );
}

export function Tuft({ x, y, s = 1, color = '#5f8f56' }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={0.75}>
      <path d="M 0 0 C -3 -10 -8 -14 -12 -18" stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" />
      <path d="M 3 0 C 3 -12 5 -18 8 -24" stroke={color} strokeWidth={3.4} fill="none" strokeLinecap="round" />
      <path d="M 8 0 C 12 -9 16 -13 21 -16" stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" />
    </g>
  );
}

export function FlowerProp({ x, y, s = 1, color = C.petalPink }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M 0 0 C -1 -10 1 -14 0 -20" stroke="#6fa961" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      {Array.from({ length: 5 }, (_, i) => {
        const a = (Math.PI * 2 * i) / 5;
        return <circle key={i} cx={Math.cos(a) * 5} cy={-22 + Math.sin(a) * 5} r={4} fill={color} />;
      })}
      <circle cx={0} cy={-22} r={2.6} fill={C.flowerCenter} />
    </g>
  );
}

export function Rock({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M -24 0 C -26 -14 -14 -26 0 -26 C 14 -26 26 -16 24 0 Z" fill="#c9c6bd" {...ST} />
      <path d="M -14 -6 C -12 -16 -4 -20 4 -18" stroke="#e8e6df" strokeWidth={3} fill="none" strokeLinecap="round" />
    </g>
  );
}

/* ───────────────────────── 建筑 ───────────────────────── */

/**
 * 会唱歌的一排东西（石头 / 贝壳 / 玻璃瓶）。
 *
 * 五个一组、从低到高，敲出来的音高和它们的大小、颜色深浅一起往上走——
 * 孩子先发现"大小不一样"，再发现"声音不一样"，这两件事连起来就是"顺序"。
 *
 * 第一个参数直接吃 `CHIMES` 里的那一条，坐标只写一份：
 * 画面按这份数据画，热区也按这份数据生成，不会各画各的。
 */
export function ChimeRow({
  set,
  night = false,
}: {
  set: { x: number; y: number; gap: number; size: number; look: 'stone' | 'bottle' | 'shell' };
  night?: boolean;
}) {
  const N = 5;
  return (
    <g>
      {Array.from({ length: N }, (_, i) => {
        const x = set.x + i * set.gap;
        const r = set.size * (0.86 + i * 0.055);

        if (set.look === 'stone') {
          return (
            <g key={i} transform={`translate(${x} ${set.y})`}>
              {/* 石头：越靠右越大、越亮，像被一个个摆开 */}
              <path
                d={`M ${-r} 0 C ${-r - 3} ${-r * 0.85} ${-r * 0.45} ${-r * 1.35} 0 ${-r * 1.32} C ${r * 0.5} ${-r * 1.3} ${r + 2} ${-r * 0.7} ${r} 0 Z`}
                fill={`hsl(34 12% ${52 + i * 4}%)`}
                {...ST}
              />
              <path d={`M ${-r * 0.55} ${-r * 0.5} C ${-r * 0.2} ${-r * 0.95} ${r * 0.2} ${-r} ${r * 0.5} ${-r * 0.8}`} stroke={`rgba(255,255,255,${0.25 + i * 0.05})`} strokeWidth={2.4} fill="none" strokeLinecap="round" />
              {/* 影子：贴地才有重量 */}
              <ellipse cx={0} cy={2} rx={r * 0.95} ry={3.2} fill="rgba(60,50,40,0.16)" />
            </g>
          );
        }
        if (set.look === 'shell') {
          return (
            <g key={i} transform={`translate(${x} ${set.y})`}>
              <path d={`M 0 0 C ${-r} ${-r * 0.4} ${-r * 0.75} ${-r * 1.5} 0 ${-r * 1.55} C ${r * 0.75} ${-r * 1.5} ${r} ${-r * 0.4} 0 0 Z`} fill={`hsl(${18 + i * 6} 52% ${82 - i * 3}%)`} {...ST} />
              {[0, 1, 2].map((j) => (
                <path key={j} d={`M 0 -2 C ${(j - 1) * r * 0.32} ${-r * 0.7} ${(j - 1) * r * 0.4} ${-r * 1.1} 0 ${-r * 1.45}`} stroke="rgba(190,150,130,0.5)" strokeWidth={1.4} fill="none" />
              ))}
              <ellipse cx={0} cy={2} rx={r * 0.85} ry={3} fill="rgba(60,50,40,0.14)" />
            </g>
          );
        }
        // 玻璃瓶：水位越高音越高（现实里也是这么回事）
        const h = r * (1.5 + i * 0.24);
        const wx = r * 0.9;
        return (
          <g key={i} transform={`translate(${x} ${set.y})`}>
            <path
              d={`M ${-wx} 0 L ${-wx} ${-h * 0.62} Q ${-wx} ${-h * 0.78} ${-wx * 0.36} ${-h * 0.85} L ${-wx * 0.36} ${-h} Q ${-wx * 0.36} ${-h * 1.06} ${-wx * 0.2} ${-h * 1.07} L ${wx * 0.2} ${-h * 1.07} Q ${wx * 0.36} ${-h * 1.06} ${wx * 0.36} ${-h} L ${wx * 0.36} ${-h * 0.85} Q ${wx} ${-h * 0.78} ${wx} ${-h * 0.62} L ${wx} 0 Z`}
              fill={`rgba(206,232,236,${0.55 + i * 0.05})`}
              stroke="rgba(120,150,160,0.55)"
              strokeWidth={1.8}
            />
            {/* 水：从瓶底往上，越靠右越满 */}
            <path d={`M ${-wx + 1.2} -1.5 L ${-wx + 1.2} ${-h * 0.34 - i * 2} Q 0 ${-h * 0.28 - i * 2.4} ${wx - 1.2} ${-h * 0.34 - i * 2} L ${wx - 1.2} -1.5 Z`} fill={`rgba(126,196,226,${0.5 + i * 0.06})`} />
            <ellipse cx={0} cy={2} rx={wx * 1.05} ry={3} fill="rgba(60,50,40,0.13)" />
            <path d={`M ${-wx * 0.5} ${-h * 0.8} L ${-wx * 0.5} ${-h * 0.2}`} stroke="rgba(255,255,255,0.5)" strokeWidth={1.6} strokeLinecap="round" />
          </g>
        );
      })}
      {/* 夜里给一点点反光，不然站在旁边看不见 */}
      {night && <rect x={set.x - set.size * 2} y={set.y - set.size * 3.2} width={(set.gap * 4 + set.size * 4)} height={set.size * 3.4} fill="rgba(220,230,255,0.05)" rx={10} />}
    </g>
  );
}

export function Cottage({
  x,
  y,
  s = 1,
  wall = C.houseWall,
  roof = C.houseRoof,
  lit = false,
}: {
  x: number;
  y: number;
  s?: number;
  wall?: string;
  roof?: string;
  lit?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M -110 -8 L -110 -130 L 0 -212 L 110 -130 L 110 -8 Z" fill={wall} {...ST} />
      <path d="M -124 -126 L 0 -218 L 124 -126 L 132 -138 L 0 -238 L -132 -138 Z" fill={roof} {...ST} />
      <rect x={54} y={-208} width={20} height={54} rx={4} fill="#d0916a" {...ST} />
      <rect x={-96} y={-112} width={52} height={46} rx={4} fill={lit ? C.houseWindowLight : C.houseWindow} {...ST} />
      <path d="M -70 -112 L -70 -66 M -96 -89 L -44 -89" stroke="#ffffff" strokeWidth={2.1} opacity={0.8} />
      <path d="M 12 -8 L 12 -78 C 12 -92 60 -92 60 -78 L 60 -8 Z" fill={C.houseDoor} {...ST} />
      <circle cx={52} cy={-42} r={3} fill="#f5d78e" />
      <path d="M -104 -8 C -60 -2 60 -2 104 -8" stroke="rgba(170,140,105,0.35)" strokeWidth={6} fill="none" />
      {lit && <circle cx={-70} cy={-89} r={46} fill="#ffe2a0" opacity={0.25} filter="url(#softBlur)" />}
    </g>
  );
}

export function Barn({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-120} y={-150} width={240} height={150} fill="#e8a97e" {...ST} />
      <path d="M -132 -148 L 0 -224 L 132 -148 Z" fill="#c9724f" {...ST} />
      <path d="M -34 -150 L -34 -96 L 34 -96 L 34 -150 Z" fill="#f7ecd8" {...ST} />
      <path d="M -34 -96 L 34 -150 M 34 -96 L -34 -150" stroke="#c9724f" strokeWidth={3} />
      <rect x={-104} y={-136} width={44} height={38} rx={4} fill="#cfe6f2" {...ST} />
      <rect x={60} y={-136} width={44} height={38} rx={4} fill="#cfe6f2" {...ST} />
    </g>
  );
}

export function TownHouse({
  x,
  y,
  s = 1,
  color,
  roof = '#c98a6a',
  lit = false,
  awning,
}: {
  x: number;
  y: number;
  s?: number;
  color: string;
  roof?: string;
  lit?: boolean;
  awning?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-100} y={-180} width={200} height={180} fill={color} {...ST} />
      <rect x={-108} y={-192} width={216} height={16} rx={4} fill={roof} {...ST} />
      {[0, 1].map((r) =>
        [0, 1].map((c2) => (
          <rect
            key={`${r}-${c2}`}
            x={-76 + c2 * 74}
            y={-166 + r * 62}
            width={48}
            height={40}
            rx={4}
            fill={lit ? '#ffe2a0' : '#cfe6f2'}
            {...ST}
          />
        )),
      )}
      {awning && (
        <g>
          <path d="M -84 -112 L 84 -112 L 74 -84 L -74 -84 Z" fill={awning} {...ST} />
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i} d={`M ${-76 + i * 32} -112 L ${-70 + i * 32} -84`} stroke="#ffffff" strokeWidth={8} opacity={0.45} />
          ))}
        </g>
      )}
      <rect x={-25} y={-80} width={50} height={80} rx={5} fill="#b98b62" {...ST} />
      <rect x={-18} y={-72} width={36} height={30} rx={3} fill="#a8814f" opacity={0.85} />
      <rect x={-18} y={-34} width={36} height={26} rx={3} fill="#a8814f" opacity={0.85} />
      <circle cx={18} cy={-42} r={3.2} fill="#f5d78e" />
      <rect x={-30} y={-3} width={60} height={5} rx={2} fill="#cfc7b2" />
    </g>
  );
}

export function Lighthouse({ x, y, s = 1, lit = false }: { x: number; y: number; s?: number; lit?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M -34 0 L -22 -172 L 22 -172 L 34 0 Z" fill="#fdfaf3" {...ST} />
      <path d="M -28 -40 L 28 -40 L 26 -70 L -26 -70 Z" fill="#e8695f" opacity={0.85} />
      <path d="M -24 -110 L 24 -110 L 22 -136 L -22 -136 Z" fill="#e8695f" opacity={0.85} />
      <rect x={-28} y={-196} width={56} height={24} rx={4} fill="#f5c86a" {...ST} />
      <path d="M -26 -196 L 0 -230 L 26 -196 Z" fill="#c9724f" {...ST} />
      {lit && <circle cx={0} cy={-184} r={54} fill="#ffe9b8" opacity={0.35} filter="url(#softBlur)" />}
      <circle cx={0} cy={-184} r={9} fill={lit ? '#fff3c4' : '#e8dfc8'} />
    </g>
  );
}

/* ───────────────────────── 水 ───────────────────────── */

export function Water({
  view,
  top,
  colorTop = C.waterTop,
  colorBottom = C.waterBottom,
}: {
  view: View;
  top: number;
  colorTop?: string;
  colorBottom?: string;
}) {
  const x0 = view.x - 200;
  const w = view.w + 400;
  const id = `water-${top}`;
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colorTop} />
          <stop offset="100%" stopColor={colorBottom} />
        </linearGradient>
      </defs>
      <rect x={x0} y={top} width={w} height={view.y + view.h + 300 - top} fill={`url(#${id})`} />
      <path
        d={`M ${x0} ${top} C ${x0 + w * 0.2} ${top - 8}, ${x0 + w * 0.34} ${top + 8}, ${x0 + w * 0.52} ${top} C ${x0 + w * 0.7} ${top - 8}, ${x0 + w * 0.86} ${top + 8}, ${x0 + w} ${top}`}
        stroke={C.waterLight}
        strokeWidth={6}
        fill="none"
        opacity={0.75}
        strokeLinecap="round"
      />
      <path
        d={`M ${x0} ${top} C ${x0 + w * 0.2} ${top - 8}, ${x0 + w * 0.34} ${top + 8}, ${x0 + w * 0.52} ${top} C ${x0 + w * 0.7} ${top - 8}, ${x0 + w * 0.86} ${top + 8}, ${x0 + w} ${top}`}
        stroke="#ffffff"
        strokeWidth={2.4}
        fill="none"
        opacity={0.5}
        strokeLinecap="round"
      />
    </g>
  );
}


/* ───────────────────────── 天空物件 ───────────────────────── */

/** 太阳：白天挂在天上，日出日落时更低更暖，夜里不画 */
export function Sun({
  view,
  phase,
  weather,
}: {
  view: View;
  phase: Phase;
  weather: Weather;
}) {
  if (phase === 'night') return null;
  const low = phase === 'dawn' || phase === 'sunset';
  const x = view.x + view.w * (phase === 'dawn' ? 0.24 : 0.82);
  const y = view.y + view.h * (low ? 0.34 : 0.15);
  const r = Math.max(26, view.w * 0.032);
  const warm = phase === 'sunset' ? '#ffb877' : phase === 'dawn' ? '#ffd9a8' : '#ffe7a4';
  const dim = weather === 'rain' || weather === 'snow' || weather === 'cloudy';

  return (
    <g pointerEvents="none" opacity={dim ? 0.34 : 1}>
      <circle cx={x} cy={y} r={r * 3.4} fill="#ffe9b8" opacity={0.22} filter="url(#softBlur)" />
      <circle cx={x} cy={y} r={r * 1.5} fill="#ffeec2" opacity={0.45} filter="url(#softBlur)" />
      <circle cx={x} cy={y} r={r} fill={warm} />
      <circle cx={x - r * 0.25} cy={y - r * 0.28} r={r * 0.34} fill="#fff6d8" opacity={0.6} />
      {!dim && (
        <g stroke={warm} strokeWidth={2.6} strokeLinecap="round" opacity={0.5}>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (Math.PI / 4) * i + 0.2;
            const r0 = r * 1.24;
            const r1 = r * (1.5 + (i % 2) * 0.16);
            return (
              <path key={i} d={`M ${x + Math.cos(a) * r0} ${y + Math.sin(a) * r0} L ${x + Math.cos(a) * r1} ${y + Math.sin(a) * r1}`} />
            );
          })}
        </g>
      )}
    </g>
  );
}

/** 云：三朵高低不同，各自慢慢飘 */
export function Clouds({ view, phase, weather }: { view: View; phase: Phase; weather: Weather }) {
  const dark = phase === 'night' ? 0.32 : weather === 'rain' || weather === 'cloudy' ? 0.86 : 1;
  const tint = phase === 'night' ? '#b9c4dd' : phase === 'sunset' || phase === 'dawn' ? '#ffe8d8' : '#ffffff';
  const shade = phase === 'night' ? '#8f9ebb' : '#e3edf6';
  const list = [
    { x: view.x + view.w * 0.18, y: view.y + view.h * 0.14, s: 1 },
    { x: view.x + view.w * 0.52, y: view.y + view.h * 0.24, s: 0.72 },
    { x: view.x + view.w * 0.9, y: view.y + view.h * 0.32, s: 0.88 },
  ];
  return (
    <g pointerEvents="none" opacity={dark}>
      {list.map((c, i) => (
        <g key={i} className="v3-drift-cloud" style={{ animationDelay: `${i * 6}s`, animationDuration: `${52 + i * 14}s` }}>
          <g transform={`translate(${c.x} ${c.y}) scale(${c.s})`}>
            <ellipse cx={-42} cy={-4} rx={34} ry={22} fill={tint} opacity={0.95} />
            <ellipse cx={6} cy={-16} rx={44} ry={30} fill={tint} opacity={0.97} />
            <ellipse cx={50} cy={-2} rx={32} ry={21} fill={tint} opacity={0.95} />
            <ellipse cx={0} cy={6} rx={62} ry={16} fill={shade} opacity={0.55} />
          </g>
        </g>
      ))}
    </g>
  );
}

/** 一丛水边的芦苇：给岸边一点"长着东西"的感觉 */
export function Reeds({ x, y, s = 1, color = '#7fae6e' }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} pointerEvents="none">
      {[
        [-10, 44, -6],
        [0, 56, 2],
        [9, 40, 8],
        [16, 30, 12],
      ].map(([dx, h, bend], i) => (
        <path
          key={i}
          d={`M ${dx} 0 C ${dx + (bend as number) * 0.4} ${-(h as number) * 0.5}, ${dx + (bend as number) * 0.8} ${-(h as number) * 0.8}, ${dx + (bend as number)} ${-(h as number)}`}
          stroke={color}
          strokeWidth={3 - i * 0.3}
          fill="none"
          strokeLinecap="round"
          className="v3-sway"
          style={{ animationDelay: `${i * 0.4}s` }}
        />
      ))}
    </g>
  );
}

/** 区域场景组件的统一入参 */
export interface SceneProps {
  view: View;
  phase: Phase;
  weather: Weather;
  season: Season;
  night: boolean;
  /** 世界状态：水位、湿度这些会直接改变画面（可选，别的区域暂时不用） */
  eco?: Eco;
}
