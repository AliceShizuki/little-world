import type { SceneProps } from '../art';

/**
 * 地下：森林的里层空间
 *
 * 画法是一条"横着的隧道剖面"：上面是土层与垂下来的根，中间是能走人的通道，
 * 下面是通道的地面。不是黑洞——土是暖棕的，光从左上角的出口漏进来。
 *
 * 这个区域没有天空、没有天气，所以 Stage 里对它跳过天气层与月亮。
 */
export function BurrowScene({ view, phase, night }: SceneProps) {
  const x0 = view.x - 300;
  const w = view.w + 600;
  const top = view.y - 400;
  const bottom = view.y + view.h + 400;
  const floor = 764;
  const dark = phase === 'night' || night;

  return (
    <g>
      <defs>
        <linearGradient id="soilWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={dark ? '#33261a' : '#5a4630'} />
          <stop offset="60%" stopColor={dark ? '#4a3726' : '#7d6142'} />
          <stop offset="100%" stopColor={dark ? '#3d2d1e' : '#6b5236'} />
        </linearGradient>
        <linearGradient id="tunnelAir" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={dark ? '#5b4429' : '#a6845a'} />
          <stop offset="45%" stopColor={dark ? '#6b5133' : '#bd9c6e'} />
          <stop offset="100%" stopColor={dark ? '#4e3a25' : '#9a7a52'} />
        </linearGradient>
        <radialGradient id="dayGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffeec6" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffeec6" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 土体本身 */}
      <rect x={x0} y={top} width={w} height={bottom - top} fill="url(#soilWall)" />

      {/* 土层颗粒：让土是"土"而不是一块颜色 */}
      <g opacity={dark ? 0.2 : 0.28}>
        {Array.from({ length: 120 }, (_, i) => {
          const x = x0 + ((i * 173) % w);
          const y = top + ((i * 89) % (bottom - top));
          return <circle key={i} cx={x} cy={y} r={1.1 + ((i * 7) % 3) * 0.6} fill={i % 3 ? '#2f2317' : '#c4a578'} />;
        })}
      </g>

      {/* 通道：一条横贯画面的空腔，顶部是弧形的拱 */}
      <path
        d={`M ${x0} 660 C ${x0 + w * 0.2} 668, ${x0 + w * 0.42} 690, ${x0 + w * 0.62} 674 C ${x0 + w * 0.82} 660, ${x0 + w * 0.94} 682, ${x0 + w} 676 L ${x0 + w} 900 L ${x0} 900 Z`}
        fill="url(#tunnelAir)"
      />
      {/* 拱顶的暗边：通道是有厚度的 */}
      <path
        d={`M ${x0} 660 C ${x0 + w * 0.2} 668, ${x0 + w * 0.42} 690, ${x0 + w * 0.62} 674 C ${x0 + w * 0.82} 660, ${x0 + w * 0.94} 682, ${x0 + w} 676`}
        fill="none"
        stroke={dark ? '#2e2116' : '#4e3a24'}
        strokeWidth={26}
        opacity={0.55}
        strokeLinecap="round"
      />
      {/* 拱顶的一条亮边：光从上面反射下来 */}
      <path
        d={`M ${x0} 670 C ${x0 + w * 0.2} 676, ${x0 + w * 0.42} 698, ${x0 + w * 0.62} 682 C ${x0 + w * 0.82} 668, ${x0 + w * 0.94} 690, ${x0 + w} 684`}
        fill="none"
        stroke={dark ? '#8a6c46' : '#dcc094'}
        strokeWidth={5}
        opacity={0.5}
        strokeLinecap="round"
      />

      {/* 通道地面：比墙亮一点，有一条清楚的地平线 */}
      <defs>
        <linearGradient id="burrowFloor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={dark ? '#6b5133' : '#a9885c'} />
          <stop offset="100%" stopColor={dark ? '#3d2c1c' : '#6b5236'} />
        </linearGradient>
      </defs>
      <path
        d={`M ${x0} ${floor} C ${x0 + w * 0.24} ${floor - 8}, ${x0 + w * 0.46} ${floor + 6}, ${x0 + w * 0.68} ${floor - 4} C ${x0 + w * 0.86} ${floor - 12}, ${x0 + w * 0.94} ${floor + 4}, ${x0 + w} ${floor - 4} L ${x0 + w} 1200 L ${x0} 1200 Z`}
        fill="url(#burrowFloor)"
      />
      <path
        d={`M ${x0} ${floor} C ${x0 + w * 0.24} ${floor - 8}, ${x0 + w * 0.46} ${floor + 6}, ${x0 + w * 0.68} ${floor - 4} C ${x0 + w * 0.86} ${floor - 12}, ${x0 + w * 0.94} ${floor + 4}, ${x0 + w} ${floor - 4}`}
        stroke={dark ? '#2e2116' : '#5c4529'}
        strokeWidth={4}
        fill="none"
        opacity={0.6}
      />

      {/* 地面上的碎土与石子 */}
      <g opacity={0.5}>
        {Array.from({ length: 26 }, (_, i) => {
          const x = x0 + ((i * 211) % w);
          const y = floor + 8 + ((i * 37) % 60);
          return <ellipse key={i} cx={x} cy={y} rx={3 + (i % 3)} ry={2 + (i % 2)} fill="#3f2d1d" opacity={0.5} />;
        })}
      </g>


      {/* 断面里的内容：大根须、侧洞、卵石、蘑菇的地下茎 —— 上半屏不能只是土 */}
      <g opacity={dark ? 0.55 : 0.9}>
        {/* 两条大根，从画面顶部垂下来再分叉 */}
        {[
          { x: 260, len: 300, k: 1.1 },
          { x: 1180, len: 260, k: 0.95 },
        ].map((r, i) => (
          <g key={i} stroke={dark ? '#6b5336' : '#8a6b46'} fill="none" strokeLinecap="round">
            <path d={`M ${r.x} ${top} C ${r.x + 16} ${top + r.len * 0.5}, ${r.x - 18} ${top + r.len * 0.82}, ${r.x + 6} ${top + r.len}`} strokeWidth={14 * r.k} />
            <path d={`M ${r.x + 10} ${top + r.len * 0.42} C ${r.x - 40} ${top + r.len * 0.6}, ${r.x - 70} ${top + r.len * 0.78}, ${r.x - 88} ${top + r.len * 0.94}`} strokeWidth={7 * r.k} />
            <path d={`M ${r.x - 2} ${top + r.len * 0.62} C ${r.x + 46} ${top + r.len * 0.76}, ${r.x + 72} ${top + r.len * 0.9}, ${r.x + 84} ${top + r.len * 1.04}`} strokeWidth={6 * r.k} />
            <path d={`M ${r.x - 30} ${top + r.len * 0.8} C ${r.x - 60} ${top + r.len * 0.88}, ${r.x - 74} ${top + r.len * 0.98}, ${r.x - 82} ${top + r.len * 1.1}`} strokeWidth={4 * r.k} />
          </g>
        ))}

        {/* 卵石堆 */}
        {[
          [700, 560, 1],
          [1060, 500, 0.85],
          [420, 640, 0.9],
        ].map(([cx, cy, k], i) => (
          <g key={i}>
            {[
              [-18, 4, 1],
              [12, 8, 0.8],
              [-4, -10, 0.7],
              [26, -6, 0.55],
            ].map(([dx, dy, ks], j) => (
              <ellipse
                key={j}
                cx={(cx as number) + (dx as number) * (k as number)}
                cy={(cy as number) + (dy as number) * (k as number)}
                rx={15 * (k as number) * (ks as number)}
                ry={11 * (k as number) * (ks as number)}
                fill={j % 2 ? '#a8927a' : '#bda98f'}
                opacity={0.85}
              />
            ))}
          </g>
        ))}

        {/* 蘑菇的地下茎与根系 */}
        <g transform="translate(880 620)" stroke={dark ? '#7a5c3e' : '#a3815b'} fill="none" strokeLinecap="round">
          <path d="M 0 0 C 4 -30 2 -50 -2 -66" strokeWidth={5} />
          <path d="M -2 -28 C -18 -34 -26 -42 -30 -50" strokeWidth={3} />
          <path d="M 0 -44 C 14 -50 20 -58 24 -64" strokeWidth={3} />
        </g>
      </g>

      {/* 地面上的一点起伏与碎石，别让下半屏是一块平色 */}
      {/* 地面上的碎石与草根：把通道地面铺出质感 */}
      <g pointerEvents="none" opacity={dark ? 0.5 : 0.85}>
        {Array.from({ length: 40 }, (_, i) => {
          const x = x0 + 40 + ((i * 197) % (w - 80));
          const y = 790 + ((i * 53) % 220);
          const k = 0.6 + ((i * 7) % 5) * 0.14;
          return (
            <g key={i}>
              <ellipse cx={x} cy={y} rx={9 * k} ry={6 * k} fill={i % 3 ? '#8a6b46' : '#a8895f'} opacity={0.7} />
              <ellipse cx={x - 2 * k} cy={y - 2 * k} rx={4 * k} ry={2.4 * k} fill="#c0a173" opacity={0.5} />
            </g>
          );
        })}
      </g>

      {/* 左上的出口：一束光 + 一架梯子 */}
      <g>
        <ellipse cx={210} cy={566} rx={110} ry={78} fill="url(#dayGlow)" />
        <ellipse cx={210} cy={578} rx={54} ry={34} fill={dark ? '#8fa2c8' : '#dff1fb'} />
        <ellipse cx={210} cy={578} rx={62} ry={40} fill="none" stroke={dark ? '#4a5b7d' : '#b9d9ea'} strokeWidth={5} opacity={0.7} />
        {/* 光柱落到梯子脚下 */}
        <path d="M 168 592 L 252 592 L 300 760 L 132 760 Z" fill="#ffeec6" opacity={dark ? 0.06 : 0.16} />
      </g>

      {/* 垂下来的根 */}
      <g stroke="#8a6b46" fill="none" strokeLinecap="round" opacity={dark ? 0.5 : 0.8}>
        {[
          [380, 120, 1],
          [470, 86, 0.8],
          [860, 150, 1.1],
          [980, 110, 0.9],
          [1300, 132, 1],
          [1420, 92, 0.85],
        ].map(([x, len, k], i) => (
          <g key={i}>
            <path d={`M ${x} ${top} C ${(x as number) + 10} ${(len as number) * 2}, ${(x as number) - 12} ${(len as number) * 3.4}, ${(x as number) + 4} ${(len as number) * 4.6}`} strokeWidth={8 * (k as number)} />
            <path d={`M ${(x as number) + 4} ${(len as number) * 2.4} C ${(x as number) - 26} ${(len as number) * 2.9}, ${(x as number) - 40} ${(len as number) * 3.6}, ${(x as number) - 50} ${(len as number) * 4.1}`} strokeWidth={3.6} />
            <path d={`M ${(x as number) + 2} ${(len as number) * 3.2} C ${(x as number) + 26} ${(len as number) * 3.8}, ${(x as number) + 36} ${(len as number) * 4.3}, ${(x as number) + 44} ${(len as number) * 4.7}`} strokeWidth={3} />
          </g>
        ))}
      </g>

      {/* 埋在土里的石头 */}
      {[
        [560, 520, 0.6],
        [1240, 470, 0.5],
        [760, 430, 0.42],
        [1090, 560, 0.46],
        [420, 460, 0.38],
        [1460, 540, 0.44],
      ].map(([x, y, s], i) => (
        <g key={i} opacity={0.55}>
          <ellipse cx={x as number} cy={y as number} rx={22 * (s as number)} ry={15 * (s as number)} fill="#9c8b76" />
          <ellipse cx={(x as number) - 4} cy={(y as number) - 4} rx={10 * (s as number)} ry={5 * (s as number)} fill="#bcac97" opacity={0.7} />
        </g>
      ))}

      {/* 通道中间的暖光，让这里像"家" */}
      <ellipse cx={820} cy={760} rx={460} ry={150} fill="url(#dayGlow)" opacity={0.7} />
    </g>
  );
}
