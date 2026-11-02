import { Stars, type SceneProps } from '../art';

/** 天空：云海、彩虹、远处的小岛，脚下是可以踩的云 */
export function SkyScene({ view, phase, weather, season, eco }: SceneProps) {
  const x0 = view.x - 200;
  const w = view.w + 400;
  // 风越大云飘得越快：孩子调"大风"能立刻看见云跑起来
  const wind = eco?.wind ?? 0.15;
  const cloudDur = Math.max(16, 90 - wind * 66);
  const grad =
    phase === 'night'
      ? ['#1a2450', '#2b3a6b', '#4a4f80']
      : phase === 'dawn'
        ? ['#cfe0f2', '#f7dcc8', '#fdf3e0']
        : phase === 'sunset'
          ? ['#e9b7b0', '#f6cfa8', '#fbe7c8']
          : season === 'winter'
            ? ['#bcd4e2', '#d8e6ee', '#eef4f6']
            : ['#a9d6f2', '#cbe9f8', '#eaf6fb'];

  return (
    <g>
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={grad[0]} />
          <stop offset="60%" stopColor={grad[1]} />
          <stop offset="100%" stopColor={grad[2]} />
        </linearGradient>
      </defs>
      <rect x={x0} y={view.y - 300} width={w} height={1400} fill="url(#skyGrad)" />
      <Stars view={view} phase={phase} />

      {/* 彩虹：雨停之后出现 */}
      {weather === 'clear' && phase !== 'night' && (
        <g opacity={0.32}>
          {['#f28b82', '#f5c86a', '#a3d68b', '#7fc4e2', '#c9b4e8'].map((c, i) => (
            <path
              key={c}
              d={`M ${x0 + w * 0.16} ${700} A ${420 - i * 16} ${420 - i * 16} 0 0 1 ${x0 + w * 0.16 + (840 - i * 32)} 700`}
              stroke={c}
              strokeWidth={13}
              fill="none"
            />
          ))}
        </g>
      )}

      {/* 远处的云海与岛屿 */}
      <g>
        <path
          d={`M ${x0} 760 C ${x0 + w * 0.18} 730 ${x0 + w * 0.34} 772 ${x0 + w * 0.5} 752 C ${x0 + w * 0.68} 730 ${x0 + w * 0.84} 768 ${x0 + w} 748 L ${x0 + w} 1400 L ${x0} 1400 Z`}
          fill={phase === 'night' ? '#3b4470' : season === 'winter' ? '#e6ecf0' : '#eef6fb'}
        />
        <path
          d={`M ${x0} 800 C ${x0 + w * 0.22} 776 ${x0 + w * 0.44} 812 ${x0 + w * 0.66} 788 C ${x0 + w * 0.8} 774 ${x0 + w * 0.92} 800 ${x0 + w} 792 L ${x0 + w} 1400 L ${x0} 1400 Z`}
          fill={phase === 'night' ? '#4b5480' : '#ffffff'}
          opacity={0.92}
        />
      </g>

      {/* 远处的小岛，说明这里是"高处" */}
      <g opacity={0.4}>
        <path d="M 150 748 C 190 700 250 694 300 748 Z" fill={phase === 'night' ? '#2b3358' : '#b9d3c4'} />
        <path d="M 1420 752 C 1450 714 1500 710 1536 752 Z" fill={phase === 'night' ? '#2b3358' : '#b9d3c4'} />
      </g>

      {/* 云团：自己会飘，风大就飘得快 */}
      {[
        [420, 700, 1.1],
        [760, 630, 0.8],
        [1180, 690, 1],
        [980, 560, 0.6],
        [320, 520, 0.55],
      ].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`} opacity={phase === 'night' ? 0.55 : 0.9}>
          <g className="v3-drift-cloud" style={{ animationDuration: `${cloudDur + i * 7}s`, animationDelay: `${i * 1.6}s` }}>
            <ellipse cx={-30} cy={-16} rx={34} ry={22} fill="#ffffff" />
            <ellipse cx={10} cy={-28} rx={42} ry={28} fill="#ffffff" />
            <ellipse cx={44} cy={-14} rx={30} ry={20} fill="#ffffff" />
            <ellipse cx={0} cy={-4} rx={54} ry={16} fill="#eef4fa" />
          </g>
        </g>
      ))}

      {/* 漂浮的小光点 */}
      <g fill="#fff4cf" opacity={phase === 'night' ? 0.85 : 0.4}>
        {Array.from({ length: 14 }, (_, i) => (
          <circle
            key={i}
            cx={340 + ((i * 197) % 900)}
            cy={300 + ((i * 131) % 300)}
            r={1.6 + (i % 3) * 0.8}
            className="v3-twinkle"
            style={{ animationDelay: `${(i % 6) * 0.8}s` }}
          />
        ))}
      </g>
    </g>
  );
}
