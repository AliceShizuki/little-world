import { Clouds, Sky, Sun, TownHouse, type SceneProps } from '../art';

/**
 * 小镇：一排店面、一条人行道、一条马路。
 * 车辆停在马路上（y≈800），小物件留在人行道上（y≈700），层次就不会糊在一起。
 */
export function TownScene({ view, phase, weather, season, night }: SceneProps) {
  const x0 = view.x - 200;
  const w = view.w + 400;
  const lit = night;
  const wet = weather === 'rain';

  // 草地与行道树随季节走：春天嫩绿、夏天深绿、秋天枯黄、冬天雪白
  const grass = season === 'winter' ? '#e8ede9' : season === 'autumn' ? '#d4c896' : season === 'spring' ? '#b8dba0' : '#c3d9a8';
  const grassNear = season === 'winter' ? '#dde5e1' : season === 'autumn' ? '#c6b982' : season === 'spring' ? '#a9d192' : '#b3d19f';
  const treeLeaf = season === 'winter' ? '#d8e2e6' : season === 'autumn' ? '#c9914f' : season === 'spring' ? '#7fc06a' : '#8cc47a';
  const treeLeafL = season === 'winter' ? '#eef4f6' : season === 'autumn' ? '#e0a35f' : season === 'spring' ? '#9fd68b' : '#a3d68b';

  return (
    <g>
      <Sky view={view} phase={phase} weather={weather} />
      <Sun view={view} phase={phase} weather={weather} />
      <Clouds view={view} phase={phase} weather={weather} />

      {/* 草地 */}
      <rect x={x0} y={600} width={w} height={260} fill={grass} />
      <path d={`M ${x0} 606 C ${x0 + w * 0.24} 596, ${x0 + w * 0.5} 614, ${x0 + w * 0.74} 602 C ${x0 + w * 0.88} 594, ${x0 + w * 0.96} 606, ${x0 + w} 600 L ${x0 + w} 660 L ${x0} 660 Z`} fill={grassNear} />
      {season === 'winter' && (
        <g pointerEvents="none" opacity={0.8}>
          {[
            [420, 630, 110, 24],
            [900, 640, 130, 26],
            [1380, 632, 100, 22],
            [650, 656, 120, 20],
            [1150, 654, 110, 22],
          ].map(([x, y, rx, ry], i) => (
            <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} fill="#f2f6f7" />
          ))}
        </g>
      )}

      {/* 街对面的房子（更小、更淡） */}
      <g opacity={0.75}>
        <TownHouse x={430} y={606} s={0.55} color="#e8d6c0" roof="#b98b62" lit={lit} />
        <TownHouse x={880} y={604} s={0.52} color="#dfe4e6" roof="#a8a49b" lit={lit} />
        <TownHouse x={1520} y={606} s={0.54} color="#f0dcc0" roof="#c98a6a" lit={lit} />
      </g>

      {/* 主街店面 */}
      <TownHouse x={300} y={680} s={0.98} color="#fbe6bd" roof="#c9724f" lit={lit} awning="#f28b82" />
      <TownHouse x={700} y={684} s={0.92} color="#dfe9ee" roof="#8fa9b8" lit={lit} />
      <TownHouse x={1090} y={682} s={0.96} color="#f0e2c8" roof="#b98b62" lit={lit} awning="#7fc4e2" />
      <TownHouse x={1450} y={680} s={0.9} color="#f7dfe0" roof="#d98b8b" lit={lit} />

      {/* 面包店的小招牌：一个圆牌加一个面包 */}
      <g transform="translate(300 528)">
        <path d="M 0 0 L 0 -14" stroke="#8d6a44" strokeWidth={3} />
        <rect x={-28} y={-46} width={56} height={32} rx={7} fill="#8d6a44" />
        <ellipse cx={0} cy={-30} rx={13} ry={7.5} fill="#e8b877" />
        <path d="M -6 -30 L 6 -30" stroke="#c9945f" strokeWidth={2} strokeLinecap="round" />
      </g>

      {/* 人行道 */}
      <path d={`M ${x0} 688 C ${x0 + w * 0.3} 682, ${x0 + w * 0.7} 694, ${x0 + w} 686 L ${x0 + w} 748 L ${x0} 748 Z`} fill="#e8e2d2" />
      <path d={`M ${x0} 688 C ${x0 + w * 0.3} 682, ${x0 + w * 0.7} 694, ${x0 + w} 686`} stroke="#d9d2c0" strokeWidth={4} fill="none" />
      <path d={`M ${x0} 748 L ${x0 + w} 748`} stroke="#cfc7b2" strokeWidth={3} />

      {/* 马路：雨天会变深，并反出灯的光 */}
      <rect x={x0} y={748} width={w} height={420} fill={wet ? '#9a978f' : '#b9b6ae'} />
      <rect x={x0} y={748} width={w} height={5} fill="#a8a49b" />
      {wet && (
        <g pointerEvents="none">
          <rect x={x0} y={748} width={w} height={420} fill="#7f95a8" opacity={0.16} />
          {[210, 630, 1250, 1570].map((x, i) => (
            <ellipse key={i} cx={x + 20} cy={846} rx={54} ry={13} fill={lit ? '#ffe2a0' : '#e8f0f6'} opacity={lit ? 0.24 : 0.16} filter="url(#softBlur)" />
          ))}
        </g>
      )}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={x0 + 40 + i * 280} y={812} width={120} height={11} rx={5} fill="#f2efe6" opacity={0.8} />
      ))}
      {/* 斑马线 */}
      <g>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={860 + i * 30} y={762} width={16} height={70} rx={3} fill="#f7f4ea" opacity={0.92} />
        ))}
      </g>

      {/* 路灯 */}
      {[200, 620, 1240, 1560].map((x) => (
        <g key={x} transform={`translate(${x} 700)`}>
          <path d="M 0 0 L 0 -104" stroke="#8d8a84" strokeWidth={5} strokeLinecap="round" />
          <path d="M 0 -104 C 0 -118 14 -120 18 -108" stroke="#8d8a84" strokeWidth={4} fill="none" strokeLinecap="round" />
          <circle cx={20} cy={-104} r={7.5} fill={lit ? '#ffe2a0' : '#e8e2d2'} />
          {lit && <circle cx={20} cy={-104} r={38} fill="#ffe2a0" opacity={0.28} filter="url(#softBlur)" />}
        </g>
      ))}

      {/* 消防栓 */}
      <g transform="translate(780 726)">
        <rect x={-7} y={-18} width={14} height={18} rx={3} fill="#e8695f" />
        <rect x={-12} y={-14} width={24} height={5} rx={2} fill="#d0554c" />
        <circle cx={0} cy={-20} r={4} fill="#d0554c" />
      </g>

      {/* 邮筒 */}
      <g transform="translate(960 732)">
        <rect x={-12} y={-38} width={24} height={38} rx={6} fill="#7fa8d0" stroke="rgba(109,90,74,0.3)" strokeWidth={2} />
        <rect x={-7} y={-32} width={14} height={4} rx={2} fill="#5c7fa8" />
      </g>

      {/* 行道树：冬天掉光叶子只留枝干，秋天叶子枯黄 */}
      <g transform="translate(520 700)">
        <rect x={-6} y={-26} width={12} height={26} rx={3} fill="#9c714c" />
        {season === 'winter' ? (
          <>
            <g fill="none" stroke="#8a6a4c" strokeLinecap="round">
              <path d="M 0 -26 C -10 -40 -22 -48 -30 -54" strokeWidth={4} />
              <path d="M 0 -26 C 12 -42 24 -48 32 -54" strokeWidth={4} />
              <path d="M 0 -26 C -2 -44 0 -56 2 -64" strokeWidth={3.4} />
            </g>
            <ellipse cx={-30} cy={-56} rx={9} ry={3.4} fill="#eef4f6" transform="rotate(14 -30 -56)" />
            <ellipse cx={32} cy={-56} rx={9} ry={3.4} fill="#eef4f6" transform="rotate(-14 32 -56)" />
            <ellipse cx={2} cy={-66} rx={8} ry={3} fill="#eef4f6" />
          </>
        ) : (
          <>
            <circle cx={0} cy={-44} r={26} fill={treeLeaf} />
            <circle cx={-12} cy={-52} r={16} fill={treeLeafL} />
          </>
        )}
      </g>
    </g>
  );
}
