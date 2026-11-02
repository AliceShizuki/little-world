/**
 * 轻量物理
 *
 * 不引入 Matter.js：这里需要的只是"落在该在的地方"——
 * 地面、别的积木顶上、或者水面。用解析式算落点，再由 CSS transition
 * 播放下落过程，比每帧跑积分器省得多，也更稳定（不会抖、不会穿透）。
 *
 * 需要浮力的物体有一个显式白名单，不做密度计算——对 3—5 岁的孩子来说
 * "木板会浮、石头会沉"是可预期的，物理引擎的真实数值反而不可预期。
 */

import { REGIONS, waterAt } from './regions';
import { spriteOf } from './sprites';
import type { Entity, RegionId } from './types';

export interface Rest {
  x: number;
  y: number;
  rot: number;
  /** 落在水上 */
  floating: boolean;
  /** 叠在别的东西上 */
  stacked: boolean;
}

/** 会浮起来的东西 */
const FLOATERS = new Set([
  'boat', 'log', 'plank', 'balloon', 'clouditem', 'plane', 'bubble', 'bridge', 'leaf', 'twig', 'leafpile',
]);

/** 这个东西会不会浮在水上（拖进水里时用得到） */
export const isFloater = (t: string): boolean => FLOATERS.has(t);

export const MIN_Y = 60;
export const MAX_Y = 900;

/**
 * 各个地面的最深处。
 * 场景是 2.5D 的：y 越大越靠近镜头。地面从 groundY 一直铺到画面底部，
 * 所以"孩子把东西拖到多前面，它就留在多前面"——除了少数地面不够深的区域。
 */
const FLOOR_MAX: Partial<Record<RegionId, number>> = { sky: 812, underwater: 868, wreck: 868, barn: 860 };

export function sizeOf(e: Entity): { w: number; h: number } {
  const s = spriteOf(e.t);
  const k = e.s ?? 1;
  return { w: s.w * k, h: s.h * k };
}

/** 落地 / 落水 / 叠放的最终位置 */
export function resolveDrop(
  e: Entity,
  others: Entity[],
  region: RegionId,
  dropX: number,
  dropY: number,
  /** 潮位（只有海边用得到）：涨潮时水线往上，退潮时露出更多沙滩 */
  tide = 0.5,
): Rest {
  const { w } = sizeOf(e);
  const meta = REGIONS[region];
  const ground = meta.groundY;
  const x = Math.min(1560, Math.max(40, dropX));
  const floorMax = Math.min(MAX_Y, FLOOR_MAX[region] ?? MAX_Y);
  const water = waterAt(region, tide);
  const canFloat = FLOATERS.has(e.t);

  // 天空区域：云和热气球就停在你松手的地方，不该掉到云层上
  if (region === 'sky' && canFloat) {
    return { x, y: Math.min(floorMax, Math.max(MIN_Y, dropY)), rot: 0, floating: true, stacked: false };
  }

  // 水下区域：整片都是水，落点就是松手的位置
  if (region === 'underwater') {
    return { x, y: Math.min(ground, Math.max(MIN_Y, dropY)), rot: 0, floating: canFloat, stacked: false };
  }

  // 水面是一块矩形区域，不是一条线：落在水里又要浮，就浮在松手处
  const inWater =
    !!water && x > water.x0 && x < water.x1 && dropY >= water.y0 && dropY <= water.y1;
  if (inWater && canFloat) {
    return { x, y: dropY, rot: 0, floating: true, stacked: false };
  }

  // 地面：保留孩子拖出来的纵深，只有"悬空松手"才落回地平线
  let top = Math.max(ground, Math.min(floorMax, dropY));
  let stackedOn: Entity | null = null;
  for (const o of others) {
    if (o.id === e.id || o.r !== region || o.hidden) continue;
    const ob = sizeOf(o);
    if (Math.abs(o.x - x) > (w + ob.w) * 0.42) continue;
    const oTop = o.y - ob.h;
    // 只有"顶面在落点之上"的东西才接得住
    if (oTop >= dropY - 6) continue;
    if (oTop >= top) {
      top = oTop;
      stackedOn = o;
    }
  }

  return {
    x,
    y: Math.min(floorMax, Math.max(MIN_Y, top)),
    rot: 0,
    floating: false,
    stacked: stackedOn !== null,
  };
}

/** 生长阶段推进需要的时间（毫秒），只在"浇过水"后计时 */
export const GROW_MS = 4200;
