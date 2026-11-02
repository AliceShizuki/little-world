import { useEffect, useRef, useState } from 'react';
import { useWorld } from '../state/WorldContext';
import type { FlowerSpot } from '../systems/layout';
import { C } from '../theme';

const PALETTE = {
  pink: { petal: C.petalPink, deep: C.petalPinkDark },
  yellow: { petal: C.petalYellow, deep: C.petalYellowDark },
  purple: { petal: C.petalPurple, deep: C.petalPurpleDark },
};

/**
 * 花朵
 *  - 轻点：花瓣展开 / 收拢，并轻轻摆动
 *  - 打开时有概率吸引蝴蝶飞来
 */
export function Flower({ spot, onBloom }: { spot: FlowerSpot; onBloom?: (x: number, y: number) => void }) {
  const { sfx, night } = useWorld();
  const [open, setOpen] = useState(true);
  const [nod, setNod] = useState(0);
  const timer = useRef<number | null>(null);
  const pal = PALETTE[spot.color];

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const onTap = () => {
    const next = !open;
    setOpen(next);
    setNod((n) => n + 1);
    sfx(next ? 'bloom' : 'pop');
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNod(0), 900);
    if (next && Math.random() < 0.65) {
      onBloom?.(spot.x, spot.y - 52 * spot.scale);
    }
  };

  const headY = -46;

  return (
    <g transform={`translate(${spot.x} ${spot.y}) scale(${spot.scale})`}>
      <ellipse cx={0} cy={2} rx={12} ry={3.5} fill="#4c6b45" opacity="0.16" />
      <path
        d={`M 0 0 C -3 -14 2 -30 0 ${headY}`}
        stroke={night ? '#79a86c' : C.leafDark}
        strokeWidth="3.2"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx={-9} cy={-18} rx={9} ry={4.5} fill={night ? '#79a86c' : C.leaf} transform="rotate(-28 -9 -18)" />
      <ellipse cx={9} cy={-27} rx={8} ry={4} fill={night ? '#8ab77c' : C.leafLight} transform="rotate(24 9 -27)" />

      <g
        className="interactive flower-head"
        onPointerDown={(e) => {
          e.preventDefault();
          onTap();
        }}
        role="button"
        aria-label="花朵"
      >
        <g transform={`translate(0 ${headY})`}>
          <g
            key={`nod-${nod}`}
            className={nod ? 'anim-flower-nod' : ''}
            style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}
          >
            <g
              className="petals"
              style={{
                transform: open ? 'scale(1)' : 'scale(0.34)',
                transformBox: 'fill-box',
                transformOrigin: 'center',
              }}
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <g key={i} transform={`rotate(${i * 72})`}>
                  <ellipse cx={0} cy={-14} rx={8.4} ry={14} fill={pal.petal} stroke="rgba(160,110,120,0.22)" strokeWidth="1.2" />
                  <ellipse cx={0} cy={-17} rx={3.6} ry={6} fill="#ffffff" opacity="0.35" />
                </g>
              ))}
            </g>
            <circle cx={0} cy={0} r={open ? 7.4 : 5} fill={C.flowerCenter} stroke="rgba(180,140,60,0.35)" strokeWidth="1.4" />
            <circle cx={-1.6} cy={-1.6} r={2.2} fill="#fff4c8" />
          </g>
          {/* 触摸区域 */}
          <circle r={34} fill="transparent" />
        </g>
      </g>
    </g>
  );
}
