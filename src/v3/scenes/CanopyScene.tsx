import { Sky, type SceneProps } from '../art';

/**
 * 树上：森林的第二个里层空间
 *
 * 一根粗枝横在画面下方就是"地面"；右边的主干把它连到树上；
 * 上面垂着叶簇，下面是一片深色的叶影把画面收住。
 * 孩子从森林的树洞上来，从枝头那个树洞下去（左上角也有返回）。
 */
export function CanopyScene({ view, phase, weather, season, night }: SceneProps) {
  const x0 = view.x - 300;
  const w = view.w + 600;
  const leaf = season === 'autumn' ? '#e0a35f' : season === 'winter' ? '#b9c7c4' : night ? '#5f8a66' : '#8fc47c';
  const leafD = season === 'autumn' ? '#c9834a' : season === 'winter' ? '#a3b1ae' : night ? '#4c7452' : '#78b268';
  const leafL = season === 'autumn' ? '#f0bd7c' : season === 'winter' ? '#cfdad8' : night ? '#6f9a68' : '#a8d492';
  const bark = night ? '#5a4432' : '#a87f52';
  const barkD = night ? '#432f1f' : '#7f5d39';

  return (
    <g>
      <Sky view={view} phase={phase} weather={weather} />

      {/* 远处：几簇模糊的枝叶，把"我们在树中间"这件事交代掉 */}
      <g opacity={night ? 0.42 : 0.75}>
        {[
          [-40, 0.18, 240, 170],
          [220, 0.06, 210, 150],
          [470, 0.0, 190, 130],
          [720, 0.02, 200, 120],
          [980, 0.08, 190, 130],
          [1230, 0.16, 210, 150],
          [1500, 0.26, 230, 160],
        ].map(([cx, fy, rx, ry], i) => (
          <g key={i} transform={`translate(0 ${view.y + view.h * (fy as number)})`}>
            <ellipse cx={cx as number} cy={0} rx={rx as number} ry={ry as number} fill={leafD} opacity={0.72} />
            <ellipse cx={(cx as number) + (rx as number) * 0.42} cy={(ry as number) * 0.5} rx={(rx as number) * 0.66} ry={(ry as number) * 0.6} fill={leaf} opacity={0.66} />
            <ellipse cx={(cx as number) - (rx as number) * 0.4} cy={(ry as number) * 0.36} rx={(rx as number) * 0.48} ry={(ry as number) * 0.46} fill={leafL} opacity={0.32} />
          </g>
        ))}
      </g>

      {/* 叶隙漏下来的光 */}
      <g pointerEvents="none">
        {[
          [560, 300, 110],
          [980, 250, 130],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#fff6d6" opacity={night ? 0.08 : 0.24} filter="url(#softBlur)" />
        ))}
      </g>

      {/* 从画面上沿垂下来的叶簇 */}
      {[
        [420, -40, 1.1],
        [700, -70, 1.3],
        [1010, -30, 1],
        [1230, -80, 1.15],
      ].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <path d={`M 0 0 C 6 46 4 76 -2 104`} stroke={barkD} strokeWidth={4} fill="none" strokeLinecap="round" />
          <g className="v3-sway-slow" style={{ transformOrigin: '0px 104px' }}>
            <ellipse cx={-34} cy={128} rx={40} ry={26} fill={leafD} />
            <ellipse cx={30} cy={136} rx={36} ry={24} fill={leaf} />
            <ellipse cx={-2} cy={158} rx={30} ry={20} fill={leafL} opacity={0.85} />
          </g>
        </g>
      ))}

      {/* 右边的主干：把横枝连到树上，画面才不像悬空的木板 */}
      <g>
        <path d="M 1296 840 C 1300 640 1314 430 1336 200 L 1452 208 C 1428 440 1414 650 1416 844 Z" fill={bark} />
        <g stroke={barkD} strokeWidth={3} fill="none" opacity={0.5}>
          <path d="M 1330 820 C 1336 620 1346 430 1360 280" />
          <path d="M 1392 824 C 1396 610 1404 450 1414 300" />
        </g>
        <ellipse cx={1378} cy={846} rx={62} ry={16} fill={barkD} opacity={0.35} />
      </g>

      {/* 主枝：横着的那根，就是这里的地面 */}
      <g>
        {/* 枝下的暗影 */}
        <path
          d={`M ${x0} 846 C ${x0 + w * 0.24} 824, ${x0 + w * 0.46} 840, ${x0 + w * 0.66} 820 C ${x0 + w * 0.84} 802, ${x0 + w * 0.94} 820, ${x0 + w} 810 L ${x0 + w} 2400 L ${x0} 2400 Z`}
          fill={night ? '#20321f' : '#2f4a35'}
          opacity={0.45}
        />
        <path
          d={`M ${x0} 796 C ${x0 + w * 0.22} 766, ${x0 + w * 0.44} 786, ${x0 + w * 0.64} 768 C ${x0 + w * 0.82} 752, ${x0 + w * 0.94} 770, ${x0 + w} 762 L ${x0 + w} 862 C ${x0 + w * 0.92} 872, ${x0 + w * 0.8} 850, ${x0 + w * 0.6} 864 C ${x0 + w * 0.4} 878, ${x0 + w * 0.18} 852, ${x0} 876 Z`}
          fill={bark}
        />
        {/* 枝上表面：一条亮边，显出树皮是圆的 */}
        <path
          d={`M ${x0} 796 C ${x0 + w * 0.22} 766, ${x0 + w * 0.44} 786, ${x0 + w * 0.64} 768 C ${x0 + w * 0.82} 752, ${x0 + w * 0.94} 770, ${x0 + w} 762`}
          fill="none"
          stroke={leafL}
          strokeWidth={7}
          opacity={0.55}
          strokeLinecap="round"
        />
        {/* 树皮纹 */}
        <g stroke={barkD} strokeWidth={2.4} fill="none" opacity={0.5} strokeLinecap="round">
          {Array.from({ length: 14 }, (_, i) => {
            const x = x0 + 40 + i * (w / 14);
            const base = 782 + Math.sin(i * 0.9) * 10;
            return <path key={i} d={`M ${x} ${base} C ${x + 20} ${base + 12}, ${x + 8} ${base + 26}, ${x + 26} ${base + 40}`} />;
          })}
        </g>
        {/* 枝上垂下去的小叶簇 */}
        {[240, 520, 860, 1120].map((x, i) => (
          <g key={i} transform={`translate(${x0 + x} 806)`} opacity={0.9}>
            <g className="v3-sway-slow" style={{ transformOrigin: '0px 0px' }}>
              <ellipse cx={-22} cy={28} rx={28} ry={18} fill={leafD} />
              <ellipse cx={18} cy={34} rx={24} ry={16} fill={leaf} />
            </g>
          </g>
        ))}
      </g>

      {/* 枝上散落的叶子 */}
      {[
        [470, 782, 1],
        [640, 792, 0.85],
        [1140, 786, 0.9],
        [1420, 794, 0.8],
      ].map(([x, y, s], i) => (
        <path
          key={i}
          transform={`translate(${x} ${y}) scale(${s})`}
          d="M -18 0 C -22 -14 -2 -22 12 -16 C 16 -4 2 6 -18 0 Z"
          fill={i % 2 ? leaf : leafD}
          stroke="rgba(109,90,74,0.28)"
          strokeWidth={1.4}
        />
      ))}

      {/* 前景：下方一片深色叶影，把画面底边收住 */}
      <g pointerEvents="none">
        <path
          d={`M ${x0} 908 C ${x0 + w * 0.2} 886, ${x0 + w * 0.42} 914, ${x0 + w * 0.62} 896 C ${x0 + w * 0.82} 880, ${x0 + w * 0.94} 904, ${x0 + w} 894 L ${x0 + w} 2400 L ${x0} 2400 Z`}
          fill={night ? '#2f4a35' : '#3f6b46'}
          opacity={0.95}
        />
        {[
          [0.06, 900, 1.6],
          [0.24, 916, 1.9],
          [0.44, 904, 1.7],
          [0.64, 920, 2],
          [0.84, 906, 1.8],
          [0.96, 918, 1.6],
        ].map(([f, yy, s], i) => (
          <g key={i} transform={`translate(${x0 + w * f} ${yy}) scale(${s})`} opacity={0.95}>
            {/* 尖叶而不是圆团：圆团会读成灌木 */}
            {[
              [0, 0, -1],
              [-34, 14, -0.8],
              [32, 16, 1],
            ].map(([dx, dy, dir], j) => (
              <path
                key={j}
                transform={`translate(${dx} ${dy}) scale(${dir} 1)`}
                d="M 0 0 C 18 -30 54 -44 78 -40 C 62 -14 32 6 0 0 Z"
                fill={j === 1 ? (night ? '#2a4230' : '#355c3c') : night ? '#2f4a35' : '#3f6b46'}
              />
            ))}
          </g>
        ))}
      </g>
    </g>
  );
}
