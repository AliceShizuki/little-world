import { useCallback, useState } from 'react';
import { useDragObject } from '../hooks/useDragObject';
import { useWorld } from '../state/WorldContext';
import { clamp } from '../systems/random';
import { C } from '../theme';
import type { Vec } from '../types';

/** 小纸船：可在河面上拖动，轻轻摇晃 */
export function Boat({ scale, bounds }: { scale: number; bounds: { minX: number; maxX: number; minY: number; maxY: number } }) {
  const { state, toUnits, toNorm, setBoat, sfx } = useWorld();
  const [rock, setRock] = useState(0);

  const commit = useCallback(
    (p: Vec) => {
      setBoat(toNorm(p));
      sfx('water');
    },
    [setBoat, toNorm, sfx],
  );

  const { pos, dragging, handlers } = useDragObject({
    position: toUnits(state.boat),
    onCommit: commit,
    onTap: () => {
      setRock((n) => n + 1);
      sfx('water');
    },
    clamp: (p) => ({
      x: clamp(p.x, bounds.minX, bounds.maxX),
      y: clamp(p.y, bounds.minY, bounds.maxY),
    }),
  });

  return (
    <g
      transform={`translate(${pos.x} ${pos.y}) scale(${scale})`}
      className={`interactive boat ${dragging ? 'is-dragging' : ''}`}
      {...handlers}
      role="button"
      aria-label="小船"
    >
      <g key={rock} className={rock ? 'anim-boat-rock' : 'boat-bob'}>
        {/* 水面接触处的阴影 */}
        <ellipse cx={0} cy={16} rx={34} ry={5} fill="#3f7fa0" opacity="0.18" />
        {/* 船身 */}
        <path
          d="M -38 -2 Q -30 18 0 18 Q 30 18 38 -2 Z"
          fill="url(#boatGrad)"
          stroke="rgba(150,130,100,0.45)"
          strokeWidth="2"
        />
        <path d="M -36 0 Q 0 8 36 0" stroke={C.boatShade} strokeWidth="2" fill="none" />
        {/* 帆 */}
        <path d="M 0 -6 L 0 -52 L 24 -8 Z" fill="#fffdf6" stroke="rgba(150,130,100,0.4)" strokeWidth="1.8" />
        <path d="M 0 -6 L 0 -52 L -16 -10 Z" fill="#fdf3e0" stroke="rgba(150,130,100,0.4)" strokeWidth="1.6" />
        <path d="M -1 -52 L 1 -56" stroke="#b08a5e" strokeWidth="2" />
        <path d="M 1 -55 L 12 -52 L 1 -48 Z" fill={C.boatFlag} />
        {/* 触控区 */}
        <rect x={-44} y={-56} width={88} height={80} fill="transparent" />
      </g>
    </g>
  );
}
