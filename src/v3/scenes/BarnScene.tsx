import type { SceneProps } from '../art';

/**
 * 谷仓内部：农场的里层空间
 *
 * 不是"另一张地图"，而是站在谷仓里往外看：木板墙、头顶的横梁、
 * 从板缝里漏进来的一线光、脚下踩实的稻草。
 *
 * 与地下/树上一样的约束：没有天空、没有天气（Stage 的 INDOOR 里包含了它），
 * 白天靠板缝的光，夜里靠挂在梁上的马灯。
 */
export function BarnScene({ view, phase, weather, night }: SceneProps) {
  const x0 = view.x - 300;
  const w = view.w + 600;
  const top = view.y - 400;
  const floor = 780;
  const dark = night || phase === 'night';
  const plank = dark ? '#4f3a26' : '#8a6742';
  const plankAlt = dark ? '#5b442c' : '#9a7550';
  const straw = dark ? '#6b5a38' : '#d9c49a';

  return (
    <g>
      <defs>
        <linearGradient id="barnWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={dark ? '#2c2117' : '#7a5a3a'} />
          <stop offset="100%" stopColor={dark ? '#43321f' : '#a07c52'} />
        </linearGradient>
        <linearGradient id="barnFloor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={dark ? '#6b5a38' : '#e2cfa4'} />
          <stop offset="100%" stopColor={dark ? '#4a3d26' : '#c9b184'} />
        </linearGradient>
        <linearGradient id="barnBeam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={dark ? '#3a2b1b' : '#6d4f32'} />
          <stop offset="100%" stopColor={dark ? '#4a3722' : '#8a6742'} />
        </linearGradient>
      </defs>

      {/* 木墙 */}
      <rect x={x0} y={top} width={w} height={floor - top} fill="url(#barnWall)" />

      {/* 竖着的木板与板缝 */}
      <g opacity={0.55}>
        {Array.from({ length: Math.ceil(w / 46) + 2 }, (_, i) => (
          <rect
            key={i}
            x={x0 + i * 46}
            y={top}
            width={44}
            height={floor - top}
            fill={i % 2 ? plank : plankAlt}
          />
        ))}
        {Array.from({ length: Math.ceil(w / 46) + 2 }, (_, i) => (
          <rect key={`g${i}`} x={x0 + i * 46 + 44} y={top} width={2} height={floor - top} fill={dark ? '#1d160f' : '#5e452c'} />
        ))}
      </g>

      {/* 板缝漏进来的光：白天是太阳，夜里是月光 */}
      <g opacity={dark ? 0.28 : 0.55}>
        {[0.22, 0.4, 0.58, 0.76].map((f, i) => (
          <path
            key={i}
            d={`M ${x0 + w * f} ${top + 40} L ${x0 + w * f + 5} ${top + 40} L ${x0 + w * f + 34} ${floor} L ${x0 + w * f + 24} ${floor} Z`}
            fill="#ffeec6"
            opacity={0.16 - i * 0.02}
          />
        ))}
      </g>

      {/* 上部横梁与斜撑 */}
      <g>
        <rect x={x0} y={top + 150} width={w} height={30} fill="url(#barnBeam)" />
        <rect x={x0} y={top + 320} width={w} height={22} fill="url(#barnBeam)" opacity={0.9} />
        {Array.from({ length: Math.ceil(w / 210) + 1 }, (_, i) => (
          <g key={i}>
            <path
              d={`M ${x0 + i * 210} ${top + 180} L ${x0 + i * 210 + 120} ${top + 342}`}
              stroke={dark ? '#3a2b1b' : '#6d4f32'}
              strokeWidth={14}
              strokeLinecap="round"
            />
            <rect x={x0 + i * 210 - 9} y={top + 140} width={18} height={352} fill="url(#barnBeam)" opacity={0.85} />
          </g>
        ))}
      </g>

      {/* 梁上吊着的马灯：夜里这一盏是光源 */}
      <g transform="translate(1180 470)">
        <path d="M 0 -70 L 0 -18" stroke="#5e452c" strokeWidth={3} />
        <rect x={-16} y={-18} width={32} height={40} rx={7} fill={dark ? '#ffd98a' : '#c9b184'} stroke="#6d4f32" strokeWidth={3} />
        <path d="M -12 -18 L 12 -18 L 16 8 L -16 8 Z" fill={dark ? '#ffe9b8' : '#e8dcc0'} opacity={0.9} />
        <path d="M -18 22 L 18 22" stroke="#6d4f32" strokeWidth={4} strokeLinecap="round" />
        {dark && <circle cx={0} cy={2} r={56} fill="#ffd98a" opacity={0.22} filter="url(#softBlur)" />}
      </g>

      {/* 地板：踩实的稻草与木板混在一起 */}
      <rect x={x0} y={floor} width={w} height={top + 1000} fill="url(#barnFloor)" />
      <g stroke={dark ? '#4a3d26' : '#b09763'} strokeWidth={2} opacity={0.45}>
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d={`M ${x0} ${floor + 16 + i * 24} L ${x0 + w} ${floor + 10 + i * 24}`} />
        ))}
      </g>
      {/* 散落的稻草 */}
      <g stroke={dark ? '#7a6842' : '#e8d6a8'} strokeWidth={3} strokeLinecap="round" opacity={0.75}>
        {Array.from({ length: 26 }, (_, i) => {
          const x = x0 + 40 + ((i * 149) % (w - 80));
          const y = floor + 18 + ((i * 71) % 90);
          const dx = 10 + (i % 5) * 4;
          const dy = -4 + (i % 3) * 3;
          return <path key={i} d={`M ${x} ${y} l ${dx} ${dy}`} />;
        })}
      </g>

      {/* 左边的草垛：孩子可以上去坐 */}
      <g>
        <path d={`M ${x0 + 90} ${floor} C ${x0 + 92} ${floor - 120} ${x0 + 300} ${floor - 132} ${x0 + 316} ${floor} Z`} fill={straw} opacity={0.9} />
        <path d={`M ${x0 + 110} ${floor - 46} C ${x0 + 150} ${floor - 66} ${x0 + 250} ${floor - 70} ${x0 + 296} ${floor - 40}`} stroke={dark ? '#8a7648' : '#f0e2bc'} strokeWidth={4} fill="none" opacity={0.6} />
        <path d={`M ${x0 + 130} ${floor - 84} C ${x0 + 168} ${floor - 100} ${x0 + 226} ${floor - 102} ${x0 + 268} ${floor - 78}`} stroke={dark ? '#8a7648' : '#f0e2bc'} strokeWidth={3.5} fill="none" opacity={0.5} />
      </g>

      {/* 墙上挂的工具：草叉与绳圈 */}
      <g transform={`translate(${x0 + 520} ${floor - 250})`} opacity={0.85}>
        <path d="M 0 0 L 0 190" stroke={dark ? '#6b5a38' : '#b98b62'} strokeWidth={7} strokeLinecap="round" />
        <path d="M -16 0 L 0 -22 L 16 0" stroke={dark ? '#8d8a84' : '#b9b6ae'} strokeWidth={6} fill="none" strokeLinecap="round" />
        <g>
          <ellipse cx={44} cy={54} rx={26} ry={26} fill="none" stroke={dark ? '#8a7648' : '#d9b07a'} strokeWidth={5} />
          <ellipse cx={44} cy={54} rx={16} ry={16} fill="none" stroke={dark ? '#8a7648' : '#d9b07a'} strokeWidth={4} opacity={0.7} />
        </g>
      </g>

      {/* 干草阁楼：一条木板平台探出来，上面堆着没拆的草捆，垂着一根绳 */}
      <g>
        <path d={`M ${x0 + 240} ${floor - 226} L ${x0 + 900} ${floor - 226} L ${x0 + 900} ${floor - 208} L ${x0 + 240} ${floor - 208} Z`} fill={dark ? '#3a2b1b' : '#7d5f3f'} />
        <path d={`M ${x0 + 240} ${floor - 208} L ${x0 + 900} ${floor - 208} L ${x0 + 900} ${floor - 196} L ${x0 + 240} ${floor - 196} Z`} fill={dark ? '#2a1f14' : '#5e452c'} opacity={0.8} />
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${x0 + 380 + i * 160} ${floor - 226})`}>
            <rect x={-56} y={-60} width={112} height={60} rx={18} fill={dark ? '#7a6842' : '#ebd39a'} />
            {/* 横向的草纹：草捆是一层一层压出来的 */}
            <g stroke={dark ? '#5f5030' : '#d3b877'} strokeWidth={2.6} strokeLinecap="round" opacity={0.85}>
              {[-46, -32, -18, -4, 10, 24, 38].map((dy, k) => (
                <path key={k} d={`M -48 ${dy * 0.55} q 24 ${k % 2 ? 4 : -4} 48 0 q 24 ${k % 2 ? -4 : 4} 48 0`} />
              ))}
            </g>
            {/* 两道麻绳 */}
            <path d="M -22 -60 q -4 30 0 60 M 24 -60 q 4 30 0 60" stroke={dark ? '#4a3d26' : '#b99b62'} strokeWidth={5} opacity={0.75} fill="none" />
            {/* 边缘的毛茬 */}
            <g stroke={dark ? '#8a7648' : '#f7ecc9'} strokeWidth={2.2} strokeLinecap="round" opacity={0.9}>
              {[-40, -14, 10, 36].map((dx, k) => (
                <path key={`t${k}`} d={`M ${dx} -60 l ${k % 2 ? 4 : -4} -7`} />
              ))}
              {[-34, -6, 20, 42].map((dx, k) => (
                <path key={`b${k}`} d={`M ${dx} 0 l ${k % 2 ? 3 : -3} 7`} />
              ))}
            </g>
          </g>
        ))}
        {/* 垂下来的绳与挂钩 */}
        <path d={`M ${x0 + 700} ${floor - 196} L ${x0 + 700} ${floor - 86}`} stroke={dark ? '#6b5a38' : '#b98b62'} strokeWidth={4} strokeLinecap="round" />
        <path d={`M ${x0 + 690} ${floor - 86} q 10 14 20 0`} stroke={dark ? '#6b5a38' : '#b98b62'} strokeWidth={4} fill="none" strokeLinecap="round" />
        {/* 撑住阁楼的两根斜撑 */}
        {[0, 1].map((i) => (
          <path
            key={i}
            d={`M ${x0 + 330 + i * 380} ${floor - 196} L ${x0 + 520 + i * 380} ${floor - 56}`}
            stroke={dark ? '#3a2b1b' : '#6d4f32'}
            strokeWidth={10}
            strokeLinecap="round"
            opacity={0.75}
          />
        ))}
      </g>

      {/* 墙上的木补丁与钉子：老谷仓的墙上总有几块后钉上去的板 */}
      <g opacity={0.75}>
        <g transform={`translate(${x0 + 1120} ${floor - 330}) rotate(-4)`}>
          <rect x={-96} y={-15} width={192} height={30} rx={4} fill={dark ? '#4a3722' : '#8a6742'} stroke={dark ? '#33261a' : '#6d4f32'} strokeWidth={2.5} />
          <path d="M -92 13 L 92 13 L 92 20 L -92 20 Z" fill="#000" opacity={0.14} />
          <g fill={dark ? '#8d8a84' : '#b9b6ae'}>
            {[-80, -40, 40, 80].map((dx) => (
              <circle key={dx} cx={dx} cy={0} r={2.6} />
            ))}
          </g>
        </g>
        <g transform={`translate(${x0 + 1290} ${floor - 392}) rotate(3)`}>
          <rect x={-70} y={-12} width={140} height={24} rx={4} fill={dark ? '#463524' : '#7d5f3f'} stroke={dark ? '#33261a' : '#5e452c'} strokeWidth={2.5} />
          <path d="M -66 10 L 66 10 L 66 16 L -66 16 Z" fill="#000" opacity={0.14} />
        </g>
        {/* 一挂干玉米：秋天挂上去，一直没摘 */}
        <g transform={`translate(${x0 + 846} ${floor - 196}) scale(0.86)`}>
          <path d="M 0 -46 L 0 -18" stroke={dark ? '#6b5a38' : '#b98b62'} strokeWidth={4} strokeLinecap="round" />
          <ellipse cx={0} cy={-16} rx={7} ry={5} fill={dark ? '#6b5a38' : '#b98b62'} />
          {/*
            四根玉米抱成一挂：每根是一根朝下的苞穗，外面裹两片枯叶。
            之前画成三颗分开的椭圆，看着像三个黄点飘在墙上。
          */}
          {[
            [-26, 34, -10],
            [-4, 58, 0],
            [22, 40, 11],
            [4, 20, -4],
          ].map(([dx, len, rot], i) => (
            <g key={i} transform={`translate(${dx} -16) rotate(${rot})`}>
              <path d={`M 0 0 L 0 ${len}`} stroke={dark ? '#6b5a38' : '#b98b62'} strokeWidth={2.4} />
              <ellipse cx={0} cy={len * 0.62} rx={15} ry={len * 0.62} fill={dark ? '#a08b4a' : '#e8c766'} />
              <g stroke={dark ? '#7a6842' : '#c9a34a'} strokeWidth={1.6} opacity={0.7}>
                {[-9, -3, 3, 9].map((ox, k) => (
                  <path key={k} d={`M ${ox} ${len * 0.16} L ${ox * 1.1} ${len * 1.05}`} />
                ))}
              </g>
              <path
                d={`M -15 ${len * 0.2} C -24 ${len * 0.5} -18 ${len * 1.05} -3 ${len * 1.2}`}
                stroke={dark ? '#8a7a45' : '#cfb06a'}
                strokeWidth={3}
                fill="none"
                opacity={0.85}
              />
            </g>
          ))}
        </g>
      </g>

      {/* 草料口：墙上一扇推开的小门，干草从这里倒进来，下面接一块滑板 */}
      <g>
        <rect x={1258} y={floor - 430} width={128} height={116} rx={5} fill={dark ? '#1b140d' : '#4a3722'} />
        <rect x={1258} y={floor - 430} width={128} height={116} rx={5} fill="none" stroke={dark ? '#3a2b1b' : '#6d4f32'} strokeWidth={7} />
        {/* 打开的翻板 */}
        <path d={`M 1266 ${floor - 436} L 1378 ${floor - 460} L 1386 ${floor - 436} L 1274 ${floor - 412} Z`} fill={dark ? '#4a3722' : '#9a7550'} stroke={dark ? '#33261a' : '#6d4f32'} strokeWidth={3} />
        {/* 往外淌的干草 */}
        <g fill={dark ? '#8a7648' : '#e8d6a8'} opacity={0.9}>
          <path d={`M 1268 ${floor - 316} q 54 26 108 0 l -6 16 q -48 18 -96 0 Z`} />
        </g>
        <g stroke={dark ? '#8a7648' : '#f4e8c4'} strokeWidth={2.4} strokeLinecap="round" opacity={0.8}>
          {[1274, 1300, 1326, 1352, 1378].map((x, i) => (
            <path key={i} d={`M ${x} ${floor - 310} l ${i % 2 ? 4 : -4} ${12 + (i % 3) * 8}`} />
          ))}
        </g>
      </g>

      {/* 靠在墙上的大车轮：谷仓里总有一个 */}
      <g transform={`translate(${x0 + 1180} ${floor - 6}) rotate(-6)`}>
        <circle cx={0} cy={-58} r={58} fill="none" stroke={dark ? '#4a3722' : '#8a6742'} strokeWidth={10} />
        <circle cx={0} cy={-58} r={50} fill="none" stroke={dark ? '#33261a' : '#6d4f32'} strokeWidth={3} opacity={0.7} />
        <circle cx={0} cy={-58} r={10} fill={dark ? '#5b442c' : '#a8814f'} />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={Math.cos(a) * 10}
              y1={-58 + Math.sin(a) * 10}
              x2={Math.cos(a) * 54}
              y2={-58 + Math.sin(a) * 54}
              stroke={dark ? '#4a3722' : '#8a6742'}
              strokeWidth={5}
              strokeLinecap="round"
            />
          );
        })}
      </g>

      {/* 前景：倒在脚边的木桶与撒开的草，让地板不再是空的 */}
      <g opacity={0.95}>
        <g transform={`translate(${x0 + 980} ${floor + 116}) rotate(-10)`}>
          {/* 影子 */}
          <ellipse cx={6} cy={44} rx={64} ry={12} fill="#000" opacity={0.12} />
          {/* 躺倒的木桶：两侧是椭圆的桶底，中间三道箍 */}
          <ellipse cx={-44} cy={0} rx={13} ry={38} fill={dark ? '#3f3020' : '#8a6742'} />
          <rect x={-44} y={-38} width={88} height={76} fill={dark ? '#4a3722' : '#9a7550'} />
          <ellipse cx={44} cy={0} rx={13} ry={38} fill={dark ? '#4a3722' : '#a8814f'} stroke={dark ? '#2a1f14' : '#6d4f32'} strokeWidth={3} />
          <path d="M -26 -38 L -26 38 M 0 -38 L 0 38 M 26 -38 L 26 38" stroke={dark ? '#2a1f14' : '#5e452c'} strokeWidth={5} opacity={0.75} />
          <path d="M -44 -20 L 44 -20" stroke={dark ? '#2a1f14' : '#5e452c'} strokeWidth={3} opacity={0.35} />
        </g>
        <g stroke={dark ? '#7a6842' : '#e8d6a8'} strokeWidth={3.5} strokeLinecap="round" opacity={0.7}>
          {Array.from({ length: 22 }, (_, i) => {
            const x = x0 + 80 + ((i * 173) % (w - 160));
            const y = floor + 60 + ((i * 53) % 120);
            return <path key={i} d={`M ${x} ${y} l ${8 + (i % 4) * 5} ${-3 + (i % 3) * 4}`} />;
          })}
        </g>
        {/* 板缝投在地板上的一道光斑 */}
        {!dark && (
          <g opacity={0.3}>
            {[0.24, 0.42, 0.6].map((f, i) => (
              <path
                key={i}
                d={`M ${x0 + w * f + 26} ${floor + 6} L ${x0 + w * f + 96} ${floor + 6} L ${x0 + w * f + 150} ${floor + 92} L ${x0 + w * f + 60} ${floor + 92} Z`}
                fill="#fff2cd"
                opacity={0.5}
              />
            ))}
          </g>
        )}
        {/* 一袋谷物：袋口松开，洒出几粒 */}
        <g transform={`translate(${x0 + 1320} ${floor + 104})`}>
          <ellipse cx={4} cy={40} rx={44} ry={10} fill="#000" opacity={0.12} />
          <path d="M -40 38 C -50 -8 -30 -34 0 -40 C 30 -34 50 -8 40 38 Z" fill={dark ? '#6b5a38' : '#e0cfa6'} stroke={dark ? '#4a3d26' : '#c0ab7c'} strokeWidth={3} />
          <path d="M -20 -38 L -6 -20 L 8 -34 L 20 -18" stroke={dark ? '#4a3d26' : '#c0ab7c'} strokeWidth={3} fill="none" strokeLinecap="round" />
          <g fill={dark ? '#8a7648' : '#f0e2bc'}>
            {[[-70, 44], [-58, 50], [-46, 46], [-64, 56]].map(([dx, dy], i) => (
              <circle key={i} cx={dx} cy={dy} r={2.6} />
            ))}
          </g>
        </g>
      </g>

      {/* 收尾：上面那一段前景组 */}
      <g>
      </g>

      {/* 谷仓门：右边那扇，门缝里能看见外面的草地 */}
      <g>
        <rect x={1372} y={floor - 300} width={210} height={300} rx={6} fill={dark ? '#33261a' : '#6d4f32'} stroke={dark ? '#241a11' : '#523a24'} strokeWidth={6} />
        <rect x={1386} y={floor - 286} width={182} height={272} rx={4} fill={dark ? '#1e2a1a' : '#9ec98a'} opacity={0.6} />
        <path d="M 1477 480 L 1477 780" stroke={dark ? '#241a11' : '#523a24'} strokeWidth={5} />
        <path d={`M 1386 ${floor - 150} L 1568 ${floor - 150}`} stroke={dark ? '#241a11' : '#523a24'} strokeWidth={5} />
        {/* 门缝的光 */}
        <rect x={1372} y={floor - 300} width={6} height={300} fill="#ffeec6" opacity={dark ? 0.2 : 0.55} />
      </g>

      {/* 地上的木箱 */}
      <g transform={`translate(${x0 + 700} ${floor - 6})`} opacity={0.95}>
        <rect x={-38} y={-56} width={76} height={56} rx={4} fill={dark ? '#4a3722' : '#a8814f'} stroke={dark ? '#33261a' : '#7d5f3f'} strokeWidth={3} />
        <path d="M -38 -38 L 38 -38 M -38 -18 L 38 -18" stroke={dark ? '#33261a' : '#7d5f3f'} strokeWidth={3} />
        <rect x={-9} y={-46} width={18} height={22} rx={2} fill={dark ? '#8a7648' : '#e8d6a8'} />
      </g>

      {/* 夜里整体压暗，只留下马灯那一圈 */}
      {dark && (
        <rect x={x0} y={top} width={w} height={floor - top + 300} fill="#101a2e" opacity={0.34} pointerEvents="none" />
      )}
      {dark && <circle cx={1180} cy={470} r={210} fill="#ffd98a" opacity={0.1} filter="url(#softBlur)" pointerEvents="none" />}

      {/* 白天：门缝与板缝进来的浮尘，让空仓不那么"死" */}
      {!dark && (
        <g fill="#fff8e4" opacity={0.5} pointerEvents="none">
          {Array.from({ length: 16 }, (_, i) => (
            <circle
              key={i}
              cx={x0 + 120 + ((i * 131) % (w - 240))}
              cy={420 + ((i * 97) % 340)}
              r={1.4 + (i % 3) * 0.6}
              className="v3-drift"
              style={{ animationDelay: `${(i % 6) * 0.8}s`, animationDuration: `${8 + (i % 4) * 2}s` }}
            />
          ))}
        </g>
      )}

      {/* 窗外的天气只在这扇小窗里（与小屋同一个做法） */}
      <g transform="translate(1080 330)">
        <rect x={-52} y={-40} width={104} height={80} rx={4} fill={dark ? '#2c3763' : weather === 'rain' ? '#8ba3b6' : '#cfe9f7'} stroke={dark ? '#33261a' : '#6d4f32'} strokeWidth={7} />
        <path d="M 0 -40 L 0 40 M -52 0 L 52 0" stroke={dark ? '#4a3722' : '#a8814f'} strokeWidth={5} />
        {weather === 'rain' && (
          <g stroke="#e8f6ff" strokeWidth={1.6} opacity={0.7} strokeLinecap="round">
            {Array.from({ length: 7 }, (_, i) => (
              <line key={i} x1={-44 + i * 14} y1={-34 + (i % 3) * 10} x2={-47 + i * 14} y2={-20 + (i % 3) * 10} />
            ))}
          </g>
        )}
      </g>
    </g>
  );
}
