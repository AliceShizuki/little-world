import { useCallback, useEffect, useRef, useState } from 'react';
import { useDragObject } from '../hooks/useDragObject';
import { useWorld } from '../state/WorldContext';
import { tween } from '../systems/animate';
import type { TreeSpot } from '../systems/layout';
import { C } from '../theme';
import type { Vec } from '../types';

/**
 * 树
 *  - 轻点：树冠摇晃、叶子飘落，偶尔掉落一颗果实
 *  - 果实可以拖动摘下，松手后会自然落到草地上
 */
export function Tree({ spot }: { spot: TreeSpot }) {
  const { sfx, night } = useWorld();
  const [shake, setShake] = useState(0);
  const [leafBurst, setLeafBurst] = useState(0);
  const [dropReq, setDropReq] = useState<Record<string, number>>({});
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const onTap = useCallback(() => {
    setShake((n) => n + 1);
    setLeafBurst((n) => n + 1);
    sfx('leaf');
    // 偶尔有果实掉落
    if (spot.variant === 'oak' && Math.random() < 0.45) {
      const ids = ['a', 'b', 'c'];
      const pickId = ids[Math.floor(Math.random() * ids.length)];
      setDropReq((r) => ({ ...r, [pickId]: (r[pickId] ?? 0) + 1 }));
    }
  }, [sfx, spot.variant]);

  const fruitSpots =
    spot.variant === 'oak'
      ? [
          { id: 'a', ox: -38, oy: -166 },
          { id: 'b', ox: 30, oy: -188 },
          { id: 'c', ox: -4, oy: -212 },
        ]
      : [];

  const groundY = spot.y + 16;

  return (
    <g>
      <g transform={`translate(${spot.x} ${spot.y}) scale(${spot.scale})`}>
        <ellipse cx={0} cy={2} rx={72} ry={12} fill="#4c6b45" opacity="0.18" filter="url(#tinyBlur)" />
        {spot.variant === 'oak' && (
          <>
            <path
              d="M -17 2 C -20 -6 -12 -46 -9 -88 L -8 -120 L 9 -120 C 9 -82 13 -44 20 2 C 12 6 -8 6 -17 2 Z"
              fill="url(#trunkGrad)"
              stroke="rgba(120,90,60,0.4)"
              strokeWidth="2.2"
            />
            <path d="M 4 -100 C 20 -116 32 -122 44 -126" stroke={C.trunk} strokeWidth="9" strokeLinecap="round" fill="none" />
            <path d="M -6 -108 C -20 -122 -30 -126 -42 -128" stroke={C.trunkDark} strokeWidth="7" strokeLinecap="round" fill="none" />
            <g key={`crown-${shake}`} className={shake ? 'anim-tree-shake' : ''}>
              <path
                d="M -96 -176 A 40 40 0 0 1 -52 -214 A 46 46 0 0 1 6 -232 A 48 48 0 0 1 66 -204 A 40 40 0 0 1 88 -160 A 34 34 0 0 1 56 -128 A 40 40 0 0 1 6 -122 A 38 38 0 0 1 -46 -132 A 40 40 0 0 1 -96 -176 Z"
                fill={night ? C.leafNight : C.leaf}
              />
              <path
                d="M -84 -158 C -44 -124 46 -126 82 -160 C 46 -128 -42 -126 -84 -158 Z"
                fill={night ? '#5d8158' : C.leafDark}
                opacity="0.5"
              />
              <ellipse cx={-38} cy={-206} rx={30} ry={17} fill="#ffffff" opacity="0.22" transform="rotate(-14 -38 -206)" />
              <ellipse cx={34} cy={-216} rx={22} ry={12} fill="#ffffff" opacity="0.16" transform="rotate(10 34 -216)" />
              <ellipse cx={-6} cy={-172} rx={26} ry={12} fill={night ? '#7fae74' : C.leafLight} opacity="0.75" />
            </g>
          </>
        )}

        {spot.variant === 'pine' && (
          <>
            <path d="M -10 0 L -8 -104 L 8 -104 L 11 0 Z" fill="url(#trunkGrad)" stroke="rgba(120,90,60,0.4)" strokeWidth="2" />
            <g key={`crown-${shake}`} className={shake ? 'anim-tree-shake' : ''}>
              <path d="M 0 -186 L 60 -92 Q 0 -74 -60 -92 Z" fill="url(#pineGrad)" stroke="rgba(80,120,80,0.35)" strokeWidth="2" />
              <path d="M 0 -238 L 50 -146 Q 0 -132 -50 -146 Z" fill={night ? '#79a877' : C.pine} stroke="rgba(80,120,80,0.3)" strokeWidth="2" />
              <path d="M 0 -286 L 39 -200 Q 0 -188 -39 -200 Z" fill={night ? '#88b884' : '#95cb8b'} stroke="rgba(80,120,80,0.3)" strokeWidth="2" />
              <ellipse cx={-8} cy={-262} rx={12} ry={7} fill="#ffffff" opacity="0.18" />
            </g>
          </>
        )}

        {spot.variant === 'willow' && (
          <>
            <path
              d="M -14 0 C -12 -50 -10 -100 -6 -146 L 10 -144 C 10 -100 12 -48 16 0 Z"
              fill="url(#trunkGrad)"
              stroke="rgba(120,90,60,0.4)"
              strokeWidth="2.2"
            />
            <path d="M -2 -132 C -20 -152 -34 -160 -46 -164" stroke={C.trunk} strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M 4 -138 C 20 -156 32 -162 44 -166" stroke={C.trunk} strokeWidth="6" fill="none" strokeLinecap="round" />
            <g key={`crown-${shake}`} className={shake ? 'anim-tree-shake' : ''}>
              {/* 垂下的柳条 */}
              {Array.from({ length: 13 }, (_, i) => {
                const x = -66 + i * 11;
                const flare = (x / 66) * 12;
                const len = 96 + (i % 3) * 26;
                return (
                  <path
                    key={`s-${i}`}
                    className="willow-strand"
                    d={`M ${x} -178 C ${x + flare * 0.4} -150, ${x + flare * 1.3} ${-178 + len * 0.6}, ${x + flare * 0.9} ${-178 + len}`}
                    stroke={night ? '#7fae74' : C.leaf}
                    strokeWidth={3 - (i % 2) * 0.6}
                    fill="none"
                    strokeLinecap="round"
                    opacity="0.92"
                    style={{ animationDelay: `${i * 0.28}s` }}
                  />
                );
              })}
              {/* 树冠 */}
              <path
                d="M -78 -180 A 34 34 0 0 1 -46 -216 A 40 40 0 0 1 2 -232 A 40 40 0 0 1 52 -216 A 34 34 0 0 1 78 -182 A 30 30 0 0 1 44 -160 A 36 36 0 0 1 0 -152 A 36 36 0 0 1 -44 -160 A 30 30 0 0 1 -78 -180 Z"
                fill={night ? C.leafNight : C.leaf}
              />
              <ellipse cx={-20} cy={-208} rx={26} ry={14} fill="#ffffff" opacity="0.2" transform="rotate(-12 -20 -208)" />
              <path d="M -64 -170 C -34 -150 36 -150 66 -172 C 34 -154 -34 -154 -64 -170 Z" fill={night ? '#5d8158' : C.leafDark} opacity="0.45" />
            </g>
          </>
        )}

        {/* 点击热区 */}
        <g className="interactive" onPointerDown={(e) => { e.preventDefault(); onTap(); }} role="button" aria-label="树">
          <ellipse cx={0} cy={-190} rx={96} ry={96} fill="transparent" />
          <rect x={-24} y={-120} width={48} height={124} fill="transparent" />
        </g>

        {/* 飘落的叶子 */}
        {leafBurst > 0 && (
          <g key={`leaves-${leafBurst}`} pointerEvents="none">
            {Array.from({ length: 5 }, (_, i) => {
              const a = (i / 5) * Math.PI * 2;
              return (
                <g key={i} transform={`translate(${Math.cos(a) * 40} ${-200 + Math.sin(a) * 40})`}>
                  <path
                    className="falling-leaf"
                    d="M 0 0 C 6 -6 12 -2 10 4 C 8 10 2 8 0 0 Z"
                    fill={i % 2 ? C.leaf : C.leafLight}
                    style={{
                      animationDelay: `${i * 0.12}s`,
                      ['--dx' as string]: `${Math.cos(a) * 52}px`,
                      ['--dy' as string]: `${120 + Math.sin(a) * 30}px`,
                    }}
                  />
                </g>
              );
            })}
          </g>
        )}
      </g>

      {/* 果实（在树坐标系之外，方便自由拖动） */}
      {fruitSpots.map((f) => (
        <Fruit
          key={f.id}
          home={{ x: spot.x + f.ox * spot.scale, y: spot.y + f.oy * spot.scale }}
          groundY={groundY}
          scale={spot.scale}
          dropReq={dropReq[f.id] ?? 0}
        />
      ))}
    </g>
  );
}

/** 树上的一颗果实：可拖动摘下，松手后落向草地 */
function Fruit({
  home,
  groundY,
  scale,
  dropReq,
}: {
  home: Vec;
  groundY: number;
  scale: number;
  dropReq: number;
}) {
  const { sfx } = useWorld();
  const [attached, setAttached] = useState(true);
  const [pos, setPos] = useState<Vec>(home);
  const [bounce, setBounce] = useState(0);
  const posRef = useRef(pos);
  posRef.current = pos;
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (attached) setPos(home);
  }, [home.x, home.y, attached]);

  const fall = useCallback(
    (from: Vec) => {
      const target = { x: from.x, y: Math.max(from.y, groundY) };
      cancelRef.current?.();
      cancelRef.current = tween(
        460,
        (t) => {
          const e = t * t;
          setPos({ x: from.x, y: from.y + (target.y - from.y) * e });
        },
        () => {
          setPos(target);
          setBounce((n) => n + 1);
          sfx('pop');
        },
      );
    },
    [groundY, sfx],
  );

  // 树摇晃时偶尔自动掉落
  useEffect(() => {
    if (dropReq > 0 && attached) {
      setAttached(false);
      fall(posRef.current);
    }
  }, [dropReq]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => cancelRef.current?.(), []);

  const { pos: shown, dragging, handlers } = useDragObject({
    position: pos,
    onCommit: (p) => {
      setAttached(false);
      fall(p);
    },
    onTap: () => sfx('pop'),
    onDragStart: () => setAttached(false),
  });

  return (
    <g
      transform={`translate(${shown.x} ${shown.y}) scale(${scale})`}
      className={`interactive fruit ${dragging ? 'is-dragging' : ''}`}
      {...handlers}
      role="button"
      aria-label="果实"
    >
      <g key={bounce} className={bounce ? 'anim-fruit-bounce' : ''}>
        <circle cx={0} cy={0} r={13} fill="#ef8a6b" stroke="rgba(160,80,60,0.45)" strokeWidth="2" />
        <circle cx={-4} cy={-4} r={4} fill="#ffc7b0" opacity="0.85" />
        <path d="M 0 -12 C 2 -18 6 -20 10 -19 C 8 -14 4 -12 0 -12 Z" fill={C.leafDark} />
        <circle cx={0} cy={0} r={30} fill="transparent" />
      </g>
    </g>
  );
}
