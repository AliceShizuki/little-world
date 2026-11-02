import { useCallback, useEffect, useRef, useState } from 'react';
import { useWorld } from '../state/WorldContext';

/**
 * 太阳
 *  - 轻点：眨眼 → 轻轻旋转 → 光芒小爆发（连续点击不会重复同一个动作）
 *  - 长按：柔和的放射光芒 + 光点闪烁
 *  - 夜晚被月亮取代，点击月亮回到白天
 */
export function Sun() {
  const { layout, night, sfx } = useWorld();
  const r = layout.u * (layout.composition === 'tall' ? 0.072 : 0.036);
  const { x, y } = layout.sun;

  const [step, setStep] = useState(0);
  const [blink, setBlink] = useState(0);
  const [spin, setSpin] = useState(0);
  const [glow, setGlow] = useState(false);
  const [burst, setBurst] = useState(0);

  const pressTimer = useRef<number | null>(null);
  const pressStart = useRef({ x: 0, y: 0 });
  const longFired = useRef(false);
  const blinkTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (pressTimer.current) clearTimeout(pressTimer.current);
      if (blinkTimer.current) clearTimeout(blinkTimer.current);
    },
    [],
  );

  const doBlink = useCallback(() => {
    setBlink((n) => n + 1);
    sfx('sun');
    if (blinkTimer.current) clearTimeout(blinkTimer.current);
    blinkTimer.current = window.setTimeout(() => setBlink(0), 420);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<SVGGElement>) => {
    if (night) return;
    pressStart.current = { x: e.clientX, y: e.clientY };
    longFired.current = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pressTimer.current = window.setTimeout(() => {
      longFired.current = true;
      setGlow(true);
      setBurst((n) => n + 1);
      sfx('sun');
      sfx('sparkle');
    }, 480);
  };

  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const onUp = () => {
    cancelPress();
    if (longFired.current) {
      window.setTimeout(() => setGlow(false), 700);
      return;
    }
    // 连续点击轮换动作
    const next = (step + 1) % 3;
    setStep(next);
    if (next === 1) {
      doBlink();
    } else if (next === 2) {
      setSpin((n) => n + 1);
      sfx('sun');
    } else {
      setBurst((n) => n + 1);
      sfx('sparkle');
    }
  };

  const onMove = (e: React.PointerEvent<SVGGElement>) => {
    if (Math.hypot(e.clientX - pressStart.current.x, e.clientY - pressStart.current.y) > 14) {
      cancelPress();
    }
  };

  return (
    <g
      transform={`translate(${x} ${y})`}
      className={`interactive ${night ? 'is-hidden' : ''}`}
      style={{ opacity: night ? 0 : 1, transition: 'opacity 1.6s ease', pointerEvents: night ? 'none' : 'auto' }}
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerCancel={() => {
        cancelPress();
        setGlow(false);
      }}
      onPointerMove={onMove}
      role="button"
      aria-label="太阳"
    >
      <circle r={r * 3.1} fill="url(#sunGlowGrad)" className="sun-halo" />
      <circle r={r * 2.2} fill="#fff3c4" opacity={0.28} filter="url(#glowBlur)" />

      {/* 光芒：长按后出现 */}
      <g
        className={`sun-rays ${glow ? 'on' : ''}`}
        style={{ opacity: glow ? 1 : 0, transition: 'opacity 0.7s ease' }}
      >
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI * 2) / 12;
          const r1 = r * 1.15;
          const r2 = r * (1.5 + (i % 2) * 0.12);
          return (
            <line
              key={i}
              x1={Math.cos(a) * r1}
              y1={Math.sin(a) * r1}
              x2={Math.cos(a) * r2}
              y2={Math.sin(a) * r2}
              stroke="#ffd884"
              strokeWidth={r * 0.085}
              strokeLinecap="round"
              opacity="0.9"
            />
          );
        })}
      </g>

      <g key={`spin-${spin}`} className={spin > 0 ? 'anim-sun-spin' : ''}>
        <circle r={r} fill="url(#sunBody)" stroke="rgba(214,150,60,0.45)" strokeWidth={r * 0.05} />
        <ellipse cx={-r * 0.42} cy={r * 0.2} rx={r * 0.16} ry={r * 0.1} fill="#f7a08a" opacity="0.45" />
        <ellipse cx={r * 0.42} cy={r * 0.2} rx={r * 0.16} ry={r * 0.1} fill="#f7a08a" opacity="0.45" />
        {/* 眼睛 */}
        <g key={`blink-${blink}`} className={blink ? 'anim-blink' : ''} style={{ transformBox: 'fill-box' }}>
          <ellipse cx={-r * 0.31} cy={-r * 0.08} rx={r * 0.075} ry={r * 0.1} fill="#8a6242" />
          <ellipse cx={r * 0.31} cy={-r * 0.08} rx={r * 0.075} ry={r * 0.1} fill="#8a6242" />
        </g>
        <path
          d={`M ${-r * 0.26} ${r * 0.16} Q 0 ${r * 0.42} ${r * 0.26} ${r * 0.16}`}
          stroke="#8a6242"
          strokeWidth={r * 0.062}
          fill="none"
          strokeLinecap="round"
        />
      </g>

      {/* 光芒小爆发时的光点 */}
      <g key={`burst-${burst}`} className={burst > 0 ? 'anim-sun-burst' : ''}>
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i * Math.PI * 2) / 6 + 0.4;
          return (
            <circle
              key={i}
              cx={Math.cos(a) * r * 1.75}
              cy={Math.sin(a) * r * 1.75}
              r={r * 0.075}
              fill="#fff7d0"
              opacity="0"
            />
          );
        })}
      </g>
    </g>
  );
}

/**
 * 月亮
 *  - 白天高悬一枚淡月亮，轻点它，世界慢慢进入夜晚
 *  - 夜晚月亮又大又亮，再点一下回到白天
 */
export function Moon() {
  const { layout, night, setTimeOfDay, sfx } = useWorld();
  const tall = layout.composition === 'tall';
  const r = layout.u * (night ? (tall ? 0.062 : 0.032) : tall ? 0.03 : 0.0155);
  const pos = night ? layout.sun : layout.dayMoon;

  const onTap = (e: React.PointerEvent<SVGGElement>) => {
    e.preventDefault();
    setTimeOfDay(night ? 'day' : 'night');
    sfx(night ? 'sun' : 'sparkle');
  };

  return (
    <g
      className="interactive"
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: 'transform 2s cubic-bezier(.4,0,.2,1)',
      }}
      onPointerDown={onTap}
      role="button"
      aria-label="月亮"
    >
      <g style={{ opacity: night ? 1 : 0.8, transition: 'opacity 1.8s ease' }}>
        <circle r={r * 3} fill="url(#moonGlowGrad)" opacity={night ? 1 : 0.35} />
        <circle r={r * 1.8} fill="#fff8d8" opacity={night ? 0.16 : 0} filter="url(#glowBlur)" />
        {night ? (
          <circle r={r} fill="url(#moonBody)" stroke="rgba(198,170,110,0.45)" strokeWidth={r * 0.05} />
        ) : (
          <g transform={`scale(${r / 100})`}>
            <circle r={100} fill="url(#moonBody)" mask="url(#moonCrescent)" />
          </g>
        )}
        <g style={{ opacity: night ? 1 : 0, transition: 'opacity 1.2s ease' }}>
          <circle cx={-r * 0.32} cy={-r * 0.3} r={r * 0.17} fill="#e9d79f" opacity="0.5" />
          <circle cx={r * 0.28} cy={r * 0.12} r={r * 0.12} fill="#e9d79f" opacity="0.42" />
          <circle cx={-r * 0.1} cy={r * 0.42} r={r * 0.09} fill="#e9d79f" opacity="0.38" />
        </g>
        {/* 睡着的表情只在夜里出现 */}
        <g style={{ opacity: night ? 1 : 0, transition: 'opacity 1.2s ease' }}>
          <path
            d={`M ${-r * 0.44} ${-r * 0.06} q ${r * 0.13} ${r * 0.1} ${r * 0.26} 0`}
            stroke="#a08a58"
            strokeWidth={r * 0.05}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={`M ${r * 0.18} ${-r * 0.06} q ${r * 0.13} ${r * 0.1} ${r * 0.26} 0`}
            stroke="#a08a58"
            strokeWidth={r * 0.05}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={`M ${-r * 0.1} ${r * 0.24} q ${r * 0.1} ${r * 0.08} ${r * 0.2} 0`}
            stroke="#a08a58"
            strokeWidth={r * 0.04}
            fill="none"
            strokeLinecap="round"
          />
        </g>
      </g>
      <circle r={Math.max(r * 2.4, 26)} fill="transparent" />
    </g>
  );
}
