import { useCallback, useEffect, useRef, useState } from 'react';
import { useBehaviour } from '../hooks/useBehaviour';
import { useWorld } from '../state/WorldContext';
import { quadPoint, tween } from '../systems/animate';
import { C } from '../theme';
import type { Vec } from '../types';

/**
 * 小鸟
 *  - 平时停在树枝上，偶尔扇翅、左右张望
 *  - 点击小鸟：飞向另一棵树
 *  - 点击天空：短暂飞翔一圈
 */
export function Bird({ perches, scale, skySignal }: { perches: Vec[]; scale: number; skySignal: number }) {
  const { layout, sfx } = useWorld();
  const [perch, setPerch] = useState(0);
  const [pos, setPos] = useState<Vec>({ x: perches[0].x, y: perches[0].y - 8 });
  const [flying, setFlying] = useState(false);
  const [flap, setFlap] = useState(0);
  const [look, setLook] = useState(0);
  const cancelRef = useRef<(() => void) | null>(null);
  const posRef = useRef(pos);
  posRef.current = pos;
  const perchedRef = useRef(true);

  const flyTo = useCallback((target: Vec, dur = 950, onDone?: () => void) => {
    cancelRef.current?.();
    setFlying(true);
    perchedRef.current = false;
    const start = posRef.current;
    const mid = { x: (start.x + target.x) / 2, y: Math.min(start.y, target.y) - 70 };
    cancelRef.current = tween(
      dur,
      (t) => {
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        setPos(quadPoint(start, mid, target, e));
      },
      () => {
        setFlying(false);
        perchedRef.current = true;
        onDone?.();
      },
    );
  }, []);

  useEffect(() => () => cancelRef.current?.(), []);

  // 自主飞行
  useBehaviour(
    [9000, 17000],
    () => {
      if (flying) return;
      const next = (perch + 1 + Math.floor(Math.random() * (perches.length - 1))) % perches.length;
      setPerch(next);
      flyTo({ x: perches[next].x, y: perches[next].y - 8 }, 1200);
      sfx('bird');
    },
    perches.length > 1,
  );

  // 点击天空时的短暂环游
  useEffect(() => {
    if (skySignal === 0) return;
    const home = { x: perches[perch].x, y: perches[perch].y - 8 };
    const target = {
      x: Math.min(layout.u - 80, Math.max(80, home.x + (Math.random() - 0.5) * 500)),
      y: layout.horizon * (0.25 + Math.random() * 0.35),
    };
    flyTo(target, 900, () => {
      window.setTimeout(() => {
        flyTo(home, 1100, () => setPerch((n) => n));
      }, 1300);
    });
    sfx('bird');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skySignal]);

  // 扇翅膀 / 张望的随机小动作
  useBehaviour([1500, 3600], () => {
    if (!flying) setFlap((n) => n + 1);
  });
  useBehaviour([2600, 5200], () => {
    if (!flying) setLook((n) => n + 1);
  });

  const onTap = (e: React.PointerEvent<SVGGElement>) => {
    e.preventDefault();
    const next = (perch + 1) % perches.length;
    setPerch(next);
    flyTo({ x: perches[next].x, y: perches[next].y - 8 }, 1000);
    sfx('bird');
  };

  return (
    <g
      transform={`translate(${pos.x} ${pos.y}) scale(${scale})`}
      className="interactive"
      onPointerDown={onTap}
      role="button"
      aria-label="小鸟"
    >
      <g key={look} className={look ? 'anim-bird-look' : ''} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        {/* 尾巴 */}
        <path d="M -16 -14 L -34 -22 L -30 -8 Z" fill={C.birdWing} stroke="rgba(70,120,150,0.35)" strokeWidth="1.4" />
        {/* 身体 */}
        <ellipse cx={0} cy={-12} rx={17} ry={12.5} fill="url(#birdGrad)" stroke="rgba(70,120,150,0.35)" strokeWidth="1.6" />
        <ellipse cx={4} cy={-8} rx={11} ry={7} fill={C.birdBelly} opacity="0.9" />
        {/* 头 */}
        <circle cx={12} cy={-24} r={9.6} fill="url(#birdGrad)" stroke="rgba(70,120,150,0.35)" strokeWidth="1.6" />
        <circle cx={16} cy={-26} r={1.9} fill="#3f4b52" />
        <circle cx={16.6} cy={-26.8} r={0.7} fill="#fff" />
        {/* 喙 */}
        <path d="M 21 -23 L 29 -21 L 21 -18 Z" fill="#f3b06a" stroke="rgba(190,130,70,0.5)" strokeWidth="1" />
        {/* 翅膀 */}
        <g key={`flap-${flap}`} className={flying ? 'anim-bird-fly' : flap ? 'anim-bird-flap' : ''}>
          <ellipse cx={-2} cy={-16} rx={12} ry={7} fill={C.birdWing} transform="rotate(-12 -2 -16)" />
          <path d="M -10 -18 q 6 -4 12 0" stroke="rgba(255,255,255,0.45)" strokeWidth="1.6" fill="none" />
        </g>
        {/* 腿 */}
        {!flying && (
          <path d="M 0 0 L 0 2 M 8 0 L 8 2" stroke="#e0a066" strokeWidth="2" strokeLinecap="round" />
        )}
      </g>
      <circle cx={4} cy={-16} r={26} fill="transparent" />
    </g>
  );
}
