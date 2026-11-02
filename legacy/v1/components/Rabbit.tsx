import { useCallback, useEffect, useRef, useState } from 'react';
import { useBehaviour } from '../hooks/useBehaviour';
import { useWorld } from '../state/WorldContext';
import { C } from '../theme';
import type { Vec } from '../types';

type Mode = 'idle' | 'blink' | 'hop' | 'ear' | 'look' | 'eat' | 'happy' | 'sleep';

const CLICK_CYCLE: Mode[] = ['blink', 'hop', 'ear', 'look'];

/**
 * 小兔子
 *  - 独立状态机：待机 / 眨眼 / 跳跃 / 摇耳朵 / 张望 / 吃东西 / 开心 / 睡觉
 *  - 连续点击会依次触发不同动作，而不是重复同一个动画
 *  - 胡萝卜靠近时会转过去看，拖到嘴边会吃掉
 */
export function Rabbit({
  pos,
  scale,
  carrot,
  onEatCarrot,
}: {
  pos: Vec;
  scale: number;
  carrot: Vec | null;
  onEatCarrot: () => void;
}) {
  const { sfx, night } = useWorld();
  const [mode, setMode] = useState<Mode>('idle');
  const [pulse, setPulse] = useState(0);
  const clickIndex = useRef(0);
  const resetTimer = useRef<number | null>(null);
  const eatenRef = useRef(false);

  const mouth = { x: pos.x + 34 * scale, y: pos.y - 62 * scale };

  const clearTimer = () => {
    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
      resetTimer.current = null;
    }
  };

  const run = useCallback(
    (next: Mode, duration: number) => {
      clearTimer();
      setMode(next);
      setPulse((n) => n + 1);
      if (duration > 0) {
        resetTimer.current = window.setTimeout(() => setMode('idle'), duration);
      }
    },
    [],
  );

  useEffect(() => () => clearTimer(), []);

  // 自主行为
  useBehaviour(
    night ? [5200, 9000] : [2600, 5200],
    () => {
      if (mode !== 'idle') return;
      const pool: Mode[] = night ? ['blink', 'sleep', 'look'] : ['blink', 'ear', 'look', 'hop'];
      const next = pool[Math.floor(Math.random() * pool.length)];
      run(next, next === 'hop' ? 900 : 700);
      if (next === 'hop') sfx('rabbit');
    },
    true,
  );

  // 胡萝卜靠近 → 转头看；拖到嘴边 → 吃掉
  useEffect(() => {
    if (!carrot) {
      eatenRef.current = false;
      return;
    }
    const d = Math.hypot(carrot.x - mouth.x, carrot.y - mouth.y);
    if (d < 74 * scale && !eatenRef.current) {
      eatenRef.current = true;
      run('eat', 1400);
      sfx('eat');
      window.setTimeout(() => {
        onEatCarrot();
        run('happy', 1200);
        sfx('rabbit');
      }, 1350);
    } else if (d < 200 * scale && mode === 'idle') {
      run('look', 900);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrot?.x, carrot?.y]);

  const onTap = () => {
    const next = CLICK_CYCLE[clickIndex.current % CLICK_CYCLE.length];
    clickIndex.current += 1;
    run(next, next === 'hop' ? 900 : 800);
    sfx('rabbit');
  };

  return (
    <g
      transform={`translate(${pos.x} ${pos.y}) scale(${scale})`}
      className={`interactive rabbit mode-${mode}`}
      onPointerDown={(e) => {
        e.preventDefault();
        onTap();
      }}
      role="button"
      aria-label="小兔子"
    >
      <ellipse cx={2} cy={2} rx={40} ry={9} fill="#4c6b45" opacity="0.18" />

      <g key={`body-${pulse}`} className={`rabbit-body ${mode === 'hop' ? 'anim-rabbit-hop' : ''}`}>
        {/* 尾巴 */}
        <circle cx={-34} cy={-40} r={11} fill="#fffdf8" stroke="rgba(200,180,160,0.35)" strokeWidth="1.6" />

        {/* 身体 */}
        <ellipse cx={-2} cy={-34} rx={36} ry={30} fill="url(#rabbitGrad)" stroke="rgba(190,170,150,0.4)" strokeWidth="2" />
        <ellipse cx={-6} cy={-24} rx={26} ry={17} fill={C.rabbitShade} opacity="0.55" />

        {/* 后脚 */}
        <ellipse cx={-18} cy={-6} rx={17} ry={9} fill="#fdf8f0" stroke="rgba(190,170,150,0.35)" strokeWidth="1.6" />
        <ellipse cx={14} cy={-6} rx={16} ry={8.5} fill="#fffdf8" stroke="rgba(190,170,150,0.35)" strokeWidth="1.6" />

        {/* 头 */}
        <g className={`rabbit-head ${mode === 'look' ? 'anim-rabbit-look' : ''} ${mode === 'eat' ? 'anim-rabbit-eat' : ''}`}>
          <g className={`rabbit-ears ${mode === 'ear' ? 'anim-rabbit-ears' : ''}`}>
            <g transform="rotate(-18 2 -94)">
              <ellipse cx={1} cy={-122} rx={9} ry={30} fill="#fdf8f0" stroke="rgba(190,170,150,0.4)" strokeWidth="2" />
              <ellipse cx={1} cy={-122} rx={4.2} ry={20} fill={C.rabbitEar} opacity="0.85" />
            </g>
            <g transform="rotate(13 21 -94)">
              <ellipse cx={21} cy={-119} rx={8.6} ry={28} fill="#fdf8f0" stroke="rgba(190,170,150,0.4)" strokeWidth="2" />
              <ellipse cx={21} cy={-119} rx={4} ry={18} fill={C.rabbitEar} opacity="0.8" />
            </g>
          </g>

          <circle cx={11} cy={-71} r={25} fill="url(#rabbitGrad)" stroke="rgba(190,170,150,0.4)" strokeWidth="2" />
          {/* 眼睛 */}
          <g className={mode === 'blink' ? 'anim-rabbit-blink' : ''} style={{ transformBox: 'fill-box' }}>
            {mode === 'sleep' ? (
              <>
                <path d="M 14 -76 q 5 5 10 0" stroke="#6d5a4a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
                <path d="M -2 -76 q 5 5 10 0" stroke="#6d5a4a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
              </>
            ) : (
              <>
                <ellipse cx={19} cy={-74} rx={3.6} ry={4.4} fill="#4b3b30" />
                <ellipse cx={3} cy={-74} rx={3.4} ry={4.2} fill="#4b3b30" />
                <circle cx={20.2} cy={-75.4} r={1.2} fill="#fff" opacity="0.9" />
                <circle cx={4.2} cy={-75.4} r={1.1} fill="#fff" opacity="0.9" />
              </>
            )}
          </g>
          {/* 鼻子与嘴 */}
          <ellipse cx={25} cy={-65} rx={3.6} ry={2.8} fill={C.rabbitNose} />
          <path d="M 25 -62 q -3 5 -6 3 M 25 -62 q 3 5 6 3" stroke="rgba(140,110,100,0.65)" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          {/* 胡须 */}
          <path d="M 29 -66 L 41 -69 M 29 -63 L 41 -60" stroke="rgba(160,140,125,0.55)" strokeWidth="1.2" strokeLinecap="round" />
          {/* 腮红 */}
          <ellipse cx={14} cy={-60} rx={6} ry={3.4} fill="#f7b6b6" opacity="0.4" />
        </g>

        {/* 开心 / 睡觉的小标记 */}
        {mode === 'happy' && (
          <g className="rabbit-heart" transform="translate(30 -110)">
            <path d="M 0 6 C -8 -2 -6 -10 0 -7 C 6 -10 8 -2 0 6 Z" fill="#f6a3b6" />
          </g>
        )}
        {mode === 'sleep' && (
          <g className="rabbit-zzz" transform="translate(34 -104)" fill="#8f9fc4" opacity="0.85">
            <text x={0} y={0} fontSize="13" fontFamily="system-ui">
              z
            </text>
            <text x={9} y={-12} fontSize="10" fontFamily="system-ui">
              z
            </text>
          </g>
        )}
      </g>

      {/* 触摸热区 */}
      <rect x={-40} y={-124} width={86} height={130} fill="transparent" />
    </g>
  );
}
