import { useEffect, useRef, useState } from 'react';
import { useWorld } from '../state/WorldContext';
import { C } from '../theme';

/**
 * 小屋
 *  - 点击房门：开关门（带吱呀声）
 *  - 点击窗户 / 阁楼圆窗：灯光亮起或熄灭
 *  - 点击烟囱：冒出轻柔的炊烟
 */
export function House() {
  const { layout, state, toggleDoor, toggleWindow, sfx, night } = useWorld();
  const { x, y, scale } = layout.house;
  const [smokeKey, setSmokeKey] = useState(0);
  const [smoking, setSmoking] = useState(false);
  const smokeTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (smokeTimer.current) clearTimeout(smokeTimer.current);
    },
    [],
  );

  const puffSmoke = () => {
    setSmokeKey((n) => n + 1);
    setSmoking(true);
    sfx('cloud');
    if (smokeTimer.current) clearTimeout(smokeTimer.current);
    smokeTimer.current = window.setTimeout(() => setSmoking(false), 3800);
  };

  const lit = state.windowLit;

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {/* 地上的影子 */}
      <ellipse cx={6} cy={6} rx={132} ry={16} fill="#4c6b45" opacity="0.16" filter="url(#tinyBlur)" />

      {/* 烟囱（画在屋顶之后会被屋顶挡住，所以先画） */}
      <g className="interactive" onPointerDown={(e) => { e.preventDefault(); puffSmoke(); }} role="button" aria-label="烟囱">
        <rect x={54} y={-250} width={30} height={80} rx={3} fill="#e8b193" stroke="rgba(150,110,80,0.45)" strokeWidth="2.4" />
        <rect x={50} y={-256} width={38} height={12} rx={4} fill="#d9987c" stroke="rgba(150,110,80,0.4)" strokeWidth="2" />
        <rect x={60} y={-246} width={12} height={68} fill="#f0c1a6" opacity="0.45" />
      </g>

      {/* 墙体 */}
      <path
        d="M -108 0 L -108 -142 Q -108 -150 -100 -150 L 100 -150 Q 108 -150 108 -142 L 108 0 Z"
        fill="url(#wallGrad)"
        stroke="rgba(150,120,90,0.42)"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      {/* 墙面下方的一点阴影，让房子更立起来 */}
      <path d="M -106 0 L -106 -14 C -60 -6 60 -6 106 -14 L 106 0 Z" fill="rgba(170,140,105,0.14)" />

      {/* 屋顶：屋檐 + 主体 */}
      <path
        d="M -146 -138 Q -146 -134 -140 -134 L -6 -246 L 0 -252 L 6 -246 L 140 -134 Q 146 -134 146 -138 L 143 -146 L 0 -256 L -143 -146 Z"
        fill={C.houseRoofDark}
        stroke="rgba(150,100,75,0.4)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M -136 -144 L 0 -258 L 136 -144 Z"
        fill="url(#roofGrad)"
        stroke="rgba(150,100,75,0.45)"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* 屋脊高光 */}
      <path d="M 0 -254 L 0 -240" stroke="rgba(255,255,255,0.45)" strokeWidth="3" strokeLinecap="round" />

      {/* 阁楼小圆窗 */}
      <g className="interactive" onPointerDown={(e) => { e.preventDefault(); toggleWindow(); }} role="button" aria-label="小圆窗">
        <circle cx={0} cy={-196} r={15} fill={lit ? 'url(#windowGlowGrad)' : C.houseWindow} stroke="#cf9a6b" strokeWidth="3.2" />
        <path d="M -15 -196 L 15 -196 M 0 -211 L 0 -181" stroke="#cf9a6b" strokeWidth="2" opacity="0.75" />
        <circle cx={0} cy={-196} r={26} fill="transparent" />
      </g>

      {/* 大窗户 */}
      <g className="interactive" onPointerDown={(e) => { e.preventDefault(); toggleWindow(); }} role="button" aria-label="窗户">
        {lit && <circle cx={-58} cy={-94} r={60} fill="url(#windowHalo)" />}
        <rect x={-86} y={-122} width={56} height={56} rx={5} fill={lit ? 'url(#windowGlowGrad)' : C.houseWindow} stroke="#cf9a6b" strokeWidth="4" />
        <path d="M -58 -122 L -58 -66 M -86 -94 L -30 -94" stroke="#cf9a6b" strokeWidth="3.2" />
        {lit && (
          <g pointerEvents="none">
            <rect x={-80} y={-116} width={18} height={18} rx={3} fill="#fff2c6" opacity="0.8" />
            <rect x={-50} y={-84} width={16} height={12} rx={3} fill="#fff2c6" opacity="0.6" />
          </g>
        )}
        <rect x={-92} y={-128} width={68} height={68} fill="transparent" />
      </g>

      {/* 窗台花箱 */}
      <g pointerEvents="none">
        <rect x={-92} y={-60} width={64} height={13} rx={4} fill="#cf9a6b" stroke="rgba(150,110,80,0.4)" strokeWidth="2" />
        {[-84, -70, -56, -42].map((fx, i) => (
          <g key={i} transform={`translate(${fx} -60)`}>
            <circle cx={0} cy={-8} r={5.4} fill={i % 2 ? C.petalPink : C.petalYellow} />
            <circle cx={0} cy={-8} r={2} fill="#ffe9a6" />
          </g>
        ))}
      </g>

      {/* 房门 */}
      <g transform="translate(-30 0)">
        <path d="M 0 0 L 0 -76 A 28 28 0 0 1 56 -76 L 56 0 Z" fill="#5b4433" opacity={state.doorOpen ? 0.95 : 0.12} />
        <g className="door-leaf" style={{ transform: state.doorOpen ? 'scaleX(0.2)' : 'scaleX(1)' }}>
          <path d="M 0 0 L 0 -76 A 28 28 0 0 1 56 -76 L 56 0 Z" fill="url(#sandGrad)" stroke="rgba(140,100,70,0.55)" strokeWidth="2.6" />
          <path d="M 8 -10 L 8 -72 A 20 20 0 0 1 48 -72 L 48 -10 Z" fill="none" stroke="rgba(150,110,80,0.32)" strokeWidth="2" />
          <circle cx={44} cy={-38} r={3.6} fill="#f6dfa8" stroke="rgba(140,100,70,0.5)" strokeWidth="1" />
        </g>
        <rect
          className="interactive"
          x={-6}
          y={-80}
          width={68}
          height={84}
          fill="transparent"
          onPointerDown={(e) => { e.preventDefault(); toggleDoor(); }}
          role="button"
          aria-label="房门"
        />
      </g>

      {/* 门口台阶 */}
      <rect x={-40} y={-5} width={76} height={9} rx={4} fill="#e3cba6" stroke="rgba(150,110,80,0.3)" strokeWidth="1.6" />

      {/* 炊烟 */}
      {smoking && (
        <g key={smokeKey} pointerEvents="none">
          {[0, 1, 2, 3].map((i) => (
            <circle
              key={i}
              className="smoke-puff"
              cx={69}
              cy={-262}
              r={10 + i * 2}
              fill="#f4efe8"
              opacity="0"
              style={{ animationDelay: `${i * 0.55}s` }}
            />
          ))}
        </g>
      )}

      {/* 夜晚窗户投下的暖光 */}
      {night && lit && <ellipse cx={-58} cy={-24} rx={74} ry={26} fill="#ffdf95" opacity="0.16" filter="url(#softBlur)" />}
    </g>
  );
}
