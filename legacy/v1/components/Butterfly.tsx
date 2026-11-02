import { useCallback, useEffect, useRef, useState } from 'react';
import { useWorld } from '../state/WorldContext';
import { quadPoint, tween } from '../systems/animate';
import { C } from '../theme';
import type { Vec } from '../types';

/**
 * 蝴蝶
 *  - 在花丛附近自然地飘飞，翅膀持续扇动
 *  - 点击蝴蝶：飞向另一个位置
 *  - 花朵打开时会被吸引过去停留一会儿
 */
export function Butterfly({
  home,
  scale,
  attract,
}: {
  home: Vec;
  scale: number;
  attract: { x: number; y: number; id: number } | null;
}) {
  const { layout, sfx } = useWorld();
  const [pos, setPos] = useState<Vec>(home);
  const [angle, setAngle] = useState(0);
  const posRef = useRef(pos);
  posRef.current = pos;
  const cancelRef = useRef<(() => void) | null>(null);
  const busyRef = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const list = timers.current;
    return () => {
      cancelRef.current?.();
      list.forEach((t) => clearTimeout(t));
    };
  }, []);

  const flyTo = useCallback(
    (target: Vec, dur: number, onDone?: () => void) => {
      cancelRef.current?.();
      busyRef.current = true;
      const start = posRef.current;
      let prev = start;
      const mid = {
        x: (start.x + target.x) / 2 + (Math.random() - 0.5) * 60,
        y: Math.min(start.y, target.y) - 60 - Math.random() * 40,
      };
      cancelRef.current = tween(
        dur,
        (t) => {
          const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          const p = quadPoint(start, mid, target, e);
          const dx = p.x - prev.x;
          const dy = p.y - prev.y;
          if (Math.abs(dx) + Math.abs(dy) > 0.4) setAngle((Math.atan2(dy, dx) * 180) / Math.PI);
          prev = p;
          setPos(p);
        },
        () => {
          busyRef.current = false;
          onDone?.();
        },
      );
    },
    [],
  );

  // 自由飘飞
  useEffect(() => {
    let stopped = false;
    const wander = () => {
      if (stopped) return;
      const t = window.setTimeout(
        () => {
          if (stopped) return;
          if (!busyRef.current) {
            const target = {
              x: Math.max(40, Math.min(layout.u - 40, home.x + (Math.random() - 0.5) * layout.u * 0.35)),
              y: Math.max(layout.horizon * 0.4, Math.min(layout.uh - 40, home.y + (Math.random() - 0.5) * layout.grassHeight * 0.7)),
            };
            flyTo(target, 2200 + Math.random() * 1400);
          }
          wander();
        },
        2400 + Math.random() * 2200,
      );
      timers.current.push(t);
    };
    wander();
    return () => {
      stopped = true;
    };
  }, [flyTo, home.x, home.y, layout.u, layout.uh, layout.horizon, layout.grassHeight]);

  // 被花朵吸引
  useEffect(() => {
    if (!attract) return;
    flyTo({ x: attract.x, y: attract.y - 6 }, 1500);
    const t = window.setTimeout(() => {
      flyTo(
        { x: attract.x + 60, y: attract.y - 90 - Math.random() * 40 },
        1400,
      );
    }, 4200);
    timers.current.push(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attract?.id]);

  const onTap = (e: React.PointerEvent<SVGGElement>) => {
    e.preventDefault();
    const target = {
      x: Math.max(50, Math.min(layout.u - 50, pos.x + (Math.random() - 0.5) * layout.u * 0.45)),
      y: Math.max(layout.horizon * 0.45, Math.min(layout.uh - 50, pos.y + (Math.random() - 0.5) * 180)),
    };
    flyTo(target, 1600);
    sfx('sparkle');
  };

  return (
    <g
      transform={`translate(${pos.x} ${pos.y}) rotate(${angle * 0.25}) scale(${scale})`}
      className="interactive butterfly"
      onPointerDown={onTap}
      role="button"
      aria-label="蝴蝶"
    >
      <ellipse cx={0} cy={14} rx={10} ry={3} fill="#4c6b45" opacity="0.08" />
      {/* 上翅 */}
      <g className="wing wing-l" style={{ transformBox: 'fill-box', transformOrigin: 'right center' }}>
        <path d="M -2 -2 C -22 -22 -32 -4 -16 6 C -8 11 -2 6 -2 -2 Z" fill={C.butterflyWing} stroke="rgba(200,120,150,0.35)" strokeWidth="1.2" />
        <circle cx={-13} cy={-6} r={4} fill="#fff2f6" opacity="0.75" />
      </g>
      <g className="wing wing-r" style={{ transformBox: 'fill-box', transformOrigin: 'left center' }}>
        <path d="M 2 -2 C 22 -22 32 -4 16 6 C 8 11 2 6 2 -2 Z" fill={C.butterflyWing} stroke="rgba(200,120,150,0.35)" strokeWidth="1.2" />
        <circle cx={13} cy={-6} r={4} fill="#fff2f6" opacity="0.75" />
      </g>
      {/* 下翅 */}
      <g className="wing wing-l" style={{ animationDelay: '0.08s', transformBox: 'fill-box', transformOrigin: 'right center' }}>
        <path d="M -2 2 C -18 8 -20 22 -8 22 C -2 22 0 12 -2 2 Z" fill={C.butterflyWing2} stroke="rgba(200,150,110,0.35)" strokeWidth="1.2" />
      </g>
      <g className="wing wing-r" style={{ animationDelay: '0.08s', transformBox: 'fill-box', transformOrigin: 'left center' }}>
        <path d="M 2 2 C 18 8 20 22 8 22 C 2 22 0 12 2 2 Z" fill={C.butterflyWing2} stroke="rgba(200,150,110,0.35)" strokeWidth="1.2" />
      </g>
      {/* 身体 */}
      <ellipse cx={0} cy={2} rx={2.6} ry={11} fill="#7a5f52" />
      <path d="M -1 -10 C -6 -18 -9 -18 -10 -22 M 1 -10 C 6 -18 9 -18 10 -22" stroke="#7a5f52" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <circle cx={0} cy={-11} r={3.2} fill="#6b5145" />
      <circle cx={-10} cy={-22} r={1.4} fill="#8a6c5c" />
      <circle cx={10} cy={-22} r={1.4} fill="#8a6c5c" />
      <circle cx={0} cy={4} r={26} fill="transparent" />
    </g>
  );
}
