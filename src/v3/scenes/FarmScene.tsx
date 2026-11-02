import { Barn, Bush, Clouds, FlowerProp, Ground, Hills, Sky, Sun, Tree, Tuft, type SceneProps } from '../art';
import { C } from '../../theme';

/**
 * 农场：一块块田地、谷仓、风车，还有永远在转的取水风车。
 *
 * 两处跟着世界状态走：
 *  - 垄沟的颜色随土壤湿度变（浇过水的土是深褐色的，晒干的土发白）；
 *  - 风车的转速随风力变（没风的时候它会慢到几乎停住，孩子会去等风）。
 */
export function FarmScene({ view, phase, weather, season, night, eco }: SceneProps) {
  const wet = eco?.soil ?? 0.52;
  const wind = eco?.wind ?? 0.15;
  /** 土越湿颜色越深：这是"浇水有没有用"最直接的证据 */
  const soilColor = wet > 0.66 ? '#7a5b3c' : wet > 0.48 ? '#a8845c' : '#c2a67e';
  return (
    <g>
      <Sky view={view} phase={phase} weather={weather} />
      <Sun view={view} phase={phase} weather={weather} />
      <Clouds view={view} phase={phase} weather={weather} />
      <Hills view={view} horizon={620} far={season === 'winter' ? '#e2e8e4' : '#d3e0bd'} mid={season === 'winter' ? '#d5ddd8' : '#c0d7a6'} />
      <Ground view={view} top={660} near={season === 'winter' ? '#dfe6e2' : season === 'autumn' ? '#c6c99a' : '#a9d095'} far={season === 'winter' ? '#e8ede9' : season === 'autumn' ? '#d2d5aa' : '#b7d8a4'} edge={season === 'winter' ? '#c6cfca' : '#8fbd7d'} />

      {/* 田边的稻草人：点它会掉草（见 hotspots 的 hs-farm-scarecrow） */}
      <g transform="translate(890 690) scale(0.82)" pointerEvents="none">
        {/* 杆与横木：粗一点才撑得住一件衣服 */}
        <path d="M -5 0 L -4 -104 L 4 -104 L 5 0 Z" fill="#a8814f" />
        <path d="M -38 -72 L 38 -72 L 38 -64 L -38 -64 Z" fill="#a8814f" />
        {/* 褂子：肩比腰宽，下摆散开 */}
        <path d="M -26 -98 L 26 -98 L 22 -54 L -22 -54 Z" fill="#e0d0aa" stroke="rgba(109,90,74,0.32)" strokeWidth={2} strokeLinejoin="round" />
        {/* 袖口散出来的草 */}
        <path d="M -38 -70 L -46 -62 M -36 -66 L -44 -54 M 38 -70 L 46 -62 M 36 -66 L 44 -54" stroke="#d8bd82" strokeWidth={3.6} strokeLinecap="round" />
        {/* 腰带 */}
        <path d="M -23 -60 L 23 -60" stroke="#c9a06a" strokeWidth={3} />
        <path d="M 0 -58 L 0 -48" stroke="#c9a06a" strokeWidth={2.4} strokeLinecap="round" />
        {/* 布头：直接坐在领口上，别留缝 */}
        <circle cx={0} cy={-110} r={14} fill="#f0e3c6" stroke="rgba(109,90,74,0.32)" strokeWidth={2} />
        <path d="M -7 -114 L -3 -109 M 3 -114 L 7 -109" stroke="#8a7256" strokeWidth={2} strokeLinecap="round" />
        <path d="M -4 -103 L 4 -103" stroke="#c9a06a" strokeWidth={2} strokeLinecap="round" />
        {/* 草帽：宽檐压低，戴在头上而不是浮在上面 */}
        <ellipse cx={0} cy={-121} rx={25} ry={6.5} fill="#e3c07a" stroke="rgba(109,90,74,0.35)" strokeWidth={2} />
        <path d="M -13 -121 Q 0 -135 13 -121 Z" fill="#edd39a" stroke="rgba(109,90,74,0.35)" strokeWidth={2} />
      </g>

      {/* 田地：一块块翻好的土，垄沟有明暗。冬天田里积了雪，土色被雪盖住 */}
      <g>
        {[0, 1, 2].map((r) => (
          <g key={r}>
            {[0, 1, 2, 3].map((c) => (
              <ellipse
                key={c}
                cx={560 + c * 92 + r * 14}
                cy={712 + r * 34}
                rx={42}
                ry={13}
                fill={night ? '#6d5a44' : season === 'winter' ? '#e6ecf0' : soilColor}
                opacity={(wet > 0.62 ? 0.6 : 0.4) - r * 0.06 + (season === 'winter' ? 0.3 : 0)}
              />
            ))}
          </g>
        ))}
      </g>

      {/* 秋天：田埂边落了一圈叶子，几片几片堆着 */}
      {season === 'autumn' && (
        <g pointerEvents="none" opacity={0.8}>
          {[
            [500, 700], [720, 716], [940, 700], [600, 730], [820, 730], [1050, 720], [660, 748], [880, 748],
          ].map(([x, y], i) => (
            <path
              key={i}
              transform={`translate(${x} ${y}) scale(${0.8 + (i % 3) * 0.2}) rotate(${i * 29 % 50 - 25})`}
              d="M -8 0 C -11 -7 -2 -11 5 -8 C 8 -2 3 4 -8 0 Z"
              fill={i % 2 ? '#c9853f' : '#b07b42'}
              stroke="rgba(109,90,74,0.3)"
              strokeWidth={1}
            />
          ))}
        </g>
      )}

      {/* 谷仓 + 筒仓 */}
      <Barn x={1240} y={690} s={0.9} />
      <g>
        <rect x={1378} y={566} width={50} height={124} rx={10} fill="#c9d3d8" stroke="rgba(109,90,74,0.35)" strokeWidth={2} />
        <path d="M 1378 566 C 1390 546 1416 546 1428 566 Z" fill="#aab8c9" />
        <path d="M 1378 600 L 1428 600 M 1378 642 L 1428 642" stroke="#b3c0c6" strokeWidth={2} />
      </g>

      {/* 风车 */}
      <g transform="translate(220 668)">
        <path d="M -12 0 L -8 -150 L 8 -150 L 12 0 Z" fill="#e8e2d2" stroke="rgba(109,90,74,0.35)" strokeWidth={2} />
        <path d="M -14 -146 L 0 -178 L 14 -146 Z" fill="#c9724f" />
        <g
          className="v3-spin-slow"
          style={{ transformOrigin: '0 -140px', animationDuration: `${Math.max(2.4, 11 - wind * 8)}s` }}
        >
          {[0, 90, 180, 270].map((a) => (
            <rect key={a} x={-3} y={-200} width={6} height={62} rx={3} fill="#f7ecd8" transform={`rotate(${a} 0 -140)`} />
          ))}
          <circle cx={0} cy={-140} r={6} fill="#b98b62" />
        </g>
      </g>

      {/* 栅栏 */}
      <g stroke="#d9b07a" strokeWidth={5} strokeLinecap="round">
        {[420, 470, 520, 570, 620].map((x) => (
          <path key={x} d={`M ${x} 700 L ${x} 668`} />
        ))}
        <path d="M 416 678 L 624 674 M 416 694 L 624 690" />
      </g>

      <Tree x={360} y={690} s={0.8} kind="oak" season={season} night={night} />
      <Tree x={1080} y={676} s={0.7} kind="birch" season={season} night={night} />
      <Bush x={1240} y={706} s={0.8} color={night ? '#6f9a68' : C.leafLight} />

      {[
        [940, 690, C.petalYellow],
        [980, 706, C.petalPink],
        [700, 690, C.petalPurple],
        [1340, 706, C.petalYellow],
      ].map(([x, y, col], i) => (
        <FlowerProp key={i} x={x as number} y={y as number} s={1} color={col as string} />
      ))}

      {[
        [480, 704],
        [660, 676],
        [1120, 700],
        [1400, 660],
        [860, 686],
      ].map(([x, y], i) => (
        <Tuft key={i} x={x} y={y} s={0.9 + (i % 3) * 0.18} color="#6aa05c" />
      ))}
      {/* 前景：贴底的一层草坡 */}
      <g pointerEvents="none">
        <path
          d={`M -400 924 C 100 900, 500 936, 900 918 C 1300 900, 1700 934, 2000 916 L 2000 1200 L -400 1200 Z`}
          fill="#94c07f"
          opacity={night ? 0.3 : 0.55}
        />
        {[
          [80, 930, 2.1],
          [420, 946, 2.5],
          [1100, 938, 2.2],
          [1520, 952, 2.6],
        ].map(([x, y, sc], i) => (
          <Tuft key={i} x={x} y={y} s={sc} color="#6b9c5f" />
        ))}
      </g>
    </g>
  );
}
