/**
 * 区域元数据 + 初始世界内容
 *
 * 每个区域的世界内容都以数据形式声明：位置、类型、初始状态。
 * 这样加内容不需要写组件，只需要在表里加一行。
 */

import { applyLayoutFix } from './layoutFix';
import type { Entity, RegionId, RegionMeta } from './types';

export const REGIONS: Record<RegionId, RegionMeta> = {
  forest: {
    id: 'forest',
    name: '森林',
    tagline: '树影里藏着很多小东西',
    focusX: 800,
    ambience: 'forest',
    accent: '#7fb96c',
    groundY: 646,
  },
  farm: {
    id: 'farm',
    name: '农场',
    tagline: '种下去，就会长出来',
    focusX: 800,
    ambience: 'farm',
    accent: '#e8b94f',
    groundY: 660,
  },
  seaside: {
    id: 'seaside',
    name: '海边',
    tagline: '潮水每天来两次',
    focusX: 800,
    ambience: 'sea',
    accent: '#7fc4e2',
    groundY: 700,
  },
  town: {
    id: 'town',
    name: '小镇',
    tagline: '面包店的灯总是最早亮',
    focusX: 800,
    ambience: 'town',
    accent: '#f28b82',
    groundY: 706,
  },
  home: {
    id: 'home',
    name: '小屋',
    tagline: '东西可以随便摆',
    focusX: 800,
    ambience: 'town',
    accent: '#e7c08a',
    groundY: 700,
  },
  site: {
    id: 'site',
    name: '工地',
    tagline: '搭起来，再推倒',
    focusX: 800,
    ambience: 'site',
    accent: '#d9a05f',
    groundY: 686,
  },
  underwater: {
    id: 'underwater',
    name: '海底',
    tagline: '很慢，很安静',
    focusX: 800,
    ambience: 'water',
    accent: '#69a8c9',
    groundY: 792,
  },
  /* —— 森林的里层空间：从森林里进去，不出现在世界地图上 —— */
  burrow: {
    id: 'burrow',
    name: '地下',
    tagline: '土里面还有一个世界',
    focusX: 800,
    ambience: 'forest',
    accent: '#9c7a55',
    groundY: 774,
    parent: 'forest',
  },
  canopy: {
    id: 'canopy',
    name: '树上',
    tagline: '枝叶之间，鸟住得比我们高',
    focusX: 800,
    ambience: 'forest',
    accent: '#8ec47a',
    groundY: 790,
    parent: 'forest',
  },
  /* —— 农场与海底的里层空间 —— */
  barn: {
    id: 'barn',
    name: '谷仓',
    tagline: '稻草味儿，猫在这儿睡觉',
    focusX: 800,
    ambience: 'farm',
    accent: '#d9a05f',
    groundY: 780,
    parent: 'farm',
  },
  wreck: {
    id: 'wreck',
    name: '沉船',
    tagline: '船沉了，鱼住了进来',
    focusX: 800,
    ambience: 'water',
    accent: '#4f7d9b',
    groundY: 800,
    parent: 'underwater',
  },
  sky: {
    id: 'sky',
    name: '天空',
    tagline: '云是可以坐上去的',
    focusX: 800,
    ambience: 'air',
    accent: '#bfe0f5',
    groundY: 742,
  },
};

export const REGION_ORDER: RegionId[] = [
  'forest',
  'farm',
  'seaside',
  'town',
  'home',
  'site',
  'underwater',
  'sky',
];

/**
 * 隔壁那个区域（首尾相接，走到天空再往右就回森林）。
 *
 * 横划换区域与画面两边的《 》按钮用的是同一套顺序——两处各写一份迟早会不一致，
 * 孩子会发现"划过去"和"点箭头"到的地方不一样。
 *
 * @param step +1 = 下一个（画面右边那个），-1 = 上一个
 * @returns 里层空间（不在 REGION_ORDER 里）返回 null，表示这儿没有"隔壁"
 */
export function neighborOf(region: RegionId, step: 1 | -1): RegionId | null {
  const i = REGION_ORDER.indexOf(region);
  if (i < 0) return null;
  return REGION_ORDER[(i + step + REGION_ORDER.length) % REGION_ORDER.length];
}

/** 水面区域：落在其中的物体会浮起来 */
export const WATER: Partial<Record<RegionId, { x0: number; x1: number; y0: number; y1: number }>> = {
  forest: { x0: 0, x1: 1600, y0: 786, y1: 856 },
  seaside: { x0: 0, x1: 1600, y0: 506, y1: 700 },
  underwater: { x0: 0, x1: 1600, y0: 0, y1: 900 },
  wreck: { x0: 0, x1: 1600, y0: 0, y1: 900 },
};

/**
 * 海边的水线（设计坐标）。
 *
 * 平潮时正好压在沙滩中线 700 上；涨潮往上抬 35、退潮往下退 35。
 * 70 这个幅度是量出来的：再大水会漫过灯塔基座，再小看不出潮在动。
 */
export function shoreY(tide: number): number {
  const t = Number.isFinite(tide) ? Math.min(1, Math.max(0, tide)) : 0.5;
  return 700 - (t - 0.5) * 70;
}

/** 某区域的实时水域（海边的上边界随潮汐走） */
export function waterAt(
  region: RegionId,
  tide = 0.5,
): { x0: number; x1: number; y0: number; y1: number } | undefined {
  const w = WATER[region];
  if (!w) return undefined;
  return region === 'seaside' ? { ...w, y1: shoreY(tide) } : w;
}

let seq = 0;
const E = (
  t: string,
  r: RegionId,
  x: number,
  y: number,
  extra: Partial<Entity> = {},
): Entity => ({ id: `${r}-${t}-${++seq}`, t, r, x, y, ...extra });

/** 生成全部区域的初始内容（只在首次进入时使用） */
export function seedEntities(): Entity[] {
  seq = 0;
  const f = (t: string, x: number, y: number, extra: Partial<Entity> = {}) => E(t, 'forest', x, y, extra);
  const a = (t: string, x: number, y: number, extra: Partial<Entity> = {}) => E(t, 'farm', x, y, extra);
  const s = (t: string, x: number, y: number, extra: Partial<Entity> = {}) => E(t, 'seaside', x, y, extra);
  const to = (t: string, x: number, y: number, extra: Partial<Entity> = {}) => E(t, 'town', x, y, extra);
  const h = (t: string, x: number, y: number, extra: Partial<Entity> = {}) => E(t, 'home', x, y, extra);
  const c = (t: string, x: number, y: number, extra: Partial<Entity> = {}) => E(t, 'site', x, y, extra);
  const u = (t: string, x: number, y: number, extra: Partial<Entity> = {}) => E(t, 'underwater', x, y, extra);
  const k = (t: string, x: number, y: number, extra: Partial<Entity> = {}) => E(t, 'sky', x, y, extra);

  return applyLayoutFix([
    /* ───────── 森林 ───────── */
    f('rabbit', 700, 700, { fixed: true, s: 1.15 }),
    f('squirrel', 590, 668, { fixed: true, s: 0.95 }),
    f('hedgehog', 960, 706, { fixed: true, s: 1 }),
    f('fox', 1200, 690, { fixed: true, s: 1.1 }),
    f('deer', 350, 662, { fixed: true, s: 1.1 }),
    f('bird', 660, 470, { fixed: true, z: 6, s: 1.1 }),
    f('butterfly', 840, 540, { fixed: true, z: 6, s: 1.2, only: 'day' }),
    f('ladybug', 880, 726, { fixed: true, s: 1.2 }),
    f('caterpillar', 780, 740, { fixed: true, s: 1.2 }),
    f('acorn', 620, 730),
    f('acorn', 1020, 742),
    f('acorn', 1170, 700),
    f('rock', 900, 762),
    f('rock', 1100, 730),
    f('log', 700, 780),
    f('mushroom', 940, 690),
    f('berry', 560, 744),
    f('fern', 1260, 700, { fixed: true, s: 1.2 }),
    f('seed', 520, 736, { v: 1, s: 1.2 }),

    /* ───────── 农场 ───────── */
    a('cow', 520, 692, { fixed: true, s: 1.1 }),
    a('sheep', 700, 704, { fixed: true, s: 1.05 }),
    a('pig', 900, 716, { fixed: true }),
    a('hen', 1030, 700, { fixed: true, s: 1.15 }),
    a('chick', 1074, 722, { fixed: true, s: 1.2 }),
    a('duck', 420, 720, { fixed: true }),
    a('horse', 300, 700, { fixed: true, s: 1.05 }),
    a('tomato', 620, 772, { st: 2, s: 1.35 }),
    a('corn', 668, 812, { st: 2, s: 1.35 }),
    a('pumpkin', 760, 782, { st: 3, s: 1.35 }),
    a('wheat', 806, 806, { st: 2, s: 1.35 }),
    a('egg', 972, 716, { s: 1.2 }),
    a('egg', 1000, 726, { s: 1.2 }),
    a('seed', 470, 748, { s: 1.2 }),
    a('seed', 500, 762, { v: 1, s: 1.2 }),
    a('can', 1130, 712, { v: 1, s: 1.3 }),

    /* ───────── 海边 ───────── */
    s('crab', 640, 722, { fixed: true, s: 1.2 }),
    s('crab', 1130, 772, { fixed: true, s: 1.25 }),
    s('gull', 700, 420, { fixed: true, z: 6, s: 1.2 }),
    s('gull', 1150, 380, { fixed: true, z: 6, s: 1.1 }),
    s('starfish', 560, 800, { s: 1.4 }),
    s('starfish', 1190, 806, { v: 1, s: 1.4 }),
    s('shell', 660, 828, { s: 1.4 }),
    s('shell', 780, 786, { s: 1.3 }),
    s('shell', 1020, 812, { s: 1.3 }),
    s('sandpile', 880, 768, { s: 1.4 }),
    s('bucket', 950, 846, { s: 1.4 }),
    s('boat', 1180, 664, { v: 1, s: 1.2 }),

    /* ───────── 小镇 ───────── */
    to('car', 400, 800, { fixed: true, v: 1, s: 1.2 }),
    to('bus', 760, 812, { fixed: true, s: 1.1 }),
    to('bike', 1240, 800, { fixed: true, s: 1.2 }),
    to('firetruck', 300, 796, { fixed: true, s: 1.1 }),
    to('bread', 1020, 716, { s: 1.2 }),
    to('flour', 1070, 720, { s: 1.2 }),
    to('dough', 1110, 744, { f: false, s: 1.2 }),
    to('letter', 900, 714, { f: false, s: 1.2 }),
    to('ball', 1330, 776, { s: 1.35 }),
    to('balloon', 1380, 640, { v: 1, s: 1.2 }),

    /* ───────── 小屋 ───────── */
    h('bed', 600, 712, { fixed: true, s: 2.4 }),
    h('chair', 820, 752, { s: 1.7 }),
    h('chair', 900, 780, { v: 1, s: 1.7 }),
    h('lamp', 1010, 716, { fixed: true, s: 1.6 }),
    h('toy', 940, 792, { s: 1.7 }),
    h('ball', 700, 826, { s: 1.6 }),
    h('vase', 1120, 724, { s: 1.5 }),
    h('canvas', 470, 726, { s: 1.6 }),
    h('paint', 540, 748, { v: 2, s: 1.6 }),
    h('bread', 1180, 730, { s: 1.4 }),

    /* ───────── 工地 ───────── */
    c('excavator', 520, 700, { fixed: true }),
    c('crane', 1150, 700, { fixed: true }),
    c('truck', 820, 696, { fixed: true }),
    c('block', 700, 700),
    c('block', 740, 702, { v: 1 }),
    c('block', 780, 700, { v: 2 }),
    c('brick', 900, 706),
    c('brick', 930, 710, { v: 1 }),
    c('plank', 660, 712),
    c('plank', 990, 710, { v: 1 }),
    c('sandpile', 1060, 712),
    c('log', 480, 712),

    /* ───────── 海底 ───────── */
    u('fish', 640, 700, { fixed: true }),
    u('fish', 700, 720, { fixed: true, v: 1 }),
    u('fishb', 1180, 690, { fixed: true }),
    u('dolphin', 980, 640, { fixed: true }),
    u('turtle', 520, 730, { fixed: true }),
    u('octopus', 840, 792, { fixed: true }),
    u('jellyfish', 1120, 600, { fixed: true }),
    u('crab', 600, 812, { fixed: true, s: 1.1 }),
    u('starfish', 740, 838, { s: 1.2 }),
    u('shell', 1080, 852, { s: 1.2 }),
    u('bubble', 900, 620),
    u('bubble', 700, 760),
    u('bubble', 1150, 820),
    u('bubble', 380, 700),
    u('coral', 460, 800, { fixed: true }),
    u('coral', 1240, 796, { fixed: true, v: 1 }),
    u('seaweed', 560, 800, { fixed: true }),
    u('seaweed', 1300, 792, { fixed: true }),

    /* ───────── 天空 ───────── */
    k('clouditem', 620, 740),
    k('clouditem', 1040, 700, { v: 1 }),
    k('balloon', 820, 700),
    k('plane', 700, 620),
    k('plane', 1120, 660, { v: 1 }),
    k('kite', 1180, 600),
    k('bird', 760, 640, { fixed: true }),
    k('bird', 900, 676, { fixed: true, v: 1 }),
    k('rainbowseeds', 1000, 740),
  ]);
}

/**
 * 内容版本。每次往 AMBIENT 里加东西就 +1，
 * 老存档在读取时会自动补注入，不用让孩子重置世界才能看到新东西。
 */
export const SEED_REV = 6;

/**
 * 增量内容：新增的、以及"只在特定天气 / 时段出现"的实体。
 * 用固定 id，老存档读取时按 id 去重补注入。
 */
export const AMBIENT: Entity[] = [
  // 森林：白天有蝴蝶，夜里换成萤火虫与猫头鹰，雨后冒出蜗牛和蘑菇
  { id: 'amb-f-owl', t: 'owl', r: 'forest', x: 470, y: 606, only: 'night', fixed: true, s: 1 },
  { id: 'amb-f-fly1', t: 'firefly', r: 'forest', x: 620, y: 690, only: 'night', s: 1.3, z: 4 },
  { id: 'amb-f-fly2', t: 'firefly', r: 'forest', x: 870, y: 688, only: 'night', s: 1.1, z: 4 },
  { id: 'amb-f-fly3', t: 'firefly', r: 'forest', x: 1180, y: 706, only: 'night', s: 1.2, z: 4 },
  { id: 'amb-f-snail1', t: 'snail', r: 'forest', x: 1146, y: 736, only: 'rain', fixed: true, s: 1.4 },
  { id: 'amb-f-snail2', t: 'snail', r: 'forest', x: 548, y: 734, only: 'rain', fixed: true, s: 1.3 },
  { id: 'amb-f-shroom1', t: 'mushroom', r: 'forest', x: 706, y: 738, only: 'rain', s: 1.3 },
  { id: 'amb-f-shroom2', t: 'mushroom', r: 'forest', x: 1244, y: 736, only: 'rain', v: 1, s: 1.25 },

  // 农场：夜里猫头鹰上谷仓，雨后地上有蜗牛
  { id: 'amb-a-owl', t: 'owl', r: 'farm', x: 1240, y: 520, only: 'night', fixed: true, s: 1.1 },
  { id: 'amb-a-fly1', t: 'firefly', r: 'farm', x: 520, y: 700, only: 'night', s: 1.2, z: 4 },
  { id: 'amb-a-fly2', t: 'firefly', r: 'farm', x: 900, y: 716, only: 'night', s: 1.1, z: 4 },
  { id: 'amb-a-snail', t: 'snail', r: 'farm', x: 600, y: 752, only: 'rain', fixed: true, s: 1.3 },

  // 海边：雨里螃蟹躲出来，夜里水里有发光水母
  { id: 'amb-s-crab', t: 'crab', r: 'seaside', x: 900, y: 762, only: 'rain', fixed: true, s: 1.2 },
  { id: 'amb-s-jelly', t: 'jellyfish', r: 'seaside', x: 1330, y: 660, only: 'night', fixed: true, s: 1.1 },

  // 小镇：夜里路灯下有飞虫
  { id: 'amb-t-fly1', t: 'firefly', r: 'town', x: 300, y: 660, only: 'night', s: 1.1, z: 4 },
  { id: 'amb-t-fly2', t: 'firefly', r: 'town', x: 1090, y: 636, only: 'night', s: 1.1, z: 4 },

  // 农场与小屋的补充道具（原本只在精灵表里、世界里没有）
  { id: 'amb-a-hay', t: 'hay', r: 'farm', x: 1120, y: 712, s: 1.2 },
  { id: 'amb-h-pot', t: 'pot', r: 'home', x: 1240, y: 786, s: 1.5 },

  /* —— 森林扩展（内容版本 4）：可搬的东西、水里的小动物、昆虫 —— */
  { id: 'amb-f-carrot', t: 'carrot', r: 'forest', x: 760, y: 748, s: 1.3 },
  { id: 'amb-f-cane', t: 'can', r: 'forest', x: 344, y: 704, s: 1.2 },
  { id: 'amb-f-basket', t: 'basket', r: 'forest', x: 1256, y: 738, s: 1.1 },
  { id: 'amb-f-pinepile', t: 'pineconepile', r: 'forest', x: 320, y: 738, s: 1.3 },
  { id: 'amb-f-pine', t: 'pinecone', r: 'forest', x: 1052, y: 726, s: 1.35 },
      { id: 'amb-f-twigbundle', t: 'twigbundle', r: 'forest', x: 844, y: 706, s: 1.35 },
          { id: 'amb-f-flower1', t: 'flower', r: 'forest', x: 786, y: 702, st: 3, f: true, s: 1.25 },
  { id: 'amb-f-flower2', t: 'flower', r: 'forest', x: 1176, y: 770, st: 3, v: 2, f: true, s: 1.25 },
  { id: 'amb-f-frog', t: 'frog', r: 'forest', x: 1078, y: 872, fixed: true, s: 1.12 },
  { id: 'amb-f-spawn', t: 'frogspawn', r: 'forest', x: 900, y: 818, fixed: true, s: 1.3 },
  { id: 'amb-f-tad1', t: 'tadpole', r: 'forest', x: 902, y: 814, fixed: true, s: 1.35 },
  { id: 'amb-f-tad2', t: 'tadpole', r: 'forest', x: 946, y: 838, fixed: true, v: 1, s: 1.2 },
  { id: 'amb-f-fish', t: 'fish', r: 'forest', x: 1336, y: 822, fixed: true, s: 1.25 },
  { id: 'amb-f-bee', t: 'bee', r: 'forest', x: 1104, y: 592, fixed: true, only: 'day', z: 6, s: 1 },
  { id: 'amb-f-spider', t: 'spider', r: 'forest', x: 300, y: 548, fixed: true, z: 5, s: 1 },
  { id: 'amb-f-ant1', t: 'ant', r: 'forest', x: 992, y: 744, fixed: true, s: 1.2 },
  { id: 'amb-f-ant2', t: 'ant', r: 'forest', x: 1034, y: 754, fixed: true, s: 1.1 },
  { id: 'amb-f-ant3', t: 'ant', r: 'forest', x: 962, y: 756, fixed: true, s: 1.05 },
  { id: 'amb-f-anthill', t: 'anthill', r: 'forest', x: 1004, y: 748, fixed: true, s: 1.15, z: 1 },
  { id: 'amb-f-burrow', t: 'burrowdoor', r: 'forest', x: 352, y: 754, fixed: true, s: 1.25 },
  // 树洞要在树干露出来的那一段：E 版树冠往下长了，放 600 会被叶子盖住，孩子点不到
  // 树洞放在树干中段：太低会贴到根部，太高会被新树冠盖住（见 AGENTS 3.18）
  { id: 'amb-f-treehole', t: 'treehole', r: 'forest', x: 470, y: 590, fixed: true, z: 4, s: 0.95 },
  { id: 'amb-f-firepit', t: 'firepit', r: 'forest', x: 562, y: 730, fixed: true, s: 1.2 },

  /* —— 地下空间 —— */
  { id: 'b-ant1', t: 'ant', r: 'burrow', x: 600, y: 782, fixed: true, s: 1.3 },
  { id: 'b-ant2', t: 'ant', r: 'burrow', x: 642, y: 792, fixed: true, s: 1.2 },
  { id: 'b-ant3', t: 'ant', r: 'burrow', x: 1062, y: 786, fixed: true, s: 1.25 },
  { id: 'b-ant4', t: 'ant', r: 'burrow', x: 1104, y: 796, fixed: true, s: 1.15 },
  { id: 'b-worm1', t: 'worm', r: 'burrow', x: 842, y: 800, fixed: true, s: 1.5 },
  { id: 'b-worm2', t: 'worm', r: 'burrow', x: 1224, y: 808, fixed: true, v: 1, s: 1.35 },
  { id: 'b-root1', t: 'root', r: 'burrow', x: 420, y: 792, fixed: true, s: 1.5 },
  { id: 'b-root2', t: 'root', r: 'burrow', x: 944, y: 794, fixed: true, v: 1, s: 1.35 },
  { id: 'b-rock1', t: 'rock', r: 'burrow', x: 702, y: 806, s: 1.5 },
  { id: 'b-seed1', t: 'seed', r: 'burrow', x: 522, y: 788, s: 1.5 },
  { id: 'b-seed2', t: 'seed', r: 'burrow', x: 562, y: 800, v: 1, s: 1.4 },
  { id: 'b-apple', t: 'apple', r: 'burrow', x: 1002, y: 800, s: 1.6 },
  { id: 'b-ladder', t: 'ladder', r: 'burrow', x: 206, y: 784, fixed: true, s: 2.2 },

  /* —— 树上空间 —— */
  { id: 'c-nest', t: 'nest', r: 'canopy', x: 764, y: 782, fixed: true, s: 1.5, z: 3 },
  { id: 'c-egg1', t: 'egg', r: 'canopy', x: 754, y: 778, s: 1.05, z: 4 },
  { id: 'c-egg2', t: 'egg', r: 'canopy', x: 776, y: 778, v: 1, s: 1.05, z: 4 },
  { id: 'c-bird', t: 'bird', r: 'canopy', x: 592, y: 780, fixed: true, s: 1.45, z: 5 },
  { id: 'c-squirrel', t: 'squirrel', r: 'canopy', x: 1032, y: 786, fixed: true, s: 1.35 },
  { id: 'c-twig1', t: 'twig', r: 'canopy', x: 890, y: 800, s: 1.6 },
  { id: 'c-twig2', t: 'twig', r: 'canopy', x: 1236, y: 804, s: 1.5 },
  { id: 'c-leaf1', t: 'leaf', r: 'canopy', x: 486, y: 800, s: 1.6 },
  { id: 'c-leaf2', t: 'leaf', r: 'canopy', x: 1148, y: 806, v: 1, s: 1.5 },
  { id: 'c-apple1', t: 'apple', r: 'canopy', x: 900, y: 780, s: 1.6 },
  { id: 'c-ladybug', t: 'ladybug', r: 'canopy', x: 660, y: 796, fixed: true, s: 1.4 },
  { id: 'c-hollow', t: 'treehollow', r: 'canopy', x: 1374, y: 664, fixed: true, s: 1.5, z: 2 },
  { id: 'c-down', t: 'treehole', r: 'canopy', x: 352, y: 786, fixed: true, s: 1.4 },

  // 海底：夜里水母更多
  { id: 'amb-u-jelly1', t: 'jellyfish', r: 'underwater', x: 700, y: 560, only: 'night', fixed: true, s: 1.3 },
  { id: 'amb-u-jelly2', t: 'jellyfish', r: 'underwater', x: 1310, y: 620, only: 'night', fixed: true, s: 1.1 },

  /* —— 内容版本 6：其余七个区域也有一整天的生灵 —— */
  // 农场：白天蜜蜂在菜地上，蝴蝶沿着篱笆飞；谷仓门口总有一只猫
  { id: 'amb-a-bee1', t: 'bee', r: 'farm', x: 960, y: 640, only: 'day', fixed: true, z: 6, s: 1 },
  { id: 'amb-a-bee2', t: 'bee', r: 'farm', x: 1080, y: 672, only: 'day', fixed: true, z: 6, s: 0.95 },
  { id: 'amb-a-butterfly', t: 'butterfly', r: 'farm', x: 470, y: 610, only: 'day', fixed: true, z: 6, s: 1.1 },
  { id: 'amb-a-cat', t: 'cat', r: 'farm', x: 1188, y: 700, fixed: true, s: 1.1 },
  // 小镇：窗台下的蝴蝶与路灯边的蜜蜂
  { id: 'amb-t-butterfly', t: 'butterfly', r: 'town', x: 640, y: 664, only: 'day', fixed: true, z: 6, s: 1.05 },
  { id: 'amb-t-bee', t: 'bee', r: 'town', x: 880, y: 660, only: 'day', fixed: true, z: 6, s: 0.95 },
  { id: 'amb-t-cat', t: 'cat', r: 'town', x: 1160, y: 700, fixed: true, s: 1.05 },
  // 海边：礁石上歇着一只海鸥，沙滩上一只小蟹
  { id: 'amb-s-gull3', t: 'gull', r: 'seaside', x: 1288, y: 726, fixed: true, s: 1.1 },
  { id: 'amb-s-crab2', t: 'crab', r: 'seaside', x: 820, y: 748, fixed: true, s: 1.15 },
  // 谁在这儿堆过沙堡：一只小桶，孩子可以拎走
  { id: 'amb-s-bucket', t: 'bucket', r: 'seaside', x: 640, y: 780, s: 1.3 },
  // 小屋：地板上有一只猫，夜里会换到窗边
  { id: 'amb-h-cat', t: 'cat', r: 'home', x: 1060, y: 760, fixed: true, s: 1.1 },
  // 海底：海龟在沙地上慢慢挪，海星摊在角落
  { id: 'amb-u-starfish', t: 'starfish', r: 'underwater', x: 1160, y: 836, fixed: true, s: 1.3 },
  // 天空：海鸥在云之间穿
  { id: 'amb-k-gull', t: 'gull', r: 'sky', x: 1040, y: 600, fixed: true, z: 6, s: 1.15 },

  /* —— 谷仓内部 —— */
  { id: 'g-ladder', t: 'ladder', r: 'barn', x: 205, y: 780, fixed: true, s: 2.3 },
  { id: 'g-hay1', t: 'hay', r: 'barn', x: 300, y: 780, s: 1.5 },
  { id: 'g-hay2', t: 'hay', r: 'barn', x: 372, y: 772, v: 1, s: 1.3 },
  { id: 'g-hay3', t: 'hay', r: 'barn', x: 470, y: 786, s: 1.2 },
  { id: 'g-cat', t: 'cat', r: 'barn', x: 640, y: 778, fixed: true, s: 1.2 },
  { id: 'g-chick', t: 'chick', r: 'barn', x: 706, y: 790, fixed: true, s: 1.3 },
  { id: 'g-egg1', t: 'egg', r: 'barn', x: 698, y: 784, s: 1.2 },
  { id: 'g-egg2', t: 'egg', r: 'barn', x: 722, y: 790, v: 1, s: 1.15 },
  { id: 'g-bucket', t: 'bucket', r: 'barn', x: 902, y: 788, s: 1.5 },
  { id: 'g-apple1', t: 'apple', r: 'barn', x: 424, y: 790, s: 1.3 },
  { id: 'g-apple2', t: 'apple', r: 'barn', x: 452, y: 796, v: 1, s: 1.25 },
  { id: 'g-twig', t: 'twig', r: 'barn', x: 820, y: 792, s: 1.4 },
  { id: 'g-basket', t: 'basket', r: 'barn', x: 1010, y: 786, s: 1.2 },
  { id: 'g-can', t: 'can', r: 'barn', x: 1080, y: 792, v: 1, s: 1.25 },

  /* —— 沉船内部 —— */
  { id: 'w-ladder', t: 'ladder', r: 'wreck', x: 1470, y: 800, fixed: true, s: 2.3 },
  { id: 'w-fish1', t: 'fish', r: 'wreck', x: 600, y: 700, fixed: true, s: 1.15 },
  { id: 'w-fish2', t: 'fish', r: 'wreck', x: 1210, y: 722, fixed: true, v: 1, s: 1.1 },
  { id: 'w-fishb', t: 'fishb', r: 'wreck', x: 918, y: 662, fixed: true, s: 1.15 },
  { id: 'w-octo', t: 'octopus', r: 'wreck', x: 1310, y: 782, fixed: true, s: 1.15 },
  { id: 'w-crab', t: 'crab', r: 'wreck', x: 520, y: 820, fixed: true, s: 1.1 },
  { id: 'w-star', t: 'starfish', r: 'wreck', x: 764, y: 832, s: 1.25 },
  { id: 'w-shell1', t: 'shell', r: 'wreck', x: 884, y: 836, s: 1.3 },
  { id: 'w-shell2', t: 'shell', r: 'wreck', x: 1128, y: 842, v: 1, s: 1.2 },
  { id: 'w-bub1', t: 'bubble', r: 'wreck', x: 700, y: 600, s: 1.1 },
  { id: 'w-bub2', t: 'bubble', r: 'wreck', x: 1004, y: 560, s: 1 },
  { id: 'w-coral', t: 'coral', r: 'wreck', x: 420, y: 808, fixed: true, s: 1.1 },
  { id: 'w-weed', t: 'seaweed', r: 'wreck', x: 1396, y: 800, fixed: true, s: 1.1 },
  { id: 'w-plank', t: 'plank', r: 'wreck', x: 662, y: 808, s: 1.1 },
  { id: 'w-block', t: 'block', r: 'wreck', x: 1040, y: 812, s: 1.2 },

];

/** 隐藏互动：每个区域 5 处，位置与揭示内容 */
export interface Secret {
  id: string;
  r: RegionId;
  x: number;
  y: number;
  /** 揭示出来的精灵类型 */
  reveal: string;
  /** 该秘密只在特定时段 / 天气出现 */
  only?: 'night' | 'rain' | 'day';
  /**
   * 只在特定潮位才浮出来：low = 退潮才露，high = 涨潮才够得着。
   * 有了这个，"等一等"才是有意义的——孩子会发现有的东西要等海水退下去。
   */
  tide?: 'low' | 'high';
  /**
   * 要点几下才开（默认 1）。设成 3 的那几处，前两下只轻轻抖一下，
   * 第三下才打开——孩子会自己数，这正是我们要的。
   */
  taps?: number;
}

export const SECRETS: Secret[] = [
  // 森林
  { id: 'f-hole', r: 'forest', x: 470, y: 520, reveal: 'owl', only: 'day' },
  { id: 'f-foot', r: 'forest', x: 860, y: 690, reveal: 'ladybug' },
  { id: 'f-leaf', r: 'forest', x: 1090, y: 706, reveal: 'snail' },
  { id: 'f-firefly', r: 'forest', x: 640, y: 660, reveal: 'firefly', only: 'night' },
  { id: 'f-shroom', r: 'forest', x: 950, y: 674, reveal: 'mushroom', only: 'rain' },
  { id: 'f-rock', r: 'forest', x: 1112, y: 726, reveal: 'ladybug' },
  { id: 'f-stump', r: 'forest', x: 890, y: 700, reveal: 'caterpillar' },
  { id: 'f-ant', r: 'forest', x: 1052, y: 782, reveal: 'ant' },
  { id: 'f-tad', r: 'forest', x: 922, y: 812, reveal: 'tadpole' },
  { id: 'f-berry', r: 'forest', x: 566, y: 764, reveal: 'berry' },
  { id: 'f-bee', r: 'forest', x: 806, y: 700, reveal: 'bee', only: 'day' },
  { id: 'f-nest', r: 'forest', x: 640, y: 492, reveal: 'bird' },
  // 树缝要连点三下：前两下只是抖一下，第三下才开
  { id: 'f-knock', r: 'forest', x: 1170, y: 652, reveal: 'spider', taps: 3 },
  { id: 'b-seed', r: 'burrow', x: 866, y: 790, reveal: 'seed' },
  { id: 'b-worm', r: 'burrow', x: 300, y: 792, reveal: 'worm' },
  { id: 'b-ant', r: 'burrow', x: 1160, y: 800, reveal: 'ant' },
  { id: 'c-egg', r: 'canopy', x: 812, y: 780, reveal: 'egg' },
  { id: 'c-apple', r: 'canopy', x: 968, y: 782, reveal: 'apple' },
  { id: 'c-spider', r: 'canopy', x: 1140, y: 700, reveal: 'spider' },
  // 农场
  { id: 'a-chick', r: 'farm', x: 1150, y: 690, reveal: 'chick' },
  { id: 'a-cat', r: 'farm', x: 1320, y: 668, reveal: 'cat' },
  { id: 'a-hay', r: 'farm', x: 620, y: 690, reveal: 'hedgehog' },
  { id: 'a-owl', r: 'farm', x: 1300, y: 470, reveal: 'owl', only: 'night' },
  { id: 'a-worm', r: 'farm', x: 840, y: 706, reveal: 'caterpillar' },
  { id: 'a-egg2', r: 'farm', x: 1180, y: 700, reveal: 'egg' },
  // 谷仓后面，不在谷仓门上（门是入口，被光点挡住就进不去了）
  { id: 'a-barnback', r: 'farm', x: 1364, y: 700, reveal: 'cat' },
  { id: 'a-nest', r: 'farm', x: 386, y: 566, reveal: 'bird' },
  { id: 'a-duckpond', r: 'farm', x: 428, y: 726, reveal: 'duck' },
  // 海边
  { id: 's-hermit', r: 'seaside', x: 900, y: 712, reveal: 'crab' },
  { id: 's-fish', r: 'seaside', x: 1300, y: 720, reveal: 'fishb' },
  { id: 's-print', r: 'seaside', x: 700, y: 724, reveal: 'starfish' },
  { id: 's-glow', r: 'seaside', x: 1100, y: 760, reveal: 'jellyfish', only: 'night' },
  { id: 's-shell', r: 'seaside', x: 560, y: 700, reveal: 'shell' },
  { id: 's-rock', r: 'seaside', x: 1272, y: 742, reveal: 'crab' },
  { id: 's-gullnest', r: 'seaside', x: 838, y: 436, reveal: 'gull' },
  // 潮池：退潮才露出来，涨潮时它整个在水下——孩子会记住要等水退下去
  { id: 's-tidepool', r: 'seaside', x: 752, y: 768, reveal: 'starfish', tide: 'low' },
  // 沙滩最右端：退潮时才露出水面，涨潮就看不见了
  { id: 's-drift', r: 'seaside', x: 1540, y: 730, reveal: 'shell', tide: 'low' },
  // 浪线上：涨潮才够得着，退潮时它在干沙上，什么也不会发生
  { id: 's-surf', r: 'seaside', x: 1040, y: 700, reveal: 'fishb', tide: 'high' },
  { id: 's-boatfish', r: 'seaside', x: 1236, y: 674, reveal: 'fishb' },
  // 小镇
  { id: 't-cat', r: 'town', x: 1180, y: 690, reveal: 'cat' },
  { id: 't-dove', r: 'town', x: 700, y: 470, reveal: 'bird' },
  { id: 't-mail', r: 'town', x: 1000, y: 700, reveal: 'letter' },
  { id: 't-moth', r: 'town', x: 1060, y: 620, reveal: 'butterfly', only: 'night' },
  { id: 't-toy', r: 'town', x: 620, y: 712, reveal: 'ball' },
  // 面包店的招牌位置，不是门口那扇门
  { id: 't-bakery', r: 'town', x: 300, y: 556, reveal: 'bread' },
  { id: 't-sign', r: 'town', x: 300, y: 496, reveal: 'letter' },
  { id: 't-hydrant', r: 'town', x: 792, y: 704, reveal: 'cat' },
  { id: 't-crossing', r: 'town', x: 1004, y: 818, reveal: 'ball' },
  // 面包店台阶底下有块活的木板，得连敲三下（别放在门口：门是入口）
  { id: 't-step', r: 'town', x: 400, y: 706, reveal: 'letter', taps: 3 },
  // 小屋
  { id: 'h-bear', r: 'home', x: 560, y: 712, reveal: 'toy' },
  { id: 'h-cookie', r: 'home', x: 760, y: 712, reveal: 'bread' },
  { id: 'h-cat', r: 'home', x: 1120, y: 706, reveal: 'cat' },
  { id: 'h-moth', r: 'home', x: 1060, y: 620, reveal: 'firefly', only: 'night' },
  { id: 'h-letter', r: 'home', x: 660, y: 706, reveal: 'letter' },
  { id: 'h-shelf', r: 'home', x: 962, y: 640, reveal: 'letter' },
  { id: 'h-rug', r: 'home', x: 824, y: 772, reveal: 'toy' },
  { id: 'h-pot', r: 'home', x: 1132, y: 690, reveal: 'flower' },
  { id: 'h-stove', r: 'home', x: 1300, y: 686, reveal: 'bread' },
  // 工地
  { id: 'c-bone', r: 'site', x: 1060, y: 706, reveal: 'starfish' },
  { id: 'c-bird', r: 'site', x: 820, y: 640, reveal: 'bird' },
  { id: 'c-cat', r: 'site', x: 480, y: 712, reveal: 'cat' },
  { id: 'c-squirrel', r: 'site', x: 660, y: 712, reveal: 'squirrel' },
  { id: 'c-light', r: 'site', x: 1150, y: 560, reveal: 'firefly', only: 'night' },
  { id: 'c-pipe', r: 'site', x: 334, y: 682, reveal: 'rock' },
  { id: 'c-wall', r: 'site', x: 604, y: 668, reveal: 'brick' },
  { id: 'c-scaffold', r: 'site', x: 1084, y: 516, reveal: 'plane' },
  { id: 'c-dirt', r: 'site', x: 384, y: 664, reveal: 'worm' },
  // 海底
  { id: 'u-crab', r: 'underwater', x: 740, y: 800, reveal: 'crab' },
  { id: 'u-eel', r: 'underwater', x: 1240, y: 760, reveal: 'octopus' },
  { id: 'u-seahorse', r: 'underwater', x: 560, y: 780, reveal: 'fishb' },
  { id: 'u-shell', r: 'underwater', x: 1080, y: 806, reveal: 'shell' },
  { id: 'u-glow', r: 'underwater', x: 1120, y: 600, reveal: 'jellyfish', only: 'night' },
  // 别放在洞穴口（1430,766）：秘密光点会先抢走点击，孩子就进不去沉船了
  { id: 'u-cave', r: 'underwater', x: 1548, y: 646, reveal: 'octopus' },
  { id: 'u-fishb', r: 'underwater', x: 1184, y: 704, reveal: 'fishb' },
  { id: 'u-coral', r: 'underwater', x: 474, y: 786, reveal: 'starfish' },
  { id: 'u-dolphin', r: 'underwater', x: 1006, y: 616, reveal: 'dolphin' },
  // 天空
  { id: 'k-bird', r: 'sky', x: 620, y: 700, reveal: 'bird' },
  { id: 'k-bear', r: 'sky', x: 820, y: 700, reveal: 'toy' },
  { id: 'k-star', r: 'sky', x: 1040, y: 700, reveal: 'rainbowseeds', only: 'night' },
  { id: 'k-mail', r: 'sky', x: 700, y: 620, reveal: 'letter' },
  { id: 'k-moon', r: 'sky', x: 1180, y: 600, reveal: 'rabbit', only: 'night' },
  { id: 'k-cloud', r: 'sky', x: 436, y: 686, reveal: 'clouditem' },
  { id: 'k-kite', r: 'sky', x: 1188, y: 596, reveal: 'kite' },
  { id: 'k-plane', r: 'sky', x: 1128, y: 654, reveal: 'plane' },
  { id: 'k-rainbow', r: 'sky', x: 866, y: 600, reveal: 'rainbowseeds' },
  // 谷仓
  { id: 'g-hidden-egg', r: 'barn', x: 362, y: 766, reveal: 'egg' },
  { id: 'g-owl', r: 'barn', x: 1160, y: 452, reveal: 'owl', only: 'night' },
  // 沉船
  { id: 'w-hidden-shell', r: 'wreck', x: 828, y: 824, reveal: 'shell' },
  { id: 'w-octo', r: 'wreck', x: 1268, y: 772, reveal: 'octopus' },
  // 舱底那块松动的木板下面压着东西，连敲三下才挪开
  { id: 'w-chest', r: 'wreck', x: 900, y: 790, reveal: 'crab', taps: 3 },
];
