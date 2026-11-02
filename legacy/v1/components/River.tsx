import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBehaviour } from '../hooks/useBehaviour';
import { pointerToSvg } from '../hooks/useSvgDrag';
import { useWorld } from '../state/WorldContext';
import { mulberry32, randRange } from '../systems/random';
import { C } from '../theme';

interface Ripple {
  id: number;
  x: number;
  y: number;
  scale: number;
}

/**
 * 河流
 *  - 持续流动的水面质感
 *  - 点击任意位置产生圆形波纹（连续点击可同时存在多个）
 *  - 下雨时自动出现雨滴波纹
 */
export function River({ splash }: { splash?: { x: number; y: number; id: number } | null }) {
  const { layout, raining, sfx } = useWorld();
  const { river, u } = layout;
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const idRef = useRef(0);
  const timers = useRef<number[]>([]);

  const addRipple = useCallback((x: number, y: number) => {
    idRef.current += 1;
    const id = idRef.current;
    setRipples((list) => [...list.slice(-10), { id, x, y, scale: randRange(Math.random, 0.85, 1.25) }]);
    const t = window.setTimeout(() => {
      setRipples((list) => list.filter((r) => r.id !== id));
    }, 1900);
    timers.current.push(t);
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach((t) => clearTimeout(t));
      timers.current = [];
    },
    [],
  );

  const onWaterTap = (e: React.PointerEvent<SVGPathElement>) => {
    e.preventDefault();
    const p = pointerToSvg(e, e.currentTarget.ownerSVGElement);
    if (!p) return;
    addRipple(p.x, p.y);
    sfx('water');
  };

  // 外部触发的波纹（例如青蛙跳水）
  useEffect(() => {
    if (!splash) return;
    addRipple(splash.x, splash.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splash?.id]);

  // 雨天自动波纹
  useBehaviour(
    [520, 1250],
    () => {
      const x = randRange(Math.random, 10, Math.max(30, river.x2 - 20));
      const y = randRange(Math.random, river.cy - river.width * 0.34, river.cy + river.width * 0.34);
      addRipple(x, y);
    },
    raining,
  );

  const flows = useMemo(() => {
    const rng = mulberry32(3131);
    return Array.from({ length: 8 }, (_, i) => ({
      x: randRange(rng, -u * 0.12, river.x2 * 0.8),
      y: river.cy + river.width * randRange(rng, -0.3, 0.3),
      w: randRange(rng, 26, 68),
      dur: randRange(rng, 11, 19).toFixed(1),
      delay: (i * 1.6).toFixed(1),
      o: randRange(rng, 0.22, 0.5).toFixed(2),
    }));
  }, [u, river]);

  const bankStones = useMemo(() => {
    const rng = mulberry32(5151);
    return Array.from({ length: 9 }, () => ({
      x: randRange(rng, 10, river.x2 * 0.85),
      y: river.cy - river.width * 0.5 + randRange(rng, -5, 5),
      r: randRange(rng, 3, 5.5),
    }));
  }, [river]);

  return (
    <g>
      {/* 河岸的浅色沙边 */}
      <path
        d={river.d}
        fill="none"
        stroke="rgba(246,236,208,0.75)"
        strokeWidth={river.width + 18}
        strokeLinecap="round"
        opacity="0.85"
      />
      {/* 水面 */}
      <path
        d={river.d}
        fill="none"
        stroke="url(#waterGrad)"
        strokeWidth={river.width}
        strokeLinecap="round"
        className="interactive"
        onPointerDown={onWaterTap}
        role="button"
        aria-label="河流"
      />
      {/* 水面：上缘一道很淡的反光，下缘一点暗色，避免看起来像充气泳池 */}
      <path
        d={river.d}
        fill="none"
        stroke="rgba(226,246,253,0.55)"
        strokeWidth={river.width * 0.28}
        strokeLinecap="round"
        transform="translate(0 -3)"
        opacity="0.55"
        pointerEvents="none"
      />
      <path
        d={river.d}
        fill="none"
        stroke="rgba(63,127,160,0.22)"
        strokeWidth={river.width * 0.3}
        strokeLinecap="round"
        transform="translate(0 5)"
        pointerEvents="none"
      />

      {/* 水面流动的高光 */}
      <g clipPath="url(#sceneClip)" pointerEvents="none">
        {flows.map((f, i) => (
          <ellipse
            key={i}
            className="water-flow"
            cx={f.x}
            cy={f.y}
            rx={f.w}
            ry={2.6}
            fill={C.waterLight}
            opacity={Number(f.o)}
            style={{ animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s` }}
          />
        ))}
      </g>

      {/* 波纹 */}
      <g pointerEvents="none">
        {ripples.map((r) => (
          <g key={r.id} transform={`translate(${r.x} ${r.y})`}>
            <ellipse className="ripple" rx={16 * r.scale} ry={5.5 * r.scale} fill="none" stroke="#ffffff" strokeWidth={1.8} opacity="0" />
            <ellipse
              className="ripple ripple-2"
              rx={11 * r.scale}
              ry={4 * r.scale}
              fill="none"
              stroke="#ffffff"
              strokeWidth={1.4}
              opacity="0"
            />
          </g>
        ))}
      </g>

      {/* 岸边小石子 */}
      <g pointerEvents="none" opacity="0.7">
        {bankStones.map((s, i) => (
          <ellipse key={i} cx={s.x} cy={s.y} rx={s.r} ry={s.r * 0.62} fill="#d8c9ae" />
        ))}
      </g>

      {/* 水草 */}
      <g pointerEvents="none" transform={`translate(${river.x2 * 0.74} ${river.cy - river.width * 0.5})`}>
        {[0, 1, 2, 3].map((i) => (
          <path
            key={i}
            className="reed"
            d={`M ${i * 7 - 10} 0 C ${i * 7 - 12} -14 ${i * 7 - 4} -20 ${i * 7 - 2} -30`}
            stroke={C.grassDark}
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
            style={{ animationDelay: `${i * 0.4}s` }}
          />
        ))}
      </g>
    </g>
  );
}
