import { Bush, ChimeRow, Clouds, FlowerProp, Ground, Hills, Reeds, Rock, Sky, Sun, Tree, Tuft, type SceneProps } from '../art';
import { chimeFor } from '../hotspots';
import { C } from '../../theme';

/**
 * 森林
 *
 * 图层顺序（必须从远到近）：天空 → 远山与远处林线 → 中景大树 → 地面
 * → 泥地/树桩等地面细节 → 小溪与水潭 → 木桥 → 前景草。
 * 水一定要画在地面之后、桥之前，否则会读成"沙洲"。
 *
 * 可交互的树/灌木/树桩/泥地不在这个文件里：它们是 hotspots.ts 里的热区，
 * 由 Stage 渲染在实体之下。
 */

/** 季节影响地面与远景的色温 */
function groundColors(season: SceneProps['season'], night: boolean) {
  // 四季的草地色。E 版统一走橄榄 / 燕麦的低饱和调子——原来的黄绿太"卡通绿"，
  // 一放进写着实树的画面里就露馅。
  if (night) return { near: '#4e5c42', far: '#42503a', edge: '#3a4634', hillFar: '#4a5348', hillMid: '#414a40' };
  switch (season) {
    case 'spring':
      return { near: '#9aa96e', far: '#a8b47f', edge: '#82905c', hillFar: '#b8bf99', hillMid: '#a8b189' };
    case 'autumn':
      return { near: '#b0a06a', far: '#bcae7c', edge: '#94875a', hillFar: '#c2b993', hillMid: '#b3aa85' };
    case 'winter':
      return { near: '#dfe6e2', far: '#e8ede9', edge: '#c6cfca', hillFar: '#e2e8e4', hillMid: '#d5ddd8' };
    default:
      return { near: C.grass, far: C.grassFar, edge: '#758252', hillFar: '#aeb988', hillMid: '#9caa77' };
  }
}

export function ForestScene({ view, phase, weather, season, night, eco }: SceneProps) {
  const x0 = view.x - 200;
  const w = view.w + 400;
  const g = groundColors(season, night);
  const chime = chimeFor('forest');

  /**
   * 小溪：上下两条岸线。
   * 弧度要比"看起来够了"再大一点——太缓会读成一块长方形水池。
   */
  // 水位：0.5 是常水位。水涨了岸线往上抬，孩子能直接看出来
  const lv = ((eco?.water ?? 0.5) - 0.5) * 34;
  const bankTop = 786 - lv;
  const bankBottom = 856;
  const wet = eco?.soil ?? 0.45;
  const topEdge = `M ${x0} ${bankTop} C ${x0 + w * 0.14} ${bankTop - 16}, ${x0 + w * 0.3} ${bankTop + 20}, ${x0 + w * 0.47} ${bankTop - 2} C ${x0 + w * 0.63} ${bankTop - 26}, ${x0 + w * 0.79} ${bankTop + 16}, ${x0 + w} ${bankTop - 8}`;
  const bottomCurve = `C ${x0 + w * 0.82} ${bankBottom + 18}, ${x0 + w * 0.64} ${bankBottom - 16}, ${x0 + w * 0.44} ${bankBottom + 8} C ${x0 + w * 0.26} ${bankBottom + 26}, ${x0 + w * 0.12} ${bankBottom - 12}, ${x0} ${bankBottom + 10}`;
  /** 闭合用（接在上岸线后面） */
  const bottomEdge = `L ${x0 + w} ${bankBottom} ${bottomCurve}`;
  /** 单独画线时用（必须有 moveto） */
  const bottomLine = `M ${x0 + w} ${bankBottom} ${bottomCurve}`;

  return (
    <g>
      <Sky view={view} phase={phase} weather={weather} />
      <Sun view={view} phase={phase} weather={weather} />
      <Clouds view={view} phase={phase} weather={weather} />
      <Hills view={view} horizon={600} far={g.hillFar} mid={g.hillMid} />

      <Ground view={view} top={646} near={g.near} far={g.far} edge={g.edge} />

      {/* 地平线附近压一层暗，草地才有"往远处退"的感觉 */}
      <defs>
        <linearGradient id="forestDepth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4f7a4a" stopOpacity={night ? 0.28 : 0.32} />
          <stop offset="42%" stopColor="#4f7a4a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x={x0} y={640} width={w} height={150} fill="url(#forestDepth)" pointerEvents="none" />

      {/* 远处的林线：贴着地平线，两三个圆叠成树冠，比一排三角自然 */}
      <g opacity={night ? 0.24 : 0.5} pointerEvents="none">
        {[
          [70, 40], [120, 52], [168, 36], [214, 46], [268, 34], [316, 44],
          [530, 38], [578, 50], [626, 34], [678, 44], [730, 32],
          [910, 40], [958, 54], [1006, 36], [1054, 44],
          [1270, 38], [1318, 50], [1366, 34], [1414, 46], [1468, 36], [1526, 48],
        ].map(([cx, h], i) => {
          const x = x0 + cx;
          const green = season === 'autumn' ? '#c9ae7c' : season === 'winter' ? '#c9d6d5' : '#a8cd97';
          return (
            <g key={i}>
              <ellipse cx={x - h * 0.28} cy={658 - h * 0.42} rx={h * 0.34} ry={h * 0.4} fill={green} />
              <ellipse cx={x + h * 0.26} cy={658 - h * 0.46} rx={h * 0.32} ry={h * 0.42} fill={green} />
              <ellipse cx={x} cy={658 - h * 0.68} rx={h * 0.4} ry={h * 0.42} fill={green} />
              <rect x={x - h * 0.05} y={658 - h * 0.3} width={h * 0.1} height={h * 0.32} fill={season === 'winter' ? '#b9c4c2' : '#96774f'} opacity={0.7} />
            </g>
          );
        })}
      </g>

      {/* 草地上的明暗斑块，让一大片绿不至于是一块色板。冬天变成雪块之间的浅色洼地 */}
      <g pointerEvents="none" opacity={night ? 0.12 : 0.2}>
        {[
          [260, 700, 120, 34],
          [700, 690, 150, 30],
          [1080, 700, 130, 32],
          [1400, 690, 110, 26],
          [500, 752, 100, 24],
          [1250, 752, 90, 22],
        ].map(([x, y, rx, ry], i) => (
          <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} fill={season === 'winter' ? '#d6dee0' : i % 2 ? '#7fae6e' : '#c2e0a4'} />
        ))}
      </g>

      {/* 冬天：地上散落的积雪斑块。雪压在地面低处，露出一点草地边 */}
      {season === 'winter' && (
        <g pointerEvents="none" opacity={night ? 0.5 : 0.85}>
          {[
            [240, 700, 150, 30],
            [760, 700, 200, 40],
            [1240, 700, 170, 34],
            [480, 764, 130, 26],
            [1080, 762, 150, 28],
            [1420, 760, 100, 22],
            [900, 780, 110, 20],
            [360, 726, 90, 18],
          ].map(([x, y, rx, ry], i) => (
            <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} fill="#eef4f6" />
          ))}
        </g>
      )}

      {/* 秋天：林间散落的落叶，几片几片堆着，不是均匀铺满 */}
      {season === 'autumn' && (
        <g pointerEvents="none" opacity={night ? 0.6 : 0.85}>
          {[
            [300, 706], [340, 712], [620, 726], [660, 718], [920, 706],
            [1180, 720], [1300, 706], [1500, 716], [420, 756], [820, 754],
            [1100, 744], [1440, 750], [540, 742], [980, 730], [70, 748],
          ].map(([x, y], i) => (
            <path
              key={i}
              transform={`translate(${x} ${y}) scale(${0.8 + (i % 3) * 0.2}) rotate(${i * 31 % 60 - 30})`}
              d="M -8 0 C -11 -7 -2 -11 5 -8 C 8 -2 3 4 -8 0 Z"
              fill={i % 3 === 0 ? '#c9853f' : i % 3 === 1 ? '#b07b42' : '#d09a5c'}
              stroke="rgba(109,90,74,0.3)"
              strokeWidth={1}
            />
          ))}
        </g>
      )}

      {/* 中景五棵树：中间留出空地给孩子活动 */}
      <Tree x={232} y={666} s={0.86} kind="oak" season={season} night={night} />
      <Tree x={470} y={690} s={1.95} kind="oak" season={season} night={night} />
      <Tree x={1030} y={658} s={0.74} kind="pine" season={season} night={night} />
      <Tree x={1226} y={676} s={0.92} kind="willow" season={season} night={night} />
      <Tree x={1452} y={662} s={0.86} kind="birch" season={season} night={night} />

      {/*
        树洞不在这里画：入口是 regions 里的 treehole 实体，精灵自己会画洞口。
        之前场景里也手绘了一个，两个洞只差几十像素，看着像树干上长了两只眼睛。
      */}

      {/* 灌木 */}
      <Bush x={600} y={716} s={0.95} color={season === 'winter' ? '#c9d4d0' : night ? '#6f9a68' : C.leaf} />
      <Bush x={900} y={724} s={0.8} color={season === 'winter' ? '#d5dedb' : night ? '#6f9a68' : C.leafLight} />
      <Bush x={1330} y={722} s={0.85} color={season === 'winter' ? '#c9d4d0' : night ? '#6f9a68' : C.leaf} />

      {/* 一片松软的泥土地：可以挖，可以种 */}
      <g>
        <ellipse cx={782} cy={734} rx={64} ry={23} fill="#a8845c" opacity={0.55} />
        <ellipse
          cx={782}
          cy={732}
          rx={49}
          ry={16}
          fill={wet > 0.62 ? '#6b4f33' : wet > 0.4 ? '#8a6a47' : '#96754f'}
          opacity={0.5 + wet * 0.35}
        />
        <path d="M 748 730 C 762 726 776 728 786 725 M 780 738 C 792 735 802 734 812 736" stroke="#7d5f3f" strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.6} />
        <ellipse cx={782} cy={732} rx={13} ry={4.6} fill="#6d5336" opacity={0.5} />
      </g>

      {/* 树桩 */}
      <g transform="translate(890 700)">
        <path d="M -22 0 L -20 -20 L 20 -20 L 22 0 Z" fill="#a8814f" stroke="rgba(109,90,74,0.4)" strokeWidth={1.8} />
        <ellipse cx={0} cy={-20} rx={21} ry={8} fill="#c9a06a" stroke="rgba(109,90,74,0.4)" strokeWidth={1.8} />
        <ellipse cx={0} cy={-20} rx={12} ry={4.4} fill="none" stroke="#a8814f" strokeWidth={1.4} />
        <ellipse cx={0} cy={-20} rx={5} ry={1.8} fill="#a8814f" />
      </g>

      {/* 花草点缀 */}
      {[
        [560, 706, C.petalPink],
        [612, 722, C.petalYellow],
        [680, 712, C.petalPurple],
        [880, 712, C.petalPink],
        [990, 730, C.petalYellow],
        [1122, 718, C.petalPurple],
        [1300, 754, C.petalPink],
        [402, 748, C.petalYellow],
        [1236, 700, C.petalPurple],
      ].map(([x, y, col], i) => (
        <FlowerProp key={i} x={x as number} y={y as number} s={1.2} color={col as string} />
      ))}

      {[
        [400, 722],
        [720, 670],
        [958, 706],
        [1300, 674],
        [860, 730],
        [1080, 696],
        [520, 762],
        [1160, 756],
      ].map(([x, y], i) => (
        <Tuft key={i} x={x} y={y} s={1 + (i % 3) * 0.22} color={season === 'winter' ? '#cdd7d4' : season === 'autumn' ? '#b5b06a' : '#5f8f56'} />
      ))}

      <Rock x={1300} y={706} s={0.55} />
      <Rock x={1180} y={748} s={0.4} />

      {/* ── 小溪 + 水潭 ── */}
      <g>
        {/* 河岸的泥土边（先画，被水面压住一半） */}
        <path d={`${topEdge} ${bottomEdge} Z`} fill="none" stroke="#9d8a63" strokeWidth={16} opacity={0.5} />
        <path d={`${topEdge} ${bottomEdge} Z`} fill={C.waterTop} />
        {/* 上缘的一道反光 */}
        <path d={topEdge} fill="none" stroke={C.waterLight} strokeWidth={4} opacity={0.8} strokeLinecap="round" />
        {/* 水潭：河面在这里宽出去一块 */}
        <ellipse cx={982} cy={826} rx={124} ry={36} fill={C.waterTop} />
        <ellipse cx={982} cy={832} rx={106} ry={25} fill={C.waterBottom} opacity={0.36} />
        {/* 深处偏暗，避免看起来像充气泳池 */}
        <path
          d={`M ${x0} 818 C ${x0 + w * 0.24} 810, ${x0 + w * 0.44} 824, ${x0 + w * 0.62} 814 C ${x0 + w * 0.8} 804, ${x0 + w * 0.92} 820, ${x0 + w} 812`}
          fill="none"
          stroke={C.waterBottom}
          strokeWidth={34}
          opacity={0.2}
          strokeLinecap="round"
        />
        {/* 近岸的暗边：水是有深度的 */}
        <path d={bottomLine} fill="none" stroke="#5f9db8" strokeWidth={7} opacity={0.22} strokeLinecap="round" />
        {/*
          水纹分两层：先铺三条长的反光带（水面的"亮面"），再撒十几条碎波。
          只画碎波的话，水面会像一块蓝布上印了几道白线。
        */}
        <g opacity={0.5}>
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={`M ${140 + i * 430} ${798 + i * 18} q 190 -9 380 0`}
              stroke="#eaf8ff"
              strokeWidth={6 - i * 1.4}
              fill="none"
              opacity={0.34 - i * 0.07}
              strokeLinecap="round"
            />
          ))}
        </g>
        {[
          [300, 812, 40], [700, 830, 54], [960, 806, 46], [1330, 842, 40],
          [520, 846, 34], [150, 838, 30], [420, 800, 26], [820, 812, 30],
          [1100, 830, 34], [1400, 802, 26], [240, 856, 30], [640, 858, 26],
          [980, 848, 32], [1260, 820, 24],
        ].map(([x, y, len], i) => (
          <path
            key={i}
            d={`M ${x} ${y} q ${len / 2} -6 ${len} 0`}
            stroke="#ffffff"
            strokeWidth={i % 3 === 0 ? 2.8 : 2}
            fill="none"
            opacity={i % 3 === 0 ? 0.5 : 0.32}
            strokeLinecap="round"
          />
        ))}
        {/* 睡莲叶 */}
        {[
          [932, 816, 1.15],
          [1024, 834, 0.95],
          [894, 838, 0.8],
        ].map(([x, y, s], i) => (
          <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
            <ellipse cx={0} cy={0} rx={17} ry={6.4} fill="#8fbf78" opacity={0.92} />
            <path d="M 0 0 L 12 -3" stroke="#a8dcef" strokeWidth={2} strokeLinecap="round" />
            <ellipse cx={-4} cy={-1} rx={6} ry={2} fill="#b9dda0" opacity={0.8} />
          </g>
        ))}
        {/* 岸边：芦苇与石头。冬天芦苇枯黄，秋天也带点枯色 */}
        <Reeds x={236} y={782} s={1.2} color={night ? '#6f9a68' : season === 'winter' ? '#c9c0a0' : season === 'autumn' ? '#b8a878' : '#7fae6e'} />
        <Reeds x={1246} y={780} s={1} color={night ? '#6f9a68' : season === 'winter' ? '#d0c8aa' : season === 'autumn' ? '#c0b080' : '#88b878'} />
        <Reeds x={1512} y={854} s={1.25} color={night ? '#6f9a68' : season === 'winter' ? '#c9c0a0' : season === 'autumn' ? '#b8a878' : '#7fae6e'} />
        <Reeds x={86} y={858} s={1.1} color={night ? '#6f9a68' : season === 'winter' ? '#d0c8aa' : season === 'autumn' ? '#c0b080' : '#88b878'} />
        {[
          [420, 784, 0.5],
          [1140, 782, 0.44],
          [1400, 788, 0.38],
          [640, 860, 0.52],
          [1330, 864, 0.44],
        ].map(([x, y, s], i) => (
          <Rock key={i} x={x} y={y} s={s} />
        ))}
      </g>

      {/* ── 小木桥：从近岸跨到远岸 ── */}
      <g>
        <path d="M 1152 768 L 1244 768 L 1272 878 L 1124 878 Z" fill="#5c7a63" opacity={0.14} />
        <path d="M 1152 764 L 1244 764 L 1270 874 L 1122 874 Z" fill="#c9a06a" stroke="rgba(109,90,74,0.35)" strokeWidth={1.8} />
        {/* 桥板 */}
        {Array.from({ length: 9 }, (_, i) => {
          const t = i / 8;
          const yTop = 766 + t * 106;
          const xL = 1152 - t * 30;
          const xR = 1244 + t * 26;
          return <path key={i} d={`M ${xL} ${yTop} L ${xR} ${yTop}`} stroke="#a8814f" strokeWidth={1.8} opacity={0.6} />;
        })}
        {/* 两侧栏杆 */}
        <path d="M 1148 760 L 1118 870" stroke="#b98b62" strokeWidth={4.2} strokeLinecap="round" />
        <path d="M 1248 760 L 1274 870" stroke="#b98b62" strokeWidth={4.2} strokeLinecap="round" />
        {[
          [1148, 760],
          [1248, 760],
          [1118, 870],
          [1274, 870],
        ].map(([x, y], i) => (
          <path key={i} d={`M ${x} ${y} L ${x} ${y - 24}`} stroke="#a8814f" strokeWidth={4} strokeLinecap="round" />
        ))}
        <path d="M 1148 736 L 1118 846" stroke="#c9a06a" strokeWidth={3.2} strokeLinecap="round" />
        <path d="M 1248 736 L 1274 846" stroke="#c9a06a" strokeWidth={3.2} strokeLinecap="round" />
      </g>

      {/* ── 溪边那排会响的石头：画在水之后，看着才像"岸上摆的" ── */}
      {chime && (
        <g pointerEvents="none">
          <ChimeRow set={chime} night={night} />
        </g>
      )}

      {/* ── 前景：镜头这一侧的小路与草坡 ── */}
      <g pointerEvents="none">
        {/* 沿河的一条土路：从画面左下蜿蜒到右下，把空着的下半屏填起来 */}
        <path
          d={`M ${x0} 930 C ${x0 + w * 0.18} 908, ${x0 + w * 0.34} 940, ${x0 + w * 0.5} 924 C ${x0 + w * 0.66} 908, ${x0 + w * 0.82} 938, ${x0 + w} 922 L ${x0 + w} 972 C ${x0 + w * 0.82} 986, ${x0 + w * 0.66} 956, ${x0 + w * 0.5} 972 C ${x0 + w * 0.34} 988, ${x0 + w * 0.18} 956, ${x0} 980 Z`}
          fill={night ? '#7a6242' : '#d2b78c'}
          opacity={night ? 0.5 : 0.85}
        />
        <path
          d={`M ${x0} 936 C ${x0 + w * 0.18} 914, ${x0 + w * 0.34} 946, ${x0 + w * 0.5} 930 C ${x0 + w * 0.66} 914, ${x0 + w * 0.82} 944, ${x0 + w} 928`}
          fill="none"
          stroke={night ? '#6b5539' : '#c0a377'}
          strokeWidth={2}
          opacity={0.5}
        />
        {/* 路边的小石子 */}
        {[
          [0.12, 946],
          [0.28, 934],
          [0.44, 950],
          [0.6, 936],
          [0.74, 952],
          [0.88, 938],
        ].map(([f, yy], i) => (
          <ellipse key={i} cx={x0 + w * f} cy={yy} rx={5 + (i % 3)} ry={3 + (i % 2)} fill="#b8a68a" opacity={0.8} />
        ))}

        {/* 前景的草坡：压住画面底边 */}
        <path
          d={`M ${x0} ${view.y + view.h + 60} L ${x0} 1000 C ${x0 + w * 0.16} 986, ${x0 + w * 0.32} 1008, ${x0 + w * 0.5} 994 C ${x0 + w * 0.68} 980, ${x0 + w * 0.84} 1006, ${x0 + w} 992 L ${x0 + w} ${view.y + view.h + 60} Z`}
          fill={night ? '#4a7150' : season === 'winter' ? '#dbe3df' : season === 'autumn' ? '#b7ae7a' : '#6c9c5d'}
          opacity={night ? 0.6 : 0.85}
        />
        {[
          [0.02, 992, 2],
          [0.1, 1004, 2.4],
          [0.24, 996, 2.1],
          [0.4, 1008, 2.5],
          [0.56, 998, 2.2],
          [0.72, 1006, 2.5],
          [0.86, 996, 2.1],
          [0.97, 1002, 2.3],
        ].map(([f, yy, sc], i) => (
          <Tuft key={i} x={x0 + w * f} y={yy} s={sc} color={night ? '#3f6349' : season === 'winter' ? '#c2cdc9' : season === 'autumn' ? '#a8a269' : '#54864a'} />
        ))}
        <Rock x={x0 + w * 0.34} y={1010} s={1.4} />
        <Rock x={x0 + w * 0.9} y={1004} s={1.1} />
      </g>
    </g>
  );
}
