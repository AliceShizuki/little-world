/**
 * 场景布局引擎
 *
 * 设计思路：场景不是固定像素画布，而是根据实际视口尺寸生成「单位坐标系」。
 *  - wide（宽屏 / 平板横屏）：单位宽度 1440
 *  - tall（竖屏 / 手机）：单位宽度 600，物体位置重新编排（不是把桌面版缩小）
 * 纵向单位高度由容器宽高比推导，因此画面永远铺满、不裁切、不留黑边。
 */

import type { Composition, NVec, Vec } from '../types';

export interface TreeSpot {
  id: string;
  x: number;
  y: number;
  scale: number;
  variant: 'oak' | 'pine' | 'willow';
}

export interface FlowerSpot {
  id: string;
  x: number;
  y: number;
  scale: number;
  color: 'pink' | 'yellow' | 'purple';
}

export interface RiverShape {
  /** 河流中心线路径（用较粗的描边绘制成水面） */
  d: string;
  top: number;
  bottom: number;
  cy: number;
  width: number;
  x2: number;
}

export interface Layout {
  composition: Composition;
  u: number;
  uh: number;
  horizon: number;
  grassHeight: number;
  sun: Vec;
  /** 白天挂在天边的淡月亮（点击可入夜） */
  dayMoon: Vec;
  clouds: { a: Vec; b: Vec };
  trees: TreeSpot[];
  flowers: FlowerSpot[];
  bushes: Vec[];
  house: { x: number; y: number; scale: number };
  river: RiverShape;
  pathD: string;
  rabbit: Vec;
  carrot: Vec;
  frog: Vec;
  boat: Vec;
  perches: Vec[];
  butterflyHome: Vec;
  seedSpawn: Vec;
}

const p = (x: number, y: number): Vec => ({ x, y });

/** 河流：一条自然弯曲、两端圆润的小溪 */
function riverShape(u: number, cy: number, width: number, x2: number): RiverShape {
  const d = `M -80 ${cy} C ${u * 0.16} ${cy - width * 0.18}, ${u * 0.32} ${cy + width * 0.26}, ${x2} ${cy + width * 0.08}`;
  return { d, top: cy - width / 2, bottom: cy + width / 2, cy, width, x2 };
}

export function buildLayout(width: number, height: number): Layout {
  const ratio = height / Math.max(width, 1);
  const composition: Composition = ratio > 1.05 ? 'tall' : 'wide';
  const tall = composition === 'tall';

  const u = tall ? 600 : 1440;
  const uh = u * ratio;

  const horizon = uh * (tall ? 0.43 : 0.53);
  const gh = uh - horizon;
  const gx = (f: number) => u * f;
  const gy = (f: number) => horizon + gh * f;

  const house = tall
    ? { x: gx(0.71), y: gy(0.33), scale: 0.8 }
    : { x: gx(0.825), y: gy(0.43), scale: 1 };

  const trees: TreeSpot[] = tall
    ? [
        { id: 'oak', variant: 'oak', x: gx(0.2), y: gy(0.08), scale: 0.95 },
        { id: 'pine', variant: 'pine', x: gx(0.39), y: gy(0.03), scale: 0.64 },
        { id: 'willow', variant: 'willow', x: gx(0.1), y: gy(0.26), scale: 0.62 },
      ]
    : [
        { id: 'oak', variant: 'oak', x: gx(0.11), y: gy(0.11), scale: 1.1 },
        { id: 'pine', variant: 'pine', x: gx(0.225), y: gy(0.04), scale: 0.78 },
        { id: 'willow', variant: 'willow', x: gx(0.335), y: gy(0.19), scale: 0.86 },
      ];

  const flowers: FlowerSpot[] = tall
    ? [
        { id: 'f1', color: 'pink', x: gx(0.47), y: gy(0.27), scale: 0.95 },
        { id: 'f2', color: 'yellow', x: gx(0.29), y: gy(0.37), scale: 0.9 },
        { id: 'f3', color: 'purple', x: gx(0.17), y: gy(0.48), scale: 0.9 },
        { id: 'f4', color: 'pink', x: gx(0.4), y: gy(0.45), scale: 0.88 },
        { id: 'f5', color: 'yellow', x: gx(0.53), y: gy(0.62), scale: 0.82 },
        { id: 'f6', color: 'purple', x: gx(0.6), y: gy(0.55), scale: 0.8 },
      ]
    : [
        { id: 'f1', color: 'pink', x: gx(0.17), y: gy(0.29), scale: 1 },
        { id: 'f2', color: 'yellow', x: gx(0.235), y: gy(0.42), scale: 0.95 },
        { id: 'f3', color: 'purple', x: gx(0.29), y: gy(0.25), scale: 0.9 },
        { id: 'f4', color: 'pink', x: gx(0.365), y: gy(0.37), scale: 0.95 },
        { id: 'f5', color: 'yellow', x: gx(0.085), y: gy(0.46), scale: 0.9 },
        { id: 'f6', color: 'purple', x: gx(0.6), y: gy(0.66), scale: 0.9 },
        { id: 'f7', color: 'pink', x: gx(0.93), y: gy(0.62), scale: 0.85 },
      ];

  const bushes: Vec[] = tall
    ? [p(gx(0.02), gy(0.16)), p(gx(0.9), gy(0.55)), p(gx(0.93), gy(0.75))]
    : [p(gx(0.03), gy(0.24)), p(gx(0.45), gy(0.18)), p(gx(0.7), gy(0.16)), p(gx(0.95), gy(0.66))];

  const river = tall
    ? riverShape(u, gy(0.74), gh * 0.2, gx(0.88))
    : riverShape(u, gy(0.63), gh * 0.21, gx(0.63));

  const rabbit = tall ? p(gx(0.45), gy(0.52)) : p(gx(0.66), gy(0.44));
  const carrot = tall ? p(gx(0.57), gy(0.62)) : p(gx(0.735), gy(0.55));
  // 青蛙蹲在河岸边（贴着水面上沿）
  const frog = tall
    ? p(gx(0.16), river.cy - river.width * 0.66)
    : p(gx(0.4), river.cy - river.width * 0.66);
  const boat = tall ? p(gx(0.55), river.cy + 2) : p(gx(0.24), river.cy + 2);
  const seedSpawn = tall ? p(gx(0.3), gy(0.36)) : p(gx(0.5), gy(0.27));
  const butterflyHome = tall ? p(gx(0.3), gy(0.26)) : p(gx(0.26), gy(0.26));

  return {
    composition,
    u,
    uh,
    horizon,
    grassHeight: gh,
    sun: p(tall ? gx(0.73) : gx(0.855), tall ? horizon * 0.26 : horizon * 0.25),
    dayMoon: p(tall ? gx(0.45) : gx(0.735), tall ? horizon * 0.1 : horizon * 0.11),
    clouds: {
      a: p(tall ? gx(0.26) : gx(0.23), tall ? horizon * 0.3 : horizon * 0.26),
      b: p(tall ? gx(0.6) : gx(0.6), tall ? horizon * 0.12 : horizon * 0.13),
    },
    trees,
    flowers,
    bushes,
    house,
    river,
    pathD: tall
      ? `M ${gx(0.42)} ${uh + 10} C ${gx(0.5)} ${gy(0.78)}, ${gx(0.64)} ${gy(0.5)}, ${house.x - 8} ${house.y - 4}`
      : `M ${gx(0.55)} ${uh + 10} C ${gx(0.66)} ${gy(0.84)}, ${gx(0.76)} ${gy(0.6)}, ${house.x - 6} ${house.y - 4}`,
    rabbit,
    carrot,
    frog,
    boat,
    perches: [
      // 橡树的横枝末端 / 松树最下面一层枝叶
      p(trees[0].x + 42 * trees[0].scale, trees[0].y - 122 * trees[0].scale),
      p(trees[1].x + 14 * trees[1].scale, trees[1].y - 96 * trees[1].scale),
    ],
    butterflyHome,
    seedSpawn,
  };
}

/** 把布局坐标转成存档用的归一化坐标 */
export function toNVec(layout: Layout, v: Vec): NVec {
  return { fx: v.x / layout.u, fy: v.y / layout.uh };
}

export function fromNVec(layout: Layout, n: NVec): Vec {
  return { x: n.fx * layout.u, y: n.fy * layout.uh };
}
