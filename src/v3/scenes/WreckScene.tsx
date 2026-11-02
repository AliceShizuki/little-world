import { ChimeRow, type SceneProps } from '../art';
import { chimeFor } from '../hotspots';

/**
 * 沉船内部：海底的里层空间
 *
 * 一艘侧躺着的旧木船。从这个角度看进去，船肋像一排拱门，
 * 光从船尾的破洞斜射进来，沙从裂缝里漫进船舱。
 *
 * 没有天空也没有天气（Stage 的 INDOOR 里包含了它），
 * 但水是通的：这里同样会冒气泡、也会有鱼游进来。
 */
export function WreckScene({ view, night }: SceneProps) {
  const x0 = view.x - 300;
  const w = view.w + 600;
  const top = view.y - 400;
  const floor = 800;
  const dark = night;
  const chime = chimeFor('wreck');
  const wood = dark ? '#3a2a1e' : '#6d4f32';
  const woodLit = dark ? '#4d3826' : '#8a6742';

  return (
    <g>
      <defs>
        <linearGradient id="wreckWater" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={dark ? '#0e2540' : '#1d4a68'} />
          <stop offset="55%" stopColor={dark ? '#123048' : '#255d7c'} />
          <stop offset="100%" stopColor={dark ? '#0a1d31' : '#1a3f57'} />
        </linearGradient>
        <linearGradient id="wreckHole" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#bfe4f2" stopOpacity={dark ? 0.3 : 0.55} />
          <stop offset="100%" stopColor="#bfe4f2" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="wreckFloor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={dark ? '#6f5f42' : '#cbb893'} />
          <stop offset="100%" stopColor={dark ? '#4a3f2c' : '#9c8a68'} />
        </linearGradient>
      </defs>

      {/* 舱内的水 */}
      <rect x={x0} y={top} width={w} height={top + 1400} fill="url(#wreckWater)" />

      {/* 船体轮廓：两侧向上收的弧，像躺着的半个船壳 */}
      <path
        d={`M ${x0} ${floor} C ${x0 + w * 0.14} ${floor - 210} ${x0 + w * 0.3} ${floor - 300} ${x0 + w * 0.5} ${floor - 312} C ${x0 + w * 0.7} ${floor - 300} ${x0 + w * 0.86} ${floor - 210} ${x0 + w} ${floor} Z`}
        fill={dark ? '#1a2c3a' : '#2c4a5c'}
        opacity={0.55}
      />

      {/* 船肋：一排拱形的木条，间隔处能看到外面的水 */}
      {Array.from({ length: Math.ceil(w / 150) + 1 }, (_, i) => {
        const bx = x0 + 40 + i * 150;
        return (
          <g key={i}>
            <path
              d={`M ${bx} ${floor} C ${bx + 6} ${floor - 150} ${bx + 40} ${floor - 240} ${bx + 76} ${floor - 268}`}
              stroke={wood}
              strokeWidth={17}
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={`M ${bx + 76} ${floor - 268} C ${bx + 112} ${floor - 240} ${bx + 146} ${floor - 150} ${bx + 152} ${floor}`}
              stroke={wood}
              strokeWidth={17}
              fill="none"
              strokeLinecap="round"
            />
            {/* 木纹上的高光 */}
            <path
              d={`M ${bx + 3} ${floor - 20} C ${bx + 9} ${floor - 152} ${bx + 42} ${floor - 236} ${bx + 76} ${floor - 262}`}
              stroke={woodLit}
              strokeWidth={4}
              fill="none"
              opacity={0.6}
              strokeLinecap="round"
            />
          </g>
        );
      })}

      {/* 横着的船板：把肋骨连起来 */}
      <g stroke={wood} strokeWidth={9} opacity={0.85} strokeLinecap="round">
        <path d={`M ${x0} ${floor - 128} C ${x0 + w * 0.3} ${floor - 158} ${x0 + w * 0.7} ${floor - 158} ${x0 + w} ${floor - 128}`} />
        <path d={`M ${x0} ${floor - 218} C ${x0 + w * 0.3} ${floor - 252} ${x0 + w * 0.7} ${floor - 252} ${x0 + w} ${floor - 218}`} opacity={0.55} />
      </g>

      {/* 船尾的破洞：光从这里进来 */}
      <g>
        <path
          d={`M ${x0 + w * 0.68} ${floor - 300} C ${x0 + w * 0.76} ${floor - 340} ${x0 + w * 0.86} ${floor - 300} ${x0 + w * 0.88} ${floor - 214} C ${x0 + w * 0.8} ${floor - 190} ${x0 + w * 0.7} ${floor - 220} ${x0 + w * 0.68} ${floor - 300} Z`}
          fill={dark ? '#0a1d31' : '#0f3348'}
        />
        <path
          d={`M ${x0 + w * 0.68} ${floor - 300} C ${x0 + w * 0.76} ${floor - 340} ${x0 + w * 0.86} ${floor - 300} ${x0 + w * 0.88} ${floor - 214} L ${x0 + w * 0.62} ${floor} L ${x0 + w * 0.46} ${floor} Z`}
          fill="url(#wreckHole)"
          opacity={0.75}
        />
      </g>

      {/* 舱底：沙与碎木 */}
      <rect x={x0} y={floor} width={w} height={top + 1000} fill="url(#wreckFloor)" />
      <path
        d={`M ${x0} ${floor} C ${x0 + w * 0.2} ${floor - 16} ${x0 + w * 0.44} ${floor + 10} ${x0 + w * 0.66} ${floor - 8} C ${x0 + w * 0.84} ${floor - 22} ${x0 + w * 0.94} ${floor + 6} ${x0 + w} ${floor - 4} L ${x0 + w} ${floor + 40} L ${x0} ${floor + 40} Z`}
        fill={dark ? '#8a7a58' : '#dbc9a4'}
        opacity={0.85}
      />
      <g stroke={dark ? '#5a4d34' : '#b8a67e'} strokeWidth={2.4} opacity={0.55} strokeLinecap="round">
        {[0.16, 0.34, 0.52, 0.72, 0.88].map((f, i) => (
          <path key={i} d={`M ${x0 + w * f} ${floor + 16 + (i % 3) * 12} q 26 6 52 0`} />
        ))}
      </g>

      {/* 散落的木板与货箱 */}
      <g opacity={0.95}>
        <g transform={`translate(${x0 + 300} ${floor - 8}) rotate(-8)`}>
          <rect x={-64} y={-16} width={128} height={16} rx={3} fill={woodLit} stroke={wood} strokeWidth={2.5} />
        </g>
        <g transform={`translate(${x0 + 980} ${floor - 4})`}>
          <rect x={-44} y={-58} width={88} height={58} rx={4} fill={wood} stroke={dark ? '#241a11' : '#523a24'} strokeWidth={3} />
          <path d="M -44 -40 L 44 -40" stroke={dark ? '#241a11' : '#523a24'} strokeWidth={3} />
          <rect x={-10} y={-48} width={20} height={18} rx={2} fill={dark ? '#c9b184' : '#e8d6a8'} opacity={0.8} />
        </g>
        {/* 陶罐 */}
        <g transform={`translate(${x0 + 1180} ${floor - 2})`}>
          <path d="M -20 0 C -26 -22 -16 -40 0 -42 C 16 -40 26 -22 20 0 Z" fill={dark ? '#5a4a3a' : '#b98b62'} stroke={wood} strokeWidth={2.5} />
          <ellipse cx={0} cy={-42} rx={13} ry={5} fill={dark ? '#3a2f22' : '#8a6742'} />
        </g>
      </g>

      {/* 断掉的桅杆：斜插在沙里，上面还挂着一片破帆 */}
      <g>
        <g transform={`translate(${x0 + 700} ${floor}) rotate(12)`}>
          <rect x={-16} y={-300} width={32} height={300} rx={7} fill={wood} stroke={dark ? '#241a11' : '#523a24'} strokeWidth={2} />
          <rect x={-16} y={-300} width={10} height={300} fill={woodLit} opacity={0.55} />
          {/* 断口：上端斜着裂开 */}
          <path d="M -16 -312 L 16 -288 L 16 -300 L -16 -300 Z" fill={dark ? '#5c4630' : '#9a7550'} />
          {/* 横桁 */}
          <rect x={-86} y={-238} width={172} height={13} rx={5} fill={wood} />
          {/* 桅杆根部堆了一点沙 */}
          <ellipse cx={0} cy={0} rx={40} ry={12} fill={dark ? '#8a7a58' : '#dbc9a4'} opacity={0.9} />
        </g>
        {/* 帆早烂没了，只剩几根绳子从横桁垂下来 */}
        <g stroke={dark ? '#6b6552' : '#c9bd97'} strokeWidth={2.6} fill="none" opacity={0.75} strokeLinecap="round">
          {[0, 1, 2, 3].map((k) => {
            const bx = x0 + 700 + (k - 1.5) * 44;
            return <path key={k} d={`M ${bx} ${floor - 232} q ${k % 2 ? 6 : -6} ${70 + (k % 3) * 26} ${k % 2 ? -8 : 8} ${120 + (k % 3) * 40}`} />;
          })}
        </g>
        {/* 挂在绳上的一个旧滑轮 */}
        <g transform={`translate(${x0 + 700} ${floor - 96})`}>
          <rect x={-13} y={-18} width={26} height={36} rx={6} fill={wood} stroke={dark ? '#241a11' : '#523a24'} strokeWidth={2.5} />
          <circle cx={0} cy={0} r={7} fill={dark ? '#2a1f14' : '#6d4f32'} />
        </g>
      </g>

      {/* 舷窗：三个圆窗，透进外面对光 */}
      <g>
        {[0.27, 0.4, 0.53].map((f, i) => (
          <g key={i} transform={`translate(${x0 + w * f} ${floor - 236})`}>
            <circle cx={0} cy={0} r={30} fill="none" stroke={wood} strokeWidth={9} />
            <circle cx={0} cy={0} r={24} fill={dark ? '#123048' : '#3f7f9c'} opacity={0.9} />
            <circle cx={-6} cy={-7} r={9} fill={dark ? '#1b3f5c' : '#7fc2d8'} opacity={0.55} />
          </g>
        ))}
      </g>

      {/* 挂在肋上的旧渔网 */}
      <g stroke={dark ? '#5a6b6a' : '#9fb6ae'} strokeWidth={2.4} fill="none" opacity={0.6}>
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M ${x0 + 560 + i * 26} ${floor - 226} q 12 34 4 62`} />
        ))}
        {Array.from({ length: 4 }, (_, i) => (
          <path key={`h${i}`} d={`M ${x0 + 556} ${floor - 212 + i * 18} q 130 10 240 0`} />
        ))}
      </g>

      {/* 前景：靠近镜头这一侧的沙地，比画面上半部更近，也更能看出"在船舱里" */}
      <g>
        {/* 沙的波纹 */}
        <g stroke={dark ? '#5a4d34' : '#c3ae86'} strokeWidth={2.5} fill="none" opacity={0.5} strokeLinecap="round">
          {Array.from({ length: 6 }, (_, i) => (
            <path
              key={i}
              d={`M ${x0 + 60 + i * 40} ${floor + 70 + i * 26} q 120 ${i % 2 ? 16 : -12} 240 2`}
            />
          ))}
        </g>
        {/* 半埋的木箱：只露出上半截，前面的沙把它盖住 */}
        <g transform={`translate(${x0 + 430} ${floor + 92})`} opacity={0.95}>
          <path d="M -58 -2 L 58 -2 L 50 -62 L -50 -62 Z" fill={wood} stroke={dark ? '#241a11' : '#523a24'} strokeWidth={3} />
          <path d="M -54 -26 L 54 -26" stroke={dark ? '#241a11' : '#523a24'} strokeWidth={3} opacity={0.8} />
          <path d="M -44 -62 L -48 -2 M 0 -62 L 0 -2 M 44 -62 L 48 -2" stroke={dark ? '#241a11' : '#523a24'} strokeWidth={2.5} opacity={0.45} />
          {/* 沙堆前缘：把箱子下沿吃掉 */}
          <path d="M -78 2 C -50 -12 50 -14 80 0 L 84 22 L -82 22 Z" fill={dark ? '#8a7a58' : '#dbc9a4'} />
          <path d="M -78 2 C -50 -12 50 -14 80 0" stroke={dark ? '#6f6349' : '#c3ae86'} strokeWidth={2} fill="none" opacity={0.7} />
        </g>
        {/* 碎石与贝壳 */}
        <g fill={dark ? '#6f6349' : '#b6a37c'} opacity={0.8}>
          {Array.from({ length: 14 }, (_, i) => (
            <ellipse
              key={i}
              cx={x0 + 120 + ((i * 197) % (w - 240))}
              cy={floor + 46 + ((i * 61) % 110)}
              rx={5 + (i % 4) * 2}
              ry={3 + (i % 3)}
            />
          ))}
        </g>
        <g fill="none" stroke={dark ? '#8a8f7e' : '#f0e4cf'} strokeWidth={3} strokeLinecap="round" opacity={0.75}>
          {[0.22, 0.58, 0.82].map((f, i) => (
            <path key={i} d={`M ${x0 + w * f} ${floor + 120 + i * 18} q 16 -14 32 0`} />
          ))}
        </g>
        {/* 一丛从沙里长出来的海草，前景的深度线索 */}
        <g transform={`translate(${x0 + 1080} ${floor + 74})`} opacity={0.85}>
          {[-18, 0, 16].map((dx, i) => (
            <path
              key={i}
              d={`M ${dx} 0 C ${dx - 18} -30 ${dx + 14} -58 ${dx - 4} -84`}
              stroke={dark ? '#2e5a4a' : '#4f9a76'}
              strokeWidth={7}
              fill="none"
              strokeLinecap="round"
            />
          ))}
        </g>
      </g>

      {/* 环境光点与小鱼影 */}
      <g fill="#d9f2fb" opacity={0.45}>
        {Array.from({ length: 20 }, (_, i) => (
          <circle
            key={i}
            cx={x0 + 60 + ((i * 211) % (w - 120))}
            cy={380 + ((i * 137) % 380)}
            r={1.4 + (i % 3)}
            className="v3-drift"
            style={{ animationDelay: `${(i % 7) * 0.9}s`, animationDuration: `${7 + (i % 5) * 2}s` }}
          />
        ))}
      </g>

      {/* 舱底角落那排旧玻璃瓶：敲起来是会响的，瓶子里的水越多音越高 */}
      {chime && (
        <g pointerEvents="none">
          <ChimeRow set={chime} night={dark} />
        </g>
      )}

      {dark && <rect x={x0} y={top} width={w} height={top + 1400} fill="#08121f" opacity={0.3} pointerEvents="none" />}
    </g>
  );
}
