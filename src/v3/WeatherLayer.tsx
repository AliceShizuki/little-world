import { useMemo } from 'react';
import type { View, Weather } from './types';

/** 确定性伪随机，保证每次渲染的雨滴位置一致（不会闪） */
function seeded(count: number, seed: number) {
  let s = seed;
  return Array.from({ length: count }, () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    const a = s / 2147483648;
    s = (s * 1103515245 + 12345) % 2147483648;
    const b = s / 2147483648;
    s = (s * 1103515245 + 12345) % 2147483648;
    const c = s / 2147483648;
    return [a, b, c] as const;
  });
}

/** 雨、雪、风。全部只看天气，不影响任何状态 */
export function WeatherLayer({ view, weather }: { view: View; weather: Weather }) {
  const drops = useMemo(() => seeded(130, 77), []);
  const flakes = useMemo(() => seeded(70, 131), []);
  const streaks = useMemo(() => seeded(16, 991), []);

  if (weather === 'clear') return null;

  const x0 = view.x - 100;
  const w = view.w + 200;
  const y0 = view.y - 120;
  const h = view.h + 240;

  if (weather === 'rain') {
    return (
      <g pointerEvents="none" className="v3-rain">
        {drops.map(([a, b, c], i) => (
          <line
            key={i}
            x1={x0 + a * w}
            y1={y0 + b * h}
            x2={x0 + a * w - 4}
            y2={y0 + b * h + 16 + c * 10}
            stroke="#e8f6ff"
            strokeWidth={1.1 + c * 0.8}
            strokeLinecap="round"
            opacity={0.26 + c * 0.34}
            className="v3-drop"
            style={{ animationDelay: `${a * 1.4}s`, animationDuration: `${0.85 + c * 0.5}s` }}
          />
        ))}
      </g>
    );
  }

  if (weather === 'snow') {
    return (
      <g pointerEvents="none">
        {flakes.map(([a, b, c], i) => (
          <circle
            key={i}
            cx={x0 + a * w}
            cy={y0 + b * h}
            r={1.8 + c * 3}
            fill="#ffffff"
            opacity={0.6 + c * 0.35}
            className="v3-flake"
            style={{ animationDelay: `${a * 3}s`, animationDuration: `${6 + c * 5}s` }}
          />
        ))}
      </g>
    );
  }

  if (weather === 'wind') {
    return (
      <g pointerEvents="none" opacity={0.5}>
        {streaks.map(([a, b, c], i) => (
          <path
            key={i}
            d={`M ${x0 + a * w} ${y0 + b * h} q 40 -10 80 0 q 40 10 80 0`}
            stroke="#ffffff"
            strokeWidth={1.6 + c * 1.6}
            fill="none"
            strokeLinecap="round"
            className="v3-gust"
            style={{ animationDelay: `${a * 2.4}s`, animationDuration: `${2.6 + c * 2}s` }}
          />
        ))}
      </g>
    );
  }

  // 阴天：一层很淡的灰
  return <rect x={view.x - 100} y={view.y - 100} width={view.w + 200} height={view.h + 200} fill="#8a9aa8" opacity={0.12} pointerEvents="none" />;
}
