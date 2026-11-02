import { useMemo } from 'react';
import { useWorld } from '../state/WorldContext';
import { mulberry32, randRange } from '../systems/random';
import { C } from '../theme';

/** 天空：白天 / 夜晚 / 雨天三层渐变叠加，用透明度过渡实现自然变化 */
export function Sky() {
  const { layout, night, raining } = useWorld();
  const { u, uh, horizon } = layout;

  const stars = useMemo(() => {
    const rng = mulberry32(20261031);
    return Array.from({ length: layout.composition === 'tall' ? 34 : 46 }, () => ({
      x: randRange(rng, 10, u - 10),
      y: randRange(rng, 14, horizon * 0.86),
      r: randRange(rng, 1.1, 2.8),
      delay: randRange(rng, 0, 5).toFixed(2),
      dur: randRange(rng, 2.6, 5.4).toFixed(2),
    }));
  }, [u, horizon, layout.composition]);

  return (
    <g pointerEvents="none" aria-hidden>
      <rect x={-40} y={-40} width={u + 80} height={horizon + 42} fill="url(#skyDay)" />
      <rect
        x={-40}
        y={-40}
        width={u + 80}
        height={horizon + 42}
        fill="url(#skyNight)"
        style={{ opacity: night ? 1 : 0, transition: 'opacity 1.9s ease' }}
      />
      <g style={{ opacity: night ? 1 : 0, transition: 'opacity 1.9s ease' }}>
        {stars.map((s, i) => (
          <circle
            key={i}
            className="star"
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={C.star}
            style={{ animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }}
          />
        ))}
      </g>
      <rect
        x={-40}
        y={-40}
        width={u + 80}
        height={horizon + 42}
        fill="url(#rainSky)"
        style={{
          opacity: raining ? (night ? 0.2 : 0.42) : 0,
          transition: 'opacity 1.5s ease',
        }}
      />
      {/* 地平线附近的柔和雾气，让天空与草地过渡更自然 */}
      <rect
        x={-40}
        y={horizon - uh * 0.07}
        width={u + 80}
        height={uh * 0.1}
        fill="#fffdf6"
        opacity={night ? 0.08 : 0.3}
        filter="url(#softBlur)"
      />
    </g>
  );
}
