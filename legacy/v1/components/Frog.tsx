import { useEffect, useRef, useState } from 'react';
import { useBehaviour } from '../hooks/useBehaviour';
import { useWorld } from '../state/WorldContext';
import { tween } from '../systems/animate';
import { C } from '../theme';
import type { Vec } from '../types';

/**
 * 小青蛙
 *  - 停在河边，偶尔眨眼、鼓腮、叫两声
 *  - 点击后跳进水里 → 水面出现波纹 → 过一会儿重新出现
 */
export function Frog({
  home,
  water,
  scale,
  onSplash,
}: {
  home: Vec;
  water: Vec;
  scale: number;
  onSplash: (x: number, y: number) => void;
}) {
  const { sfx } = useWorld();
  const [pos, setPos] = useState<Vec>(home);
  const [mode, setMode] = useState<'idle' | 'jumping' | 'away' | 'back'>('idle');
  const cancelRef = useRef<(() => void) | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const list = timers.current;
    return () => {
      cancelRef.current?.();
      list.forEach((t) => clearTimeout(t));
    };
  }, []);

  useBehaviour([6000, 12000], () => {
    if (mode === 'idle') {
      sfx('frog');
      setMode('idle');
    }
  });

  const jump = (e: React.PointerEvent<SVGGElement>) => {
    e.preventDefault();
    if (mode !== 'idle') return;
    setMode('jumping');
    sfx('frog');
    const start = { ...pos };
    const target = water;
    cancelRef.current = tween(
      680,
      (t) => {
        setPos({
          x: start.x + (target.x - start.x) * t,
          y: start.y + (target.y - start.y) * t - Math.sin(Math.PI * t) * 74,
        });
      },
      () => {
        onSplash(target.x, target.y);
        sfx('splash');
        setMode('away');
        const t1 = window.setTimeout(() => {
          setPos(home);
          setMode('back');
          const t2 = window.setTimeout(() => setMode('idle'), 700);
          timers.current.push(t2);
        }, 3600);
        timers.current.push(t1);
      },
    );
  };

  return (
    <g
      transform={`translate(${pos.x} ${pos.y}) scale(${scale})`}
      className={`interactive frog frog-${mode}`}
      style={{ opacity: mode === 'away' ? 0 : 1, transition: 'opacity .35s' }}
      onPointerDown={jump}
      role="button"
      aria-label="小青蛙"
    >
      <ellipse cx={0} cy={2} rx={22} ry={5} fill="#4c6b45" opacity="0.16" />
      <g className={mode === 'idle' ? 'frog-breathe' : ''} style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
        {/* 后腿 */}
        <path d="M -16 -8 C -26 -6 -28 2 -20 4" stroke={C.frogDark} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M 14 -8 C 24 -6 26 2 18 4" stroke={C.frogDark} strokeWidth="6" fill="none" strokeLinecap="round" />
        {/* 身体 */}
        <ellipse cx={0} cy={-14} rx={24} ry={17} fill="url(#frogGrad)" stroke="rgba(90,140,80,0.35)" strokeWidth="1.8" />
        <ellipse cx={0} cy={-8} rx={15} ry={9} fill={C.frogBelly} opacity="0.85" />
        {/* 眼睛 */}
        <circle cx={-11} cy={-30} r={7.4} fill="url(#frogGrad)" stroke="rgba(90,140,80,0.35)" strokeWidth="1.6" />
        <circle cx={11} cy={-30} r={7.4} fill="url(#frogGrad)" stroke="rgba(90,140,80,0.35)" strokeWidth="1.6" />
        <g className="frog-blink" style={{ transformBox: 'fill-box' }}>
          <circle cx={-11} cy={-31} r={3.6} fill="#3f4b30" />
          <circle cx={11} cy={-31} r={3.6} fill="#3f4b30" />
          <circle cx={-9.8} cy={-32.4} r={1.3} fill="#fff" />
          <circle cx={12.2} cy={-32.4} r={1.3} fill="#fff" />
        </g>
        {/* 嘴 */}
        <path d="M -9 -18 Q 0 -12 9 -18" stroke="#5f7a4d" strokeWidth="2" fill="none" strokeLinecap="round" />
        <ellipse cx={-17} cy={-16} rx={4} ry={2.4} fill="#f0a6a6" opacity="0.4" />
        <ellipse cx={17} cy={-16} rx={4} ry={2.4} fill="#f0a6a6" opacity="0.4" />
      </g>
      <ellipse cx={0} cy={-14} rx={30} ry={24} fill="transparent" />
    </g>
  );
}
