import type { SceneProps } from '../art';

/** 海底：光柱、沙地、远处的鱼群剪影，安静得很 */
export function UnderwaterScene({ view, phase, night, eco }: SceneProps) {
  const x0 = view.x - 200;
  const w = view.w + 400;
  const deep = night ? '#16365a' : '#1f5273';
  const mid = night ? '#1d4468' : '#2b6d92';
  const top = night ? '#27618a' : '#4d9dc0';
  // 水流：风大的时候（海面起浪）水里也流得快，气泡与水草跟着走
  const flow = eco?.wind ?? 0.15;
  /** 水越深光越暗：潮位高的时候画面整体压暗一点，像真的潜下去了 */
  const rayOp = 0.4 + (eco?.water ?? 0.86) * 0.22;

  return (
    <g>
      <defs>
        <linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={top} />
          <stop offset="55%" stopColor={mid} />
          <stop offset="100%" stopColor={deep} />
        </linearGradient>
        <linearGradient id="rayGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
        </linearGradient>
      </defs>

      <rect x={x0} y={view.y - 300} width={w} height={1400} fill="url(#seaGrad)" />

      {/* 水面上的光柱 */}
      {phase !== 'night' &&
        [
          [420, 90],
          [700, 130],
          [980, 76],
          [1260, 110],
        ].map(([x, sw], i) => (
          <path
            key={i}
            d={`M ${x} ${view.y - 100} L ${x + sw} ${view.y - 100} L ${x + sw * 2.6} 900 L ${x + sw * 1.1} 900 Z`}
            fill="url(#rayGrad)"
            opacity={rayOp}
            className="v3-ray"
            style={{ animationDelay: `${i * 1.3}s`, animationDuration: `${Math.max(3, 9 - flow * 6)}s` }}
          />
        ))}

      {/* 远处的鱼群剪影 */}
      <g fill="#0f3a58" opacity={0.25}>
        {Array.from({ length: 16 }, (_, i) => {
          const x = 380 + ((i * 173) % 900);
          const y = 200 + ((i * 97) % 260);
          return <ellipse key={i} cx={x} cy={y} rx={9} ry={4} transform={`rotate(${i % 2 ? 8 : -6} ${x} ${y})`} />;
        })}
      </g>

      {/* 沙地 */}
      <path
        d={`M ${x0} ${792} C ${x0 + w * 0.2} ${774} ${x0 + w * 0.42} ${806} ${x0 + w * 0.62} ${788} C ${x0 + w * 0.82} ${772} ${x0 + w * 0.94} ${800} ${x0 + w} ${790} L ${x0 + w} 1200 L ${x0} 1200 Z`}
        fill={night ? '#c8b895' : '#e8d6b4'}
      />
      <path
        d={`M ${x0} ${792} C ${x0 + w * 0.2} ${774} ${x0 + w * 0.42} ${806} ${x0 + w * 0.62} ${788} C ${x0 + w * 0.82} ${772} ${x0 + w * 0.94} ${800} ${x0 + w} ${790}`}
        stroke={night ? '#dccaa4' : '#f6e8cc'}
        strokeWidth={5}
        fill="none"
        opacity={0.7}
      />

      {/* 海底岩石 */}
      <g>
        <path d="M 320 800 C 316 774 350 764 372 780 C 386 792 380 800 374 800 Z" fill={night ? '#5a6f7a' : '#6d8590'} />
        <path d="M 1210 796 C 1220 764 1276 762 1290 784 C 1298 796 1290 800 1284 800 Z" fill={night ? '#51666f' : '#64808b'} />
        <path d="M 880 806 C 886 786 922 786 930 800 Z" fill={night ? '#5a6f7a' : '#6d8590'} />
      </g>

      {/* 洞穴口 */}
      <path d="M 1380 800 C 1362 752 1430 730 1466 762 C 1490 784 1478 800 1472 800 Z" fill="#123c56" opacity={0.75} />

      {/* 沙地上的细纹 */}
      <g stroke={night ? '#b8a888' : '#d9c7a4'} strokeWidth={2.4} opacity={0.55} strokeLinecap="round">
        <path d="M 500 812 q 26 6 50 0" />
        <path d="M 660 828 q 30 6 58 0" />
        <path d="M 980 818 q 24 6 48 0" />
        <path d="M 1120 838 q 28 6 54 0" />
      </g>

      {/* 环境光点：流得越快飘得越急 */}
      <g fill="#d9f2fb" opacity={0.5}>
        {Array.from({ length: 18 }, (_, i) => (
          <circle
            key={i}
            cx={340 + ((i * 211) % 940)}
            cy={260 + ((i * 137) % 420)}
            r={1.5 + (i % 3)}
            className="v3-drift"
            style={{
              animationDelay: `${(i % 7) * 0.9}s`,
              animationDuration: `${Math.max(5, 15 - flow * 9)}s`,
            }}
          />
        ))}
      </g>
    </g>
  );
}
