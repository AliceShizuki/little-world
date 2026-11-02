import { ChimeRow, Clouds, Hills, Lighthouse, Rock, Sky, Sun, type SceneProps } from '../art';
import { chimeFor } from '../hotspots';
import { C } from '../../theme';

/**
 * 海边：海在远处、沙滩在近处。
 *
 * 分层顺序很重要：海必须先画（在沙滩后面），沙滩从水线一直铺到画面底部，
 * 否则会出现"沙子夹在两层水之间"的怪相。
 * 水线定在 shore=700，与 regions.ts 里的 WATER 区间（590–698）对齐。
 */
export function SeasideScene({ view, phase, weather, season, night, eco }: SceneProps) {
  const x0 = view.x - 200;
  const w = view.w + 400;
  // 水线跟着潮汐上下：平潮 700，涨潮抬到 665 左右，退潮退到 735
  const tideY = ((eco?.tide ?? 0.5) - 0.5) * 70;
  const shore = 700 - tideY;
  const chime = chimeFor('seaside');

  // 海边季节变化克制：冬天沙滩与海都偏冷灰一点，秋天沙滩略暖。海本身的蓝四季都在。
  const sand = season === 'winter' ? '#d8cdb4' : C.sand;
  const sandWet = season === 'winter' ? '#cbbd9f' : '#e3cca0';

  /** 沙滩上缘的曲线（水线） */
  // 起伏要比"看起来是一条直线"更大一点：±16 上下，比之前的 ±8 明显
  const shoreCurve = (dy: number) =>
    `M ${x0} ${shore + dy + 4} C ${x0 + w * 0.16} ${shore + dy + 26}, ${x0 + w * 0.32} ${shore + dy - 14}, ${x0 + w * 0.5} ${shore + dy + 6} C ${x0 + w * 0.68} ${shore + dy + 26}, ${x0 + w * 0.86} ${shore + dy - 12}, ${x0 + w} ${shore + dy + 12}`;

  return (
    <g>
      <Sky view={view} phase={phase} weather={weather} />
      <Sun view={view} phase={phase} weather={weather} />
      <Clouds view={view} phase={phase} weather={weather} />
      <Hills view={view} horizon={520} far="#dfe9ec" mid="#cddadd" />

      {/* 海：从远处的地平线铺到水线 */}
      <g>
        <defs>
          <linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={night ? '#3d5f80' : '#8cc8e2'} />
            <stop offset="70%" stopColor={night ? '#45708f' : '#a8dcef'} />
            <stop offset="100%" stopColor={night ? '#4f7d9b' : '#c3e8f4'} />
          </linearGradient>
        </defs>
        {/*
          海面往下多铺 30：沙滩的上缘是一条起伏的曲线，比水线的最高点还要高一点。
          如果海只铺到 shore+2，就会在沙滩上方露出一条笔直的水边，
          看起来像泳池的池壁（这条直线真的出现过）。
        */}
        <rect x={x0} y={506} width={w} height={shore - 506 + 30} fill="url(#seaGrad)" />
        {/* 远处的水平线，让海与天分开 */}
        <path d={`M ${x0} 512 L ${x0 + w} 512`} stroke="#ffffff" strokeWidth={2} opacity={0.45} />

        {/* 浪线：越靠近岸边越密。整组跟着潮位上下，涨潮时浪会压到沙子上 */}
        {[0, 1, 2, 3].map((i) => (
          <path
            key={i}
            d={`M ${x0 + w * (0.04 + i * 0.05)} ${578 + i * 26 - tideY * 0.55} C ${x0 + w * 0.3} ${572 + i * 26 - tideY * 0.55}, ${x0 + w * 0.42} ${584 + i * 26 - tideY * 0.55}, ${x0 + w * 0.58} ${576 + i * 26 - tideY * 0.55}`}
            stroke="#ffffff"
            strokeWidth={2.6 - i * 0.3}
            fill="none"
            opacity={0.34 - i * 0.05}
            strokeLinecap="round"
          />
        ))}
        {[0, 1, 2].map((i) => (
          <path
            key={`r${i}`}
            d={`M ${x0 + w * (0.52 + i * 0.06)} ${600 + i * 26 - tideY * 0.8} C ${x0 + w * 0.72} ${594 + i * 26 - tideY * 0.8}, ${x0 + w * 0.84} ${608 + i * 26 - tideY * 0.8}, ${x0 + w * 0.98} ${598 + i * 26 - tideY * 0.8}`}
            stroke="#ffffff"
            strokeWidth={2.4 - i * 0.3}
            fill="none"
            opacity={0.3 - i * 0.05}
            strokeLinecap="round"
          />
        ))}
      </g>

      {/* 沙滩：从水线一直铺到画面底部（近处） */}
      <g>
        <path
          d={`${shoreCurve(0)} L ${x0 + w} 1200 L ${x0} 1200 Z`}
          fill={sand}
        />
        {/* 湿沙：贴着水的那一条更深 */}
        <path d={`${shoreCurve(0)} L ${x0 + w} ${shore + 34} C ${x0 + w * 0.84} ${shore + 18}, ${x0 + w * 0.66} ${shore + 40}, ${x0 + w * 0.48} ${shore + 26} C ${x0 + w * 0.3} ${shore + 12}, ${x0 + w * 0.16} ${shore + 40}, ${x0} ${shore + 28} Z`} fill={sandWet} opacity={0.9} />
        {/* 沙面的两层色带：远处偏冷、近处偏暖，平地才有纵深 */}
        <path d={`${shoreCurve(58)} L ${x0 + w} 1200 L ${x0} 1200 Z`} fill="rgba(130,104,68,0.055)" />
        <path d={`${shoreCurve(168)} L ${x0 + w} 1200 L ${x0} 1200 Z`} fill="rgba(130,104,68,0.045)" />
        {/* 浪花：压在沙与水之间 */}
        {/*
          滩头泡沫：水与沙的交界是碎的。
          原来是一条实线，看着像泳池的池壁——改成断续的三层，才有浪打上来的感觉。
        */}
        <path d={shoreCurve(0)} stroke="#ffffff" strokeWidth={7} fill="none" opacity={0.82} strokeLinecap="round" strokeDasharray="30 12 44 10" />
        <path d={shoreCurve(9)} stroke="#ffffff" strokeWidth={3.4} fill="none" opacity={0.45} strokeLinecap="round" strokeDasharray="18 16 26 12" />
        <path d={shoreCurve(17)} stroke="#ffffff" strokeWidth={2.4} fill="none" opacity={0.3} strokeLinecap="round" strokeDasharray="12 22 20 14" />
        {/* 沙面上浅浅的纹路 */}
        <g stroke={C.sandDark} strokeWidth={2.2} opacity={0.35} strokeLinecap="round" fill="none">
          {[
            [520, 770, 46],
            [700, 812, 58],
            [980, 780, 40],
            [1180, 826, 52],
            [380, 838, 44],
          ].map(([x, y, len], i) => (
            <path key={i} d={`M ${x} ${y} q ${len / 2} 6 ${len} 0`} />
          ))}
        </g>
      </g>

      {/* 礁石 */}
      <g>
        <path d="M 1160 772 C 1150 706 1226 696 1252 730 C 1272 754 1260 772 1252 772 Z" fill="#a8a49b" stroke="rgba(109,90,74,0.3)" strokeWidth={2} />
        <path d="M 1238 776 C 1248 736 1306 732 1320 760 C 1328 776 1320 776 1316 776 Z" fill="#b9b5ab" stroke="rgba(109,90,74,0.3)" strokeWidth={2} />
      </g>
      <Rock x={150} y={806} s={1.1} />
      <Rock x={212} y={828} s={0.8} />

      <Lighthouse x={1462} y={776} s={1} lit={night} />

      {/* 栈桥：从沙滩斜着伸进海里 */}
      <g>
        <path d="M 232 722 L 468 640 L 476 652 L 240 736 Z" fill="#c9a06a" stroke="rgba(109,90,74,0.28)" strokeWidth={1.6} />
        <path d="M 232 722 L 468 640" stroke="#e2c69a" strokeWidth={2} opacity={0.75} />
        {[
          [252, 724, 34],
          [312, 702, 40],
          [372, 680, 44],
          [428, 660, 48],
        ].map(([x, y, len], i) => (
          <rect key={i} x={x} y={y} width={6.5} height={len} fill="#a8814f" opacity={0.9} />
        ))}
      </g>

      {/* 沙滩上的小碎石 */}
      <g fill={C.sandDark} opacity={0.5}>
        {[
          [560, 736],
          [612, 752],
          [880, 742],
          [1020, 758],
          [430, 764],
          [760, 728],
        ].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx={3} ry={1.8} />
        ))}
      </g>

      {/* 前景：贴底的沙丘草与贝壳，避免下半屏空荡 */}
      <g pointerEvents="none">
        <path
          d={`M ${x0} 1180 L ${x0} 968 C ${x0 + w * 0.22} 946, ${x0 + w * 0.46} 978, ${x0 + w * 0.7} 956 C ${x0 + w * 0.86} 942, ${x0 + w * 0.94} 966, ${x0 + w} 958 L ${x0 + w} 1180 Z`}
          fill="#e8d3a8"
          opacity={0.85}
        />
        {[
          [0.12, 972, 1.5],
          [0.19, 986, 1.9],
          [0.47, 962, 1.6],
          [0.72, 958, 1.5],
          [0.9, 970, 1.8],
        ].map(([f, y, sc], i) => (
          <g key={i} transform={`translate(${x0 + w * f} ${y}) scale(${sc})`} opacity={0.75}>
            <path d="M 0 0 C -6 -22 -14 -34 -20 -42" stroke="#a9bd8c" strokeWidth={5} fill="none" strokeLinecap="round" />
            <path d="M 5 0 C 4 -26 7 -40 11 -50" stroke="#a9bd8c" strokeWidth={5.4} fill="none" strokeLinecap="round" />
            <path d="M 14 0 C 19 -20 26 -30 33 -38" stroke="#a9bd8c" strokeWidth={5} fill="none" strokeLinecap="round" />
          </g>
        ))}
        {[
          [0.33, 992],
          [0.58, 1006],
          [0.8, 986],
        ].map(([f, y], i) => (
          <ellipse key={`sh${i}`} cx={x0 + w * f} cy={y} rx={13} ry={9} fill="#f6d9c4" stroke="rgba(109,90,74,0.2)" strokeWidth={1.4} />
        ))}
      </g>

      {weather !== 'rain' && (
        <circle
          cx={view.x + view.w * 0.84}
          cy={view.y + view.h * 0.18}
          r={64}
          fill="#fff3c4"
          opacity={night ? 0.12 : 0.3}
          filter="url(#softBlur)"
        />
      )}

      {/* 沙滩上那排会响的贝壳：潮水冲上来以后就没再带走 */}
      {chime && (
        <g pointerEvents="none">
          <ChimeRow set={chime} night={night} />
        </g>
      )}
    </g>
  );
}
