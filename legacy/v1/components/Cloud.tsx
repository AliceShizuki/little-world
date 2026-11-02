import { useCallback, useEffect, useRef, useState } from 'react';
import { useDragObject } from '../hooks/useDragObject';
import { useWorld } from '../state/WorldContext';
import { clamp } from '../systems/random';
import type { Vec } from '../types';

interface CloudProps {
  id: 'a' | 'b';
  scale: number;
}

/**
 * 云朵
 *  - 可拖动（鼠标 / 触摸），松手后继续缓慢漂浮
 *  - 轻点会「鼓一下」并改变形状
 *  - 深色雨云：轻点切换下雨 / 放晴
 */
export function Cloud({ id, scale }: CloudProps) {
  const { state, layout, toUnits, toNorm, setCloud, setWeather, raining, sfx } = useWorld();
  const [puff, setPuff] = useState(0);
  const timer = useRef<number | null>(null);
  const isRainCloud = id === 'b';

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const position = toUnits(state.clouds[id]);

  const commit = useCallback(
    (p: Vec) => {
      setCloud(id, toNorm(p));
      sfx('cloud');
    },
    [id, setCloud, toNorm, sfx],
  );

  const onTap = useCallback(() => {
    setPuff((n) => n + 1);
    sfx('cloud');
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPuff(0), 700);
    if (isRainCloud) {
      setWeather(raining ? 'clear' : 'rain');
    }
  }, [isRainCloud, raining, setWeather, sfx]);

  const { pos, dragging, handlers } = useDragObject({
    position,
    onCommit: commit,
    onTap,
    clamp: (p) => ({
      x: clamp(p.x, -40, layout.u + 40),
      y: clamp(p.y, -30, layout.horizon * 0.86),
    }),
  });

  const dark = isRainCloud && raining;

  return (
    <g
      transform={`translate(${pos.x} ${pos.y})`}
      className={`interactive cloud ${dragging ? 'is-dragging' : ''}`}
      {...handlers}
      role="button"
      aria-label={isRainCloud ? '雨云' : '云朵'}
    >
      <g transform={`scale(${scale})`}>
        <g className="cloud-drift" style={{ animationDuration: id === 'a' ? '24s' : '31s' }}>
          <g key={puff} className={puff ? 'anim-cloud-puff' : ''}>
            {/* 云朵的柔和投影 */}
            <ellipse cx={6} cy={22} rx={82} ry={12} fill="#a9c6d8" opacity={0.18} filter="url(#softBlur)" />
            {id === 'a' ? (
              <path
                d="M -96 14 C -104 -14 -78 -34 -56 -25 C -54 -48 -20 -58 -2 -43 C 8 -64 46 -63 55 -40 C 78 -47 98 -26 93 -5 C 102 6 93 17 79 19 L -77 19 C -92 19 -96 17 -96 14 Z"
                fill={dark ? 'url(#cloudRainGrad)' : 'url(#cloudGrad)'}
                stroke="rgba(140,170,190,0.35)"
                strokeWidth={2}
              />
            ) : (
              <path
                d="M -106 12 C -112 -16 -86 -32 -66 -23 C -62 -52 -18 -60 2 -45 C 16 -68 58 -63 64 -38 C 88 -45 110 -22 101 0 C 110 11 101 18 88 18 L -88 18 C -101 18 -106 15 -106 12 Z"
                fill={dark ? 'url(#cloudRainGrad)' : 'url(#cloudGrad)'}
                stroke="rgba(140,170,190,0.35)"
                strokeWidth={2}
              />
            )}
            {/* 底部阴影，增加体积感 */}
            <path
              d="M -80 18 C -40 26 40 26 82 18 C 60 26 -20 28 -80 18 Z"
              fill={dark ? '#93a4b6' : '#d5e3ee'}
              opacity={0.7}
            />
            {isRainCloud && (
              <g className={raining ? 'rain-hint on' : 'rain-hint'} opacity={raining ? 1 : 0.35}>
                <path d="M -40 32 q 4 8 0 10 q -4 -2 0 -10 Z" fill="#8fc6e0" opacity="0.8" />
                <path d="M 0 38 q 4 8 0 10 q -4 -2 0 -10 Z" fill="#8fc6e0" opacity="0.55" />
                <path d="M 40 32 q 4 8 0 10 q -4 -2 0 -10 Z" fill="#8fc6e0" opacity="0.8" />
              </g>
            )}
          </g>
        </g>
      </g>
    </g>
  );
}
