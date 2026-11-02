import type { SceneProps } from '../art';

/** 小屋：室内。墙、地板、窗、灶台，东西可以随便摆 */
export function HomeScene({ view, phase, weather, season, night, eco }: SceneProps) {
  const wall = '#f7ecdc';
  const wallShade = '#efe0c8';
  const floor = '#c9a06a';
  const floorDark = '#b98b62';
  /** 窗外的天：先看昼夜，再看天气 */
  const skyFill =
    phase === 'night'
      ? '#2c3763'
      : weather === 'rain'
        ? '#8ba3b6'
        : weather === 'snow'
          ? '#d3dee6'
          : weather === 'cloudy'
            ? '#c4d3da'
            : phase === 'dawn'
              ? '#f7dcc8'
              : phase === 'sunset'
                ? '#f6cfa8'
                : '#cfe9f7';

  const x0 = view.x - 200;
  const w = view.w + 400;
  /**
   * 挂钟：指针跟着世界时钟走。
   *
   * 世界的时间一直是"看不见的"——只有家长面板里才有数字。挂到墙上以后，
   * 孩子抬头就知道"天快黑了"，而且他会发现指针自己会动。
   */
  const clock = eco?.clock ?? 0.3;
  const hourAngle = ((clock * 24) % 12) * 30;
  const minuteAngle = ((clock * 24 * 60) % 60) * 6;

  return (
    <g>
      {/* 墙 */}
      <rect x={x0} y={view.y - 300} width={w} height={1000} fill={wall} />
      <g opacity={0.5}>
        {Array.from({ length: 14 }, (_, i) => (
          <circle key={i} cx={x0 + 40 + (i * 137) % w} cy={view.y + 40 + ((i * 91) % 380)} r={3} fill={wallShade} />
        ))}
      </g>

      {/* 墙上的挂钟：指针跟世界时钟一起走 */}
      <g transform="translate(288 316)" pointerEvents="none">
        <circle r={47} fill="#fffaf0" stroke="#c9a06a" strokeWidth={7} />
        <circle r={39} fill="none" stroke="#e6d3b8" strokeWidth={1.6} />
        {[0, 1, 2, 3].map((i) => {
          const a = (i * Math.PI) / 2;
          return <circle key={i} cx={Math.sin(a) * 28} cy={-Math.cos(a) * 28} r={2.6} fill="#c1a07a" />;
        })}
        {/* 时针短、分针长：分得清才有"时间在走"的感觉 */}
        <line x1={0} y1={0} x2={0} y2={-21} stroke="#7a6553" strokeWidth={5.2} strokeLinecap="round" transform={`rotate(${hourAngle})`} />
        <line x1={0} y1={0} x2={0} y2={-31} stroke="#a8814f" strokeWidth={3.2} strokeLinecap="round" transform={`rotate(${minuteAngle})`} />
        <circle r={4} fill="#b98b62" />
      </g>

      {/* 窗：外面的天色跟着昼夜变 */}
      <g transform="translate(430 470)">
        <rect x={-78} y={-90} width={156} height={150} rx={8} fill={skyFill} stroke="#c9a06a" strokeWidth={9} />
        <path d="M 0 -90 L 0 60 M -78 -14 L 78 -14" stroke="#e0c8a4" strokeWidth={7} />
        {night ? (
          <>
            <circle cx={40} cy={-56} r={11} fill="#fdf3cf" />
            <circle cx={-30} cy={-50} r={1.8} fill="#fff4cf" />
            <circle cx={-46} cy={-20} r={1.4} fill="#fff4cf" />
            <circle cx={12} cy={-30} r={1.6} fill="#fff4cf" />
          </>
        ) : (
          <>
            {weather === 'clear' && <circle cx={44} cy={-54} r={13} fill="#ffe7a4" />}
            <ellipse cx={-30} cy={-34} rx={26} ry={11} fill="#ffffff" opacity={weather === 'clear' ? 0.9 : 0.75} />
            <path d="M -78 26 C -40 -2 0 26 78 4 L 78 60 L -78 60 Z" fill={season === 'winter' ? '#e6ecf0' : season === 'autumn' ? '#d8cf9a' : season === 'spring' ? '#b6d89a' : '#c3ddaa'} opacity={0.85} />
          </>
        )}
        {/* 天气只发生在窗外：雨丝与雪粒被裁在玻璃里 */}
        <defs>
          <clipPath id="homeWindow">
            <rect x={-74} y={-86} width={148} height={142} rx={4} />
          </clipPath>
        </defs>
        <g clipPath="url(#homeWindow)" pointerEvents="none">
          {weather === 'rain' &&
            Array.from({ length: 16 }, (_, i) => {
              const x = -72 + ((i * 37) % 144);
              return (
                <line
                  key={i}
                  x1={x}
                  y1={-110 + ((i * 23) % 150)}
                  x2={x - 3}
                  y2={-94 + ((i * 23) % 150)}
                  stroke="#e8f6ff"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  opacity={0.75}
                  className="v3-drop"
                  style={{ animationDelay: `${(i % 5) * 0.18}s`, animationDuration: `${0.9 + (i % 3) * 0.15}s` }}
                />
              );
            })}
          {weather === 'snow' &&
            Array.from({ length: 14 }, (_, i) => {
              const x = -72 + ((i * 41) % 144);
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={-100 + ((i * 29) % 140)}
                  r={1.8 + (i % 3) * 0.9}
                  fill="#ffffff"
                  opacity={0.9}
                  className="v3-flake"
                  style={{ animationDelay: `${(i % 4) * 0.6}s`, animationDuration: `${6 + (i % 3) * 2}s` }}
                />
              );
            })}
          {weather === 'rain' && (
            <rect x={-74} y={-86} width={148} height={142} fill="#5a7085" opacity={0.16} />
          )}
        </g>

        <rect x={-84} y={56} width={168} height={10} rx={4} fill="#e0c8a4" />
      </g>

      {/* 挂画 */}
      <g transform="translate(760 400)">
        <rect x={-46} y={-38} width={92} height={76} rx={4} fill="#fdf8ef" stroke="#c9a06a" strokeWidth={6} />
        <path d="M -34 26 C -14 -8 14 26 34 4 L 34 30 L -34 30 Z" fill="#b3d69e" />
        <circle cx={16} cy={-14} r={9} fill="#f5c86a" />
      </g>

      {/* 书架 */}
      <g transform="translate(960 706)">
        <rect x={-90} y={-150} width={180} height={150} rx={5} fill="#c9a06a" stroke="rgba(109,90,74,0.3)" strokeWidth={2} />
        <rect x={-82} y={-142} width={164} height={46} rx={3} fill="#b98b62" />
        <rect x={-82} y={-90} width={164} height={46} rx={3} fill="#b98b62" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={-74 + i * 22} y={-138} width={14} height={38} rx={2} fill={['#e8695f', '#7fc4e2', '#f5c86a', '#a3d68b', '#c9b4e8'][i % 5]} />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <rect key={`b${i}`} x={-74 + i * 24} y={-86} width={15} height={38} rx={2} fill={['#f5c86a', '#a3d68b', '#e8695f', '#8fc7e8'][i % 4]} />
        ))}
      </g>

      {/* 地板 */}
      <rect x={x0} y={700} width={w} height={600} fill={floor} />
      {Array.from({ length: 9 }, (_, i) => (
        <path key={i} d={`M ${x0} ${714 + i * 26} L ${x0 + w} ${706 + i * 26}`} stroke={floorDark} strokeWidth={2} opacity={0.35} />
      ))}
      <rect x={x0} y={694} width={w} height={8} fill="#a8814f" opacity={0.5} />

      {/* 厨房台面 + 烤箱（组合站点 home:oven 在这） */}
      <g transform="translate(1240 706)">
        <rect x={-130} y={-66} width={260} height={66} rx={6} fill="#e8e2d2" stroke="rgba(109,90,74,0.3)" strokeWidth={2} />
        <rect x={-134} y={-74} width={268} height={12} rx={4} fill="#d9d2c0" />
        {/* 灶台 */}
        <rect x={-40} y={-46} width={84} height={46} rx={5} fill="#8d8a84" />
        <rect x={-30} y={-38} width={64} height={30} rx={4} fill={night ? '#3a3733' : '#4d4a45'} />
        <circle cx={-14} cy={-23} r={5} fill="#c9c6bd" opacity={0.6} />
        <circle cx={14} cy={-23} r={5} fill="#c9c6bd" opacity={0.6} />
        {/* 水槽 */}
        <rect x={62} y={-44} width={54} height={34} rx={4} fill="#cfe0e6" />
        <path d="M 78 -54 C 78 -62 92 -62 92 -52" stroke="#a8b8bd" strokeWidth={4} fill="none" strokeLinecap="round" />
        {/* 上方置物架 */}
        <rect x={-120} y={-118} width={240} height={8} rx={3} fill="#c9a06a" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={-108 + i * 58} y={-146} width={34} height={28} rx={4} fill={['#f7dca2', '#e8695f', '#a3d68b', '#8fc7e8'][i]} opacity={0.9} />
        ))}
      </g>

      {/* 地毯 */}
      <ellipse cx={760} cy={760} rx={190} ry={44} fill="#e8b6a8" opacity={0.75} />
      <ellipse cx={760} cy={760} rx={150} ry={33} fill="#f2cbc0" opacity={0.8} />

      {/* 吊灯 */}
      <g transform="translate(760 250)">
        <path d="M 0 -80 L 0 0" stroke="#b98b62" strokeWidth={3} />
        <path d="M -34 0 L 34 0 L 22 26 L -22 26 Z" fill={night ? '#ffe2a0' : '#f7ecd8'} stroke="rgba(109,90,74,0.3)" strokeWidth={2} />
        {night && <ellipse cx={0} cy={70} rx={130} ry={80} fill="#ffe2a0" opacity={0.22} filter="url(#softBlur)" />}
      </g>

      {/* 盆栽 */}
      <g transform="translate(1120 706)">
        <path d="M -18 0 L -14 -26 L 14 -26 L 18 0 Z" fill="#d9855c" stroke="rgba(109,90,74,0.3)" strokeWidth={2} />
        <path d="M 0 -26 C -2 -44 2 -54 0 -66" stroke="#6fa961" strokeWidth={3} fill="none" strokeLinecap="round" />
        <ellipse cx={-8} cy={-44} rx={10} ry={6} fill="#8cc47a" transform="rotate(-24 -8 -44)" />
        <ellipse cx={9} cy={-52} rx={10} ry={6} fill="#a3d68b" transform="rotate(24 9 -52)" />
        <ellipse cx={0} cy={-68} rx={9} ry={6} fill="#8cc47a" />
      </g>

    </g>
  );
}
