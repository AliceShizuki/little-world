import { useMemo } from 'react';
import { useWorld } from '../state/WorldContext';
import { mulberry32, randRange } from '../systems/random';

/** 雨：雨滴 + 地面水花。晴天时暂停动画，避免空耗性能 */
export function Rain() {
  const { layout, raining } = useWorld();
  const { u, uh, horizon, grassHeight } = layout;

  const drops = useMemo(() => {
    const rng = mulberry32(77123);
    const count = layout.composition === 'tall' ? 60 : 88;
    return Array.from({ length: count }, () => ({
      x: randRange(rng, -30, u + 30),
      y: randRange(rng, -uh, horizon * 0.4),
      len: randRange(rng, 12, 24),
      dur: randRange(rng, 0.6, 1.1).toFixed(2),
      delay: randRange(rng, 0, 2).toFixed(2),
      op: randRange(rng, 0.35, 0.7).toFixed(2),
      w: randRange(rng, 1.3, 2.3).toFixed(1),
    }));
  }, [u, uh, horizon, layout.composition]);

  const splashes = useMemo(() => {
    const rng = mulberry32(99881);
    return Array.from({ length: 12 }, () => ({
      x: randRange(rng, 20, u - 20),
      y: randRange(rng, horizon + grassHeight * 0.12, uh - 12),
      delay: randRange(rng, 0, 1.4).toFixed(2),
      dur: randRange(rng, 0.9, 1.6).toFixed(2),
    }));
  }, [u, uh, horizon, grassHeight]);

  return (
    <g
      className={`rain-layer ${raining ? 'on' : ''}`}
      style={{ ['--rain-travel' as string]: `${uh + 260}px` }}
      pointerEvents="none"
      aria-hidden
    >
      {drops.map((d, i) => (
        <g key={i} transform={`translate(${d.x} ${d.y})`}>
          <g
            className="rain-drop"
            style={{ animationDuration: `${d.dur}s`, animationDelay: `${d.delay}s` }}
          >
            <line
              x1={0}
              y1={0}
              x2={-d.len * 0.32}
              y2={d.len}
              stroke="#e8f6ff"
              strokeWidth={Number(d.w)}
              strokeLinecap="round"
              opacity={Number(d.op)}
            />
          </g>
        </g>
      ))}
      <g className="rain-splashes">
        {splashes.map((s, i) => (
          <g key={`s-${i}`} transform={`translate(${s.x} ${s.y})`}>
            <ellipse
              className="rain-splash"
              rx={9}
              ry={3.2}
              fill="none"
              stroke="#dff0f8"
              strokeWidth={1.4}
              style={{ animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }}
            />
          </g>
        ))}
      </g>
    </g>
  );
}
