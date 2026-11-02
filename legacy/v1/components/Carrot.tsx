import { useDragObject } from '../hooks/useDragObject';
import { C } from '../theme';
import type { Vec } from '../types';

/** 一根可以拖给小兔子的胡萝卜 */
export function Carrot({
  pos,
  scale,
  onCommit,
  onTap,
}: {
  pos: Vec;
  scale: number;
  onCommit: (p: Vec) => void;
  onTap: () => void;
}) {
  const { dragging, handlers } = useDragObject({ position: pos, onCommit, onTap });

  return (
    <g
      transform={`translate(${pos.x} ${pos.y}) scale(${scale})`}
      className={`interactive carrot ${dragging ? 'is-dragging' : ''}`}
      {...handlers}
      role="button"
      aria-label="胡萝卜"
    >
      <ellipse cx={0} cy={12} rx={16} ry={4} fill="#4c6b45" opacity="0.16" />
      <path
        d="M -11 -22 Q 0 -27 11 -22 L 4 6 Q 0 12 -4 6 Z"
        fill="url(#carrotGrad)"
        stroke="rgba(190,120,70,0.45)"
        strokeWidth="1.8"
      />
      <path d="M -7 -14 L -3 -12 M 6 -6 L 2 -4 M -6 0 L -2 2" stroke="rgba(190,120,70,0.4)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M -4 -24 C -6 -34 -12 -38 -14 -44" stroke={C.carrotLeaf} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 0 -25 C 0 -36 2 -40 1 -46" stroke={C.leafDark} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 4 -24 C 8 -33 12 -36 16 -41" stroke={C.carrotLeaf} strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <circle cx={0} cy={-12} r={24} fill="transparent" />
    </g>
  );
}
