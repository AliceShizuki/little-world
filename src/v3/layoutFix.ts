/**
 * 布局修正
 *
 * 第一版森林的坐标是"排成一排"的：小东西挤在中间、小鸟飘在半空、
 * 几件道具小到看不出是什么。这里给出一张**只对没被移动过的东西生效**的修正表：
 *
 *   只有在实体仍然停在自己出生时的坐标上，才把它挪到新位置。
 *   孩子自己摆过的东西一律不动 —— 那是他的森林。
 *
 * 同时被 seedEntities()（新存档）和 loadSave()（老存档）调用，所以只维护一处。
 */

import type { Entity, RegionId } from './types';

interface Fix {
  t: string;
  r: RegionId;
  /** 出生时的旧坐标 */
  from: [number, number];
  /** 新坐标 */
  to: [number, number];
  /** 新缩放（不给就保持原样） */
  s?: number;
}

export const LAYOUT_FIX: Fix[] = [
  // 小鸟原来飘在空地中间，挪到橡树右侧那根横枝上
  { t: 'bird', r: 'forest', from: [660, 470], to: [538, 520], s: 1.15 },
  // 蝴蝶贴着花丛飞，而不是悬在半空
  { t: 'butterfly', r: 'forest', from: [840, 540], to: [826, 638], s: 1.25 },
  // 松鼠回到橡树干旁边
  { t: 'squirrel', r: 'forest', from: [590, 668], to: [418, 686], s: 1.15 },
  // 兔子挪到空地中间，个头放大一点（孩子要看得清）
  { t: 'rabbit', r: 'forest', from: [700, 700], to: [694, 722], s: 1.35 },
  // 刺猬去右边桦树下，避免和兔子、狐狸挤在一起
  { t: 'hedgehog', r: 'forest', from: [960, 706], to: [1332, 750], s: 1.2 },
  { t: 'fox', r: 'forest', from: [1200, 690], to: [1400, 716], s: 1.2 },
  { t: 'deer', r: 'forest', from: [350, 662], to: [252, 704], s: 1.25 },
  // 小道具：把挤在一起的分开，并放大到看得清
  { t: 'acorn', r: 'forest', from: [620, 730], to: [614, 748], s: 1.25 },
  { t: 'acorn', r: 'forest', from: [1020, 742], to: [936, 740], s: 1.25 },
  { t: 'acorn', r: 'forest', from: [1170, 700], to: [1204, 762], s: 1.25 },
  { t: 'rock', r: 'forest', from: [900, 762], to: [852, 752], s: 1.4 },
  { t: 'rock', r: 'forest', from: [1100, 730], to: [1152, 744], s: 1.3 },
  { t: 'log', r: 'forest', from: [700, 780], to: [756, 812], s: 1.15 },
  { t: 'mushroom', r: 'forest', from: [940, 690], to: [1092, 764], s: 1.25 },
  { t: 'berry', r: 'forest', from: [560, 744], to: [1300, 752], s: 1.25 },
  { t: 'fern', r: 'forest', from: [1260, 700], to: [128, 736], s: 1.35 },
  { t: 'seed', r: 'forest', from: [520, 736], to: [566, 766], s: 1.35 },
];

export function applyLayoutFix(ents: Entity[]): Entity[] {
  return ents.map((e) => {
    const f = LAYOUT_FIX.find(
      (x) =>
        x.t === e.t &&
        x.r === e.r &&
        Math.abs(e.x - x.from[0]) < 2 &&
        Math.abs(e.y - x.from[1]) < 2,
    );
    if (!f) return e;
    return { ...e, x: f.to[0], y: f.to[1], ...(f.s !== undefined ? { s: f.s } : {}) };
  });
}
