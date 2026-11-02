import { Clouds, Ground, Sky, Sun, type SceneProps } from '../art';

/** 工地：土坡、脚手架、水泥管、半截的墙 */
export function SiteScene({ view, phase, weather, eco }: SceneProps) {
  const soil = eco?.soil ?? 0.2;
  const wind = eco?.wind ?? 0.15;
  /** 干土发白、湿土发暗：下雨之后工地会明显变深一号 */
  const dirt = soil > 0.55 ? '#b08a5c' : soil > 0.35 ? '#c9ab80' : '#d9bd93';
  return (
    <g>
      <Sky view={view} phase={phase} weather={weather} />
      <Sun view={view} phase={phase} weather={weather} />
      <Clouds view={view} phase={phase} weather={weather} />

      {/* 远处的城市轮廓，淡淡的 */}
      <g opacity={0.28}>
        {[
          [180, 560, 90, 120],
          [280, 588, 70, 92],
          [860, 574, 110, 106],
          [980, 596, 60, 84],
          [1400, 562, 100, 118],
        ].map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} fill="#9fb2b8" rx={3} />
        ))}
      </g>

      <Ground view={view} top={686} near={dirt} far={soil > 0.55 ? '#a8845c' : '#c9ab80'} edge="#b99a6e" />
      {/* 土堆 */}
      <path d="M 240 700 C 300 640 420 636 470 700 Z" fill={dirt} opacity={0.9} />
      <path d="M 1240 706 C 1280 660 1380 656 1420 706 Z" fill={dirt} opacity={0.85} />

      {/* 半截砖墙 */}
      <g transform="translate(560 700)">
        {[0, 1, 2, 3, 4].map((r) =>
          [0, 1, 2, 3, 4].map((c2) => (
            <rect
              key={`${r}-${c2}`}
              x={-90 + c2 * 38 + (r % 2 ? 12 : 0)}
              y={-28 - r * 22}
              width={34}
              height={20}
              rx={2}
              fill={r % 2 ? '#d98b6a' : '#c97a5c'}
              stroke="rgba(109,90,74,0.25)"
              strokeWidth={1.2}
            />
          )),
        )}
      </g>

      {/* 脚手架 */}
      <g stroke="#c9a06a" strokeWidth={6} strokeLinecap="round" opacity={0.95}>
        <path d="M 1010 700 L 1010 430 M 1130 700 L 1130 430" />
        <path d="M 1000 660 L 1140 660 M 1000 570 L 1140 570 M 1000 480 L 1140 480" />
        <path d="M 1010 660 L 1130 570 M 1010 570 L 1130 480" strokeWidth={3.4} opacity={0.8} />
      </g>
      <rect x={1000} y={648} width={140} height={12} rx={3} fill="#b98b62" />
      <rect x={1000} y={558} width={140} height={12} rx={3} fill="#b98b62" />

      {/* 水泥管 */}
      <g transform="translate(300 690)">
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <circle cx={i * 8} cy={-14} r={26} fill="#b9b6ae" stroke="rgba(109,90,74,0.3)" strokeWidth={2} />
            <circle cx={i * 8} cy={-14} r={17} fill="#8d8a84" />
          </g>
        ))}
      </g>

      {/* 隔离墩 */}
      {[720, 780, 840].map((x) => (
        <g key={x} transform={`translate(${x} 716)`}>
          <path d="M -14 0 L -8 -26 L 8 -26 L 14 0 Z" fill="#f28b82" stroke="rgba(109,90,74,0.3)" strokeWidth={1.6} />
          <rect x={-10} y={-18} width={20} height={5} fill="#fdf8ef" opacity={0.85} />
        </g>
      ))}

      {/* 小推车 */}
      <g transform="translate(1180 720)">
        <path d="M -26 -8 L 26 -8 L 20 12 L -20 12 Z" fill="#8fc7e8" stroke="rgba(109,90,74,0.3)" strokeWidth={2} />
        <circle cx={-18} cy={16} r={8} fill="#5c4a3d" />
        <path d="M 26 -8 L 44 -18" stroke="#8d8a84" strokeWidth={4} strokeLinecap="round" />
      </g>

      {/* 地上散落的碎石 */}
      <g fill="#b9b6ae" opacity={0.7}>
        {[
          [660, 716],
          [700, 726],
          [920, 720],
          [960, 732],
          [1320, 722],
        ].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx={5} ry={3} />
        ))}
      </g>

      {/* 起风时扬起的土：工地是最容易看出风的地方 */}
      {wind > 0.42 && (
        <g fill="#e8d6b4" opacity={Math.min(0.5, (wind - 0.4) * 0.85)} pointerEvents="none">
          {Array.from({ length: 10 }, (_, i) => (
            <circle
              key={i}
              cx={300 + ((i * 173) % 1100)}
              cy={690 + ((i * 61) % 90)}
              r={2 + (i % 3)}
              className="v3-drift"
              style={{ animationDuration: `${Math.max(3, 10 - wind * 7)}s`, animationDelay: `${(i % 5) * 0.6}s` }}
            />
          ))}
        </g>
      )}
    </g>
  );
}
