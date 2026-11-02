/**
 * 共享美术库
 *
 * 八个区域的背景与固定道具全部由这里拼装，颜色统一取自 theme.ts。
 * 每个组件都接受 view（相机视野），并且画得比视野更大一圈——
 * 这样在竖屏手机上多出来的天空与地面不会露出空白。
 */

import { useEffect, useState, type ReactNode } from 'react';
import { C } from '../theme';
import type { Eco, Phase, Season, View, Weather } from './types';

const OUT = 'rgba(109,90,74,0.35)';
const ST = { stroke: OUT, strokeWidth: 2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

/* ───────────────────────── 天空 ───────────────────────── */

/** 天空三段的色阶。整体压低饱和：这是"印刷的自然图鉴"，不是"屏幕上的动画" */
const SKY: Record<Phase, [string, string, string]> = {
  dawn: ['#b9cbd6', '#e6d2ba', '#f0e5cb'],
  day: ['#adc4d1', '#c8d7dc', '#eee3ca'],
  sunset: ['#d2a79e', '#e2c39e', '#eedbbc'],
  night: ['#1b2236', '#2b3450', '#4a4a68'],
};

export function Sky({ view, phase, weather, children }: { view: View; phase: Phase; weather: Weather; children?: ReactNode }) {
  /**
   * 日出日落的过渡：
   * 之前 phase 是硬切的——天一下黑、太阳瞬间跳到另一侧。
   * 这里用一个 state 记住"上一帧的 phase"，每次 phase 变化时，
   * 先以旧颜色渲染一帧、下一帧再切到新颜色，中间的渐变交给 CSS transition。
   * 天空、太阳、云一起走这段 1.6 秒的过渡。
   */
  const [shown, setShown] = useState<Phase>(phase);
  useEffect(() => {
    if (shown === phase) return;
    const t = window.setTimeout(() => setShown(phase), 30);
    return () => clearTimeout(t);
  }, [phase, shown]);

  const [a, b, c] = SKY[shown];
  const id = `sky-${shown}`;
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={a} className="sky-stop" />
          <stop offset="62%" stopColor={b} className="sky-stop" />
          <stop offset="100%" stopColor={c} className="sky-stop" />
        </linearGradient>
      </defs>
      <rect x={view.x - 200} y={view.y - 300} width={view.w + 400} height={view.h + 600} fill={`url(#${id})`} className="sky-rect" />
      {/* 云的光晕 */}
      {shown !== 'night' && (
        <ellipse
          className="sky-glow"
          cx={view.x + view.w * 0.7}
          cy={view.y + view.h * 0.22}
          rx={view.w * 0.3}
          ry={view.h * 0.18}
          fill="#ffffff"
          opacity={weather === 'rain' || weather === 'snow' ? 0.06 : 0.16}
          filter="url(#softBlur)"
        />
      )}
      {children}
    </g>
  );
}

/** 星星：只有夜里出现，各自闪烁节奏不同 */
export function Stars({ view, phase }: { view: View; phase: Phase }) {
  if (phase !== 'night') return null;
  return (
    <g>
      {Array.from({ length: 56 }, (_, i) => {
        const rx = ((i * 9301 + 49297) % 233280) / 233280;
        const ry = ((i * 4271 + 12345) % 199999) / 199999;
        const x = view.x + rx * view.w;
        const y = view.y + ry * view.h * 0.66;
        const r = 1.2 + ((i * 37) % 10) / 7;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={r}
            fill="#fff4cf"
            className="v3-twinkle"
            style={{ animationDelay: `${(i % 13) * 0.42}s`, animationDuration: `${3.4 + (i % 5) * 0.7}s` }}
          />
        );
      })}
    </g>
  );
}

/* ───────────────────────── 地面 ───────────────────────── */

export function Hills({
  view,
  horizon,
  far = '#cfdfc4',
  mid = '#bcd7ab',
}: {
  view: View;
  horizon: number;
  far?: string;
  mid?: string;
}) {
  const x0 = view.x - 200;
  const w = view.w + 400;
  return (
    <g>
      <path
        d={`M ${x0} ${horizon + 30} C ${x0 + w * 0.2} ${horizon - 90}, ${x0 + w * 0.42} ${horizon - 40}, ${x0 + w * 0.6} ${horizon - 70} C ${x0 + w * 0.8} ${horizon - 100}, ${x0 + w * 0.9} ${horizon - 30}, ${x0 + w} ${horizon - 40} L ${x0 + w} ${horizon + 400} L ${x0} ${horizon + 400} Z`}
        fill={far}
      />
      <path
        d={`M ${x0} ${horizon + 70} C ${x0 + w * 0.25} ${horizon + 10}, ${x0 + w * 0.5} ${horizon + 60}, ${x0 + w * 0.72} ${horizon + 20} C ${x0 + w * 0.86} ${horizon - 4}, ${x0 + w * 0.95} ${horizon + 50}, ${x0 + w} ${horizon + 40} L ${x0 + w} ${horizon + 500} L ${x0} ${horizon + 500} Z`}
        fill={mid}
      />
    </g>
  );
}

export function Ground({
  view,
  top,
  near = C.grass,
  far = C.grassFar,
  edge,
}: {
  view: View;
  top: number;
  near?: string;
  far?: string;
  edge?: string;
}) {
  const x0 = view.x - 200;
  const w = view.w + 400;
  const bottom = view.y + view.h + 300;
  return (
    <g>
      <rect x={x0} y={top} width={w} height={bottom - top} fill={far} />
      <path
        d={`M ${x0} ${top + 26} C ${x0 + w * 0.22} ${top - 6}, ${x0 + w * 0.46} ${top + 34}, ${x0 + w * 0.68} ${top + 6} C ${x0 + w * 0.84} ${top - 12}, ${x0 + w * 0.94} ${top + 22}, ${x0 + w} ${top + 12} L ${x0 + w} ${bottom} L ${x0} ${bottom} Z`}
        fill={near}
      />
      {edge && (
        <path
          d={`M ${x0} ${top + 26} C ${x0 + w * 0.22} ${top - 6}, ${x0 + w * 0.46} ${top + 34}, ${x0 + w * 0.68} ${top + 6} C ${x0 + w * 0.84} ${top - 12}, ${x0 + w * 0.94} ${top + 22}, ${x0 + w} ${top + 12}`}
          stroke={edge}
          strokeWidth={7}
          fill="none"
          opacity={0.5}
          strokeLinecap="round"
        />
      )}

      {/*
        草地不是一块色板。远处偏冷、近处偏暖，中间还有一条起伏的明暗交界——
        这三层叠上去，平铺的绿才会变成"一片地"。
        用半透明叠加而不是再取几个颜色，各区域传进来的 near/far 不用改。
      */}
      <path
        d={`M ${x0} ${top + 96} C ${x0 + w * 0.24} ${top + 74}, ${x0 + w * 0.5} ${top + 110}, ${x0 + w * 0.72} ${top + 86} C ${x0 + w * 0.86} ${top + 72}, ${x0 + w * 0.94} ${top + 96}, ${x0 + w} ${top + 88} L ${x0 + w} ${bottom} L ${x0} ${bottom} Z`}
        fill="rgba(58,88,52,0.07)"
      />
      <path
        d={`M ${x0} ${top + 210} C ${x0 + w * 0.3} ${top + 190}, ${x0 + w * 0.62} ${top + 224}, ${x0 + w} ${top + 200} L ${x0 + w} ${bottom} L ${x0} ${bottom} Z`}
        fill="rgba(58,88,52,0.05)"
      />
    </g>
  );
}

/* ───────────────────────── 植物 ───────────────────────── */

export type TreeKind = 'oak' | 'pine' | 'willow' | 'birch' | 'bare';

/**
 * 一团叶子的轮廓（E 版美术的地基）。
 *
 * 为什么不用椭圆：一簇叶子的边界是由一片片叶子顶出来的，是有起伏的；
 * 椭圆一眼就能看出是"画上去的圆形"。这里用 9 个外凸点在半径上抖 0.82~1.16，
 * 再用二次曲线连成波浪边——远看是一团，近看边缘是一片片叶尖。
 *
 * seed 是固定值：同一个物体每次渲染的轮廓必须一模一样，否则会"抖"。
 */
function clumpPath(r: number, seed: number, squash = 0.86): string {
  const N = 11;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < N; i += 1) {
    const a = (i / N) * Math.PI * 2;
    const n = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    // 起伏要大：0.74~1.26。差得小了，一团叶子就成了一个圆
    const k = 0.74 + (n - Math.floor(n)) * 0.52;
    pts.push([Math.cos(a) * r * k, Math.sin(a) * r * k * squash]);
  }
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i <= N; i += 1) {
    const prev = pts[i - 1];
    const cur = pts[i % N];
    const mx = (prev[0] + cur[0]) / 2;
    const my = (prev[1] + cur[1]) / 2;
    d += ` Q ${prev[0].toFixed(1)} ${prev[1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  return `${d} Z`;
}

/**
 * 一簇叶子：暗底 + 主色 + 左上亮斑。
 *
 * 三个平色而不是渐变——这是 E 版的核心取舍：层次靠"三个色阶"表达，
 * 不靠渐变。渐变缩到 60px 会糊成一片，三个色块到多小都还在。
 */
/**
 * 一片橡树叶。
 *
 * 这是 E 版最关键的一笔：参考图里树冠是**能数清的一片片叶子**，
 * 而"一团绿色的云"无论加多少层次都还是云。所以最小单位必须是一片叶子，
 * 有裂片、有叶柄、有明暗。
 *
 * 轮廓写死一次（宽 20、高 48，叶柄在原点，叶尖朝上），
 * 靠 transform 缩放旋转复用——不同大小共用一条路径，比手写十几片省得多。
 */
const OAK_LEAF =
  'M 0 0 C -6 -2 -9 -6 -8 -10 C -15 -7 -18 -13 -13 -18 C -20 -19 -20 -26 -13 -28 ' +
  'C -17 -33 -12 -39 -5 -36 L 0 -44 L 5 -36 C 12 -39 17 -33 13 -28 C 20 -26 20 -19 13 -18 ' +
  'C 18 -13 15 -7 8 -10 C 9 -6 6 -2 0 0 Z';

/**
 * 一片叶子：主色 + 主脉 + 三对侧脉。
 *
 * 光有主脉的叶子读起来还是一块绿片；侧脉才是"植物图鉴"和"卡通树叶"的分界。
 * 侧脉在主脉的裂片凹陷处向外分叉，方向朝叶尖，这是橡树叶实际的长法。
 */
function Leaf({ x, y, s, rot, fill, vein }: { x: number; y: number; s: number; rot: number; fill: string; vein: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d={OAK_LEAF} fill={fill} stroke={vein} strokeWidth={1.05} strokeLinejoin="round" opacity={0.96} />
      <g stroke={vein} strokeWidth={0.95} fill="none" strokeLinecap="round" opacity={0.45}>
        <path d="M 0 -2 L 0 -37" />
        {[-9, -16, -23, -29].map((cy, i) => (
          <g key={i}>
            <path d={`M 0 ${cy} C -4 ${cy - 3} -7 ${cy - 5} -10 ${cy - 5}`} />
            <path d={`M 0 ${cy} C 4 ${cy - 3} 7 ${cy - 5} 10 ${cy - 5}`} />
          </g>
        ))}
      </g>
    </g>
  );
}

export function LeafClump({
  x,
  y,
  r,
  seed,
  leaf,
  dark,
  light,
  squash = 0.86,
}: {
  x: number;
  y: number;
  r: number;
  seed: number;
  leaf: string;
  dark: string;
  light: string;
  squash?: number;
}) {
  const shape = clumpPath(r, seed, squash);
  /**
   * 一团叶子 = 不透明的底色团（保证密实不透光）+ 边缘可数的叶片 + 内部暗斑。
   *
   * 之前底色团只有 0.5 的不透明度、叶片均匀铺满，结果树冠读起来是"一层绿雾上
   * 撒了些小点"。真实的树冠正好相反：**外缘是一片片清楚的叶子，内部是压暗的密实体积**。
   */
  // 叶长 44 × s ≈ r*0.66 → s ≈ r/66。
  // 之前是 r/84，叶子偏小，树冠远看还是一团细碎的绿。
  const N = 9;
  const leaves = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2 + seed * 0.7;
    const jitter = Math.sin(seed * 7.13 + i * 5.71) * 43758.5453;
    // 只走外圈：0.54~0.98。叶片在边缘才看得清，堆在中间只是把团涂花
    const k = 0.54 + (jitter - Math.floor(jitter)) * 0.44;
    return {
      lx: Math.cos(a) * r * k,
      ly: Math.sin(a) * r * k * squash,
      rot: (a * 180) / Math.PI + 90 + (i % 2 ? 18 : -15),
      s: (r / 66) * (0.92 + (i % 3) * 0.1),
      fill: i % 4 === 0 ? light : i % 4 === 3 ? dark : leaf,
    };
  });
  // 内部暗斑：几片压暗的叶子，制造"叶与叶之间的阴影"，树冠才有厚度
  const inner = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * Math.PI * 2 + seed * 1.31;
    const k = 0.16 + ((i * 7 + seed) % 5) * 0.055;
    return { lx: Math.cos(a) * r * k, ly: Math.sin(a) * r * k * squash, rot: (a * 180) / Math.PI + 60 };
  });
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* 暗部：往左下挪一点垫在底下。光从右上来（画面里太阳在右上），影子就在左下 */}
      <path d={shape} fill={dark} transform="translate(-3 4)" />
      <path d={shape} fill={leaf} />
      {inner.map((l, i) => (
        <Leaf key={`i${i}`} x={l.lx} y={l.ly} s={(r / 66) * 0.86} rot={l.rot} fill={dark} vein={dark} />
      ))}
      {leaves.map((l, i) => (
        <Leaf key={i} x={l.lx} y={l.ly} s={l.s} rot={l.rot} fill={l.fill} vein={dark} />
      ))}
      {/* 受光面：右上角一小块 */}
      <path d={clumpPath(r * 0.46, seed + 3, squash)} fill={light} opacity={0.24} transform={`translate(${r * 0.3} ${-r * 0.34})`} />
    </g>
  );
}

export function Tree({
  x,
  y,
  s = 1,
  kind = 'oak',
  season = 'summer',
  night = false,
}: {
  x: number;
  y: number;
  s?: number;
  kind?: TreeKind;
  season?: Season;
  night?: boolean;
}) {
  /**
   * 四季的四个色阶。
   *
   * E 版每个物体只用三个平色：leaf（受光面）/ dark（背光与暗部）/ light（高光）。
   * 夜里整体压暗并偏蓝，而不是直接盖一层黑——盖黑会把颜色压死。
   */
  /**
   * 四季三色。整套压到低饱和的橄榄 / 赭石系——参考图是自然图鉴的调子，
   * 高饱和的粉彩一放进去就"塑料"。这一步比改形状更能统一画风。
   */
  const tone =
    season === 'autumn'
      ? { leaf: '#b07b42', dark: '#8a5c30', light: '#cf9a5f' }
      : season === 'winter'
        ? { leaf: '#a9b4ae', dark: '#8b968f', light: '#c2cdc6' }
        : season === 'spring'
          ? { leaf: '#7d8f56', dark: '#5c6b3f', light: '#9caf6d' }
          : { leaf: '#6b7c4c', dark: '#4a5834', light: '#8a9c62' };
  const { leaf, dark, light } = night
    ? { leaf: '#6b9163', dark: '#4c6b48', light: '#82a877' }
    : tone;
  // 季节形态：冬天阔叶树掉光叶子（用 bare 造型），秋天掉一部分叶子（树冠变稀 + 树下落叶）。
  // 松树是常绿的，冬天只是枝头挂雪，不掉叶。
  const isBare = season === 'winter' && kind !== 'pine' && !night;
  const isAutumn = season === 'autumn' && kind !== 'pine';
  // 冬天树上积雪的平色（夜里不显雪，雪在夜里偏蓝灰）
  const snow = night ? '#8b96a8' : '#eef4f6';
  const snowShade = night ? '#6b768c' : '#d8e2e6';
  // 白桦的树皮是另一种材料，三色跟着换（否则白桦会看起来像一棵灰橡树）
  const isBirch = kind === 'birch';
  const bark = isBirch ? (night ? '#c6bda9' : '#efe9dd') : night ? '#43332a' : '#77573c';
  const barkDark = isBirch ? (night ? '#9d9382' : '#cfc6b4') : night ? '#2a1f16' : '#4a3524';
  const barkLight = isBirch ? '#ffffff' : night ? '#63503c' : '#a3835a';

  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {kind === 'pine' ? (
        <>
          {/* 松树：树干 + 四层塔状枝叶，每层一个色阶 */}
          <path d="M -9 2 C -8 -16 -7 -30 -6 -44 L 6 -44 C 7 -30 8 -16 9 2 Z" fill={bark} stroke={barkDark} strokeWidth={2} strokeLinejoin="round" />
          {[0, 1, 2, 3].map((i) => {
            const yy = -40 + i * -38;
            const w = 54 - i * 11;
            return (
              <g key={i}>
                <path d={`M 0 ${yy - 44} L ${w} ${yy} L ${-w} ${yy} Z`} fill={dark} transform="translate(0 3)" />
                <path d={`M 0 ${yy - 44} L ${w} ${yy} L ${-w} ${yy} Z`} fill={i % 2 ? leaf : light} opacity={i % 2 ? 1 : 0.92} />
                {/* 冬天枝头挂雪：每层塔尖压一条雪线，常绿松针从雪下透出来 */}
                {season === 'winter' && (
                  <path d={`M 0 ${yy - 44} L ${w * 0.6} ${yy - 12} L ${-w * 0.6} ${yy - 12} Z`} fill={snow} opacity={night ? 0.55 : 0.9} />
                )}
              </g>
            );
          })}
        </>
      ) : kind === 'willow' ? (
        <>
          <path d="M -11 2 C -10 -30 -8 -60 -6 -88 L 8 -88 C 8 -60 10 -30 13 2 Z" fill={bark} stroke={barkDark} strokeWidth={2} strokeLinejoin="round" />
          {/* 柳枝：一束下垂的细枝，末端收细。冬天柳条挂霜雪，颜色换成雪色 */}
          {Array.from({ length: 11 }, (_, i) => {
            const dx = -50 + i * 10;
            const len = 66 + (i % 3) * 30;
            return (
              <path
                key={i}
                className="v3-sway"
                d={`M ${dx * 0.4} -116 C ${dx} -104, ${dx * 1.12} ${-116 + len * 0.6}, ${dx * 1.05} ${-116 + len}`}
                stroke={isBare ? (i % 2 ? snowShade : snow) : i % 3 === 0 ? light : leaf}
                strokeWidth={i % 3 === 0 ? 3.4 : 4.6}
                fill="none"
                strokeLinecap="round"
                style={{ animationDelay: `${i * 0.28}s` }}
              />
            );
          })}
          {/* 顶部叶簇：秋天变稀，冬天掉光（只剩垂枝） */}
          {!isBare && <LeafClump x={0} y={-136} r={isAutumn ? 30 : 43} seed={11} leaf={leaf} dark={dark} light={light} />}
        </>
      ) : kind === 'bare' ? (
        <>
          {/* 光秃的树：分叉本身就是主角，画清每根枝的粗细变化 */}
          <path d="M -11 2 C -10 -34 -8 -64 -6 -96 L 8 -96 C 8 -64 10 -34 13 2 Z" fill={bark} stroke={barkDark} strokeWidth={2} strokeLinejoin="round" />
          <g fill="none" stroke={bark} strokeLinecap="round">
            <path d="M 0 -92 C -20 -118 -42 -132 -60 -140" strokeWidth={7} />
            <path d="M 2 -94 C 22 -122 44 -134 62 -142" strokeWidth={7} />
            <path d="M -34 -126 C -46 -146 -54 -156 -60 -168" strokeWidth={4.5} />
            <path d="M 34 -130 C 46 -150 54 -160 60 -172" strokeWidth={4.5} />
            <path d="M 0 -92 C -2 -126 2 -158 4 -186" strokeWidth={6} />
            <path d="M -58 -140 C -70 -148 -78 -152 -86 -152" strokeWidth={3} />
            <path d="M 60 -142 C 72 -148 80 -150 88 -150" strokeWidth={3} />
          </g>
        </>
      ) : (
        <>
          {/* ── 阔叶树（森林主角）──
              结构顺序：根 → 主干 → 主枝 → 次枝 → 叶簇。
              树干是一段段收细的锥形，不是一根等宽的柱子。 */}
          <g>
            {/* 两条探出去的根须：打破左右对称，树才不像放在花盆里 */}
            <path d="M -27 12 C -33 14 -39 16 -44 19" stroke={barkDark} strokeWidth={4.2} strokeLinecap="round" fill="none" opacity={0.5} />
            <path d="M 25 12 C 31 14 36 15 41 18" stroke={barkDark} strokeWidth={4.2} strokeLinecap="round" fill="none" opacity={0.38} />
            {/* 树贴地的那道影：没有它，树干像悬在草地上 */}
            <ellipse cx={0} cy={13} rx={50} ry={6} fill="rgba(58,72,44,0.2)" />

            {/*
              主干：一条连续的轮廓，底部一直扩到 59 宽。
              板根是**同一条轮廓的一部分**——单独画一个喇叭口再叠上去，
              两层之间会出现一条横向接缝，看着像树干上套了个壳（这条接缝真的出现过）。
              宽高比也调过：底宽 60、高 114 画出来是一截树桩，不是树干。
            */}
            <path
              d="M -30 12 C -28 0 -25 -22 -22 -44 C -21 -72 -17 -102 -12 -132 L 8 -132 C 13 -102 17 -74 19 -44 C 22 -22 26 0 29 12 C 15 19 -16 19 -30 12 Z"
              fill={bark}
              stroke={barkDark}
              strokeWidth={2.2}
              strokeLinejoin="round"
            />
            {/*
              圆柱是靠**明暗分界线**立起来的，不是靠渐变。
              左边一条宽暗带、右边一条较窄的亮带，中间留出本色——三块颜色就够。

              注意这两块必须用 fill 并且贴着轮廓走，不能用 stroke：
              粗 stroke 的端头会探出树干，在轮廓外糊出一条灰带（真的出现过）。
            */}
            <path
              d="M -28 10 C -26 -2 -23 -23 -20 -44 C -19 -72 -15 -101 -10 -130 L -5 -130 C -9 -101 -12 -72 -13 -44 C -16 -23 -18 0 -19 12 Z"
              fill={barkDark}
              opacity={0.48}
            />
            <path
              d="M 5 -130 L 7 -130 C 12 -101 16 -73 17 -44 C 20 -23 23 0 25 10 C 22 13 19 13 17 12 C 16 -2 13 -23 11 -44 C 9 -73 7 -101 5 -130 Z"
              fill={barkLight}
              opacity={0.56}
            />
            <path d="M 24 8 C 23 -12 21 -44 18 -74 C 16 -98 12 -118 8 -128" stroke={barkLight} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.4} />

            {/* 纵向裂纹：树皮是竖着裂开的。长短、粗细都要不一样，整齐了就成斑马 */}
            <g stroke={barkDark} fill="none" strokeLinecap="round" opacity={0.32}>
              <path d="M -2 -14 C 0 -50 2 -88 1 -124" strokeWidth={2.2} />
              <path d="M 8 -22 C 10 -56 9 -90 7 -120" strokeWidth={1.4} />
              <path d="M -10 -26 C -9 -58 -8 -86 -7 -114" strokeWidth={1.2} />
              <path d="M 13 -34 C 14 -60 14 -84 12 -104" strokeWidth={1} />
              <path d="M 4 -50 C 5 -66 5 -78 4 -90" strokeWidth={2.4} opacity={0.75} />
              <path d="M -6 -72 C -5 -84 -5 -94 -5 -104" strokeWidth={1.8} opacity={0.7} />
              <path d="M 11 -84 C 12 -96 12 -106 11 -114" strokeWidth={1.6} opacity={0.6} />
            </g>
            {/* 横向皮孔：短促的几笔，树皮才有年代感 */}
            <g stroke={barkDark} fill="none" strokeLinecap="round" opacity={0.22}>
              <path d="M -7 -30 L 0 -29" strokeWidth={1.4} />
              <path d="M 4 -60 L 11 -59" strokeWidth={1.2} />
              <path d="M -8 -90 L -2 -89" strokeWidth={1.2} />
              <path d="M 6 -110 L 12 -109" strokeWidth={1} />
            </g>

            {/* 主枝：从分叉点伸出去，越往上越细。伸得比叶簇深一点，枝才像"撑着"树冠 */}
            <g fill="none" stroke={bark} strokeLinecap="round">
              <path d="M -7 -124 C -30 -148 -52 -166 -72 -182" strokeWidth={12} />
              <path d="M 4 -126 C 30 -150 54 -168 76 -184" strokeWidth={12} />
              <path d="M -2 -128 C -3 -158 1 -186 3 -212" strokeWidth={9} />
            </g>
            {/* 主枝的受光边：光从右上来，亮线压在每根枝的上沿 */}
            <g fill="none" stroke={barkLight} strokeLinecap="round" opacity={0.42}>
              <path d="M -8 -127 C -31 -151 -52 -168 -71 -183" strokeWidth={3} />
              <path d="M 3 -129 C 29 -153 53 -170 75 -185" strokeWidth={3} />
              <path d="M -3 -131 C -4 -160 0 -187 2 -213" strokeWidth={2.4} />
            </g>
            <g fill="none" stroke={barkDark} strokeLinecap="round" opacity={0.32}>
              <path d="M -7 -121 C -30 -145 -52 -163 -72 -179" strokeWidth={2} transform="translate(0 6)" />
              <path d="M 4 -123 C 30 -147 54 -165 76 -181" strokeWidth={2} transform="translate(0 6)" />
            </g>
            {/* 次枝 */}
            <g fill="none" stroke={bark} strokeLinecap="round">
              <path d="M -40 -156 C -50 -176 -56 -190 -60 -208" strokeWidth={6} />
              <path d="M -12 -196 C -20 -210 -28 -218 -36 -224" strokeWidth={5} />
              <path d="M 42 -160 C 52 -180 58 -194 62 -212" strokeWidth={6} />
              <path d="M 8 -202 C 18 -216 26 -224 34 -230" strokeWidth={5} />
              <path d="M 68 -178 C 82 -184 92 -188 100 -188" strokeWidth={4.2} />
              <path d="M -66 -178 C -80 -184 -90 -188 -98 -188" strokeWidth={4.2} />
            </g>
            {/* 次枝的受光边：细，但少了枝就成黑线 */}
            <g fill="none" stroke={barkLight} strokeLinecap="round" opacity={0.34}>
              <path d="M -40 -158 C -50 -178 -56 -191 -60 -209" strokeWidth={1.6} />
              <path d="M 42 -162 C 52 -182 58 -195 62 -213" strokeWidth={1.6} />
              <path d="M -2 -130 C -3 -159 1 -187 3 -213" strokeWidth={1.5} />
            </g>
          </g>

          {/*
            叶簇：十四团，互相咬合成一整片树冠。
            密度是这棵树的性格——叶子稀了就像秋天掉光了，孩子会觉得"这棵树病了"。
            底下的团先用深色，上面的团用亮色，光从左上来的关系才成立。
          */}
          {/*
            树冠 = 九簇，每簇挂在一根枝的末端。
            这是参考图的结构：粗枝分叉，枝头各有自己的一团叶，簇与簇之间留缝。
            之前是"一个大团 + 顶部几根枝"，怎么调都还是一颗绿球。
            簇小（r 26~34）才能看见枝，也才透得过光。

            季节形态：
              · 秋天掉一部分叶（只保留外围几簇，中间透空）——树冠变稀；
              · 冬天整棵掉光，枝头挂雪（不画叶簇，改在枝头压雪块）。
          */}
          {!isBare && (
            <g className="v3-sway-slow" transform="translate(0 -24)">
              <LeafClump x={-96} y={-146} r={27} seed={10} leaf={leaf} dark={dark} light={light} />
              <LeafClump x={-62} y={-170} r={32} seed={1} leaf={leaf} dark={dark} light={light} />
              <LeafClump x={-32} y={-196} r={28} seed={4} leaf={leaf} dark={dark} light={light} />
              {/* 秋天：中间与顶部的叶簇掉光，露出枝杈，树冠"透空" */}
              {!isAutumn && <LeafClump x={2} y={-172} r={33} seed={12} leaf={leaf} dark={dark} light={light} />}
              {!isAutumn && <LeafClump x={34} y={-200} r={28} seed={7} leaf={leaf} dark={dark} light={light} />}
              <LeafClump x={62} y={-172} r={32} seed={2} leaf={leaf} dark={dark} light={light} />
              <LeafClump x={98} y={-148} r={27} seed={8} leaf={leaf} dark={dark} light={light} />
              {!isAutumn && <LeafClump x={-10} y={-228} r={31} seed={6} leaf={leaf} dark={dark} light={light} />}
              {!isAutumn && <LeafClump x={22} y={-242} r={25} seed={9} leaf={leaf} dark={dark} light={light} />}
              {/* 底下两个小簇：填住枝干与树冠之间的空档，树才不会像一把伞 */}
              {!isAutumn && <LeafClump x={-74} y={-176} r={22} seed={13} leaf={leaf} dark={dark} light={light} />}
              {!isAutumn && <LeafClump x={78} y={-178} r={22} seed={14} leaf={leaf} dark={dark} light={light} />}
              {/* 再补两簇更低的：树冠下缘要是平的，整棵树就成了一把伞 */}
              {!isAutumn && <LeafClump x={-28} y={-152} r={25} seed={15} leaf={leaf} dark={dark} light={light} />}
              {!isAutumn && <LeafClump x={44} y={-156} r={23} seed={16} leaf={leaf} dark={dark} light={light} />}
            </g>
          )}

          {/* 冬天：枝头挂雪。雪块压在几条主枝与次枝的上沿，落点与树叶的受光面一致（光从右上来） */}
          {isBare && (
            <g fill={snow} opacity={night ? 0.6 : 0.92}>
              <ellipse cx={-72} cy={-186} rx={20} ry={6} transform="rotate(18 -72 -186)" />
              <ellipse cx={76} cy={-190} rx={20} ry={6} transform="rotate(-18 76 -190)" />
              <ellipse cx={2} cy={-216} rx={17} ry={5.4} />
              <ellipse cx={-40} cy={-210} rx={15} ry={5} transform="rotate(12 -40 -210)" />
              <ellipse cx={40} cy={-218} rx={15} ry={5} transform="rotate(-12 40 -218)" />
              <ellipse cx={-60} cy={-150} rx={12} ry={4.4} transform="rotate(20 -60 -150)" />
              <ellipse cx={60} cy={-152} rx={12} ry={4.4} transform="rotate(-20 60 -152)" />
            </g>
          )}

          {/*
            树冠的体积：右下压一层暗、右上提一层亮。
            只靠单片叶子的明暗，整团叶子还是"平贴"的——远看要有球的感觉。
            ⚠ 半径必须小于树冠轮廓：试过 116，结果在树冠外面露出一块灰影，
            飘在天空上像一朵脏云。
          */}
          {!isBare && (
            <g transform="translate(0 -24)" pointerEvents="none">
              <path d={clumpPath(78, 31, 0.78)} fill={dark} opacity={0.14} transform="translate(10 -212)" />
              <path d={clumpPath(48, 33, 0.8)} fill={light} opacity={0.14} transform="translate(42 -250)" />
            </g>
          )}

          {/* 秋天：树根旁落了一圈叶。深色在下、亮色在上，像刚飘下来的 */}
          {isAutumn && (
            <g pointerEvents="none" opacity={night ? 0.6 : 0.85}>
              {[
                [-40, 10, 0.9, 20],
                [-16, 13, 1, -14],
                [8, 12, 0.85, 30],
                [30, 11, 1, -22],
                [44, 8, 0.8, 10],
                [-54, 6, 0.75, -30],
                [54, 5, 0.7, 24],
              ].map(([dx, dy, k, rot], i) => (
                <path
                  key={i}
                  transform={`translate(${dx} ${dy}) scale(${k}) rotate(${rot})`}
                  d="M -8 0 C -11 -7 -2 -11 5 -8 C 8 -2 3 4 -8 0 Z"
                  fill={i % 2 ? '#c9853f' : '#b07b42'}
                  stroke="rgba(109,90,74,0.3)"
                  strokeWidth={1}
                />
              ))}
            </g>
          )}

        </>
      )}
    </g>
  );
}

export function Bush({ x, y, s = 1, color = C.leaf, dark = C.leafDark }: { x: number; y: number; s?: number; color?: string; dark?: string }) {
  /**
   * 灌木：三团叶子咬合，每团三色。
   * 原来三个椭圆一叠——椭圆没有"叶子顶出来的边"，远看就是个绿气球。
   */
  const light = '#b9e2a2';
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <LeafClump x={-15} y={-15} r={16} seed={21} leaf={dark} dark={dark} light={dark} squash={0.92} />
      <LeafClump x={15} y={-13} r={14} seed={22} leaf={color} dark={dark} light={light} squash={0.92} />
      <LeafClump x={0} y={-24} r={18} seed={23} leaf={color} dark={dark} light={light} squash={0.9} />
      {/* 底部一条暗影：灌木是贴着地的，没有这条会像浮着 */}
      <ellipse cx={0} cy={-1} rx={24} ry={4} fill="rgba(70,94,58,0.18)" />
    </g>
  );
}

export function Tuft({ x, y, s = 1, color = '#5f8f56' }: { x: number; y: number; s?: number; color?: string }) {
  /**
   * 一丛草：五根，长短不一、方向散开。
   * 关键是"根根从地里长出来"——之前的写法三根都从同一点伸出，像插上去的。
   */
  const blades: Array<[number, number, number]> = [
    [-6, -9, 1.6],
    [-2, -15, 2],
    [2, -20, 2.2],
    [6, -12, 1.8],
    [9, -6, 1.5],
  ];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={0.8}>
      {blades.map(([bx, by, w], i) => (
        <path
          key={i}
          d={`M ${bx} 0 C ${bx - 1} ${by * 0.45} ${bx + by * 0.35} ${by * 0.75} ${bx + by * 0.5} ${by}`}
          stroke={color}
          strokeWidth={w}
          fill="none"
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

export function FlowerProp({ x, y, s = 1, color = C.petalPink }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M 0 0 C -1 -10 1 -14 0 -20" stroke="#6fa961" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      {/* 花瓣：椭圆而不是圆——圆花瓣堆起来像"一颗糖"，椭圆才有朝向 */}
      {Array.from({ length: 5 }, (_, i) => {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        return (
          <ellipse
            key={i}
            cx={Math.cos(a) * 5.6}
            cy={-22 + Math.sin(a) * 5.6}
            rx={3.4}
            ry={4.6}
            fill={color}
            transform={`rotate(${(a * 180) / Math.PI + 90} ${Math.cos(a) * 5.6} ${-22 + Math.sin(a) * 5.6})`}
          />
        );
      })}
      <circle cx={0} cy={-22} r={2.8} fill={C.flowerCenter} />
      {/* 叶：花枝上有一片，才不像"插在棍子上的糖" */}
      <path d="M 0 -8 C 4 -10 7 -8 8 -4 C 4 -3 1 -5 0 -8 Z" fill="#6fa961" opacity={0.9} />
    </g>
  );
}

export function Rock({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M -24 0 C -26 -14 -14 -26 0 -26 C 14 -26 26 -16 24 0 Z" fill="#c9c6bd" {...ST} />
      <path d="M -14 -6 C -12 -16 -4 -20 4 -18" stroke="#e8e6df" strokeWidth={3} fill="none" strokeLinecap="round" />
    </g>
  );
}

/* ───────────────────────── 建筑 ───────────────────────── */

/**
 * 会唱歌的一排东西（石头 / 贝壳 / 玻璃瓶）。
 *
 * 五个一组、从低到高，敲出来的音高和它们的大小、颜色深浅一起往上走——
 * 孩子先发现"大小不一样"，再发现"声音不一样"，这两件事连起来就是"顺序"。
 *
 * 第一个参数直接吃 `CHIMES` 里的那一条，坐标只写一份：
 * 画面按这份数据画，热区也按这份数据生成，不会各画各的。
 */
export function ChimeRow({
  set,
  night = false,
}: {
  set: { x: number; y: number; gap: number; size: number; look: 'stone' | 'bottle' | 'shell' };
  night?: boolean;
}) {
  const N = 5;
  return (
    <g>
      {Array.from({ length: N }, (_, i) => {
        const x = set.x + i * set.gap;
        const r = set.size * (0.86 + i * 0.055);

        if (set.look === 'stone') {
          // 河石：底边贴地、顶面略斜，一块有受光面、一块有背光面、底下一片苔
          const base = 50 + i * 3;
          return (
            <g key={i} transform={`translate(${x} ${set.y})`}>
              <ellipse cx={0} cy={2} rx={r * 0.95} ry={3.2} fill="rgba(60,50,40,0.16)" />
              <path
                d={`M ${-r} 0 C ${-r - 3} ${-r * 0.55} ${-r * 0.5} ${-r * 1.12} ${r * 0.05} ${-r * 1.24} C ${r * 0.62} ${-r * 1.32} ${r + 3} ${-r * 0.6} ${r} 0 Z`}
                fill={`hsl(34 10% ${base}%)`}
                {...ST}
              />
              <path
                d={`M ${r * 0.1} ${-r * 1.22} C ${r * 0.65} ${-r * 1.22} ${r + 2} ${-r * 0.6} ${r} 0 L ${r * 0.25} 0 C ${r * 0.36} ${-r * 0.42} ${r * 0.3} ${-r * 0.92} ${r * 0.1} ${-r * 1.22} Z`}
                fill={`hsl(34 12% ${base + 13}%)`}
                opacity={0.85}
              />
              <path
                d={`M ${-r} 0 C ${-r - 3} ${-r * 0.55} ${-r * 0.5} ${-r * 1.12} ${r * 0.05} ${-r * 1.24} L ${-r * 0.12} ${-r * 0.62} L ${-r * 0.36} 0 Z`}
                fill={`hsl(34 10% ${base - 13}%)`}
                opacity={0.85}
              />
              {/* 一道裂纹、一片贴地的苔：石头才有"放久了"的感觉 */}
              <path
                d={`M ${-r * 0.34} ${-r * 0.98} C ${-r * 0.2} ${-r * 0.62} ${-r * 0.3} ${-r * 0.32} ${-r * 0.4} ${-r * 0.06}`}
                stroke={`hsl(34 10% ${base - 18}%)`}
                strokeWidth={1.2}
                fill="none"
                opacity={0.5}
              />
              <ellipse cx={-r * 0.38} cy={-r * 0.1} rx={r * 0.34} ry={r * 0.14} fill="#6b7c4c" opacity={0.35} />
            </g>
          );
        }
        if (set.look === 'shell') {
          return (
            <g key={i} transform={`translate(${x} ${set.y})`}>
              <path d={`M 0 0 C ${-r} ${-r * 0.4} ${-r * 0.75} ${-r * 1.5} 0 ${-r * 1.55} C ${r * 0.75} ${-r * 1.5} ${r} ${-r * 0.4} 0 0 Z`} fill={`hsl(${18 + i * 6} 52% ${82 - i * 3}%)`} {...ST} />
              {[0, 1, 2].map((j) => (
                <path key={j} d={`M 0 -2 C ${(j - 1) * r * 0.32} ${-r * 0.7} ${(j - 1) * r * 0.4} ${-r * 1.1} 0 ${-r * 1.45}`} stroke="rgba(190,150,130,0.5)" strokeWidth={1.4} fill="none" />
              ))}
              <ellipse cx={0} cy={2} rx={r * 0.85} ry={3} fill="rgba(60,50,40,0.14)" />
            </g>
          );
        }
        // 玻璃瓶：水位越高音越高（现实里也是这么回事）
        const h = r * (1.5 + i * 0.24);
        const wx = r * 0.9;
        return (
          <g key={i} transform={`translate(${x} ${set.y})`}>
            <path
              d={`M ${-wx} 0 L ${-wx} ${-h * 0.62} Q ${-wx} ${-h * 0.78} ${-wx * 0.36} ${-h * 0.85} L ${-wx * 0.36} ${-h} Q ${-wx * 0.36} ${-h * 1.06} ${-wx * 0.2} ${-h * 1.07} L ${wx * 0.2} ${-h * 1.07} Q ${wx * 0.36} ${-h * 1.06} ${wx * 0.36} ${-h} L ${wx * 0.36} ${-h * 0.85} Q ${wx} ${-h * 0.78} ${wx} ${-h * 0.62} L ${wx} 0 Z`}
              fill={`rgba(206,232,236,${0.55 + i * 0.05})`}
              stroke="rgba(120,150,160,0.55)"
              strokeWidth={1.8}
            />
            {/* 水：从瓶底往上，越靠右越满 */}
            <path d={`M ${-wx + 1.2} -1.5 L ${-wx + 1.2} ${-h * 0.34 - i * 2} Q 0 ${-h * 0.28 - i * 2.4} ${wx - 1.2} ${-h * 0.34 - i * 2} L ${wx - 1.2} -1.5 Z`} fill={`rgba(126,196,226,${0.5 + i * 0.06})`} />
            <ellipse cx={0} cy={2} rx={wx * 1.05} ry={3} fill="rgba(60,50,40,0.13)" />
            <path d={`M ${-wx * 0.5} ${-h * 0.8} L ${-wx * 0.5} ${-h * 0.2}`} stroke="rgba(255,255,255,0.5)" strokeWidth={1.6} strokeLinecap="round" />
          </g>
        );
      })}
      {/* 夜里给一点点反光，不然站在旁边看不见 */}
      {night && <rect x={set.x - set.size * 2} y={set.y - set.size * 3.2} width={(set.gap * 4 + set.size * 4)} height={set.size * 3.4} fill="rgba(220,230,255,0.05)" rx={10} />}
    </g>
  );
}

export function Cottage({
  x,
  y,
  s = 1,
  wall = C.houseWall,
  roof = C.houseRoof,
  lit = false,
}: {
  x: number;
  y: number;
  s?: number;
  wall?: string;
  roof?: string;
  lit?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M -110 -8 L -110 -130 L 0 -212 L 110 -130 L 110 -8 Z" fill={wall} {...ST} />
      <path d="M -124 -126 L 0 -218 L 124 -126 L 132 -138 L 0 -238 L -132 -138 Z" fill={roof} {...ST} />
      <rect x={54} y={-208} width={20} height={54} rx={4} fill="#d0916a" {...ST} />
      <rect x={-96} y={-112} width={52} height={46} rx={4} fill={lit ? C.houseWindowLight : C.houseWindow} {...ST} />
      <path d="M -70 -112 L -70 -66 M -96 -89 L -44 -89" stroke="#ffffff" strokeWidth={2.1} opacity={0.8} />
      <path d="M 12 -8 L 12 -78 C 12 -92 60 -92 60 -78 L 60 -8 Z" fill={C.houseDoor} {...ST} />
      <circle cx={52} cy={-42} r={3} fill="#f5d78e" />
      <path d="M -104 -8 C -60 -2 60 -2 104 -8" stroke="rgba(170,140,105,0.35)" strokeWidth={6} fill="none" />
      {lit && <circle cx={-70} cy={-89} r={46} fill="#ffe2a0" opacity={0.25} filter="url(#softBlur)" />}
    </g>
  );
}

export function Barn({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-120} y={-150} width={240} height={150} fill="#e8a97e" {...ST} />
      <path d="M -132 -148 L 0 -224 L 132 -148 Z" fill="#c9724f" {...ST} />
      <path d="M -34 -150 L -34 -96 L 34 -96 L 34 -150 Z" fill="#f7ecd8" {...ST} />
      <path d="M -34 -96 L 34 -150 M 34 -96 L -34 -150" stroke="#c9724f" strokeWidth={3} />
      <rect x={-104} y={-136} width={44} height={38} rx={4} fill="#cfe6f2" {...ST} />
      <rect x={60} y={-136} width={44} height={38} rx={4} fill="#cfe6f2" {...ST} />
    </g>
  );
}

export function TownHouse({
  x,
  y,
  s = 1,
  color,
  roof = '#c98a6a',
  lit = false,
  awning,
}: {
  x: number;
  y: number;
  s?: number;
  color: string;
  roof?: string;
  lit?: boolean;
  awning?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-100} y={-180} width={200} height={180} fill={color} {...ST} />
      <rect x={-108} y={-192} width={216} height={16} rx={4} fill={roof} {...ST} />
      {[0, 1].map((r) =>
        [0, 1].map((c2) => (
          <rect
            key={`${r}-${c2}`}
            x={-76 + c2 * 74}
            y={-166 + r * 62}
            width={48}
            height={40}
            rx={4}
            fill={lit ? '#ffe2a0' : '#cfe6f2'}
            {...ST}
          />
        )),
      )}
      {awning && (
        <g>
          <path d="M -84 -112 L 84 -112 L 74 -84 L -74 -84 Z" fill={awning} {...ST} />
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i} d={`M ${-76 + i * 32} -112 L ${-70 + i * 32} -84`} stroke="#ffffff" strokeWidth={8} opacity={0.45} />
          ))}
        </g>
      )}
      <rect x={-25} y={-80} width={50} height={80} rx={5} fill="#b98b62" {...ST} />
      <rect x={-18} y={-72} width={36} height={30} rx={3} fill="#a8814f" opacity={0.85} />
      <rect x={-18} y={-34} width={36} height={26} rx={3} fill="#a8814f" opacity={0.85} />
      <circle cx={18} cy={-42} r={3.2} fill="#f5d78e" />
      <rect x={-30} y={-3} width={60} height={5} rx={2} fill="#cfc7b2" />
    </g>
  );
}

export function Lighthouse({ x, y, s = 1, lit = false }: { x: number; y: number; s?: number; lit?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M -34 0 L -22 -172 L 22 -172 L 34 0 Z" fill="#fdfaf3" {...ST} />
      <path d="M -28 -40 L 28 -40 L 26 -70 L -26 -70 Z" fill="#e8695f" opacity={0.85} />
      <path d="M -24 -110 L 24 -110 L 22 -136 L -22 -136 Z" fill="#e8695f" opacity={0.85} />
      <rect x={-28} y={-196} width={56} height={24} rx={4} fill="#f5c86a" {...ST} />
      <path d="M -26 -196 L 0 -230 L 26 -196 Z" fill="#c9724f" {...ST} />
      {lit && <circle cx={0} cy={-184} r={54} fill="#ffe9b8" opacity={0.35} filter="url(#softBlur)" />}
      <circle cx={0} cy={-184} r={9} fill={lit ? '#fff3c4' : '#e8dfc8'} />
    </g>
  );
}

/* ───────────────────────── 水 ───────────────────────── */

export function Water({
  view,
  top,
  colorTop = C.waterTop,
  colorBottom = C.waterBottom,
}: {
  view: View;
  top: number;
  colorTop?: string;
  colorBottom?: string;
}) {
  const x0 = view.x - 200;
  const w = view.w + 400;
  const id = `water-${top}`;
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colorTop} />
          <stop offset="100%" stopColor={colorBottom} />
        </linearGradient>
      </defs>
      <rect x={x0} y={top} width={w} height={view.y + view.h + 300 - top} fill={`url(#${id})`} />
      <path
        d={`M ${x0} ${top} C ${x0 + w * 0.2} ${top - 8}, ${x0 + w * 0.34} ${top + 8}, ${x0 + w * 0.52} ${top} C ${x0 + w * 0.7} ${top - 8}, ${x0 + w * 0.86} ${top + 8}, ${x0 + w} ${top}`}
        stroke={C.waterLight}
        strokeWidth={6}
        fill="none"
        opacity={0.75}
        strokeLinecap="round"
      />
      <path
        d={`M ${x0} ${top} C ${x0 + w * 0.2} ${top - 8}, ${x0 + w * 0.34} ${top + 8}, ${x0 + w * 0.52} ${top} C ${x0 + w * 0.7} ${top - 8}, ${x0 + w * 0.86} ${top + 8}, ${x0 + w} ${top}`}
        stroke="#ffffff"
        strokeWidth={2.4}
        fill="none"
        opacity={0.5}
        strokeLinecap="round"
      />
    </g>
  );
}


/* ───────────────────────── 天空物件 ───────────────────────── */

/** 太阳：白天挂在天上，日出日落时更低更暖，夜里不画 */
export function Sun({
  view,
  phase,
  weather,
}: {
  view: View;
  phase: Phase;
  weather: Weather;
}) {
  /**
   * 太阳的位置、颜色跟着 phase 平滑过渡（1.6 秒），
   * 而不是从日出位置瞬间跳到白天位置。
   * 位置用 transform 过渡（只动 translate，不重算坐标），
   * 颜色用 fill 的 CSS transition。
   */
  const [shown, setShown] = useState<Phase>(phase);
  useEffect(() => {
    if (shown === phase) return;
    const t = window.setTimeout(() => setShown(phase), 30);
    return () => clearTimeout(t);
  }, [phase, shown]);

  if (shown === 'night') return null;
  const low = shown === 'dawn' || shown === 'sunset';
  /*
   * 太阳位置：直接用 cx/cy 定位（SVG 用户单位），
   * 过渡靠 CSS transition 作用于 cx/cy（现代浏览器都支持）。
   * 不要用 CSS `transform: translate` —— 在 SVG 里它的无单位长度是 CSS px，
   * 会和 viewBox 的用户单位错位，太阳就跑到屏幕中心不动了（真的发生过）。
   */
  const x = view.x + view.w * (shown === 'dawn' ? 0.26 : 0.8);
  const y = view.y + view.h * (low ? 0.32 : 0.15);
  const r = Math.max(26, view.w * 0.032);
  const warm = shown === 'sunset' ? '#ffb877' : shown === 'dawn' ? '#ffd9a8' : '#ffe7a4';
  const dim = weather === 'rain' || weather === 'snow' || weather === 'cloudy';

  const move = { transition: 'cx 1.6s cubic-bezier(.4,0,.2,1), cy 1.6s cubic-bezier(.4,0,.2,1), fill 1.6s ease' };

  return (
    <g pointerEvents="none" opacity={dim ? 0.34 : 1} style={{ transition: 'opacity 1.6s ease' }}>
      <circle cx={x} cy={y} r={r * 3.4} fill="#ffe9b8" opacity={0.22} filter="url(#softBlur)" style={move} />
      <circle cx={x} cy={y} r={r * 1.5} fill="#ffeec2" opacity={0.45} filter="url(#softBlur)" style={move} />
      <circle cx={x} cy={y} r={r} fill={warm} style={move} />
      <circle cx={x - r * 0.25} cy={y - r * 0.28} r={r * 0.34} fill="#fff6d8" opacity={0.6} style={move} />
      {!dim && (
        <g stroke={warm} strokeWidth={2.6} strokeLinecap="round" opacity={0.5} style={{ transition: 'stroke 1.6s ease' }}>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (Math.PI / 4) * i + 0.2;
            const r0 = r * 1.24;
            const r1 = r * (1.5 + (i % 2) * 0.16);
            return (
              <path key={i} d={`M ${x + Math.cos(a) * r0} ${y + Math.sin(a) * r0} L ${x + Math.cos(a) * r1} ${y + Math.sin(a) * r1}`} style={move} />
            );
          })}
        </g>
      )}
    </g>
  );
}

/** 云：三朵高低不同，各自慢慢飘 */
export function Clouds({ view, phase, weather }: { view: View; phase: Phase; weather: Weather }) {
  const [shown, setShown] = useState<Phase>(phase);
  useEffect(() => {
    if (shown === phase) return;
    const t = window.setTimeout(() => setShown(phase), 30);
    return () => clearTimeout(t);
  }, [phase, shown]);

  const dark = shown === 'night' ? 0.32 : weather === 'rain' || weather === 'cloudy' ? 0.86 : 1;
  const tint = shown === 'night' ? '#b9c4dd' : shown === 'sunset' || shown === 'dawn' ? '#ffe8d8' : '#ffffff';
  const shade = shown === 'night' ? '#8f9ebb' : '#e3edf6';
  const list = [
    { x: view.x + view.w * 0.18, y: view.y + view.h * 0.14, s: 1 },
    { x: view.x + view.w * 0.52, y: view.y + view.h * 0.24, s: 0.72 },
    { x: view.x + view.w * 0.9, y: view.y + view.h * 0.32, s: 0.88 },
  ];
  return (
    <g pointerEvents="none" opacity={dark} style={{ transition: 'opacity 1.6s ease' }}>
      {list.map((c, i) => (
        <g key={i} className="v3-drift-cloud" style={{ animationDelay: `${i * 6}s`, animationDuration: `${52 + i * 14}s` }}>
          <g transform={`translate(${c.x} ${c.y}) scale(${c.s})`}>
            <ellipse cx={-42} cy={-4} rx={34} ry={22} fill={tint} opacity={0.95} style={{ transition: 'fill 1.6s ease' }} />
            <ellipse cx={6} cy={-16} rx={44} ry={30} fill={tint} opacity={0.97} style={{ transition: 'fill 1.6s ease' }} />
            <ellipse cx={50} cy={-2} rx={32} ry={21} fill={tint} opacity={0.95} style={{ transition: 'fill 1.6s ease' }} />
            <ellipse cx={0} cy={6} rx={62} ry={16} fill={shade} opacity={0.55} style={{ transition: 'fill 1.6s ease' }} />
          </g>
        </g>
      ))}
    </g>
  );
}

/** 一丛水边的芦苇：给岸边一点"长着东西"的感觉 */
export function Reeds({ x, y, s = 1, color = '#7fae6e' }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} pointerEvents="none">
      {[
        [-10, 44, -6],
        [0, 56, 2],
        [9, 40, 8],
        [16, 30, 12],
      ].map(([dx, h, bend], i) => (
        <path
          key={i}
          d={`M ${dx} 0 C ${dx + (bend as number) * 0.4} ${-(h as number) * 0.5}, ${dx + (bend as number) * 0.8} ${-(h as number) * 0.8}, ${dx + (bend as number)} ${-(h as number)}`}
          stroke={color}
          strokeWidth={3 - i * 0.3}
          fill="none"
          strokeLinecap="round"
          className="v3-sway"
          style={{ animationDelay: `${i * 0.4}s` }}
        />
      ))}
    </g>
  );
}

/** 区域场景组件的统一入参 */
export interface SceneProps {
  view: View;
  phase: Phase;
  weather: Weather;
  season: Season;
  night: boolean;
  /** 世界状态：水位、湿度这些会直接改变画面（可选，别的区域暂时不用） */
  eco?: Eco;
}
