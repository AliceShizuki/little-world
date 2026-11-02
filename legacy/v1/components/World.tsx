import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWorld } from '../state/WorldContext';
import type { NVec } from '../types';
import { Bird } from './Bird';
import { Boat } from './Boat';
import { Butterfly } from './Butterfly';
import { Carrot } from './Carrot';
import { Cloud } from './Cloud';
import { Flower } from './Flower';
import { Frog } from './Frog';
import { House } from './House';
import { Landscape } from './Landscape';
import { Planting } from './Planting';
import { Rabbit } from './Rabbit';
import { Rain } from './Rain';
import { River } from './River';
import { SceneDefs } from './SceneDefs';
import { Sky } from './Sky';
import { Moon, Sun } from './Sun';
import { Tree } from './Tree';

/**
 * 世界本体：按空间层次从前到后组织所有元素。
 * 天空 → 云与太阳 → 远景草地 → 河流 → 房屋 → 树 → 花 → 动物 → 天气 → 夜色
 */
export function World() {
  const { layout, state, night, raining, toUnits, toNorm } = useWorld();
  const { u, uh, horizon } = layout;
  const tall = layout.composition === 'tall';

  const [skySignal, setSkySignal] = useState(0);
  const [attract, setAttract] = useState<{ x: number; y: number; id: number } | null>(null);
  const [splash, setSplash] = useState<{ x: number; y: number; id: number } | null>(null);
  const splashId = useRef(0);
  const attractId = useRef(0);

  // 胡萝卜：默认摆在草地上，被吃掉后过一会儿重新长出来
  const [carrot, setCarrot] = useState<NVec | null>(() => toNorm(layout.carrot));
  const respawn = useRef<number | null>(null);

  useEffect(() => {
    if (carrot !== null) return;
    respawn.current = window.setTimeout(() => {
      setCarrot(toNorm({ x: layout.carrot.x + 30, y: layout.carrot.y + 6 }));
    }, 9000);
    return () => {
      if (respawn.current) clearTimeout(respawn.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrot]);

  const onSplash = useCallback((x: number, y: number) => {
    splashId.current += 1;
    setSplash({ x, y, id: splashId.current });
  }, []);

  const onBloom = useCallback((x: number, y: number) => {
    attractId.current += 1;
    setAttract({ x, y, id: attractId.current });
  }, []);

  const scales = useMemo(
    () => ({
      rabbit: tall ? 0.95 : 1,
      bird: tall ? 0.9 : 1,
      butterfly: tall ? 0.95 : 1,
      frog: tall ? 0.95 : 1,
      boat: tall ? 0.95 : 1,
      carrot: tall ? 0.9 : 1,
      seed: tall ? 1 : 1,
      cloud: tall ? 0.78 : 1,
    }),
    [tall],
  );

  const { river, house } = layout;
  const grassEdge = layout.grassHeight * 0.16;

  return (
    <svg
      className="world-svg"
      viewBox={`0 0 ${u} ${uh}`}
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <SceneDefs layout={layout} />

      <Sky />

      {/* 点击天空：让小鸟飞一圈 */}
      <rect
        x={-30}
        y={-40}
        width={u + 60}
        height={horizon * 0.98}
        fill="transparent"
        className="interactive sky-hit"
        onPointerDown={(e) => {
          e.preventDefault();
          setSkySignal((n) => n + 1);
        }}
        aria-label="天空"
        role="button"
      />

      <Sun />
      <Moon />
      <Cloud id="a" scale={scales.cloud} />
      <Cloud id="b" scale={scales.cloud} />

      <Landscape />
      <River splash={splash} />

      <House />

      {layout.trees.map((spot) => (
        <Tree key={spot.id} spot={spot} />
      ))}

      {layout.flowers.map((spot) => (
        <Flower key={spot.id} spot={spot} onBloom={onBloom} />
      ))}

      <Planting seedScale={scales.seed} />

      <Boat
        scale={scales.boat}
        bounds={{
          minX: 10,
          maxX: river.x2 - 34,
          minY: river.cy - river.width * 0.26,
          maxY: river.cy + river.width * 0.28,
        }}
      />

      {carrot && (
        <Carrot
          pos={toUnits(carrot)}
          scale={scales.carrot}
          onCommit={(p) => setCarrot(toNorm(p))}
          onTap={() => undefined}
        />
      )}

      <Rabbit
        pos={layout.rabbit}
        scale={scales.rabbit}
        carrot={carrot ? toUnits(carrot) : null}
        onEatCarrot={() => setCarrot(null)}
      />

      <Frog
        home={layout.frog}
        water={{ x: layout.frog.x + 30, y: river.cy + 4 }}
        scale={scales.frog}
        onSplash={onSplash}
      />

      <Bird perches={layout.perches} scale={scales.bird} skySignal={skySignal} />

      <Butterfly home={layout.butterflyHome} scale={scales.butterfly} attract={attract} />

      {/* 前景：贴地的一层暗草，做出最朴素的景深 */}
      <g pointerEvents="none">
        <path
          d={`M -40 ${uh + 20} L -40 ${uh - grassEdge * 0.5} C ${u * 0.25} ${uh - grassEdge}, ${u * 0.5} ${uh - grassEdge * 0.2}, ${u * 0.78} ${uh - grassEdge * 0.75} C ${u * 0.9} ${uh - grassEdge}, ${u + 40} ${uh - grassEdge * 0.3}, ${u + 40} ${uh - grassEdge * 0.6} L ${u + 40} ${uh + 20} Z`}
          fill="#6ea463"
          opacity={night ? 0.16 : 0.28}
        />
        {[
          { x: 0.02, s: 1.1 },
          { x: 0.06, s: 0.8 },
          { x: 0.96, s: 1 },
          { x: 0.99, s: 0.7 },
        ].map((b, i) => (
          <g key={i} transform={`translate(${u * b.x} ${uh + 8}) scale(${b.s * (u / 1440) * 2.4})`} opacity={night ? 0.45 : 0.7}>
            <path d="M 0 0 C -8 -30 -20 -46 -30 -58" stroke="#5c9256" strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M 8 0 C 6 -34 10 -52 16 -66" stroke="#5c9256" strokeWidth="8" fill="none" strokeLinecap="round" />
            <path d="M 20 0 C 26 -26 34 -40 44 -50" stroke="#5c9256" strokeWidth="7" fill="none" strokeLinecap="round" />
          </g>
        ))}
      </g>

      <Rain />

      {/* 夜色 / 雨天的整体色调（整屏渐变，不产生硬边） */}
      <rect
        x={-40}
        y={-40}
        width={u + 80}
        height={uh + 80}
        fill="#161d3f"
        pointerEvents="none"
        style={{ opacity: night ? 0.46 : 0, transition: 'opacity 1.9s ease' }}
      />
      <rect
        x={-40}
        y={-40}
        width={u + 80}
        height={uh + 80}
        fill="#93a9bb"
        pointerEvents="none"
        style={{ opacity: raining ? 0.1 : 0, transition: 'opacity 1.5s ease' }}
      />
      {/* 夜晚亮着的窗，光要压在夜色之上才看得见 */}
      {night && state.windowLit && (
        <ellipse
          cx={house.x - 58 * house.scale}
          cy={house.y - 94 * house.scale}
          rx={78 * house.scale}
          ry={68 * house.scale}
          fill="url(#windowHalo)"
          opacity="0.9"
          pointerEvents="none"
        />
      )}
      <rect x={-40} y={-40} width={u + 80} height={uh + 80} fill="url(#vignette)" pointerEvents="none" />
    </svg>
  );
}
