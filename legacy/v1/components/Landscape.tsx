import { useMemo, useRef, useState } from 'react';
import { pointerToSvg } from '../hooks/useSvgDrag';
import { useWorld } from '../state/WorldContext';
import { mulberry32, randRange } from '../systems/random';
import { C } from '../theme';

/** 远景山丘、草地、小路、草丛与灌木 */
export function Landscape() {
  const { layout, sfx } = useWorld();
  const { u, uh, horizon, grassHeight } = layout;
  const [stones, setStones] = useState<{ id: number; x: number; y: number; r: number }[]>([]);
  const stoneId = useRef(0);

  const tufts = useMemo(() => {
    const rng = mulberry32(4242);
    return Array.from({ length: layout.composition === 'tall' ? 40 : 62 }, () => {
      const y = randRange(rng, horizon + grassHeight * 0.06, uh - 8);
      return {
        x: randRange(rng, -20, u + 20),
        y,
        s: randRange(rng, 0.5, 1.15) * (0.6 + (y - horizon) / grassHeight),
        flip: rng() > 0.5,
      };
    });
  }, [u, uh, horizon, grassHeight, layout.composition]);

  const confetti = useMemo(() => {
    const rng = mulberry32(881);
    return Array.from({ length: 26 }, () => ({
      x: randRange(rng, 0, u),
      y: randRange(rng, horizon + grassHeight * 0.1, uh - 16),
      r: randRange(rng, 1.4, 3),
      o: randRange(rng, 0.18, 0.42),
    }));
  }, [u, uh, horizon, grassHeight]);

  const gy0 = (f: number) => horizon + grassHeight * f;

  const onPathTap = (e: React.PointerEvent<SVGPathElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    const p = pointerToSvg(e, svg);
    if (!p) return;
    stoneId.current += 1;
    const stone = { id: stoneId.current, x: p.x + randRange(Math.random, -10, 10), y: p.y, r: randRange(Math.random, 4, 8) };
    setStones((s) => [...s.slice(-13), stone]);
    sfx('stone');
  };

  return (
    <g aria-hidden={false}>
      {/* 远处山丘 */}
      <path
        d={`M -40 ${horizon + 12} C ${u * 0.06} ${horizon - uh * 0.1}, ${u * 0.2} ${horizon - uh * 0.06}, ${u * 0.32} ${horizon + 14} Z`}
        fill="url(#hillFar)"
        opacity="0.85"
      />
      <path
        d={`M ${u * 0.62} ${horizon + 12} C ${u * 0.74} ${horizon - uh * 0.12}, ${u * 0.9} ${horizon - uh * 0.07}, ${u + 40} ${horizon + 14} Z`}
        fill="url(#hillFar)"
        opacity="0.72"
      />

      {/* 草地 */}
      <path
        d={`M -40 ${horizon + 6}
            C ${u * 0.18} ${horizon - 6}, ${u * 0.36} ${horizon + 12}, ${u * 0.55} ${horizon + 2}
            C ${u * 0.74} ${horizon - 8}, ${u * 0.9} ${horizon + 10}, ${u + 40} ${horizon}
            L ${u + 40} ${uh + 60} L -40 ${uh + 60} Z`}
        fill="url(#grassGrad)"
      />

      {/* 阳光落在草地上的柔和亮部 */}
      <ellipse cx={u * 0.62} cy={gy0(0.36)} rx={u * 0.17} ry={grassHeight * 0.13} fill="#eaf6c9" opacity="0.2" filter="url(#softBlur)" />
      <ellipse cx={u * 0.18} cy={gy0(0.14)} rx={u * 0.12} ry={grassHeight * 0.08} fill="#eaf6c9" opacity="0.16" filter="url(#softBlur)" />

      {/* 草地上的细小纹理 */}
      {confetti.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={c.r} fill="#ffffff" opacity={c.o} />
      ))}

      {/* 小路 */}
      <path d={layout.pathD} fill="none" stroke="url(#sandGrad)" strokeWidth={Math.max(18, u * 0.019)} strokeLinecap="round" opacity="0.92" />
      <path d={layout.pathD} fill="none" stroke="#f7e8c8" strokeWidth={Math.max(10, u * 0.011)} strokeLinecap="round" opacity="0.55" />
      {/* 小路热区（点击出现石子） */}
      <path
        d={layout.pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(40, u * 0.035)}
        strokeLinecap="round"
        className="interactive"
        onPointerDown={(e) => {
          e.preventDefault();
          onPathTap(e);
        }}
        role="button"
        aria-label="小路"
      />
      {stones.map((s) => (
        <g key={s.id} className="stone-pop" transform={`translate(${s.x} ${s.y})`}>
          <ellipse rx={s.r} ry={s.r * 0.72} fill="#d9cbb4" stroke="rgba(120,100,80,0.35)" strokeWidth="1.2" />
          <ellipse cx={-s.r * 0.25} cy={-s.r * 0.25} rx={s.r * 0.35} ry={s.r * 0.22} fill="#efe6d6" opacity="0.9" />
        </g>
      ))}

      {/* 草丛 */}
      {tufts.map((t, i) => (
        <g key={i} transform={`translate(${t.x} ${t.y}) scale(${t.flip ? -t.s : t.s} ${t.s})`} opacity={0.55}>
          <path d="M 0 0 C -2 -8 -6 -11 -8 -16" stroke={C.grassDark} strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.85" />
          <path d="M 2 0 C 2 -9 3 -13 5 -18" stroke={C.grassDark} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M 5 0 C 8 -7 10 -9 13 -12" stroke={C.grassDark} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.75" />
        </g>
      ))}

      {/* 灌木 */}
      {layout.bushes.map((b, i) => (
        <g key={`bush-${i}`} transform={`translate(${b.x} ${b.y})`}>
          <ellipse cx={0} cy={4} rx={34} ry={8} fill="#5f8a5b" opacity="0.16" />
          <circle cx={-16} cy={-8} r={17} fill={C.leaf} />
          <circle cx={14} cy={-10} r={19} fill={C.leafDark} opacity={0.9} />
          <circle cx={-2} cy={-18} r={15} fill={C.leafLight} />
          <ellipse cx={2} cy={-6} rx={26} ry={10} fill={C.leaf} opacity="0.9" />
          <circle cx={-18} cy={-14} r={5} fill="#ffffff" opacity="0.25" />
        </g>
      ))}
    </g>
  );
}
