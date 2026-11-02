import { useEffect, useRef, useState } from 'react';
import { useDragObject } from '../hooks/useDragObject';
import { useWorld } from '../state/WorldContext';
import { clamp } from '../systems/random';
import { C } from '../theme';
import type { Plant } from '../types';

const FLOWER = {
  pink: { petal: C.petalPink, deep: C.petalPinkDark },
  yellow: { petal: C.petalYellow, deep: C.petalYellowDark },
  purple: { petal: C.petalPurple, deep: C.petalPurpleDark },
};

/**
 * 种植区域：一颗可拖动的种子 + 所有已种下的植物
 *  - 把种子拖到草地上 → 出现土坑
 *  - 点击土坑浇水 → 长出小芽 → 慢慢长成开花的小植物
 *  - 生长状态通过 localStorage 保留
 */
export function Planting({ seedScale }: { seedScale: number }) {
  const { layout, state, toUnits, toNorm, addPlant, setSeed, sfx } = useWorld();
  const seedPos = toUnits(state.seed ?? { fx: 0.44, fy: 0.75 });
  const pendingSpawn = useRef<number | null>(null);

  // 生长完成后补一颗新种子，让孩子可以继续种
  useEffect(() => {
    const blooming = state.plants.some((p) => p.stage === 3);
    const growing = state.plants.some((p) => p.stage < 3);
    if (!blooming || growing || state.seed !== null || state.plants.length >= 7) return;
    if (pendingSpawn.current) return;
    pendingSpawn.current = window.setTimeout(() => {
      pendingSpawn.current = null;
      setSeed(toNorm({ x: layout.seedSpawn.x, y: layout.seedSpawn.y }));
    }, 2600);
    return () => {
      if (pendingSpawn.current) {
        clearTimeout(pendingSpawn.current);
        pendingSpawn.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.plants, state.seed]);

  const { pos, dragging, handlers } = useDragObject({
    position: seedPos,
    onDragStart: () => sfx('pop'),
    onCommit: (p) => {
      const onGrass = p.y > layout.horizon + layout.grassHeight * 0.1;
      if (onGrass) {
        addPlant(toNorm({ x: clamp(p.x, 40, layout.u - 40), y: clamp(p.y, layout.horizon + 30, layout.uh - 20) }));
      } else {
        // 放回原处
        setSeed(toNorm(layout.seedSpawn));
      }
    },
  });

  return (
    <g>
      {state.plants.map((plant) => (
        <PlantNode key={plant.id} plant={plant} />
      ))}

      {state.seed && (
        <g
          transform={`translate(${pos.x} ${pos.y}) scale(${seedScale})`}
          className={`interactive seed ${dragging ? 'is-dragging' : ''}`}
          {...handlers}
          role="button"
          aria-label="种子"
        >
          <circle className="seed-halo" r={26} fill="#ffe9a8" opacity="0.22" />
          <ellipse cx={0} cy={10} rx={12} ry={3.5} fill="#4c6b45" opacity="0.18" />
          <g className="seed-bob">
            <ellipse cx={0} cy={0} rx={9} ry={12} fill="#c89a68" stroke="rgba(140,100,65,0.5)" strokeWidth="1.6" />
            <path d="M -4 -4 C -2 -8 2 -8 4 -4" stroke="#e6c49a" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M 0 -12 C 1 -18 5 -21 8 -22 C 7 -16 4 -13 0 -12 Z" fill={C.leaf} />
          </g>
          <circle r={30} fill="transparent" />
        </g>
      )}
    </g>
  );
}

/** 一株植物（土坑 / 幼芽 / 小苗 / 开花） */
function PlantNode({ plant }: { plant: Plant }) {
  const { layout, waterPlant, advancePlant, sfx, toUnits } = useWorld();
  const p = toUnits({ fx: plant.fx, fy: plant.fy });
  const [water, setWater] = useState(0);
  const [wiggle, setWiggle] = useState(0);
  const [grown, setGrown] = useState(0);

  // 生长节奏：幼芽 3.2s → 小苗，小苗 4.6s → 开花
  useEffect(() => {
    if (!plant.watered || plant.stage >= 3) return;
    const delay = plant.stage === 1 ? 3200 : 4600;
    const timer = window.setTimeout(() => {
      advancePlant(plant.id);
      setGrown((n) => n + 1);
      sfx('pop');
    }, delay);
    return () => clearTimeout(timer);
  }, [plant.stage, plant.watered, plant.id, advancePlant, sfx]);

  const onTap = (e: React.PointerEvent<SVGGElement>) => {
    e.preventDefault();
    if (!plant.watered) {
      waterPlant(plant.id);
      setWater((n) => n + 1);
    } else {
      setWiggle((n) => n + 1);
      sfx('leaf');
    }
  };

  const scale = layout.composition === 'tall' ? 1.05 : 1;
  const isOpen = plant.stage === 3;
  const pal = FLOWER[plant.color];

  return (
    <g
      transform={`translate(${p.x} ${p.y}) scale(${scale})`}
      className="interactive plant"
      onPointerDown={onTap}
      role="button"
      aria-label={plant.watered ? '植物' : '土坑'}
    >
      <ellipse cx={0} cy={2} rx={14} ry={4} fill="#4c6b45" opacity="0.18" />
      {/* 土坑 */}
      <ellipse cx={0} cy={0} rx={13} ry={5.5} fill="#8a6a4b" />
      <ellipse cx={0} cy={-1} rx={9} ry={3.4} fill="#a9835e" />
      {plant.stage === 0 && (
        <ellipse cx={0} cy={-2} rx={4} ry={5} fill="#c89a68" stroke="rgba(120,90,60,0.4)" strokeWidth="1" />
      )}

      {/* 茎与叶 */}
      {plant.stage >= 1 && (
        <g key={wiggle} className={wiggle ? 'anim-plant-wiggle' : grown ? 'anim-plant-grow' : ''} style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
          <path
            d={
              plant.stage === 1
                ? 'M 0 0 C -1 -8 1 -12 0 -16'
                : plant.stage === 2
                  ? 'M 0 0 C -2 -14 2 -24 0 -34'
                  : 'M 0 0 C -2 -18 2 -30 0 -44'
            }
            stroke={C.leafDark}
            strokeWidth={plant.stage >= 2 ? 3 : 2.4}
            fill="none"
            strokeLinecap="round"
          />
          <ellipse
            cx={-7}
            cy={plant.stage === 1 ? -9 : plant.stage === 2 ? -18 : -26}
            rx={plant.stage === 3 ? 9 : 7}
            ry={4}
            fill={C.leaf}
            transform={`rotate(-26 -7 ${plant.stage === 1 ? -9 : -20})`}
          />
          <ellipse
            cx={7}
            cy={plant.stage === 1 ? -13 : plant.stage === 2 ? -26 : -36}
            rx={plant.stage === 3 ? 8 : 6}
            ry={3.6}
            fill={C.leafLight}
            transform={`rotate(24 7 ${plant.stage === 1 ? -13 : -30})`}
          />
          {/* 花 */}
          {isOpen && (
            <g transform="translate(0 -46)">
              {[0, 1, 2, 3, 4].map((i) => (
                <g key={i} transform={`rotate(${i * 72})`}>
                  <ellipse cx={0} cy={-11} rx={6.6} ry={10.6} fill={pal.petal} stroke="rgba(160,110,120,0.2)" strokeWidth="1" />
                </g>
              ))}
              <circle r={5.4} fill={C.flowerCenter} />
              <circle cx={-1.4} cy={-1.4} r={1.8} fill="#fff4c8" />
            </g>
          )}
        </g>
      )}

      {/* 浇水提示 */}
      {!plant.watered && (
        <g className="water-hint" transform="translate(0 -30)">
          <path d="M 0 0 C 4 6 6 9 6 11.5 A 6 6 0 0 1 -6 11.5 C -6 9 -4 6 0 0 Z" fill="#8fc6e0" opacity="0.9" />
          <circle cx={-2} cy={9.5} r={1.4} fill="#ffffff" opacity="0.8" />
        </g>
      )}

      {/* 浇水动画 */}
      {water > 0 && (
        <g key={water} pointerEvents="none">
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              className="water-drop"
              d="M 0 0 C 2 3 3 5 3 6 A 3 3 0 0 1 -3 6 C -3 5 -2 3 0 0 Z"
              fill="#8fc6e0"
              style={{ animationDelay: `${i * 0.14}s` }}
              transform={`translate(${-4 + i * 4} -34)`}
            />
          ))}
        </g>
      )}

      <circle cx={0} cy={-12} r={22} fill="transparent" />
    </g>
  );
}
